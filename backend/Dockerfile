# Dockerfile pour Wisherr Backend (FastAPI)
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
COPY .env.example .
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
