from django.db import migrations


def clean_orphan_columns(apps, schema_editor):
    """
    Elimina columnas huérfanas de la tabla orders_order que no están en el modelo actual.
    Esto resuelve IntegrityErrors causados por campos NOT NULL que fueron eliminados del modelo.
    """
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Obtener todas las columnas de la tabla
        cursor.execute("""
            SELECT column_name, is_nullable
            FROM information_schema.columns 
            WHERE table_name='orders_order'
            ORDER BY column_name;
        """)
        
        db_columns = {row[0]: row[1] == 'YES' for row in cursor.fetchall()}
        
        # Campos que SÍ deberían estar (según el modelo Order actual)
        expected_fields = {
            'id', 'order_number', 'customer_id', 'customer_name', 'customer_identification',
            'order_type', 'status', 'payment_status',
            'subtotal', 'tax_amount', 'discount_amount', 'discount_code',
            'delivery_fee', 'tip_amount', 'total',
            'notes', 'special_instructions', 'table_number',
            'estimated_prep_time',
            'created_at', 'updated_at', 'confirmed_at', 'ready_at',
            'delivered_at', 'cancelled_at'
        }
        
        # Encontrar huérfanos
        orphan_columns = set(db_columns.keys()) - expected_fields
        
        if orphan_columns:
            print(f"🔧 Eliminando {len(orphan_columns)} columnas huérfanas:")
            for col in orphan_columns:
                print(f"   - {col}")
                cursor.execute(f'ALTER TABLE orders_order DROP COLUMN IF EXISTS "{col}" CASCADE;')
            print("✅ Limpieza completada")
        else:
            print("✓ No hay columnas huérfanas")


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_remove_payment_method_field'),
    ]

    operations = [
        migrations.RunPython(clean_orphan_columns, reverse_code=migrations.RunPython.noop),
    ]


