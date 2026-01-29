from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0005_product_accounting_cost_account_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            # Renombrar las tablas de menu_ a inventario_
            sql=[
                # Renombrar tabla Category
                'ALTER TABLE menu_category RENAME TO inventario_category;',
                # Renombrar tabla Product
                'ALTER TABLE menu_product RENAME TO inventario_product;',
                # Renombrar tabla Size
                'ALTER TABLE menu_size RENAME TO inventario_size;',
                # Renombrar tabla Extra
                'ALTER TABLE menu_extra RENAME TO inventario_extra;',
                # Renombrar tabla Extra_Products (many-to-many)
                'ALTER TABLE menu_extra_products RENAME TO inventario_extra_products;',
                # Renombrar tabla Combo
                'ALTER TABLE menu_combo RENAME TO inventario_combo;',
                # Renombrar tabla ComboProduct
                'ALTER TABLE menu_comboproduct RENAME TO inventario_comboproduct;',
            ],
            reverse_sql=[
                # Reverse para rollback
                'ALTER TABLE inventario_category RENAME TO menu_category;',
                'ALTER TABLE inventario_product RENAME TO menu_product;',
                'ALTER TABLE inventario_size RENAME TO menu_size;',
                'ALTER TABLE inventario_extra RENAME TO menu_extra;',
                'ALTER TABLE inventario_extra_products RENAME TO menu_extra_products;',
                'ALTER TABLE inventario_combo RENAME TO menu_combo;',
                'ALTER TABLE inventario_comboproduct RENAME TO menu_comboproduct;',
            ]
        ),
    ]
