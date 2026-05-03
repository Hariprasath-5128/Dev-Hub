# VitalsGuard AI — Hugging Face Spaces
# Strategy: Multi-stage build, Node 20, no TensorFlow (too large for HF free tier)

# ── Stage 1: Build React/Vite frontend ───────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/vitalsgaurd

# Install deps first (better layer caching)
COPY vitalsgaurd/package.json ./
RUN npm install

# Copy source and build
COPY vitalsgaurd/ ./
RUN npm run build

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim

# Install Node.js 20 from NodeSource (apt default is too old)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files (venv, node_modules, dist excluded via .dockerignore)
COPY . .

# Bring in the compiled frontend from Stage 1
COPY --from=frontend-build /app/vitalsgaurd/dist /app/vitalsgaurd/dist

# ── Python dependencies (no TensorFlow — too large for free-tier build) ───────
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r vitalsgaurd/backend/requirements-deploy.txt

# ── Node: server dependencies ─────────────────────────────────────────────────
WORKDIR /app/vitalsgaurd/server
RUN npm install --omit=dev

# ── Node: proxy server dependencies (in /app, NOT inside vitalsgaurd/) ────────
# We install here so proxy.cjs can use require() without ESM conflicts
WORKDIR /app
RUN npm init -y && npm install express http-proxy-middleware

# ── Make startup script executable ───────────────────────────────────────────
RUN chmod +x /app/start.sh

EXPOSE 7860

ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

CMD ["/app/start.sh"]
