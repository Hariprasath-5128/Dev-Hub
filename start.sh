#!/bin/bash

# VitalsGuard AI - Multi-service startup script for HF Spaces

set -e

echo "================================"
echo "🏥 VitalsGuard AI - Starting..."
echo "================================"

cd /app

export PYTHONUNBUFFERED=1

# Create log directories
mkdir -p /app/vitalsgaurd/backend/logs
mkdir -p /app/vitalsgaurd/server/logs

echo "📝 Environment variables loaded"

# 1. Node Backend (Port 5003)
echo "🟢 Starting Node Backend..."
cd /app/vitalsgaurd/server
node server.js > /app/vitalsgaurd/server/logs/server.log 2>&1 &
NODE_PID=$!
sleep 3
echo "✅ Node Backend started (PID: $NODE_PID)"

# 2. FastAPI Backend (Port 8000)
echo "🟢 Starting FastAPI Backend..."
cd /app/vitalsgaurd/backend
uvicorn main:app --host 0.0.0.0 --port 8000 > /app/vitalsgaurd/backend/logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
sleep 5
echo "✅ FastAPI Backend started (PID: $FASTAPI_PID)"

# 3. Proxy + Static Frontend (Port 7860 - HF Spaces default)
echo "🟢 Starting Frontend proxy..."
cd /app/vitalsgaurd

# Write proxy server
cat > proxy.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Serve built frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy /api/** → FastAPI (port 8000)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true
}));

// Proxy /auth + /appointments + /alerts → Node backend (port 5003)
app.use(['/auth', '/appointments', '/alerts', '/store-report', '/health'], createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true
}));

// SPA fallback — serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VitalsGuard frontend proxy running on http://0.0.0.0:${PORT}`);
});
EOF

node proxy.js &
FRONTEND_PID=$!
echo "✅ Frontend proxy started (PID: $FRONTEND_PID)"

echo ""
echo "================================"
echo "✅ All Services Running!"
echo "================================"
echo "Frontend:     http://localhost:7860"
echo "Node Backend: http://localhost:5003"
echo "FastAPI:      http://localhost:8000"
echo "Health Check: http://localhost:8000/api/health"
echo "================================"

# Keep the container alive
wait
