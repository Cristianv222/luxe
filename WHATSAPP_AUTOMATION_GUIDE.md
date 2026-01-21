# 🎂 Sistema de Automatización de Cumpleaños - WhatsApp

## 📋 **Resumen del Sistema**

Has implementado exitosamente un sistema de automatización de mensajes de cumpleaños que:
- ✅ Detecta automáticamente clientes con cumpleaños
- ✅ Envía mensajes personalizados vía WhatsApp desde tu número (0994712899)
- ✅ Se puede configurar desde el panel de administración de Django
- ✅ Es completamente GRATIS y autohospedado

---

## 🚀 **Guía de Configuración Inicial**

### **Paso 1: Vincula tu WhatsApp con WPPConnect**

1. **Abre tu navegador** y ve a:
   ```
   http://localhost:21465
   ```

2. **Genera un Token** (primera vez):
   - Endpoint: `http://localhost:21465/api/luxe_session/generate-token`
   - Secret Key: `luxe_wpp_secret`
   - Método: POST
   - O simplemente haz clic en el botón del Admin que creamos.

3. **Inicia la Sesión de WhatsApp**:
   - Ve a: `http://localhost:21465/api/luxe_session/start-session`
   - Verás un **código QR en pantalla**
   - **Escanea el QR** con tu WhatsApp (tu número 0994712899):
     - Abre WhatsApp en tu celular
     - Ve a **Configuración > Dispositivos Vinculados**
     - Toca **"Vincular un dispositivo"**
     - Escanea el QR que aparece en la pantalla

4. **¡Listo!** Tu WhatsApp quedará vinculado al servidor y podrás enviar mensajes automáticamente.

---

### **Paso 2: Configura el Sistema desde Django Admin**

1. **Accede al Admin de Luxe Service**:
   ```
   http://localhost:8000/admin/
   ```

2. **Ve a la sección "Integraciones"**:
   - Busca **"Configuración WhatsApp"**
   - Si no existe, crea una nueva configuración

3. **Configura los parámetros**:
   
   | Campo | Valor por Defecto | Descripción |
   |-------|-------------------|-------------|
   | **Automatización Activa** | ✅ | Activa/desactiva el envío automático |
   | **Hora de Envío Diario** | 09:00 | Hora a la que se ejecutará el chequeo |
   | **Nombre de Sesión** | luxe_session | Identificador de la sesión de WhatsApp |
   | **Plantilla de Mensaje** | Ver abajo | Mensaje que se enviará a los clientes |

   **Plantilla de Mensaje por Defecto:**
   ```
   🎉 ¡Feliz Cumpleaños {first_name}! 🎂
   En Luxe queremos celebrar contigo.
   🎁 Tienes un 10% DE DESCUENTO en tu próxima compra.
   ¡Te esperamos!
   ```
   
   > **Nota:** Puedes usar `{first_name}` y `{last_name}` para personalizar.

4. **Verifica la Conexión**:
   - En el Admin, verás un botón: **"📷 Iniciar Sesión / Escanear QR"**
   - Haz clic para abrir la interfaz de WPPConnect
   - Verifica que el estado diga "CONNECTED"

---

## 🧪 **Prueba el Sistema Manualmente**

Antes de configurar la automatización, prueba que todo funcione:

1. **Crea un Cliente de Prueba** con cumpleaños de hoy:
   - Ve a `http://localhost:8000/admin/customers/customer/`
   - Crea un cliente con:
     - `birth_date`: **21 de enero** (o la fecha actual)
     - `phone`: Tu número de prueba (ej. 0987654321)
     - `is_active`: ✅

2. **Ejecuta el Comando Manualmente**:
   ```powershell
   docker exec -it luxe_automation python manage.py send_birthday_wishes
   ```

3. **Verifica el Resultado**:
   - Deberías ver en la consola:
     ```
     🔍 Checking birthdays for: 21/01
     📤 Sending to Juan Pérez...
     ✅ Sent to Juan Pérez
     ✨ Completed. Sent 1 messages.
     ```
   - **Revisa tu WhatsApp**: El número de prueba debería recibir el mensaje.

---

## ⏰ **Automatización Diaria (Cron)**

