# VitalsGuard Unified AI Suite Startup Script
# Runs Model 01 (Diagnosis) and Model 03 (Trend) in a single FastAPI service

Write-Host "🚀 Starting VitalsGuard Unified AI Suite..." -ForegroundColor Cyan

# Ensure we are in the backend directory
$ScriptPath = $MyInvocation.MyCommand.Path
$BackendDir = Split-Path $ScriptPath
Set-Location $BackendDir

# Start the FastAPI server using uvicorn
Write-Host "📡 Backend listening on http://localhost:8000" -ForegroundColor Green
Write-Host "📊 Model 01 (Diagnosis) + Model 03 (Trend) Active" -ForegroundColor Yellow

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
