#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.menu.models import Product
from apps.orders.serializers import OrderCreateSerializer
from apps.customers.models import Customer

print("=" * 60)
print("DEBUG: Probando creación de orden desde POS")
print("=" * 60)

# 1. Verificar productos disponibles
products = Product.objects.filter(is_active=True, is_available=True)[:3]
print(f"\n✓ Productos disponibles: {products.count()}")
for p in products:
    print(f"  - {p.name} (ID: {p.id}) - Active: {p.is_active}, Available: {p.is_available}")

if products.count() == 0:
    print("\n❌ ERROR: No hay productos disponibles!")
    exit(1)


# 2. Preparar payload de orden (simulando POS)
first_product = products.first()
print(f"\n✓ Usando producto: {first_product.name}")

# Intentar obtener o crear un cliente
customer = Customer.objects.first()
if customer:
    print(f"✓ Cliente encontrado: {customer.first_name} {customer.last_name}")
else:
    print("⚠ No hay clientes, la orden será sin cliente")

payload = {
    'order_type': 'in_store',
    'table_number': 'TEST-DEBUG',
    'items': [
        {
            'product_id': str(first_product.id),
            'quantity': 1,
            'notes': 'Test desde debug script'
        }
    ],
    'customer_id': str(customer.id) if customer else None,
}

print(f"\n✓ Payload preparado:")
print(f"  - order_type: {payload['order_type']}")
print(f"  - table_number: {payload['table_number']}")
print(f"  - items: {len(payload['items'])} producto(s)")
print(f"  - customer_id: {payload['customer_id']}")

# 3. Validar y crear orden
print("\n" + "=" * 60)
print("Intentando crear orden...")
print("=" * 60)

serializer = OrderCreateSerializer(data=payload)

if serializer.is_valid():
    print("✓ Serializer es válido")
    try:
        order = serializer.save()
        print(f"\n✅ ORDEN CREADA EXITOSAMENTE!")
        print(f"  - Número de orden: {order.order_number}")
        print(f"  - Total: ${order.total}")
        print(f"  - Estado: {order.status}")
        print(f"  - Payment Status: {order.payment_status}")
        print(f"  - Items: {order.items.count()}")
        
        # Verificar si hay pago asociado
        payments = order.payments.all()
        print(f"  - Pagos asociados: {payments.count()}")
        for payment in payments:
            print(f"    * {payment.payment_method.name}: ${payment.amount}")
        
    except Exception as e:
        with open('/tmp/pos_error.txt', 'w') as f:
            f.write(f"ERROR al crear orden:\n")
            f.write(f"  Tipo: {type(e).__name__}\n")
            f.write(f"  Mensaje: {str(e)}\n\n")
            
            # Capturar detalles del IntegrityError
            if hasattr(e, '__cause__'):
                f.write(f"\n  Causa (cause): {e.__cause__}\n")
            
            if hasattr(e, 'args') and e.args:
                f.write(f"\n  Args completos:\n")
                for i, arg in enumerate(e.args):
                    f.write(f"    [{i}]: {arg}\n")
            
            # Detalles específicos de IntegrityError de psycopg2
            if hasattr(e, 'pgerror'):
                f.write(f"\n  PostgreSQL Error detallado:\n")
                f.write(f"  {e.pgerror}\n")
            
            if hasattr(e, 'diag'):
                f.write(f"\n  Diagnóstico PostgreSQL:\n")
                f.write(f"    - message_primary: {e.diag.message_primary if hasattr(e.diag, 'message_primary') else 'N/A'}\n")
                f.write(f"    - message_detail: {e.diag.message_detail if hasattr(e.diag, 'message_detail') else 'N/A'}\n")
                f.write(f"    - constraint_name: {e.diag.constraint_name if hasattr(e.diag, 'constraint_name') else 'N/A'}\n")
                f.write(f"    - column_name: {e.diag.column_name if hasattr(e.diag, 'column_name') else 'N/A'}\n")
                f.write(f"    - table_name: {e.diag.table_name if hasattr(e.diag, 'table_name') else 'N/A'}\n")
            
            import traceback
            f.write("\nTraceback completo:\n")
            traceback.print_exc(file=f)
        
        print(f"\n❌ ERROR al crear orden - Ver /tmp/pos_error.txt para detalles completos")
        print(f"  Tipo: {type(e).__name__}")
        print(f"  Mensaje: {str(e)[:200]}")

else:
    print("❌ Serializer NO es válido")
    print(f"Errores: {serializer.errors}")

print("\n" + "=" * 60)
print("FIN DEBUG")
print("=" * 60)
