from django.db import migrations
from decimal import Decimal


def create_payment_setup(apps, schema_editor):
    """
    Crea la configuración inicial de monedas y métodos de pago
    """
    Currency = apps.get_model('payments', 'Currency')
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    
    # Crear moneda USD por defecto
    usd, created = Currency.objects.get_or_create(
        code='USD',
        defaults={
            'name': 'US Dollar',
            'symbol': '$',
            'is_default': True,
            'is_active': True,
            'decimal_places': 2
        }
    )
    
    if created:
        print(f"✅ Moneda USD creada")
    
    # Crear métodos de pago básicos
    payment_methods_data = [
        {
            'name': 'Efectivo',
            'method_type': 'cash',
            'is_active': True,
            'requires_authorization': False,
            'display_order': 1
        },
        {
            'name': 'Tarjeta de Crédito',
            'method_type': 'credit_card',
            'is_active': True,
            'requires_authorization': True,
            'display_order': 2
        },
        {
            'name': 'Tarjeta de Débito',
            'method_type': 'debit_card',
            'is_active': True,
            'requires_authorization': True,
            'display_order': 3
        },
        {
            'name': 'Transferencia Bancaria',
            'method_type': 'bank_transfer',
            'is_active': True,
            'requires_authorization': False,
            'display_order': 4
        }
    ]
    
    for pm_data in payment_methods_data:
        pm, created = PaymentMethod.objects.get_or_create(
            method_type=pm_data['method_type'],
            defaults=pm_data
        )
        if created:
            print(f"✅ Método de pago '{pm_data['name']}' creado")


def reverse_payment_setup(apps, schema_editor):
    """
    Revierte la creación de datos iniciales
    """
    # No eliminamos nada para evitar pérdida de datos
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),  # Ajusta según tu última migración
    ]

    operations = [
        migrations.RunPython(create_payment_setup, reverse_payment_setup),
    ]
