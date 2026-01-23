# 📱 LUXE WhatsApp - Baileys (Optimizado)

## 🚀 Cambios vs WPPConnect

| Característica | WPPConnect (anterior) | Baileys (actual) |
|----------------|----------------------|------------------|
| **Tamaño imagen** | 2.62 GB | ~250 MB |
| **RAM** | ~140 MB | ~50-80 MB |
| **Chromium** | ✅ Sí (pesado) | ❌ No necesita |
| **Tipo conexión** | Puppeteer → WhatsApp Web | Directo a WhatsApp |

---

## 🔧 Configuración

### Variables de entorno
```yaml
environment:
  - PORT=21465
  - SECRET_KEY=luxe_wpp_secret
  - TZ=America/Guayaquil
```

### Volumen de autenticación
Las credenciales de WhatsApp se persisten en el volumen `whatsapp-auth`.

---

## 📋 API Endpoints

### Estado y Conexión

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | Estado de conexión |
| GET | `/api/qr` | Obtener QR en Base64 |
| GET | `/api/qr/page` | Página web para escanear QR |
| GET | `/api/:session/status-session` | Compatibilidad WPPConnect |

### Envío de Mensajes

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| POST | `/api/send-message` | `{phone, message}` | Enviar texto |
| POST | `/api/:session/send-message` | `{phone, message, isGroup}` | Compatibilidad WPPConnect |
| POST | `/api/send-image` | `{phone, imageUrl, caption}` | Enviar imagen |

### Sesión

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/:session/:secret/generate-token` | Generar token |
| POST | `/api/:session/start-session` | Iniciar sesión |
| POST | `/api/logout` | Cerrar sesión |

---

## 🔗 Conectar WhatsApp

### Opción 1: Página Web (Recomendado)
1. Abre en tu navegador: `http://localhost:21465/api/qr/page`
2. Escanea el QR con WhatsApp
3. La página se actualizará automáticamente cuando conectes

### Opción 2: Terminal
El QR también aparece en los logs del contenedor:
```bash
docker logs luxe_whatsapp
```

---

## 🧪 Probar Envío de Mensaje

```bash
curl -X POST http://localhost:21465/api/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer luxe_wpp_secret" \
  -d '{"phone": "0991234567", "message": "Hola desde Luxe!"}'
```

---

## 📊 Verificar Estado

```bash
curl http://localhost:21465/api/status
```

Respuesta:
```json
{
  "status": "connected",
  "connected": true,
  "hasQR": false,
  "messagesSent": 5,
  "uptime": 3600
}
```

---

## 🔄 Comandos Útiles

```bash
# Ver logs
docker logs luxe_whatsapp --tail 50 -f

# Reiniciar servicio
docker compose restart whatsapp

# Reconstruir imagen (después de cambios)
docker compose build whatsapp
docker compose up -d whatsapp
```

---

## ⚠️ Solución de Problemas

### El QR no aparece
- Espera unos segundos, Baileys necesita conectar con WhatsApp
- Revisa los logs: `docker logs luxe_whatsapp`

### Sesión desconectada
- Ve a `/api/qr/page` y escanea nuevamente
- Las credenciales se guardan, normalmente reconecta automáticamente

### "WhatsApp no conectado"
- Verifica que el contenedor esté corriendo: `docker compose ps`
- Escanea el QR de nuevo

---

## 🎯 Integración con Automation Service

El automation-service usa esta URL internamente:
```
http://luxe_whatsapp:21465/api/{session}/send-message
```

**No necesitas cambiar nada en automation-service**, la API es 100% compatible.
