param(
    [int]$FrontendPort = 9002,
    [int]$BackendPort = 8000,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serviceDir = Join-Path $root "yolo-service"
$venvDir = Join-Path $serviceDir ".venv"
$python = Join-Path $venvDir "Scripts\python.exe"
$requirements = Join-Path $serviceDir "requirements.txt"
$requirementsStamp = Join-Path $venvDir ".requirements.sha256"
$defaultModel = Join-Path $serviceDir "models\yolo_model.pt"
$logDir = Join-Path $serviceDir ".logs"
$frontendLog = Join-Path $logDir "frontend.out.log"
$frontendErrorLog = Join-Path $logDir "frontend.error.log"
$backendLog = Join-Path $logDir "backend.out.log"
$backendErrorLog = Join-Path $logDir "backend.error.log"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python is not installed or is not on PATH."
}

if (-not (Test-Path $python)) {
    Write-Host "Creating project-local Python virtual environment..."
    & python -m venv $venvDir
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create $venvDir"
    }
}

$requirementsHash = (Get-FileHash -Path $requirements -Algorithm SHA256).Hash
$installedHash = if (Test-Path $requirementsStamp) { (Get-Content $requirementsStamp -Raw).Trim() } else { "" }
if ($requirementsHash -ne $installedHash) {
    Write-Host "Installing or updating Python dependencies..."
    & $python -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) {
        throw "Python dependency installation failed."
    }
    Set-Content -Path $requirementsStamp -Value $requirementsHash -NoNewline
} else {
    Write-Host "Python dependencies are up to date."
}

$configuredModel = $env:YOLO_MODEL_PATH
if ($configuredModel) {
    if (-not [System.IO.Path]::IsPathRooted($configuredModel)) {
        $configuredModel = Join-Path $serviceDir $configuredModel
    }
    if (-not (Test-Path $configuredModel -PathType Leaf)) {
        throw "YOLO_MODEL_PATH points to a missing model file: $configuredModel"
    }
    $env:YOLO_MODEL_PATH = $configuredModel
} elseif (Test-Path $defaultModel -PathType Leaf) {
    $env:YOLO_MODEL_PATH = $defaultModel
} else {
    Write-Warning "Custom model file is missing at $defaultModel. The backend will use its declared pretrained YOLO fallback and may download yolov8x.pt."
}

if (-not $env:DATABASE_URL -and
    (-not (Test-Path (Join-Path $root ".env.local")) -or
     -not (Select-String -Path (Join-Path $root ".env.local") -Pattern "^\s*DATABASE_URL\s*=\s*\S+" -Quiet))) {
    throw "DATABASE_URL is not set. Add it to .env.local before starting the local services."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$frontend = $null
$backend = $null

function Assert-PortAvailable($port, $name) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        throw "$name port $port is already in use (PID $($listener[0].OwningProcess)). Stop that process or choose another port."
    }
}

function Get-Json($url) {
    try {
        Assert-PortAvailable $FrontendPort "Frontend"
        Assert-PortAvailable $BackendPort "Python service"
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        return ($response.Content | ConvertFrom-Json)
    } catch {
        return $null
    }
}

try {
    Write-Host "Starting Next.js on port $FrontendPort..."
    $frontend = Start-Process -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev", "--", "-p", "$FrontendPort") `
        -WorkingDirectory $root `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError $frontendErrorLog `
        -PassThru

    Write-Host "Starting Python AI/database service on port $BackendPort..."
    $backend = Start-Process -FilePath $python `
        -ArgumentList @("-m", "uvicorn", "app:app", "--port", "$BackendPort") `
        -WorkingDirectory $serviceDir `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErrorLog `
        -PassThru

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $aiReady = $false
    $dbReady = $false
    while ((Get-Date) -lt $deadline) {
        if ($backend.HasExited) {
            throw "Python service exited during startup. See $backendLog"
        }

        $health = Get-Json "http://127.0.0.1:$BackendPort/health"
        if ($health -and $health.ok -eq $true) {
            $aiReady = $true
            $db = Get-Json "http://127.0.0.1:$BackendPort/db/health"
            if ($db -and $db.ok -eq $true) {
                $dbReady = $true
                break
            }
        }
        Start-Sleep -Seconds 2
    }

    if (-not $aiReady) {
        throw "YOLO service did not become ready within $TimeoutSeconds seconds. Check $backendLog for model/dependency errors."
    }
    if (-not $dbReady) {
        throw "Database did not become ready within $TimeoutSeconds seconds. Check DATABASE_URL and $backendLog."
    }

    Write-Host "AI/model and database are ready."
    Write-Host "Open http://127.0.0.1:$FrontendPort"
    Write-Host "Press Ctrl+C to stop both services."
    while ($true) {
        if ($frontend.HasExited) {
            throw "Next.js exited. Check $frontendLog"
        }
        if ($backend.HasExited) {
            throw "Python service exited. Check $backendLog"
        }
        Start-Sleep -Seconds 2
    }
} finally {
    if ($frontend -and -not $frontend.HasExited) {
        Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
}
