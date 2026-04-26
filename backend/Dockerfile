# backend/Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder) – install Python dependencies
#   Stage 2 (runtime) – lean production image
#
# Daphne is the ASGI server (component diagram).
# The Docker socket is mounted at runtime (not baked in).

# -----------------------------------------------------------------------
# Stage 1: dependency builder
# -----------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# System dependencies for psycopg2 and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------
# Stage 2: runtime image
# -----------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Create non-root user for security (NFR-1)
RUN useradd --no-create-home --shell /bin/false rasp && \
    chown -R rasp:rasp /app

# staticfiles directory must be writable for collectstatic
RUN mkdir -p /app/staticfiles && chown rasp:rasp /app/staticfiles

USER rasp

EXPOSE 8000

RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Default command — overridden in docker-compose.yml per service
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "rasp_backend.asgi:application"]