# VitalsGuard AI - Hugging Face Spaces Deployment
# Base: Node 20 + Python 3.11

FROM node:20-slim AS frontend-build

WORKDIR /app/vitalsgaurd

# Copy frontend package files and install
COPY vitalsgaurd/package.json vitalsgaurd/package-lock.json ./
RUN npm ci --prefer-offline

# Copy frontend source and build
COPY vitalsgaurd/ ./
RUN npm run build

# ── Final image ───────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Install Node.js 20 via NodeSource
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire project
COPY . .

# Copy built frontend from build stage
COPY --from=frontend-build /app/vitalsgaurd/dist ./vitalsgaurd/dist

# --- Install Node Backend (server) ---
WORKDIR /app/vitalsgaurd/server
RUN npm install

# --- Install Python Backend Dependencies ---
WORKDIR /app/vitalsgaurd/backend

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        fastapi>=0.111.0 \
        "uvicorn[standard]>=0.29.0" \
        httpx>=0.27.0 \
        numpy>=1.26.0 \
        scikit-learn>=1.4.0 \
        joblib>=1.3.0 \
        python-dotenv>=1.0.0 \
        "pydantic>=2.7.0" \
        phidata>=2.4.0 \
        "openai>=1.30.0"

# Install tensorflow separately (large download, last so other steps are cached)
RUN pip install --no-cache-dir "tensorflow>=2.15.0"

# --- Setup proxy dependencies ---
WORKDIR /app/vitalsgaurd
RUN npm install express http-proxy-middleware

# --- Copy startup script ---
WORKDIR /app
RUN chmod +x ./start.sh

# HF Spaces uses port 7860 for public access
EXPOSE 7860

# Environment
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Start all services
CMD ["./start.sh"]
