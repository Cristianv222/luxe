from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import requests
import logging

from .models import Order, OrderItem, OrderItemExtra, DeliveryInfo, OrderStatusHistory
from apps.inventario.serializers import ProductListSerializer, SizeSerializer, ExtraSerializer
from apps.customers.serializers import CustomerSerializer

# Configurar logger
logger = logging.getLogger(__name__)


class OrderItemExtraSerializer(serializers.ModelSerializer):
    """Serializer para extras de items"""
    extra_name = serializers.CharField(source='extra.name', read_only=True)
    extra_details = ExtraSerializer(source='extra', read_only=True)
    
    class Meta:
        model = OrderItemExtra
        fields = [
            'id', 'extra', 'extra_name', 'extra_details', 'price', 'created_at'
        ]
        read_only_fields = ['id', 'price', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer para items de orden"""
    product_details = ProductListSerializer(source='product', read_only=True)
    size_details = SizeSerializer(source='size', read_only=True)
    extras = OrderItemExtraSerializer(many=True, read_only=True)
    total_with_extras = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_details', 'size', 'size_details',
            'quantity', 'unit_price', 'line_total', 'notes',
            'extras', 'total_with_extras', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'unit_price', 'line_total', 'created_at', 'updated_at']
    
    def get_total_with_extras(self, obj):
        return float(obj.get_total_with_extras())


class OrderItemCreateSerializer(serializers.Serializer):
    """Serializer para crear items de orden"""
    product_id = serializers.UUIDField()
    size_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    notes = serializers.CharField(required=False, allow_blank=True)
    extra_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    def validate_product_id(self, value):
        """Valida que el producto exista y esté disponible"""
        from apps.inventario.models import Product
        try:
            product = Product.objects.get(id=value)
            if not product.is_available_now():
                raise serializers.ValidationError('Este producto no está disponible')
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError('Producto no encontrado')
    
    def validate_size_id(self, value):
        """Valida que el tamaño exista si se proporciona"""
        if value:
            from apps.inventario.models import Size
            try:
                size = Size.objects.get(id=value)
                if not size.is_active:
                    raise serializers.ValidationError('Este tamaño no está disponible')
                return value
            except Size.DoesNotExist:
                raise serializers.ValidationError('Tamaño no encontrado')
        return value
    
    def validate_extra_ids(self, value):
        """Valida que los extras existan"""
        if value:
            from apps.inventario.models import Extra
            extras = Extra.objects.filter(id__in=value, is_active=True)
            if extras.count() != len(value):
                raise serializers.ValidationError('Uno o más extras no son válidos')
        return value


class DeliveryInfoSerializer(serializers.ModelSerializer):
    """Serializer para información de delivery"""
    
    class Meta:
        model = DeliveryInfo
        fields = [
            'id', 'address', 'city', 'postal_code', 'reference',
            'latitude', 'longitude', 'contact_name', 'contact_phone',
            'driver_name', 'driver_phone', 'estimated_delivery_time',
            'picked_up_at', 'delivered_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'driver_name', 'driver_phone', 'picked_up_at',
            'delivered_at', 'created_at', 'updated_at'
        ]


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer para historial de estados"""
    from_status_display = serializers.CharField(
        source='get_from_status_display',
        read_only=True
    )
    to_status_display = serializers.CharField(
        source='get_to_status_display',
        read_only=True
    )
    
    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'from_status', 'from_status_display',
            'to_status', 'to_status_display', 'notes',
            'changed_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de órdenes"""
    customer_name = serializers.CharField(
        source='customer.get_full_name',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    order_type_display = serializers.CharField(
        source='get_order_type_display',
        read_only=True
    )
    payment_status_display = serializers.CharField(
        source='get_payment_status_display',
        read_only=True
    )
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name',
            'order_type', 'order_type_display', 'status', 'status_display',
            'payment_status', 'payment_status_display', 'total', 'tax_amount',
            'items_count', 'table_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']
    
    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de órdenes"""
    customer = CustomerSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_info = DeliveryInfoSerializer(read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    order_type_display = serializers.CharField(
        source='get_order_type_display',
        read_only=True
    )
    payment_status_display = serializers.CharField(
        source='get_payment_status_display',
        read_only=True
    )
    
    can_be_cancelled = serializers.SerializerMethodField()
    can_be_modified = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_identification',
            'order_type', 'order_type_display',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'subtotal', 'tax_amount', 'discount_amount', 'discount_code', 'delivery_fee',
            'tip_amount', 'total', 'notes', 'special_instructions',
            'table_number', 'estimated_prep_time', 'items', 'delivery_info',
            'status_history', 'can_be_cancelled', 'can_be_modified',
            'created_at', 'updated_at', 'confirmed_at', 'ready_at',
            'delivered_at', 'cancelled_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'subtotal', 'tax_amount', 'total',
            'created_at', 'updated_at', 'confirmed_at', 'ready_at',
            'delivered_at', 'cancelled_at'
        ]
    
    def get_can_be_cancelled(self, obj):
        return obj.can_be_cancelled()
    
    def get_can_be_modified(self, obj):
        return obj.can_be_modified()


class OrderCreateSerializer(serializers.Serializer):
    """Serializer para crear órdenes"""
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    customer_email = serializers.EmailField(required=False, allow_null=True)
    order_type = serializers.ChoiceField(choices=Order.ORDER_TYPE, default='dine_in')
    items = OrderItemCreateSerializer(many=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    table_number = serializers.CharField(required=False, allow_blank=True)
    discount_code = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=0
    )
    tip_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=0
    )
    delivery_info = DeliveryInfoSerializer(required=False, allow_null=True)
    source = serializers.CharField(required=False, default='pos')
    payment_method_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    def validate_customer_id(self, value):
        """Valida que el cliente exista"""
        if value:
            from apps.customers.models import Customer
            try:
                Customer.objects.get(id=value)
                return value
            except Customer.DoesNotExist:
                raise serializers.ValidationError('Cliente no encontrado')
        return value
    
    def validate_items(self, value):
        """Valida que haya al menos un item"""
        if not value:
            raise serializers.ValidationError('Debe agregar al menos un item')
        return value
    
    def validate(self, data):
        """Validaciones cruzadas"""
        # Si es delivery, debe tener información de entrega
        if data.get('order_type') == 'delivery' and not data.get('delivery_info'):
            raise serializers.ValidationError({
                'delivery_info': 'La información de delivery es requerida para este tipo de orden'
            })
        
        # Si es dine-in y no tiene mesa, asignar mesa genérica
        if data.get('order_type') == 'dine_in' and not data.get('table_number'):
            data['table_number'] = 'GENERICA'
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Crea la orden con todos sus items"""
        from apps.inventario.models import Product, Size, Extra
        from apps.customers.models import Customer
        from apps.pos.models import Discount
        from apps.loyalty.models import UserCoupon
        
        # Extraer datos que no van directamente al modelo Order
        items_data = validated_data.pop('items')
        delivery_info_data = validated_data.pop('delivery_info', None)
        customer_email = validated_data.pop('customer_email', None)
        payment_method_name = validated_data.pop('payment_method_name', None)
        
        # 1. Lógica de Cliente y SNAPSHOT (Inmortal)
        customer = None
        customer_id = validated_data.get('customer_id')
        
        if customer_id:
            customer = Customer.objects.filter(id=customer_id).first()
            if customer:
                validated_data['customer'] = customer
        elif customer_email:
            customer = Customer.objects.filter(email__iexact=customer_email).first()
            if customer:
                validated_data['customer'] = customer

        # Guardamos el snapshot de identidad en la orden para que quede 'quieta'
        if customer:
            validated_data['customer_name'] = f"{customer.first_name} {customer.last_name}".strip()
            validated_data['customer_identification'] = customer.cedula or customer.phone
        else:
            validated_data['customer_name'] = "Consumidor Final"
            validated_data['customer_identification'] = "9999999999999"

        # 2. LOGICA DE ESTADO SEGÚN ORIGEN
        # Si viene explicitamente como 'web' o el tipo es delivery/pickup iniciada por cliente,
        # NO completamos automáticamente.
        # Por defecto, si no se especifica source, asumimos POS (comportamiento anterior) o si es in_store.
        
        source = validated_data.get('source', 'pos')
        
        if source == 'web':
            validated_data['status'] = 'pending'
            validated_data['payment_status'] = 'pending'
            # Fechas nulas por defecto
            validated_data['confirmed_at'] = None
            validated_data['ready_at'] = None
            validated_data['delivered_at'] = None
        else:
            # COMPORTAMIENTO POS (Original)
            validated_data['status'] = 'completed'
            validated_data['payment_status'] = 'paid'
            
            now = timezone.now()
            validated_data['confirmed_at'] = now
            validated_data['ready_at'] = now
            validated_data['delivered_at'] = now
        
        # Definir now si no existe (para el caso web)
        if 'now' not in locals():
            now = timezone.now()
        
        # Procesar Descuento/Cupón
        discount_code = validated_data.get('discount_code')
        applied_discount_object = None
        is_user_coupon = False

        if discount_code:
            # Intentar con Cupón de Fidelidad primero
            coupon = UserCoupon.objects.filter(code__iexact=discount_code, is_used=False).first()
            if coupon:
                coupon.is_used = True
                coupon.used_at = timezone.now()
                coupon.save()
                applied_discount_object = coupon
                is_user_coupon = True
                logger.info(f"Cupón de Fidelidad {discount_code} marcado como usado.")
            else:
                # Intentar con Descuento estándar
                discount = Discount.objects.filter(code__iexact=discount_code).first()
                if discount:
                    discount.use_discount()
                    applied_discount_object = discount
                    is_user_coupon = False
                    logger.info(f"Descuento POS {discount_code} uso incrementado.")

        # Crear la orden
        order = Order.objects.create(**validated_data)
        
        # Crear los items
        for item_data in items_data:
            # Bloquear el registro del producto para evitar condiciones de carrera
            product = Product.objects.select_for_update().get(id=item_data['product_id'])
            
            # Verificar y descontar stock
            if product.track_stock:
                if product.stock_quantity < item_data['quantity']:
                    raise serializers.ValidationError(
                        f"Stock insuficiente para '{product.name}'. Disponibles: {product.stock_quantity}"
                    )
                product.stock_quantity -= item_data['quantity']
                product.save()

            size = None
            if item_data.get('size_id'):
                size = Size.objects.get(id=item_data['size_id'])
            
            extra_ids = item_data.pop('extra_ids', [])
            
            # Crear el item
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                size=size,
                quantity=item_data['quantity'],
                unit_cost=product.cost_price,  # Guardar costo histórico para reporte de ganancias
                notes=item_data.get('notes', '')
            )
            
            # Agregar extras
            if extra_ids:
                extras = Extra.objects.filter(id__in=extra_ids)
                for extra in extras:
                    OrderItemExtra.objects.create(
                        order_item=order_item,
                        extra=extra
                    )
        
        # Crear información de delivery si aplica
        if delivery_info_data:
            DeliveryInfo.objects.create(
                order=order,
                **delivery_info_data
            )
        
        # Calcular tiempo estimado
        order.calculate_estimated_time()
        
        # Primero calcular subtotales y tax
        order.calculate_totals()

        # APLICAR VALOR DEL DESCUENTO
        if applied_discount_object:
            calculated_discount = 0
            # Si es Cupón de Usuario (Loyalty)
            if is_user_coupon:
                rule = applied_discount_object.reward_rule
                if rule:
                    if rule.reward_type == 'PERCENTAGE':
                        calculated_discount = order.subtotal * (rule.discount_value / 100)
                    elif rule.reward_type == 'FIXED_AMOUNT':
                        calculated_discount = rule.discount_value
            # Si es Descuento Estándar (POS)
            else:
                # Usar el método calculate_discount del modelo
                calculated_discount = applied_discount_object.calculate_discount(order.subtotal)
            
            # Asignar el descuento calculado a la orden
            if calculated_discount > 0:
                # Asegurarse que no exceda el subtotal (aunque calculate_discount ya lo hace para Discount, aseguramos para Coupon)
                if calculated_discount > order.subtotal:
                    calculated_discount = order.subtotal
                
                order.discount_amount = calculated_discount
                # Crear registro de uso si es Descuento estándar (para auditoría)
                if not is_user_coupon:
                    from apps.pos.models import DiscountUsage
                    DiscountUsage.objects.create(
                        discount=applied_discount_object,
                        order=order,
                        discount_amount=calculated_discount,
                        original_amount=order.subtotal,
                        applied_by="SYSTEM" # O el usuario si lo tuviéramos
                    )

        # Recalcular totales finales con el descuento aplicado
        order.calculate_totals()
        order.save()
        
        # ========================================
        # CREAR REGISTRO DE PAGO AUTOMÁTICO
        # ========================================
        # Las órdenes de POS necesitan un registro de pago
        # para evitar IntegrityError cuando se accede a payment_method
        from apps.payments.models import Payment, PaymentMethod, Currency
        
        try:
            # Obtener el método de pago seleccionado o por defecto (efectivo)
            payment_method = None
            if payment_method_name:
                # Buscar por nombre (incensitivo)
                payment_method = PaymentMethod.objects.filter(name__iexact=payment_method_name, is_active=True).first()
            
            if not payment_method:
                payment_method = PaymentMethod.objects.filter(
                    method_type='cash',
                    is_active=True
                ).first()
            
            # Obtener la moneda por defecto
            default_currency = Currency.objects.filter(is_default=True).first()
            
            if payment_method and default_currency:
                # Crear el registro de pago
                # IMPORTANTE: No usar .create() sino crear instancia y .save()
                # para que se ejecute el método save() del modelo que genera payment_number
                payment = Payment(
                    order=order,
                    payment_method=payment_method,
                    currency=default_currency,
                    amount=order.total,
                    original_amount=order.total,
                    original_currency=default_currency,
                    status='completed',
                    completed_at=now
                )
                payment.save()
                logger.info(f"✅ Pago automático creado para orden {order.order_number} - Payment: {payment.payment_number}")
            else:
                logger.warning(f"⚠️ No se pudo crear pago automático: método de pago o moneda no encontrados")
        except Exception as e:
            logger.error(f"❌ Error al crear pago automático: {str(e)}")
            # No fallar la orden por esto, solo registrar el error
        
        # ========================================
        # ENVIAR A IMPRESIÓN AUTOMÁTICAMENTE
        # ========================================
        self._send_to_printer(order)
        
        return order
    
    def _send_to_printer(self, order):
        """
        Envía la orden a la impresora automáticamente.
        Prepara los datos en el formato esperado por PrintReceiptView.
        """
        from django.conf import settings
        
        try:
            # URL del endpoint de impresión
            printer_url = 'http://127.0.0.1:8000/luxe/api/hardware/print/receipt/'
            
            # Preparar items en el formato esperado por el printer
            items = []
            for item in order.items.all():
                items.append({
                    'name': item.product.name,
                    'quantity': item.quantity,
                    'price': float(item.unit_price),
                    'total': float(item.line_total)
                })
            
            # Preparar datos de la orden en el formato esperado
            order_data = {
                'order_number': order.order_number,
                'customer_name': order.customer.get_full_name() if order.customer else 'CONTADO',
                'items': items,
                'subtotal': float(order.subtotal),
                'tax': float(order.tax_amount),
                'total': float(order.total)
            }
            
            # Payload completo
            payload = {
                'order': order_data
            }
            
            # Headers con token de autenticación
            headers = {
                'Authorization': f'Bearer {settings.HARDWARE_SERVICE_TOKEN}',
                'Content-Type': 'application/json'
            }
            
            # Hacer la petición con timeout corto
            response = requests.post(
                printer_url, 
                json=payload, 
                headers=headers, 
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                logger.info(f'✅ Orden {order.order_number} enviada a impresora exitosamente')
                logger.info(f'   Job ID: {response.json().get("job_id")}')
            else:
                logger.warning(f'⚠️ Error imprimiendo orden {order.order_number}: HTTP {response.status_code}')
                logger.warning(f'   Respuesta: {response.text}')
                
        except requests.Timeout:
            logger.warning(f'⚠️ Timeout al imprimir orden {order.order_number}')
        except requests.ConnectionError:
            logger.error(f'❌ No se pudo conectar al servicio de impresión para orden {order.order_number}')
        except Exception as e:
            logger.error(f'❌ Error inesperado al imprimir orden {order.order_number}: {str(e)}')
            import traceback
            logger.error(traceback.format_exc())


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar órdenes"""
    
    class Meta:
        model = Order
        fields = [
            'notes', 'special_instructions', 'table_number',
            'discount_amount', 'tip_amount'
        ]
    
    def validate(self, data):
        """Validar que la orden pueda ser modificada"""
        # Relaxed validation: Allow editing notes and table number even if completed
        # if not self.instance.can_be_modified():
        #     raise serializers.ValidationError(
        #         'Esta orden no puede ser modificada en su estado actual'
        #     )
        return data
    
    def update(self, instance, validated_data):
        """Actualiza la orden y recalcula totales"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.calculate_totals()
        instance.save()
        
        return instance


class OrderStatusUpdateSerializer(serializers.Serializer):
    """Serializer para actualizar el estado de una orden"""
    status = serializers.ChoiceField(choices=Order.ORDER_STATUS)
    notes = serializers.CharField(required=False, allow_blank=True)
    changed_by = serializers.CharField(required=False, allow_blank=True)
    
    def validate_status(self, value):
        """Valida transiciones de estado válidas"""
        # Validation disabled to allow flexible status updates
        return value
    
    def save(self):
        """Actualiza el estado y crea historial"""
        order = self.context.get('order')
        new_status = self.validated_data['status']
        old_status = order.status
        
        # Crear entrada en historial
        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status=new_status,
            notes=self.validated_data.get('notes', ''),
            changed_by=self.validated_data.get('changed_by', '')
        )
        
        # Actualizar orden según el nuevo estado
        if new_status == 'confirmed':
            order.mark_as_confirmed()
        elif new_status == 'preparing':
            order.mark_as_preparing()
        elif new_status == 'ready':
            order.mark_as_ready()
        elif new_status == 'delivered':
            order.mark_as_delivered()
        elif new_status == 'cancelled':
            order.mark_as_cancelled(self.validated_data.get('notes', ''))
        else:
            order.status = new_status
            order.save()
        
        return order


