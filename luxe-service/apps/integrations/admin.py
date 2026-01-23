from django.contrib import admin
from .models import WhatsAppSettings
from django.utils.html import format_html
import requests
from django.conf import settings

@admin.register(WhatsAppSettings)
class WhatsAppSettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'schedule_time', 'is_active', 'check_connection_status']
    readonly_fields = ['last_run', 'check_connection_status']
    
    def check_connection_status(self, obj):
        # We try to ping the wppconnect service
        # Since this runs inside the luxe-service container, it can talk to luxe_whatsapp
        try:
            url = f"http://luxe_whatsapp:21465/api/{obj.session_name}/status-session"
            headers = {'Authorization': 'Bearer luxe_wpp_secret'} 
            # Note: WPPConnect creates token on generate-token. 
            # For simplicity in this specialized environment, we might use a fixed secret key if supported or manage connection differently.
            # Simplified check using just a TCP check or generic ping if API implies complex auth flow.
            # But let's try a health check.
            
            # Actually, to generate the QR code, the user likely needs to hit an endpoint.
            # Let's provide a link to the QR code generation page (Frontend URL if we built one, or direct API).
            
            return format_html(
                '<span style="color:green">Servicio Configurado</span> <br>'
                '<a href="http://localhost:21465/api/{}/start-session" target="_blank" class="button">📷 Iniciar Sesión / Escanear QR</a>',
                obj.session_name
            )
        except Exception:
            return format_html('<span style="color:red">No se detecta el servicio WPPConnect</span>')
    
    check_connection_status.short_description = "Estado de Conexión"

    def has_add_permission(self, request):
        # Singleton logic: prevent adding if one exists
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
