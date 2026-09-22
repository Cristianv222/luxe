from decimal import Decimal, InvalidOperation
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db.models import Count
from .models import Product

class BulkUpdateTaxRateView(APIView):
    """
    Vista para consultar y actualizar el IVA (tax_rate) masivamente para TODOS los productos.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Retorna estadísticas de cómo está distribuido el IVA en los productos actuales.
        """
        stats = list(Product.objects.values('tax_rate').annotate(total=Count('id')).order_by('tax_rate'))
        total_products = Product.objects.count()
        return Response({
            'total_products': total_products,
            'distribution': stats
        })

    def post(self, request):
        """
        Actualiza el tax_rate de todos los productos al porcentaje especificado.
        """
        tax_rate_raw = request.data.get('tax_rate', 0)
        try:
            tax_rate = Decimal(str(tax_rate_raw))
            if tax_rate < Decimal('0') or tax_rate > Decimal('100'):
                return Response(
                    {'error': 'El porcentaje de IVA debe estar entre 0% y 100%.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (InvalidOperation, ValueError, TypeError):
            return Response(
                {'error': f'El valor de IVA "{tax_rate_raw}" no es válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Actualizar todos los productos en la base de datos
        count = Product.objects.all().update(tax_rate=tax_rate)

        return Response({
            'message': f'Se actualizó el IVA al {tax_rate}% en todos los productos ({count} productos actualizados).',
            'updated_count': count,
            'tax_rate': float(tax_rate)
        }, status=status.HTTP_200_OK)


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


