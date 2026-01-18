# Luxe

Sistema de gestion empresarial integrado.

## Arquitectura

Este proyecto utiliza una arquitectura de microservicios con Docker:

- **auth-service**: Autenticacion y autorizacion centralizada
- **luxe-service**: Gestion principal del negocio (anteriormente fast-food)
- **frontend**: Aplicacion React

## Requisitos

- Docker
- Docker Compose

## Instalacion

1. Clonar el repositorio
2. Levantar los servicios:
```bash
docker-compose up -d --build
```

3. El sistema estará disponible en:
- **Frontend**: http://localhost:3000
- **Gateway (Nginx)**: http://localhost:8080

## Acceso

- **Frontend**: http://localhost:3000
- **Luxe Admin**: http://localhost:8080/luxe/admin
- **Auth Service**: Interno

## Licencia

Propietario
