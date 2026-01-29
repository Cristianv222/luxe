from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

class LoyaltyProgramConfig(models.Model):
    """
    Configuración global del programa de fidelidad.
    """
    is_active = models.BooleanField(
        default=True, 
        verbose_name=_("Programa Activo"),
        help_text=_("Activar o desactivar todo el sistema de fidelidad.")
    )
    name = models.CharField(
        max_length=100, 
        default="Programa de Recompensas", 
        verbose_name=_("Nombre del Programa")
    )
    
    class Meta:
        verbose_name = _("Configuración del Programa")
        verbose_name_plural = _("Configuración del Programa")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk and LoyaltyProgramConfig.objects.exists():
            raise ValidationError("Solo puede existir una configuración activa.")
        return super().save(*args, **kwargs)


class EarningRuleType(models.Model):
    """
    Tipos de reglas de obtención de puntos definidos dinámicamente.
    """
    name = models.CharField(max_length=100, verbose_name=_("Nombre del Tipo"))
    code = models.SlugField(max_length=50, unique=True, verbose_name=_("Código Interno"))
    description = models.TextField(blank=True, verbose_name=_("Descripción"))
    is_active = models.BooleanField(default=True, verbose_name=_("Activo"))

    class Meta:
        verbose_name = _("Tipo de Regla de Obtención")
        verbose_name_plural = _("Tipos de Reglas de Obtención")

    def __str__(self):
        return self.name


