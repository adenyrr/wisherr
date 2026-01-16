# Dockerfile unique pour Wisherr (multi-stage: frontend + backend)

# --- Build frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend .
RUN npm run build

# --- Build backend ---
FROM python:3.11-slim AS backend-build
WORKDIR /app/backend
COPY backend/pyproject.toml .
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi
COPY backend/app ./app

# --- Final image ---
FROM python:3.11-slim
WORKDIR /app

# Copie backend
COPY --from=backend-build /app/backend/app ./app
COPY --from=backend-build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-build /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copie frontend build (servi par nginx ou autre, à adapter selon besoin)
COPY --from=frontend-build /app/frontend/build ./frontend_build

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
