# VaultStack File Server Deployment Script
# PowerShell script voor Windows deployment

Write-Host "🔒 VaultStack File Server Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "📋 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
Write-Host "📋 Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Create storage directories
Write-Host "📁 Creating storage directories..." -ForegroundColor Yellow
$storageDir = "./vault-storage"
$filesDir = "$storageDir/files"
$metadataDir = "$storageDir/metadata"

if (!(Test-Path $storageDir)) {
    New-Item -ItemType Directory -Path $storageDir -Force | Out-Null
    Write-Host "✅ Created storage directory: $storageDir" -ForegroundColor Green
}

if (!(Test-Path $filesDir)) {
    New-Item -ItemType Directory -Path $filesDir -Force | Out-Null
    Write-Host "✅ Created files directory: $filesDir" -ForegroundColor Green
}

if (!(Test-Path $metadataDir)) {
    New-Item -ItemType Directory -Path $metadataDir -Force | Out-Null
    Write-Host "✅ Created metadata directory: $metadataDir" -ForegroundColor Green
}

# Check if .env exists, create if not
Write-Host "⚙️  Checking configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "❌ .env file not found. Creating default configuration..." -ForegroundColor Yellow
    
    $envContent = @"
# VaultStack File Server Configuration
PORT=3004
NODE_ENV=development

# Security
MAX_FILE_SIZE=104857600
# 100MB in bytes

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
# 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100

# Storage
STORAGE_DIR=./vault-storage

# Encryption
ENCRYPTION_ITERATIONS=10000

# CORS Origins (comma separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,https://vault.toolstack.nl

# Logging
LOG_LEVEL=info

# Development
DEV_MODE=true
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file with default configuration" -ForegroundColor Green
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

# Test server startup
Write-Host "🧪 Testing server startup..." -ForegroundColor Yellow
$testProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

if ($testProcess.HasExited) {
    Write-Host "❌ Server failed to start. Check the logs above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Server started successfully" -ForegroundColor Green
    Stop-Process -Id $testProcess.Id -Force
}

# Check port availability
Write-Host "🔌 Checking port 3004 availability..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3004 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 3004 is already in use. You may need to stop other services." -ForegroundColor Yellow
} else {
    Write-Host "✅ Port 3004 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the server: npm start" -ForegroundColor White
Write-Host "2. Server will run on: http://localhost:3004" -ForegroundColor White
Write-Host "3. Open VaultStack to see file sync status" -ForegroundColor White
Write-Host ""
Write-Host "🌐 To make it accessible online:" -ForegroundColor Yellow
Write-Host "• Use ngrok: ngrok http 3004" -ForegroundColor White
Write-Host "• Use Cloudflare Tunnel: cloudflared tunnel --url http://localhost:3004" -ForegroundColor White
Write-Host "• Configure router port forwarding" -ForegroundColor White
Write-Host ""
Write-Host "📖 For more info, see README.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔒 VaultStack File Server is ready!" -ForegroundColor Cyan