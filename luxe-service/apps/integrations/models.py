
from django.db import models
from django.utils.translation import gettext_lazy as _

class MaytapiConfig(models.Model):
    """
    Configuración única para la conexión con el servicio Maytapi (WhatsApp)
    """
    product_id = models.CharField(
        _('Product ID'), 
        max_length=255, 
        help_text=_('ID del producto proporcionado por Maytapi'),
        default=''
    )
    token = models.CharField(
        _('Token'), 
        max_length=255, 
        help_text=_('Token de acceso a la API'),
        default=''
    )
    api_url = models.URLField(
        _('API URL'), 
        max_length=500, 
        help_text=_('Endpoint base de la API de Maytapi'),
        default='https://api.maytapi.com/api/'
    )
    phone_id = models.CharField(
        _('Phone ID'), 
        max_length=100, 
        help_text=_('ID del teléfono configurado'),
        blank=True, 
        null=True
    )
    is_active = models.BooleanField(
        _('Activo'), 
        default=True,
        help_text=_('Activar o desactivar el servicio de WhatsApp')
    )
    schedule_time = models.TimeField(
        _('Hora de Envío (Cron)'),
        default='09:00',
        help_text=_('Hora diaria para enviar felicitaciones de cumpleaños')
    )
    birthday_message_template = models.TextField(
        _('Plantilla Mensaje Cumpleaños'),
        default="¡Feliz cumpleaños {name}! 🎉 En Luxe queremos celebrar contigo. Visítanos hoy y recibe un regalo especial de la casa. ¡Te esperamos!",
        help_text=_('Usa {name} para insertar el nombre del cliente.')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Configuración Maytapi')
        verbose_name_plural = _('Configuraciones Maytapi')

    def __str__(self):
        return f"Configuración Maytapi ({self.product_id})"

    def save(self, *args, **kwargs):
        # Garantizar que solo exista una configuración activa
        if not self.pk and MaytapiConfig.objects.exists():
            # Si ya existe, actualizamos el primero en lugar de crear uno nuevo
            existing = MaytapiConfig.objects.first()
            existing.product_id = self.product_id
            existing.token = self.token
            existing.api_url = self.api_url
            existing.phone_id = self.phone_id
            existing.is_active = self.is_active
            existing.schedule_time = self.schedule_time
            existing.birthday_message_template = self.birthday_message_template
            existing.save()
            return existing
        return super(MaytapiConfig, self).save(*args, **kwargs)

class WhatsAppLog(models.Model):
    """
    Log de mensajes enviados por WhatsApp
    """
    TYPE_CHOICES = [
        ('TEST', 'Prueba'),
        ('BIRTHDAY', 'Cumpleaños'),
        ('OTHER', 'Otro'),
    ]

    phone_number = models.CharField(_('Teléfono'), max_length=20)
    message = models.TextField(_('Mensaje'))
    message_type = models.CharField(_('Tipo'), max_length=20, choices=TYPE_CHOICES, default='OTHER')
    status = models.CharField(_('Estado'), max_length=50) # 'sent', 'failed'
    response_data = models.TextField(_('Respuesta API'), blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Opcional: Relación con cliente si existe
    # Evitamos clave foránea estricta para no romper si el cliente se borra, o usamos SET_NULL
    # customer_id guardado como entero por simplicidad o ForeignKey
    # Para simplicidad ahora, solo logueamos los datos básicos.

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Log de WhatsApp')
        verbose_name_plural = _('Logs de WhatsApp')

    def __str__(self):
        return f"{self.message_type} a {self.phone_number} - {self.status}"
