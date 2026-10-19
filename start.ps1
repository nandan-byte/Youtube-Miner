# YouTube Playback Testing Bot - PowerShell Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   YouTube Playback QA & Browser Automation Testing Bot" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not found in PATH." -ForegroundColor Red
    Write-Host "Please download and install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

# Install dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing root dependencies..." -ForegroundColor Green
    npm install
}

if (-not (Test-Path "client\node_modules")) {
    Write-Host "[INFO] Installing client dependencies..." -ForegroundColor Green
    npm --prefix client install
}

if (-not (Test-Path "client\dist")) {
    Write-Host "[INFO] Building React GUI..." -ForegroundColor Green
    npm run build
}

if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Generating .env from template..." -ForegroundColor Green
    Copy-Item ".env.example" ".env"
}

Write-Host ""
Write-Host "[INFO] Launching Application Server on http://localhost:3000" -ForegroundColor Green
Write-Host "[INFO] Initial Admin Credentials:" -ForegroundColor Yellow
Write-Host "       Username: admin" -ForegroundColor White
Write-Host "       Password: AdminSecurePass123!" -ForegroundColor White
Write-Host ""

# Open web browser
Start-Process "http://localhost:3000"

# Start server
node server/index.js
