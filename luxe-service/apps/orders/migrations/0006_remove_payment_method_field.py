from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_discount_code'),  # Última migración de orders
    ]

    operations = [
        # Eliminar el campo payment_method de la tabla orders_order
        # Este campo no debería existir en el modelo Order
        migrations.RunSQL(
            sql='ALTER TABLE orders_order DROP COLUMN IF EXISTS payment_method_id;',
            reverse_sql='-- No reverse, este campo no debería existir'
        ),
    ]


