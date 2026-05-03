#!/bin/bash

# VitalsGuard AI - Multi-service startup script for HF Spaces

set -e

echo "================================"
echo "🏥 VitalsGuard AI - Starting..."
echo "================================"

# Set working directory
cd /app

# --- Environment Setup ---
export PYTHONUNBUFFERED=1

# Create necessary directories
mkdir -p /app/vitalsgaurd/backend/logs
mkdir -p /app/vitalsgaurd/server/logs

echo "📝 Environment variables loaded"

# --- Start Services in Background ---

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
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 > /app/vitalsgaurd/backend/logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
sleep 5
echo "✅ FastAPI Backend started (PID: $FASTAPI_PID)"

# 3. Frontend + Reverse Proxy (Port 7860 - HF Spaces default)
echo "🟢 Starting Frontend with proxy..."
cd /app/vitalsgaurd

# Create a simple Node proxy server to serve frontend on port 7860
cat > proxy.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API calls to FastAPI backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

// Proxy to Node backend
app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend proxy running on http://0.0.0.0:${PORT}`);
});
EOF

# Check if http-proxy-middleware is installed
npm list http-proxy-middleware > /dev/null 2>&1 || npm install http-proxy-middleware

node proxy.js &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "================================"
echo "✅ All Services Running!"
echo "================================"
echo "Frontend:    http://localhost:7860"
echo "Node Backend:  http://localhost:5003"
echo "FastAPI:    http://localhost:8000"
echo ""
echo "Health Check: http://localhost:8000/api/health"
echo "================================"

# Keep script running
wait
