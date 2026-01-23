from django.db import models

class RemoteCustomer(models.Model):
    """
    ISO 25010: Interoperability
    Mirror model of apps.customers.Customer in luxe-service.
    Managed = False ensures we don't try to create tables, just read them.
    """
    # UUID is the PK in the original model
    id = models.UUIDField(primary_key=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    birth_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Flag for the Router
    use_luxe_db = True

    class Meta:
        managed = False
        db_table = 'customers_customer' # Actual table name in Postgres
        verbose_name = 'Cliente Remoto (Luxe)'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class RemoteWhatsAppSettings(models.Model):
    """
    Mirror of integrations_whatsappsettings in luxe-service.
    Allows accessing WhatsApp session configuration.
    """
    session_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    use_luxe_db = True

    class Meta:
        managed = False
        db_table = 'integrations_whatsappsettings'
        verbose_name = 'Configuración WhatsApp Remota'

    def __str__(self):
        return self.session_name

class BirthdaySentHistory(models.Model):
    """
    Tracks messages successfully sent to customers.
    This table lives in the automation_service_db.
    """
    customer_id = models.UUIDField()
    customer_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='sent')
    message = models.TextField()

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Historial de Envío'

    def __str__(self):
        return f"{self.customer_name} - {self.sent_at.strftime('%Y-%m-%d')}"


class RemoteMessageHistory(models.Model):
    """
    Mirror mirror of integrations_messagehistory in luxe-service.
    Used for centralized logging.
    """
    phone = models.CharField(max_length=20)
    message = models.TextField()
    message_type = models.CharField(max_length=20, default='birthday')
    status = models.CharField(max_length=20, default='sent')
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    sent_at = models.DateTimeField()
    error_message = models.TextField(blank=True, null=True)

    # Flag for the Router
    use_luxe_db = True

    class Meta:
        managed = False
        db_table = 'integrations_messagehistory'

    def __str__(self):
        return f"{self.phone} - {self.message_type}"
