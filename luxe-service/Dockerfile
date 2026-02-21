# ============================================================
# STAGE 1: Builder — instala dependencias y compila wheels
# ============================================================
FROM python:3.11-alpine3.19 AS builder

RUN apk add --no-cache \
    bash \
    gcc \
    g++ \
    musl-dev \
    postgresql-dev \
    libffi-dev \
    openssl-dev \
    make

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# ============================================================
# STAGE 2: Production — imagen mínima sin herramientas de build
# ============================================================
FROM python:3.11-alpine3.19 AS production

# Dependencias mínimas de runtime
# tini: maneja señales del OS correctamente como PID 1,
#       evita procesos zombie si gunicorn falla
RUN apk add --no-cache \
    bash \
    postgresql-libs \
    libffi \
    openssl \
    curl \
    tini

# Root deshabilitado: nadie puede hacer 'su root' ni login como root
RUN passwd -l root

# Usuario sin privilegios ANTES de copiar archivos
# UID/GID fijos (1001) para consistencia con volúmenes del host
# Shell /sbin/nologin impide login interactivo al usuario
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup -s /sbin/nologin

WORKDIR /app

# Copiar paquetes instalados desde el builder
COPY --from=builder /install /usr/local

# Crear directorios con permisos correctos (NO 777)
RUN mkdir -p /app/logs /app/staticfiles /app/media && \
    chown -R appuser:appgroup /app && \
    chmod -R 750 /app

# Copiar código fuente (propiedad del usuario sin privilegios)
COPY --chown=appuser:appgroup . .

# Eliminar archivos que no deben estar en producción:
# tests, bytecode compilado, .git, etc.
# Reduce superficie de ataque y tamaño de imagen
RUN find /app -name "*.pyc" -delete 2>/dev/null; \
    find /app -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null; \
    find /app -name ".git" -type d -exec rm -rf {} + 2>/dev/null; \
    find /app -name "tests" -type d -exec rm -rf {} + 2>/dev/null; \
    find /app -name "test_*.py" -delete 2>/dev/null; true

USER appuser

EXPOSE 8000

# tini como ENTRYPOINT (PID 1 correcto)
ENTRYPOINT ["/sbin/tini", "--"]

# CMD es el fallback; en producción docker-compose.prod.yml sobreescribe este CMD
# con migrate + collectstatic + gunicorn para garantizar el orden correcto.
#
# Gunicorn con opciones de seguridad:
#   --max-requests 1000       → reinicia workers cada 1000 req (previene memory leaks)
#   --max-requests-jitter 100 → variación aleatoria para no reiniciar todos a la vez
#   --limit-request-line 4094 → rechaza URLs anormalmente largas (ataque HTTP)
#   --limit-request-fields 100→ limita número de headers HTTP
#   --access-logfile - y --error-logfile - → logs a stdout/stderr (capturados por Docker)
CMD ["sh", "-c", \
     "python manage.py migrate --noinput && \
      python manage.py collectstatic --noinput && \
      exec gunicorn \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --timeout 120 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --limit-request-line 4094 \
        --limit-request-fields 100 \
        --access-logfile - \
        --error-logfile - \
        luxe_service.wsgi:application"]