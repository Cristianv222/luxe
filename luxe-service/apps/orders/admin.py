from django.contrib import admin
from .models import Order, OrderItem, OrderItemExtra, DeliveryInfo, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('line_total',)
    fields = ('product', 'quantity', 'unit_price', 'line_total', 'notes')


class OrderItemExtraInline(admin.TabularInline):
    model = OrderItemExtra
    extra = 0
    readonly_fields = ('price',)


class DeliveryInfoInline(admin.StackedInline):
    model = DeliveryInfo
    extra = 0


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('from_status', 'to_status', 'changed_by', 'created_at')
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 
        'customer_display', 
        'order_type', 
        'status', 
        'payment_status', 
        'total', 
        'created_at'
    )
    list_filter = ('status', 'payment_status', 'order_type', 'source', 'created_at')
    search_fields = ('order_number', 'customer__first_name', 'customer__last_name', 'customer_name')
    readonly_fields = ('id', 'order_number', 'created_at', 'updated_at', 'subtotal', 'tax_amount', 'total')
    inlines = [OrderItemInline, DeliveryInfoInline, OrderStatusHistoryInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('id', 'order_number', 'customer', 'customer_name', 'customer_identification')
        }),
        ('Detalles de la Orden', {
            'fields': ('order_type', 'source', 'status', 'payment_status', 'table_number')
        }),
        ('Totales', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'discount_code', 'delivery_fee', 'tip_amount', 'total')
        }),
        ('Información Adicional', {
            'fields': ('notes', 'special_instructions', 'estimated_prep_time')
        }),
        ('Tiempos', {
            'fields': ('created_at', 'updated_at', 'confirmed_at', 'ready_at', 'delivered_at', 'cancelled_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_display(self, obj):
        if obj.customer:
            return f"{obj.customer.first_name} {obj.customer.last_name}"
        return obj.customer_name or "Cliente Anónimo"
    customer_display.short_description = 'Cliente'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'order', 'product', 'quantity', 'unit_price', 'line_total')
    list_filter = ('order__created_at',)
    search_fields = ('order__order_number', 'product__name')
    readonly_fields = ('id', 'line_total', 'created_at', 'updated_at')
    inlines = [OrderItemExtraInline]


@admin.register(DeliveryInfo)
class DeliveryInfoAdmin(admin.ModelAdmin):
    list_display = ('order', 'contact_name', 'contact_phone', 'city', 'delivered_at')
    list_filter = ('city', 'delivered_at')
    search_fields = ('order__order_number', 'contact_name', 'contact_phone', 'address')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('order', 'from_status', 'to_status', 'changed_by', 'created_at')
    list_filter = ('from_status', 'to_status', 'created_at')
    search_fields = ('order__order_number', 'changed_by')
    readonly_fields = ('id', 'created_at')

