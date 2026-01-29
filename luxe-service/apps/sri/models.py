from django.db import models
from django.utils import timezone
import uuid

class SRIConfiguration(models.Model):
    """Configuración para la integración con API VENDO (SRI)"""
    id = models.AutoField(primary_key=True)
    
    # Credenciales API VENDO
    api_url = models.URLField(
        default='https://apivendo.fronteratech.ec/api/sri/documents/create_and_process_invoice_complete/',
        verbose_name='URL API Facturación'
    )
    auth_token = models.CharField(
        max_length=255,
        verbose_name='Token VSR / Auth Token',
        help_text='Token proporcionado por FronteraTech (ej: vsr_...)'
    )
    
    # Configuración de comportamiento
    is_active = models.BooleanField(default=True, verbose_name='Integración Activa')
    environment = models.CharField(
        max_length=20,
        choices=[('TEST', 'Pruebas'), ('PRODUCTION', 'Producción')],
        default='TEST',
        verbose_name='Ambiente'
    )
    
    # Configuración de Empresa (Opcional si se usa Token Personal, obligatorio si no es VSR)
    company_id = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name='ID de Empresa (API)',
        help_text='Requerido solo si no se usa un Token VSR que autodetecta la empresa'
    )
    
    # Impuestos por defecto
    default_vat_code = models.CharField(
        max_length=5, 
        default='2',
        verbose_name='Código IVA Default',
        help_text='2=12%, 3=14%, 4=15%, 5=5%'
    )
    
    auto_invoice = models.BooleanField(
        default=False,
        verbose_name='Facturar Automáticamente',
        help_text='Emitir factura automáticamente al completar una orden'
    )

    class Meta:
        verbose_name = 'Configuración SRI'
        verbose_name_plural = 'Configuración SRI'

    def __str__(self):
        return f"Configuración SRI ({self.get_environment_display()})"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        SRIConfiguration.objects.exclude(pk=1).delete()

    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class SRIDocument(models.Model):
    """Registro de documentos electrónicos emitidos"""
    DOCUMENT_TYPES = [
        ('invoice', 'Factura'),
        ('credit_note', 'Nota de Crédito'),
        ('debit_note', 'Nota de Débito'),
        ('remission_guide', 'Guía de Remisión'),
    ]
    
    STATUS_CHOICES = [
        ('DRAFT', 'Borrador'),
        ('GENERATED', 'XML Generado'),
        ('SIGNED', 'Firmado'),
        ('SENT', 'Enviado'),
        ('AUTHORIZED', 'Autorizado'),
        ('REJECTED', 'Rechazado'),
        ('FAILED', 'Fallido'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relación con la orden
    order = models.OneToOneField(
        'orders.Order', 
        on_delete=models.PROTECT, 
        related_name='sri_document',
        verbose_name='Orden'
    )
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='invoice')
    
    # Datos retornados por la API
    external_id = models.IntegerField(null=True, blank=True, verbose_name='ID Externo (API)')
    sri_number = models.CharField(max_length=50, blank=True, verbose_name='Número de Documento', help_text='001-001-000000001')
    access_key = models.CharField(max_length=49, blank=True, verbose_name='Clave de Acceso')
    authorization_date = models.DateTimeField(null=True, blank=True, verbose_name='Fecha Autorización')
    
    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    error_message = models.TextField(blank=True, verbose_name='Mensaje de Error')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # JSON completo de respuesta para debug
    api_response = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Documento Electrónico'
        verbose_name_plural = 'Documentos Electrónicos'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sri_number or 'Pendiente'} - {self.get_status_display()}"