class OrderCancelSerializer(serializers.Serializer):
    """Serializer para cancelar órdenes"""
    reason = serializers.CharField(required=True)
    
    def validate(self, data):
        """Valida que la orden pueda ser cancelada"""
        order = self.context.get('order')
        if not order.can_be_cancelled():
            raise serializers.ValidationError(
                'Esta orden no puede ser cancelada en su estado actual'
            )
        return data
    
    def save(self):
        """Cancela la orden"""
        order = self.context.get('order')
        reason = self.validated_data['reason']
        
        old_status = order.status
        order.mark_as_cancelled(reason)
        
        # Crear entrada en historial
        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status='cancelled',
            notes=f'Cancelado: {reason}'
        )
        
        return order


class OrderStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de órdenes"""
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    preparing_orders = serializers.IntegerField()
    ready_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderReportDetailSerializer(serializers.ModelSerializer):
    """
    Serializer optimizado para ser usado en el detalle de órdenes del Reporte (PDF/Web).
    Mapea los campos de Order al formato esperado por el front-end.
    """
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    
    # Mapear 'total' a 'total_amount' y 'created_at' a 'timestamp' para compatibilidad con el frontend/PDF
    total_amount = serializers.FloatField(source='total', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'order_number', 'id', 'status', 'customer_name', 
            'items', 'payment_method_display',
            'total_amount', 'timestamp',
        ]
        
    def get_payment_method_display(self, obj):
        """Obtiene el nombre del método de pago asociado"""
        payment = obj.payments.filter(status='completed').first() or obj.payments.first()
        if payment and payment.payment_method:
            return payment.payment_method.name
        return obj.get_payment_status_display()
