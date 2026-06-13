# CLLauncher - local dev launcher (hot-reload mode)
$mingwBin = "$env:USERPROFILE\mingw64\bin"
if (-not (Test-Path $mingwBin)) {
    Write-Host "ERROR: MinGW not found at $mingwBin" -ForegroundColor Red
    exit 1
}
$env:PATH = "$mingwBin;$env:PATH"
$env:CARGO_TARGET_DIR = "C:\CLTarget"

Write-Host "Starting CLLauncher dev mode..." -ForegroundColor Cyan
npm run tauri:dev
