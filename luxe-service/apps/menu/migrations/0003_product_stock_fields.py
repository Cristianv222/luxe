from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('menu', '0002_alter_product_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='min_stock_alert',
            field=models.PositiveIntegerField(default=5, verbose_name='Alerta Stock Bajo'),
        ),
        migrations.AddField(
            model_name='product',
            name='stock_quantity',
            field=models.PositiveIntegerField(default=0, verbose_name='Cantidad en Stock'),
        ),
        migrations.AddField(
            model_name='product',
            name='track_stock',
            field=models.BooleanField(default=False, verbose_name='Controlar Stock'),
        ),
    ]
