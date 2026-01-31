FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 8000

# Recolectar estáticos para WhiteNoise
RUN python manage.py collectstatic --noinput

# Comando por defecto
CMD ["gunicorn", "luxe_service.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]