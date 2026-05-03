const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Simple logging middleware to see traffic in Hugging Face logs
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Proxy] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 1. Serve the built Vite frontend static files
app.use(express.static(path.join(__dirname, 'vitalsgaurd/dist')));

// 2. ML Prediction Routes → Flask (port 5000)
app.use(createProxyMiddleware({
  pathFilter: ['/api/predict', '/api/explain-trend', '/api/integrated', '/health'],
  target: 'http://localhost:5000',
  changeOrigin: true,
  on: { 
    error: (err, req, res) => {
      console.error('ML Engine Proxy Error:', err);
      res.status(502).json({ error: 'ML Engine unavailable' });
    }
  }
}));

// 3. Agentic / Other API Routes → FastAPI (port 8000)
app.use(createProxyMiddleware({
  pathFilter: (path) => path.startsWith('/api') && !path.startsWith('/api/predict'),
  target: 'http://localhost:8000',
  changeOrigin: true,
  on: { 
    error: (err, req, res) => {
      console.error('FastAPI Proxy Error:', err);
      res.status(502).json({ error: 'FastAPI unavailable' });
    }
  }
}));

// 4. Auth + Node routes → Node backend (port 5003)
app.use(createProxyMiddleware({
  pathFilter: ['/auth', '/store-report', '/appointments', '/alerts'],
  target: 'http://localhost:5003',
  changeOrigin: true,
  on: { 
    error: (err, req, res) => {
      console.error('Node Backend Proxy Error:', err);
      res.status(502).json({ error: 'Node backend unavailable' });
    }
  }
}));

// 5. SPA Fallback
// If no route matches, serve index.html (important for React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'vitalsgaurd/dist/index.html'));
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================');
  console.log('🚀 VitalsGuard Gateway Running');
  console.log('Port: ' + PORT);
  console.log('Routing: /api/predict -> 5000, /api -> 8000, /auth -> 5003');
  console.log('================================================');
});
