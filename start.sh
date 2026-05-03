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
# IMPORTANT: proxy.cjs lives at /app/ (not inside /app/vitalsgaurd/)
# because vitalsgaurd/package.json has "type":"module" which breaks require()
echo "🟢 Starting Frontend proxy..."

cat > /app/proxy.cjs << 'PROXYEOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Serve the built Vite frontend
app.use(express.static(path.join(__dirname, 'vitalsgaurd/dist')));

// ML Prediction Routes → Flask (port 5000)
app.use(['/api/predict', '/api/explain-trend', '/api/integrated'], createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  on: { error: (err, req, res) => res.status(502).json({ error: 'ML Engine unavailable' }) }
}));

// Agentic / Other API Routes → FastAPI (port 8000)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  on: { error: (err, req, res) => res.status(502).json({ error: 'FastAPI unavailable' }) }
}));

// Auth + Node routes → Node backend (port 5003)
app.use(['/auth', '/store-report', '/appointments', '/alerts', '/health'],
  createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    on: { error: (err, req, res) => res.status(502).json({ error: 'Node backend unavailable' }) }
  })
);

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'vitalsgaurd/dist/index.html'));
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 VitalsGuard proxy running on http://0.0.0.0:' + PORT);
});
PROXYEOF

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
