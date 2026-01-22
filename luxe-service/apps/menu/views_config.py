from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Product

class BulkUpdateAccountsView(APIView):
    """
    Vista para actualizar cuentas contables masivamente para TODOS los productos.
    """
    permission_classes = [AllowAny]
    def post(self, request):
        sales_account = request.data.get('sales_account')
        cost_account = request.data.get('cost_account')
        inventory_account = request.data.get('inventory_account')
        
        if not any([sales_account, cost_account, inventory_account]):
            return Response(
                {'error': 'Debe proporcionar al menos una cuenta para actualizar'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        update_data = {}
        if sales_account:
            update_data['accounting_sales_account'] = sales_account
        if cost_account:
            update_data['accounting_cost_account'] = cost_account
        if inventory_account:
            update_data['accounting_inventory_account'] = inventory_account
            
        # Actualizar todos los productos
        count = Product.objects.update(**update_data)
        
        return Response({
            'message': f'Se actualizaron las cuentas contables de {count} productos.',
            'updated_count': count
        })


class ClearInventoryView(APIView):
    """
    Vista para VACIAR todo el inventario (Solo Desarrollo).
    Elimina OrderItems primero para evitar ProtectedError.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        from apps.orders.models import OrderItem
        
        # 1. Eliminar Items de Ordenes (para liberar restricción PROTECT)
        items_count, _ = OrderItem.objects.all().delete()
        
        # 2. Eliminar Productos
        products_count, _ = Product.objects.all().delete()
        
        return Response({
            'message': f'Inventario vaciado correctamente.\nEliminados: {products_count} productos y {items_count} registros de historial de ventas.',
            'products_deleted': products_count
        })
