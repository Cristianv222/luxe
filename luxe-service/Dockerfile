FROM python:3.11.7-slim AS builder

WORKDIR /app

# Instalar dependencias para compilar
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Etapa produccion
FROM python:3.11.7-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar wheels y paquetes compilados
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# Copiar código
COPY . .

# Comando similar a addgroup -S appgroup && adduser -S appuser -G appgroup (versión para Debian/slim)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R appuser:appgroup /app

# Asignamos el usuario sin privilegios explícitamente y lo aplicamos
USER appuser

# Exponer puerto
EXPOSE 8000

# Recolectar estáticos
RUN python manage.py collectstatic --noinput

# Comando por defecto
CMD ["gunicorn", "luxe_service.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]