Set-Location $PSScriptRoot
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Python environment is missing. Create it with: python -m venv .venv"
}
& ".\.venv\Scripts\python.exe" -m uvicorn app:app --reload --port 8000
