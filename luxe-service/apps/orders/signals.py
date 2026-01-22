from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db import models
from .models import Order, OrderItem
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def update_customer_stats_on_order_save(sender, instance, created, **kwargs):
    """
    Actualiza las estadísticas del cliente cuando una orden se marca como pagada.
    """
    if instance.customer and instance.payment_status == 'paid':
        try:
            customer = instance.customer
            # Usamos agregación para mayor precisión y para corregir posibles desincronizaciones previas
            paid_orders = customer.orders.filter(payment_status='paid')
            
            stats = paid_orders.aggregate(
                total_amnt=models.Sum('total'),
                order_count=models.Count('id'),
                last_date=models.Max('created_at')
            )
            
            customer.total_spent = stats['total_amnt'] or 0
            customer.total_orders = stats['order_count'] or 0
            customer.last_order_date = stats['last_date']
            
            if customer.total_orders > 0:
                customer.average_order_value = customer.total_spent / customer.total_orders
            else:
                customer.average_order_value = 0
            
            customer.save(update_fields=[
                'total_spent', 'total_orders', 'last_order_date', 'average_order_value'
            ])
            
            # También actualizar puntos de lealtad si existe el método
            if hasattr(customer, 'calculate_loyalty_points'):
                # Si hay sistema de lealtad, podrías actualizarlo aquí o dejarlo para otro signal
                pass
                
        except Exception as e:
            logger.error(f"Error actualizando stats de cliente {instance.customer.id}: {str(e)}")

@receiver(post_delete, sender=OrderItem)
def restore_stock_on_delete(sender, instance, **kwargs):
    """
    Restaura el stock cuando se elimina un item de orden.
    """
    try:
        # Verificar si el producto rastrea stock
        if instance.product and instance.product.track_stock:
            product = instance.product
            
            # Incrementar el stock
            old_stock = product.stock_quantity
            product.stock_quantity += instance.quantity
            product.save()
            
            logger.info(
                f"Stock restaurado por eliminación de orden/ item: "
                f"Producto '{product.name}' ({product.id}) "
                f"Stock: {old_stock} -> {product.stock_quantity} "
                f"(+{instance.quantity})"
            )
            
    except Exception as e:
        logger.error(f"Error al restaurar stock para item eliminado {instance.id}: {str(e)}")
