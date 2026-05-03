#!/bin/bash
# VitalsGuard AI — HF Spaces startup script

set -e

echo "================================"
echo "🏥 VitalsGuard AI - Starting..."
echo "================================"

export PYTHONUNBUFFERED=1

mkdir -p /app/vitalsgaurd/backend/logs
mkdir -p /app/vitalsgaurd/server/logs

# ── 1. Node Backend (Port 5003) ───────────────────────────────────────────────
echo "🟢 Starting Node Backend..."
cd /app/vitalsgaurd/server
node server.js > /app/vitalsgaurd/server/logs/server.log 2>&1 &
NODE_PID=$!
sleep 3
echo "✅ Node Backend started (PID: $NODE_PID)"

# ── 2. FastAPI Backend (Port 8000) ────────────────────────────────────────────
echo "🟢 Starting FastAPI Backend..."
cd /app/vitalsgaurd/backend
uvicorn main:app --host 0.0.0.0 --port 8000 > /app/vitalsgaurd/backend/logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
sleep 5
echo "✅ FastAPI Backend started (PID: $FASTAPI_PID)"

# ── 3. ML Prediction Engine (Port 5000) ───────────────────────────────────────
echo "🟢 Starting Flask ML Engine..."
cd /app/base_models
python app.py > /app/vitalsgaurd/backend/logs/flask.log 2>&1 &
FLASK_PID=$!
sleep 5
echo "✅ Flask ML Engine started (PID: $FLASK_PID)"

# ── 4. Proxy + Static Frontend (Port 7860) ────────────────────────────────────
echo "🟢 Starting Frontend proxy..."
cd /app
node proxy.cjs &
PROXY_PID=$!
echo "✅ Frontend proxy started (PID: $PROXY_PID)"

echo ""
echo "================================"
echo "✅ All Services Running!"
echo "================================"
echo "Frontend:     http://localhost:7860"
echo "ML Engine:    http://localhost:5000"
echo "Node Backend: http://localhost:5003"
echo "FastAPI:      http://localhost:8000"
echo "================================"


wait
