# VitalsGuard AI - Hugging Face Spaces Deployment
# Multi-service container: React frontend, Node backend, FastAPI backend

FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire project
COPY . .

# --- Install Frontend Dependencies ---
WORKDIR /app/vitalsgaurd
RUN npm ci

# Build frontend
RUN npm run build

# --- Install Node Backend Dependencies ---
WORKDIR /app/vitalsgaurd/server
RUN npm ci

# --- Install Python Backend Dependencies ---
WORKDIR /app/vitalsgaurd/backend

RUN python -m venv venv
ENV PATH="/app/vitalsgaurd/backend/venv/bin:$PATH"

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# --- Create startup script ---
WORKDIR /app

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Expose ports (HF Spaces uses 7860 for public access)
EXPOSE 7860 5003 5173 8000

# Set environment
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Start all services
CMD ["./start.sh"]
