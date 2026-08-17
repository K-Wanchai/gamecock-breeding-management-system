# Production image: Django app served by Gunicorn behind a reverse proxy.
# migrate/collectstatic are run as separate commands (see docker-compose.yml /
# README "Deployment"), not baked into image build, so they run against
# whatever DB/env the container is actually deployed with.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libpq for psycopg (PostgreSQL), fonts-thai-tlwg so generated PDFs render Thai
# text correctly instead of silently falling back to boxes (see CLAUDE.md
# STEP8 "Thai font gotcha").
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 fonts-thai-tlwg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN useradd --create-home appuser \
    && mkdir -p /app/logs /app/staticfiles /app/media \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
