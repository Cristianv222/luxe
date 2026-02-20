from django.contrib import admin
from .models import Category, Product, Size, Extra, Combo, ComboProduct, Color, ProductVariant

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'is_active', 'products_count')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('display_order', 'name')

    def products_count(self, obj):
        return obj.products.count()
    products_count.short_description = 'Productos'

class SizeInline(admin.TabularInline):
    model = Size
    extra = 1

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1

class ExtraInline(admin.TabularInline):
    model = Extra.products.through
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'price', 'is_active', 'is_available', 'stock_quantity')
    list_filter = ('category', 'is_active', 'is_available', 'is_featured')
    search_fields = ('code', 'name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SizeInline, ProductVariantInline]
    ordering = ('category', 'display_order', 'name')
    list_editable = ('price', 'is_active', 'is_available')

@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ('product', 'name', 'price_adjustment', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('product__name', 'name')

@admin.register(Extra)
class ExtraAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

class ComboProductInline(admin.TabularInline):
    model = ComboProduct
    extra = 1

@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_active', 'is_featured')
    list_filter = ('is_active', 'is_featured')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ComboProductInline]

@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'hex_code', 'is_active', 'display_order')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'product', 'size', 'color', 'stock_quantity', 'get_price_display', 'is_active')
    list_filter = ('is_active', 'product__category', 'size', 'color')
    search_fields = ('sku', 'product__name')
    
    def get_price_display(self, obj):
        return f"${obj.get_price()}"
    get_price_display.short_description = 'Precio Final'
