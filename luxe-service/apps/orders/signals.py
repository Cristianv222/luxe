from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver
from django.db import models
from .models import Order, OrderItem
import logging

logger = logging.getLogger(__name__)

def update_customer_stats(customer):
    """
    Helper para recalcular estadísticas del cliente
    """
    try:
        # Usamos agregación para mayor precisión
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
    except Exception as e:
        logger.error(f"Error Helper update_customer_stats {customer.id}: {str(e)}")

@receiver(post_save, sender=Order)
def update_customer_stats_on_order_save(sender, instance, created, **kwargs):
    """
    Actualiza las estadísticas del cliente cuando una orden se marca como pagada.
    """
    if instance.customer and instance.payment_status == 'paid':
        update_customer_stats(instance.customer)

@receiver(post_delete, sender=Order)
def update_customer_stats_on_order_delete(sender, instance, **kwargs):
    """
    Actualiza las estadísticas del cliente cuando se ELIMINA una orden.
    """
    if instance.customer:
        update_customer_stats(instance.customer)

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


@receiver(pre_delete, sender=Order)
def delete_related_payments(sender, instance, **kwargs):
    """
    Eliminar pagos antes de borrar la orden para evitar ProtectedError
    ya que la relación es PROTECT en la base de datos.
    """
    try:
        # 1. Eliminar dependencias de pagos (Reembolsos protegen a Pagos)
        if hasattr(instance, 'payments'):
             payments = instance.payments.all()
             for payment in payments:
                 # Eliminar reembolsos asociados al pago
                 if hasattr(payment, 'refunds'):
                     payment.refunds.all().delete()
                 # Eliminar split_payments si existen
                 if hasattr(payment, 'splits'):
                     payment.splits.all().delete()
             
             # Ahora sí eliminar los pagos
             payments.delete()
             logger.info(f"Pagos y sus dependencias eliminados para orden {instance.id}.")
        
        # 2. Eliminar Documento SRI (PROTECT)
        try:
             # Acceso directo para evitar problemas con hasattr en OneToOne inverso
             if instance.sri_document:
                 instance.sri_document.delete()
                 logger.info(f"Documento SRI eliminado para orden {instance.id} antes de borrado.")
        except Exception:
             # Si no existe (ObjectDoesNotExist) o falla, continuamos
             pass

    except Exception as e:
        logger.error(f"Error preparando borrado de orden {instance.id}: {e}")