class EarningRule(models.Model):
    """
    Reglas para ganar puntos.
    Ej: Por cada $10 gastados, ganas 1 punto.
    O: Si la factura es > $50, ganas 10 puntos fijos.
    """
    # EARNING_TYPES removed in favor of EarningRuleType model

    name = models.CharField(max_length=100, verbose_name=_("Nombre de la Regla"))
    rule_type = models.ForeignKey(
        EarningRuleType,
        on_delete=models.PROTECT,
        verbose_name=_("Tipo de Regla"),
        null=True, # Temporarily null for migration
        blank=True
    )
    # rule_type = models.CharField(max_length=50, null=True, blank=True)
    min_order_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name=_("Valor Mínimo de Compra"),
        help_text=_("Monto mínimo para que aplique esta regla.")
    )
    points_to_award = models.IntegerField(
        verbose_name=_("Puntos a Otorgar"),
        help_text=_("Puntos que se ganan por cada unidad de monto o fijos.")
    )
    amount_step = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name=_("Monto Paso (para 'Por monto')"),
        help_text=_("Ej: Cada $10. Si es nulo se asume el total.")
    )
    
    ORDER_SOURCE_CHOICES = [
        ('ALL', 'Todos los Canales'),
        ('WEB', 'Web / Delivery'),
        ('POS', 'Local / POS'),
    ]
    order_source = models.CharField(
        max_length=10,
        choices=ORDER_SOURCE_CHOICES,
        default='ALL',
        verbose_name=_("Canal de Venta"),
        help_text=_("Aplica esta regla solo a órdenes de este canal.")
    )

    is_active = models.BooleanField(default=True, verbose_name=_("Activa"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Regla de Obtención de Puntos")
        verbose_name_plural = _("Reglas de Obtención de Puntos")

    def __str__(self):
        type_name = self.rule_type.name if self.rule_type else "Sin Asignar"
        return f"{self.name} ({type_name})"


class RewardRule(models.Model):
    """
    Reglas para recompensas (Cupones).
    Ej: A los 100 puntos, obtienes $5 de descuento.
    """
    REWARD_TYPES = (
        ('FIXED_AMOUNT', _('Descuento Monto Fijo')),
        ('PERCENTAGE', _('Descuento Porcentaje')),
        # ('FREE_PRODUCT', _('Producto Gratis')), # Futura expansión
    )

    name = models.CharField(max_length=100, verbose_name=_("Nombre de la Recompensa"))
    points_cost = models.IntegerField(
        verbose_name=_("Costo en Puntos"),
        help_text=_("Puntos necesarios para canjear o activar esta recompensa.")
    )
    reward_type = models.CharField(
        max_length=20, 
        choices=REWARD_TYPES, 
        default='FIXED_AMOUNT',
        verbose_name=_("Tipo de Recompensa")
    )
    discount_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name=_("Valor del Descuento"),
        help_text=_("Monto en $ o Porcentaje (0-100).")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Activa"))
    is_birthday_reward = models.BooleanField(
        default=False, 
        verbose_name=_("Es regalo de cumpleaños"),
        help_text=_("Si es True, este cupón se habilita gratis el día del cumpleaños del cliente.")
    )
    
    # Auto-apply logic?
    auto_redeem_threshold = models.BooleanField(
        default=False, 
        verbose_name=_("Canje Automático"),
        help_text=_("Si es True, se genera el cupón automáticamente al llegar a los puntos.")
    )

    class Meta:
        verbose_name = _("Regla de Recompensa (Cupón)")
        verbose_name_plural = _("Reglas de Recompensas")

    def __str__(self):
        return f"{self.name} - {self.points_cost} pts"


class LoyaltyAccount(models.Model):
    """
    Cuenta de fidelidad del usuario.
    """
    # Assuming User model is generic settings.AUTH_USER_MODEL or related to Customer
    # The user mentioned "connect to customers", let's verify if there is a Customer app.
    # checking file list: yes 'apps.customers'. 
    # Usually better to link to User if auth is handled that way, or Customer profile.
    # Given 'luxe-service' settings, it uses 'core.authentication.CustomJWTAuthentication', 
    # so standard user model or custom one. I'll use settings.AUTH_USER_MODEL for now 
    # as a OneToOne, or link to Customer if that's the primary entity.
    # User said "conectado obviamente a los clientes".
    
    # I will link to User (which maps to Customer usually).
    customer = models.OneToOneField(
        'customers.Customer', 
        on_delete=models.CASCADE, 
        related_name='loyalty_account',
        verbose_name=_("Cliente")
    )
    points_balance = models.IntegerField(default=0, verbose_name=_("Puntos Actuales"))
    total_points_earned = models.IntegerField(default=0, verbose_name=_("Total Puntos Ganados Histórico"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Cuenta de Fidelidad")
        verbose_name_plural = _("Cuentas de Fidelidad")

    def __str__(self):
        return f"Fidelidad: {self.customer} - {self.points_balance} pts"


class PointTransaction(models.Model):
    """
    Historial de puntos (entradas y salidas).
    """
    TRANSACTION_TYPES = (
        ('EARN', _('Ganancia por Compra')),
        ('REDEEM', _('Canje de Recompensa')),
        ('ADJUSTMENT', _('Ajuste Manual')),
        ('EXPIRATION', _('Expiración')),
        ('REFUND', _('Reembolso/Devolución')),
    )

    account = models.ForeignKey(
        LoyaltyAccount, 
        on_delete=models.CASCADE, 
        related_name='transactions',
        verbose_name=_("Cuenta")
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    points = models.IntegerField(verbose_name=_("Puntos"), help_text=_("Positivo o negativo"))
    description = models.CharField(max_length=255, verbose_name=_("Descripción"))
    related_order_id = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name=_("ID Orden Relacionada")
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Transacción de Puntos")
        verbose_name_plural = _("Transacciones de Puntos")
        ordering = ['-created_at']


class UserCoupon(models.Model):
    """
    Cupones generados para el usuario.
    """
    customer = models.ForeignKey(
        'customers.Customer', 
        on_delete=models.CASCADE, 
        related_name='loyalty_coupons'
    )
    reward_rule = models.ForeignKey(
        RewardRule, 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name=_("Regla de Origen")
    )
    code = models.CharField(max_length=50, unique=True, verbose_name=_("Código"))
    is_used = models.BooleanField(default=False, verbose_name=_("Usado"))
    used_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Fecha de Uso"))
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Expira"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Cupón de Usuario")
        verbose_name_plural = _("Cupones de Usuario")

    def __str__(self):
        return f"{self.code} ({self.user})"

