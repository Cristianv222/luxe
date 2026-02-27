from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta

from core.permissions import require_authentication, require_staff
from .models import Order, OrderItem, OrderItemExtra, DeliveryInfo, OrderStatusHistory
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
    OrderStatusUpdateSerializer,
    OrderCancelSerializer,
    OrderStatsSerializer,
    DeliveryInfoSerializer,
    OrderStatusHistorySerializer,
)


# ============================================================================
# VIEWS DE PRUEBA Y HEALTH CHECK
# ============================================================================

@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint (sin autenticación)
    GET /api/orders/health/
    """
    return Response({
        'status': 'ok',
        'service': 'orders-service'
    })


# ============================================================================
# VIEWSETS DE ÓRDENES
# ============================================================================

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet para órdenes
    
    list: Lista todas las órdenes
    retrieve: Obtiene detalle de una orden
    create: Crea una nueva orden
    update: Actualiza una orden
    partial_update: Actualiza parcialmente una orden
    destroy: Elimina una orden
    """
    queryset = Order.objects.all()
    permission_classes = [AllowAny]  # ← YA ESTÁ CORRECTO
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'order_type', 'payment_status', 'customer']
    search_fields = ['order_number', 'customer__first_name', 'customer__last_name', 'table_number']
    ordering_fields = ['created_at', 'total', 'status']
    ordering = ['-created_at']
    lookup_field = 'order_number'
    pagination_class = None  # Frontend handles pagination; return all orders at once

    
    def get_queryset(self):
        """Optimiza queries con prefetch y filtros adicionales"""
        queryset = super().get_queryset().select_related(
            'customer'
        ).prefetch_related(
            Prefetch('items', queryset=OrderItem.objects.select_related('product', 'size')),
            'items__extras',
            'delivery_info',
            'status_history'
        )
        
        # Filtros adicionales por query params
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        min_total = self.request.query_params.get('min_total')
        max_total = self.request.query_params.get('max_total')
        customer_email = self.request.query_params.get('customer__email') or self.request.query_params.get('customer_email')
        
        # SEGURIDAD: Si es un cliente autenticado (no staff), forzamos que SOLO vea sus órdenes
        if self.request.user.is_authenticated and not self.request.user.is_staff:
            queryset = queryset.filter(customer__email__iexact=self.request.user.email)
        elif customer_email:
            # Si es staff o admin, permitimos el filtro manual por email
            queryset = queryset.filter(customer__email__iexact=customer_email)
        
        if date_from:
            try:
                date_from = datetime.fromisoformat(date_from)
                queryset = queryset.filter(created_at__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.fromisoformat(date_to)
                queryset = queryset.filter(created_at__lte=date_to)
            except ValueError:
                pass
        
        if min_total:
            queryset = queryset.filter(total__gte=min_total)
        if max_total:
            queryset = queryset.filter(total__lte=max_total)
        
        return queryset
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrderUpdateSerializer
        return OrderDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Crea una nueva orden"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        
        # Retornar con el serializer de detalle
        detail_serializer = OrderDetailSerializer(order)
        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, order_number=None):
        """
        Actualiza el estado de una orden
        POST /api/orders/{order_number}/update_status/
        Body: {"status": "confirmed", "notes": "...", "changed_by": "..."}
        """
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(
            data=request.data,
            context={'order': order}
        )
        serializer.is_valid(raise_exception=True)
        updated_order = serializer.save()
        
        detail_serializer = OrderDetailSerializer(updated_order)
        return Response(detail_serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, order_number=None):
        """
        Cancela una orden
        POST /api/orders/{order_number}/cancel/
        Body: {"reason": "Cliente canceló"}
        """
        order = self.get_object()
        serializer = OrderCancelSerializer(
            data=request.data,
            context={'order': order}
        )
        serializer.is_valid(raise_exception=True)
        cancelled_order = serializer.save()
        
        detail_serializer = OrderDetailSerializer(cancelled_order)
        return Response(detail_serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, order_number=None):
        """
        Confirma una orden pendiente
        POST /api/orders/{order_number}/confirm/
        """
        order = self.get_object()
        
        if order.mark_as_confirmed():
            detail_serializer = OrderDetailSerializer(order)
            return Response(detail_serializer.data)
        
        return Response(
            {'error': 'No se puede confirmar esta orden en su estado actual'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def start_preparing(self, request, order_number=None):
        """
        Marca orden como en preparación
        POST /api/orders/{order_number}/start_preparing/
        """
        order = self.get_object()
        
        if order.mark_as_preparing():
            detail_serializer = OrderDetailSerializer(order)
            return Response(detail_serializer.data)
        
        return Response(
            {'error': 'No se puede iniciar preparación en el estado actual'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def mark_ready(self, request, order_number=None):
        """
        Marca orden como lista
        POST /api/orders/{order_number}/mark_ready/
        """
        order = self.get_object()
        
        if order.mark_as_ready():
            detail_serializer = OrderDetailSerializer(order)
            return Response(detail_serializer.data)
        
        return Response(
            {'error': 'No se puede marcar como lista en el estado actual'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, order_number=None):
        """
        Marca orden como entregada
        POST /api/orders/{order_number}/mark_delivered/
        """
        order = self.get_object()
        
        if order.mark_as_delivered():
            detail_serializer = OrderDetailSerializer(order)
            return Response(detail_serializer.data)
        
        return Response(
            {'error': 'No se puede marcar como entregada en el estado actual'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Obtiene órdenes pendientes
        GET /api/orders/pending/
        """
        orders = self.get_queryset().filter(status='pending')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def preparing(self, request):
        """
        Obtiene órdenes en preparación
        GET /api/orders/preparing/
        """
        orders = self.get_queryset().filter(status='preparing')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ready(self, request):
        """
        Obtiene órdenes listas
        GET /api/orders/ready/
        """
        orders = self.get_queryset().filter(status='ready')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Obtiene todas las órdenes activas (no completadas ni canceladas)
        GET /api/orders/active/
        """
        orders = self.get_queryset().exclude(
            status__in=['delivered', 'cancelled', 'rejected']
        )
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """
        Obtiene órdenes de hoy
        GET /api/orders/today/
        """
        today = timezone.now().date()
        orders = self.get_queryset().filter(
            created_at__date=today
        )
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """
        Obtiene órdenes de un cliente específico
        GET /api/orders/by_customer/?customer_id=xxx
        """
        customer_id = request.query_params.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': 'El parámetro customer_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orders = self.get_queryset().filter(customer_id=customer_id)
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_table(self, request):
        """
        Obtiene órdenes de una mesa específica
        GET /api/orders/by_table/?table_number=5
        """
        table_number = request.query_params.get('table_number')
        
        if not table_number:
            return Response(
                {'error': 'El parámetro table_number es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orders = self.get_queryset().filter(
            table_number=table_number,
            order_type='dine_in'
        ).exclude(status__in=['delivered', 'cancelled'])
        
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtiene estadísticas de órdenes
        GET /api/orders/stats/?date_from=...&date_to=...
        """
        queryset = self.get_queryset()
        
        # Filtrar por fechas si se proporcionan
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.fromisoformat(date_from)
                queryset = queryset.filter(created_at__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.fromisoformat(date_to)
                queryset = queryset.filter(created_at__lte=date_to)
            except ValueError:
                pass
        
        # Calcular estadísticas
        stats = {
            'total_orders': queryset.count(),
            'pending_orders': queryset.filter(status='pending').count(),
            'preparing_orders': queryset.filter(status='preparing').count(),
            'ready_orders': queryset.filter(status='ready').count(),
            'completed_orders': queryset.filter(status='delivered').count(),
            'cancelled_orders': queryset.filter(status='cancelled').count(),
        }
        
        # Calcular ingresos
        revenue_data = queryset.filter(
            status='delivered',
            payment_status='paid'
        ).aggregate(
            total_revenue=Sum('total'),
            average_order_value=Avg('total')
        )
        
        stats['total_revenue'] = revenue_data['total_revenue'] or 0
        stats['average_order_value'] = revenue_data['average_order_value'] or 0
        
        serializer = OrderStatsSerializer(data=stats)
        serializer.is_valid()
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sales_by_period(self, request):
        """
        Obtiene ventas agrupadas por período
        GET /api/orders/sales_by_period/?period=day&date_from=...&date_to=...
        period: day, week, month
        """
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
        
        period = request.query_params.get('period', 'day')
        queryset = self.get_queryset().filter(
            status='delivered',
            payment_status='paid'
        )
        
        # Aplicar filtros de fecha
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.fromisoformat(date_from)
                queryset = queryset.filter(created_at__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.fromisoformat(date_to)
                queryset = queryset.filter(created_at__lte=date_to)
            except ValueError:
                pass
        
        # Agrupar por período
        if period == 'day':
            trunc_func = TruncDate
        elif period == 'week':
            trunc_func = TruncWeek
        elif period == 'month':
            trunc_func = TruncMonth
        else:
            trunc_func = TruncDate
        
        sales = queryset.annotate(
            period=trunc_func('created_at')
        ).values('period').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total'),
            average_order_value=Avg('total')
        ).order_by('period')
        
        return Response(sales)
    
    @action(detail=False, methods=['get'])
    def recent_completed(self, request):
        """
        Obtiene órdenes completadas recientes (últimas 24 horas)
        GET /api/orders/recent_completed/
        """
        since = timezone.now() - timedelta(hours=24)
        orders = self.get_queryset().filter(
            status='delivered',
            delivered_at__gte=since
        ).order_by('-delivered_at')[:50]
        
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, order_number=None):
        """
        Obtiene el historial de cambios de estado de una orden
        GET /api/orders/{order_number}/history/
        """
        order = self.get_object()
        history = order.status_history.all()
        serializer = OrderStatusHistorySerializer(history, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def receipt(self, request, order_number=None):
        """
        Obtiene información formateada para recibo/ticket
        GET /api/orders/{order_number}/receipt/
        """
        order = self.get_object()
        
        receipt_data = {
            'order_number': order.order_number,
            'date': order.created_at,
            'order_type': order.get_order_type_display(),
            'table_number': order.table_number,
            'customer': {
                'name': order.customer.get_full_name() if order.customer else 'Cliente General',
                'phone': order.customer.phone if order.customer else '',
            },
            'items': [],
            'subtotal': float(order.subtotal),
            'tax': float(order.tax_amount),
            'discount': float(order.discount_amount),
            'delivery_fee': float(order.delivery_fee),
            'tip': float(order.tip_amount),
            'total': float(order.total),
            'payment_status': order.get_payment_status_display(),
            'notes': order.notes,
        }
        
        # Formatear items
        for item in order.items.all():
            item_data = {
                'name': item.product.name,
                'size': item.size.name if item.size else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total),
                'extras': [extra.extra.name for extra in item.extras.all()],
                'notes': item.notes,
            }
            receipt_data['items'].append(item_data)
        
        return Response(receipt_data)
    
    @action(detail=True, methods=['post'])
    def reprint(self, request, order_number=None):
        """
        Reimprime el ticket de una orden existente
        POST /api/orders/{order_number}/reprint/
        
        IMPORTANTE: Esta acción NO:
        - Descuenta stock
        - Emite nueva factura al SRI
        - Crea nuevo registro de pago
        
        Solo reenvía los datos de la orden a la impresora
        """
        import requests
        import logging
        from django.conf import settings
        
        logger = logging.getLogger(__name__)
        order = self.get_object()
        
        try:
            # Preparar items
            items = []
            for item in order.items.all():
                items.append({
                    'name': item.product.name,
                    'quantity': item.quantity,
                    'price': float(item.unit_price),
                    'total': float(item.line_total),
                    'note': item.notes or ''
                })
            
            # Preparar datos de la orden
            order_data = {
                'order_number': order.order_number,
                'customer_name': order.customer_name or 'CONSUMIDOR FINAL',
                'order_type': order.order_type,
                'items': items,
                'subtotal': float(order.subtotal),
                'tax': float(order.tax_amount),
                'discount': float(order.discount_amount),
                'total': float(order.total)
            }
            
            # Agregar información del SRI si está disponible
            try:
                if hasattr(order, 'sri_document'):
                    sri_doc = order.sri_document
                    order_data['sri_info'] = {
                        'sri_number': sri_doc.sri_number or '',
                        'access_key': sri_doc.access_key or '',
                        'customer_name': order.customer_name or 'CONSUMIDOR FINAL',
                        'customer_identification': order.customer_identification or '9999999999999',
                        'authorization_date': sri_doc.authorization_date.strftime('%d/%m/%Y %H:%M') if sri_doc.authorization_date else None,
                        'status': sri_doc.status
                    }
                    logger.info(f'ℹ️ Datos SRI incluidos en reimpresión de orden {order.order_number}')
            except Exception as e:
                logger.warning(f'⚠️ No se pudo incluir datos SRI en reimpresión: {str(e)}')
            
            # Enviar a la impresora
            printer_url = 'http://127.0.0.1:8000/luxe/api/hardware/print/receipt/'
            payload = {'order': order_data}
            headers = {
                'Authorization': f'Bearer {settings.HARDWARE_SERVICE_TOKEN}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(printer_url, json=payload, headers=headers, timeout=5)
            
            if response.status_code in [200, 201]:
                return Response({
                    'status': 'success',
                    'message': f'Ticket de orden {order.order_number} enviado a imprimir',
                    'job_id': response.json().get('job_id'),
                    'job_number': response.json().get('job_number')
                })
            else:
                return Response({
                    'status': 'warning',
                    'message': f'Advertencia al reimprimir: HTTP {response.status_code}',
                    'details': response.text
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except requests.Timeout:
            return Response({
                'status': 'error',
                'message': 'Timeout al conectar con el servicio de impresión'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except requests.ConnectionError:
            return Response({
                'status': 'error',
                'message': 'No se pudo conectar al servicio de impresión'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({
                'status': 'error',
                'message': f'Error inesperado: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def retry_sri(self, request, order_number=None):
        """
        Reintenta manualmente la emisión de factura SRI
        POST /api/orders/{order_number}/retry_sri/
        """
        order = self.get_object()
        from apps.sri.services import SRIIntegrationService
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # 1. Verificar si ya está autorizada
            if hasattr(order, 'sri_document') and order.sri_document.status == 'AUTHORIZED':
                 return Response({
                     'status': 'AUTHORIZED',
                     'message': 'Esta factura ya está autorizada',
                     'sri_number': order.sri_document.sri_number
                 }, status=status.HTTP_400_BAD_REQUEST)

            # 2. Reintentar emisión
            logger.info(f"🔄 Reintentando SRI MANUAL para orden {order.order_number}")
            doc = SRIIntegrationService.emit_invoice(order)
            
            # 3. Responder con resultado
            return Response({
                'status': doc.status,
                'status_display': doc.get_status_display(),
                'error': doc.error_message,
                'sri_number': doc.sri_number,
                'access_key': doc.access_key
            })
            
        except Exception as e:
            logger.error(f"Error en reintento SRI {order.order_number}: {e}")
            return Response({
                'error': str(e),
                'status': 'FAILED'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeliveryInfoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para información de delivery
    """
    queryset = DeliveryInfo.objects.all()
    serializer_class = DeliveryInfoSerializer
    permission_classes = [AllowAny]  # ← CAMBIADO
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['order']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Optimiza queries"""
        return super().get_queryset().select_related('order')
    
    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """
        Asigna un repartidor al delivery
        POST /api/deliveries/{id}/assign_driver/
        Body: {"driver_name": "...", "driver_phone": "..."}
        """
        delivery = self.get_object()
        
        driver_name = request.data.get('driver_name')
        driver_phone = request.data.get('driver_phone')
        
        if not driver_name or not driver_phone:
            return Response(
                {'error': 'driver_name y driver_phone son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        delivery.driver_name = driver_name
        delivery.driver_phone = driver_phone
        delivery.save()
        
        serializer = self.get_serializer(delivery)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_picked_up(self, request, pk=None):
        """
        Marca el delivery como recogido
        POST /api/deliveries/{id}/mark_picked_up/
        """
        delivery = self.get_object()
        delivery.picked_up_at = timezone.now()
        delivery.save()
        
        # Actualizar estado de la orden
        delivery.order.status = 'delivering'
        delivery.order.save()
        
        serializer = self.get_serializer(delivery)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """
        Marca el delivery como entregado
        POST /api/deliveries/{id}/mark_delivered/
        """
        delivery = self.get_object()
        delivery.delivered_at = timezone.now()
        delivery.save()
        
        # Actualizar estado de la orden
        delivery.order.mark_as_delivered()
        
        serializer = self.get_serializer(delivery)
        return Response(serializer.data)
