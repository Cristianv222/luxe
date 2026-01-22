from pathlib import Path
import os
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY', default='django-insecure-automation-service-iso25010')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third Party
    'rest_framework',
    # Local Apps
    'apps.whatsapp_bot',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'automation_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'automation_service.wsgi.application'

# Database - ISO 25010: Modularity (Separate DBs)
# We need 'default' for this service's own data (logs, schedules)
# And 'luxe_db' to read Customer data (Integration)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='automation_service_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='postgres'),
        'PORT': config('DB_PORT', default='5432'),
    },
    'luxe_db': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('LUXE_DB_NAME', default='luxe_service_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='postgres'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Database Routers to handle the multi-db access
DATABASE_ROUTERS = ['automation_service.db_routers.LuxeServiceRouter']


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# WhatsApp Configuration (Modular Strategy)
# To use your number 0994712899, you must run a WhatsApp Gateway (like local WppConnect or use a service)
# For now, we keep 'console' for testing until you provide the Gateway URL.
WHATSAPP_PROVIDER = config('WHATSAPP_PROVIDER', default='console') # Options: 'console', 'rest_api'
WHATSAPP_API_URL = config('WHATSAPP_API_URL', default='http://localhost:3000/api/sendText')
WHATSAPP_API_TOKEN = config('WHATSAPP_API_TOKEN', default='')

