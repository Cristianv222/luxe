from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order
from .services import LoyaltyService

@receiver(post_save, sender=Order)
def award_points_on_payment(sender, instance, created, **kwargs):
    """
    Escucha cambios en la orden. Si el pago es completado (paid),
    otorga puntos.
    """
    # Check if payment_status is 'paid'
    if instance.payment_status == 'paid':
        # La lógica de award_points_for_order revisa si ya se dieron puntos
        # para evitar duplicados.
        LoyaltyService.award_points_for_order(instance)
