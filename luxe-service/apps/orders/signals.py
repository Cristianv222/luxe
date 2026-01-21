from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import OrderItem
import logging

logger = logging.getLogger(__name__)

@receiver(post_delete, sender=OrderItem)
def restore_stock_on_delete(sender, instance, **kwargs):
    """
    Restaura el stock cuando se elimina un item de orden.
    Esto cubre tanto la eliminación de items individuales como la eliminación
    en cascada al borrar una orden completa.
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
