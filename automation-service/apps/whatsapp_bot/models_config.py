# Mirror model for the Automation Service
from django.db import models

class RemoteWhatsAppSettings(models.Model):
    """
    Mirror of apps.integrations.WhatsAppSettings in luxe-service.
    Reads configuration for the automation bot.
    """
    is_active = models.BooleanField(default=True)
    schedule_time = models.TimeField(default="09:00")
    session_name = models.CharField(max_length=50, default="luxe_session")
    birthday_message_template = models.TextField()
    last_run = models.DateTimeField(null=True, blank=True)

    use_luxe_db = True # Connects to luxe_service_db

    class Meta:
        managed = False
        db_table = 'integrations_whatsappsettings' # Must match luxe-service table name
        verbose_name = 'Configuración Remota (Luxe)'

    def __str__(self):
        return "Remote Config"
