from django.db import models
from django.utils import timezone

class WhatsAppSettings(models.Model):
    """
    Singleton model to store WhatsApp Automation Configuration.
    ISO 25010: Usability & Modifiability (User can change logic without code deploy)
    """
    is_active = models.BooleanField(default=True, verbose_name="Automatización Activa")
    
    # Scheduler
    schedule_time = models.TimeField(default="09:00", verbose_name="Hora de Envío Diario")
    
    # Session
    session_name = models.CharField(max_length=50, default="luxe_session", verbose_name="Nombre de Sesión (WPPConnect)")
    phone_number_sender = models.CharField(max_length=20, default="default", help_text="Referencia del número emisor")

    # Message Template
    birthday_message_template = models.TextField(
        verbose_name="Plantilla de Mensaje de Cumpleaños",
        default="🎉 ¡Feliz Cumpleaños {first_name}! 🎂\nEn Luxe queremos celebrar contigo.\n🎁 Tienes un 10% DE DESCUENTO en tu próxima compra.\n¡Te esperamos!",
        help_text="Usa {first_name}, {last_name} para personalizar."
    )
    
    # Status (Updated by the external service or check)
    last_run = models.DateTimeField(null=True, blank=True, verbose_name="Última Ejecución")
    status_log = models.TextField(blank=True, verbose_name="Log de Estado")

    class Meta:
        verbose_name = "Configuración WhatsApp"
        verbose_name_plural = "Configuraciones WhatsApp"

    def save(self, *args, **kwargs):
        if not self.pk and WhatsAppSettings.objects.exists():
            # Force singleton: update the existing one instead of creating new
            return WhatsAppSettings.objects.first().save(*args, **kwargs)
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Configuración (Activa: {self.is_active}) - Hora: {self.schedule_time}"
