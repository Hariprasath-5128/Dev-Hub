# VitalsGuard AI — Hugging Face Spaces
# Strategy: Multi-stage build, Node 20, includes tensorflow-cpu for Model 03

# ── Stage 1: Build React/Vite frontend ───────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/vitalsgaurd

# Install deps first (better layer caching)
COPY vitalsgaurd/package.json ./
RUN npm install

# Copy source and build
COPY vitalsgaurd/ ./
# Fix hardcoded localhost URLs for production deployment without changing source code in repo
RUN find src -type f -name "*.js*" -exec sed -i 's|http://localhost:5000/api|/api|g' {} + && \
    find src -type f -name "*.js*" -exec sed -i 's|http://localhost:8000/api|/api|g' {} + && \
    find src -type f -name "*.js*" -exec sed -i 's|http://localhost:5003||g' {} + && \
    find src -type f -name "*.ts*" -exec sed -i 's|http://localhost:5000/api|/api|g' {} + && \
    find src -type f -name "*.ts*" -exec sed -i 's|http://localhost:8000/api|/api|g' {} + && \
    find src -type f -name "*.ts*" -exec sed -i 's|http://localhost:5003||g' {} +
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

# ── Python dependencies (includes tensorflow-cpu for Model 03) ───────
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