Para que el sistema se ejecute automáticamente a las 9:00 AM todos los días:

### **Opción 1: Usar Windows Task Scheduler**

1. Abre **Programador de Tareas** de Windows
2. Crea una nueva tarea:
   - **Nombre**: Luxe WhatsApp Birthday Bot
   - **Desencadenador**: Diario a las 09:00
   - **Acción**: Ejecutar programa
     - Programa: `docker`
     - Argumentos: `exec luxe_automation python manage.py send_birthday_wishes`
     - Iniciar en: `c:\Users\HP\Documents\GitHub\luxe`

### **Opción 2: Script PowerShell con Loop**

Crea un archivo `birthday_scheduler.ps1`:

```powershell
while ($true) {
    $now = Get-Date
    if ($now.Hour -eq 9 -and $now.Minute -eq 0) {
        docker exec luxe_automation python manage.py send_birthday_wishes
        Start-Sleep -Seconds 3600  # Espera 1 hora para no ejecutar múltiples veces
    }
    Start-Sleep -Seconds 60  # Chequea cada minuto
}
```

Ejecuta este script en segundo plano.

### **Opción 3: Agregar Celery Beat al `automation-service`**

(Más complejo pero más robusto - te puedo ayudar con esto si lo prefieres)

---

## 🔧 **Comandos Útiles**

### Verificar Logs de WPPConnect
```powershell
docker logs luxe_wppconnect --tail 50 --follow
```

### Verificar Logs del Automation Service
```powershell
docker logs luxe_automation --tail 50 --follow
```

### Reiniciar WPPConnect (si se desconecta)
```powershell
docker-compose restart wppconnect
```

### Ver Estado de Todos los Contenedores
```powershell
docker-compose ps
```

---

## 🎨 **Personalización del Mensaje**

Puedes modificar el mensaje desde el Admin:

**Variables disponibles:**
- `{first_name}` - Nombre del cliente
- `{last_name}` - Apellido del cliente

**Ejemplo de mensaje alternativo:**
```
Hola {first_name} {last_name}! 🎉

Hoy es tu día especial y queremos celebrarlo contigo.

🎁 REGALO ESPECIAL: 15% DE DESCUENTO en toda la tienda
🕐 Válido por 7 días

¡Feliz Cumpleaños!
🎂 Equipo Luxe
```

---

## 📊 **Monitoreo y Logs**

El sistema guarda en el campo `status_log` del Admin:
- Última fecha de ejecución
- Número de mensajes enviados
- Errores (si los hay)

---

## ⚠️ **Solución de Problemas**

### **El mensaje no se envía**

1. **Verifica que WPPConnect esté conectado**:
   ```powershell
   docker exec luxe_wppconnect sh -c "curl http://localhost:21465/api/luxe_session/status-session"
   ```
   
2. **Revisa los logs del automation service**:
   ```powershell
   docker logs luxe_automation
   ```

3. **Asegúrate de que el formato del teléfono sea correcto**:
   - El sistema convierte automáticamente `0987654321` a `593987654321`
   - Si tienes problemas, verifica el método `format_phone()` en el código

### **WPPConnect se desconecta**

- Esto puede pasar si el servidor se reinicia
- **Solución**: Vuelve a escanear el QR code en `http://localhost:21465/api/luxe_session/start-session`

### **No encuentra cumpleaños**

- Verifica que el cliente tenga:
  - `birth_date` con DÍA y MES correctos (el año no importa)
  - `is_active = True`
  - Un número de teléfono válido

---

## 🎯 **Próximos Pasos Recomendados**

1. **✅ Probado**: Sistema básico funcionando
2. **📅 Pendiente**: Configurar automatización diaria (Cron/Task Scheduler)
3. **📈 Mejora Futura**: Dashboard con estadísticas de envíos
4. **🔔 Mejora Futura**: Notificaciones de otros eventos (aniversarios, promociones)

---

## 📞 **Soporte**

Si tienes problemas:
1. Revisa los logs de Docker
2. Verifica que todos los contenedores estén corriendo: `docker-compose ps`
3. Asegúrate de que WPPConnect esté vinculado a tu WhatsApp

---

**¡Tu sistema de automatización está listo! 🎉**
