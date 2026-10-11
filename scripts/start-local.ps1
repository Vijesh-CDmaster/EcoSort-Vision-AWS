param(
    [int]$FrontendPort = 9002,
    [int]$BackendPort = 8000,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serviceDir = Join-Path $root "yolo-service"
$python = Join-Path $serviceDir ".venv\Scripts\python.exe"
$logDir = Join-Path $serviceDir ".logs"
$frontendLog = Join-Path $logDir "frontend.out.log"
$frontendErrorLog = Join-Path $logDir "frontend.error.log"
$backendLog = Join-Path $logDir "backend.out.log"
$backendErrorLog = Join-Path $logDir "backend.error.log"

if (-not (Test-Path $python)) {
    throw "Python environment is missing. Run: cd yolo-service; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

if (-not $env:DATABASE_URL -and
    (-not (Test-Path (Join-Path $root ".env.local")) -or
     -not (Select-String -Path (Join-Path $root ".env.local") -Pattern "^\s*DATABASE_URL\s*=\s*\S+" -Quiet))) {
    throw "DATABASE_URL is not set. Add it to .env.local before starting the local services."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$frontend = $null
$backend = $null

function Get-Json($url) {
    try {
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
