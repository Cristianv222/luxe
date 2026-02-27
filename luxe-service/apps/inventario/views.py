from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Prefetch

from core.permissions import require_authentication, require_staff
from .models import Category, Product, Size, Extra, Combo, ComboProduct, SubCategory
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    SubCategorySerializer,
    SizeSerializer,
    SizeCreateUpdateSerializer,
    ExtraSerializer,
    ExtraCreateUpdateSerializer,
    ComboListSerializer,
    ComboDetailSerializer,
    ComboCreateUpdateSerializer,
)
from .views_inventory import InventoryExportExcelView, InventoryExportPDFView, InventoryImportExcelView


# ============================================================================
# VIEWS DE PRUEBA Y HEALTH CHECK
# ============================================================================

@api_view(['GET'])
@require_authentication
def test_auth_view(request):
    """
    Vista de prueba para verificar que la autenticación JWT funciona
    GET /api/menu/test-auth/
    """
    return Response({
        'message': 'Autenticación exitosa',
        'user_id': request.user_id,
        'username': request.username,
        'email': request.user_email,
        'role': request.user_role,
        'is_staff': request.is_staff,
        'is_superuser': request.is_superuser
    })


@api_view(['GET'])
@require_staff
def test_staff_view(request):
    """
    Vista de prueba que requiere permisos de staff
    GET /api/menu/test-staff/
    """
    return Response({
        'message': 'Acceso de staff exitoso',
        'user': request.username
    })


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint (sin autenticación)
    GET /api/menu/health/
    """
    return Response({
        'status': 'ok',
        'service': 'luxe-service'
    })


# ============================================================================
# VIEWSETS DEL MENÚ
# ============================================================================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para categorías del menú
    
    list: Lista todas las categorías activas
    retrieve: Obtiene detalle de una categoría
    create: Crea una nueva categoría
    update: Actualiza una categoría
    partial_update: Actualiza parcialmente una categoría
    destroy: Elimina una categoría
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'created_at']
    ordering = ['display_order', 'name']
    lookup_field = 'pk'  # ← CAMBIADO de 'slug' a 'pk'
    
    def get_queryset(self):
        """Optimiza queries con prefetch"""
        queryset = super().get_queryset()
        return queryset
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):  # ← CAMBIADO slug a pk
        """Obtiene todos los productos de una categoría"""
        category = self.get_object()
        products = category.products.filter(
            is_active=True, 
            is_available=True
        ).select_related('category').prefetch_related('sizes', 'extras')
        
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Obtiene categorías destacadas con productos destacados"""
        categories = self.get_queryset().filter(
            is_active=True,
            products__is_featured=True
        ).distinct()
        
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)



class SubCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para subcategorías
    """
    queryset = SubCategory.objects.all()
    serializer_class = SubCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'created_at']
    ordering = ['display_order', 'name']
    lookup_field = 'pk'


from .models import Category, Product, Size, Extra, Combo, ComboProduct, SubCategory, ProductImage # Added ProductImage
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    SubCategorySerializer,
    SizeSerializer,
    SizeCreateUpdateSerializer,
    ExtraSerializer,
    ExtraCreateUpdateSerializer,
    ComboListSerializer,
    ComboDetailSerializer,
    ComboCreateUpdateSerializer,
    ProductImageSerializer, # Added ProductImageSerializer
)

# ... (Previous imports remain same)

def parse_and_create_variants(product, available_sizes_str):
    import re
    from .models import Size, Color, ProductVariant
    if not available_sizes_str:
        return
    
    items = [x.strip() for x in available_sizes_str.split(',') if x.strip()]
    if not items:
        return
        
    pattern = re.compile(r'^([^-:]+)(?:-([^:]+))?(?::(\d+))?$')
    
    total_stock = 0
    has_stock = False
    
    processed_variants = []
    
    display_order = 0
    for item in items:
        match = pattern.match(item)
        if not match:
            continue
            
        size_str, color_str, stock_str = match.groups()
        
        size_obj = None
        if size_str:
            size_name = size_str.strip()[:50].title()
            size_obj, _ = Size.objects.get_or_create(
                product=product, name=size_name,
                defaults={'display_order': display_order}
            )
            
        color_obj = None
        if color_str:
            color_name = color_str.strip()[:50].title()
            color_obj, _ = Color.objects.get_or_create(
                name=color_name,
                defaults={'hex_code': '#CCCCCC'}
            )
            
        stock_val = int(stock_str) if stock_str else 0
        if stock_str is not None:
            has_stock = True
            total_stock += stock_val
            
        variant, created = ProductVariant.objects.get_or_create(
            product=product,
            size=size_obj,
            color=color_obj,
            defaults={'stock_quantity': stock_val}
        )
        if not created:
            variant.stock_quantity = stock_val
            variant.save()
            
        processed_variants.append(variant.id)
        display_order += 1
        
    ProductVariant.objects.filter(product=product).exclude(id__in=processed_variants).delete()
    
    if has_stock:
        product.track_stock = True
        product.stock_quantity = total_stock
        product.save(update_fields=['track_stock', 'stock_quantity'])



class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet para productos del menú
    """
    queryset = Product.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['category', 'subcategory', 'is_active', 'is_available', 'is_featured', 'is_new']
    search_fields = ['name', 'description', 'ingredients', 'code', 'barcode']
    ordering_fields = ['display_order', 'name', 'price', 'created_at']
    ordering = ['category__display_order', 'display_order', 'name']
    lookup_field = 'pk'
    
    def get_queryset(self):
        """Optimiza queries y filtra según contexto"""
        queryset = super().get_queryset().select_related('category').prefetch_related(
            'sizes',
            'extras',
            'images'  # Prefetch images
        )
        # ... (Rest of get_queryset logic remains the same)
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(Q(track_stock=False) | Q(stock_quantity__gt=0))
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Handle extra images
        product = serializer.instance
        images = request.FILES.getlist('gallery_images')
        for image in images:
            ProductImage.objects.create(product=product, image=image)
            
        parse_and_create_variants(product, product.available_sizes)
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Handle extra images
        images = request.FILES.getlist('gallery_images')
        for image in images:
            ProductImage.objects.create(product=instance, image=image)

        parse_and_create_variants(instance, instance.available_sizes)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_image(self, request, pk=None):
        """Delete specific gallery image"""
        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'error': 'image_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            image = ProductImage.objects.get(id=image_id, product_id=pk)
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Obtiene productos destacados"""
        products = self.get_queryset().filter(
            is_featured=True,
            is_active=True,
            is_available=True
        )[:10]
        
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """Marca o desmarca un producto como destacado"""
        product = self.get_object()
        product.is_featured = not product.is_featured
        product.save()
        
        serializer = ProductDetailSerializer(product)
        return Response({
            'message': 'Producto destacado actualizado',
            'is_featured': product.is_featured,
            'product': serializer.data
        })

    
    @action(detail=False, methods=['get'])
    def new(self, request):
        """Obtiene productos nuevos"""
        products = self.get_queryset().filter(
            is_new=True,
            is_active=True,
            is_available=True
        ).order_by('-created_at')[:10]
        
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def sizes(self, request, pk=None):  # ← CAMBIADO slug a pk
        """Obtiene tamaños disponibles del producto"""
        product = self.get_object()
        sizes = product.sizes.filter(is_active=True).order_by('display_order')
        
        serializer = SizeSerializer(sizes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def extras(self, request, pk=None):  # ← CAMBIADO slug a pk
        """Obtiene extras disponibles del producto"""
        product = self.get_object()
        extras = product.extras.filter(is_active=True).order_by('display_order')
        
        serializer = ExtraSerializer(extras, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Búsqueda avanzada de productos"""
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'error': 'El parámetro "q" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        products = self.get_queryset().filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(ingredients__icontains=query) |
            Q(category__name__icontains=query)
        ).distinct()
        
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)


class SizeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para tamaños de productos
    
    list: Lista todos los tamaños
    retrieve: Obtiene detalle de un tamaño
    create: Crea un nuevo tamaño
    update: Actualiza un tamaño
    partial_update: Actualiza parcialmente un tamaño
    destroy: Elimina un tamaño
    """
    queryset = Size.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'is_active', 'is_default']
    ordering_fields = ['display_order', 'price_adjustment']
    ordering = ['product', 'display_order']
    
    def get_queryset(self):
        """Optimiza queries"""
        return super().get_queryset().select_related('product')
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado"""
        if self.action in ['create', 'update', 'partial_update']:
            return SizeCreateUpdateSerializer
        return SizeSerializer
    
    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Obtiene tamaños de un producto específico"""
        product_id = request.query_params.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'El parámetro "product_id" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sizes = self.get_queryset().filter(
            product_id=product_id,
            is_active=True
        )
        
        serializer = SizeSerializer(sizes, many=True)
        return Response(serializer.data)


class ExtraViewSet(viewsets.ModelViewSet):
    """
    ViewSet para extras/adicionales
    
    list: Lista todos los extras
    retrieve: Obtiene detalle de un extra
    create: Crea un nuevo extra
    update: Actualiza un extra
    partial_update: Actualiza parcialmente un extra
    destroy: Elimina un extra
    """
    queryset = Extra.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'price']
    ordering = ['display_order', 'name']
    
    def get_queryset(self):
        """Optimiza queries"""
        return super().get_queryset().prefetch_related('products')
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado"""
        if self.action in ['create', 'update', 'partial_update']:
            return ExtraCreateUpdateSerializer
        return ExtraSerializer
    
    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Obtiene extras disponibles para un producto específico"""
        product_id = request.query_params.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'El parámetro "product_id" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        extras = self.get_queryset().filter(
            products__id=product_id,
            is_active=True
        )
        
        serializer = ExtraSerializer(extras, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_products(self, request, pk=None):
        """Asocia productos a un extra"""
        extra = self.get_object()
        product_ids = request.data.get('product_ids', [])
        
        if not product_ids:
            return Response(
                {'error': 'Se requiere una lista de product_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        extra.products.add(*product_ids)
        
        serializer = self.get_serializer(extra)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_products(self, request, pk=None):
        """Desasocia productos de un extra"""
        extra = self.get_object()
        product_ids = request.data.get('product_ids', [])
        
        if not product_ids:
            return Response(
                {'error': 'Se requiere una lista de product_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        extra.products.remove(*product_ids)
        
        serializer = self.get_serializer(extra)
        return Response(serializer.data)


class ComboViewSet(viewsets.ModelViewSet):
    """
    ViewSet para combos
    
    list: Lista todos los combos
    retrieve: Obtiene detalle de un combo
    create: Crea un nuevo combo
    update: Actualiza un combo
    partial_update: Actualiza parcialmente un combo
    destroy: Elimina un combo
    """
    queryset = Combo.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['is_active', 'is_featured']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'price', 'created_at']
    ordering = ['display_order', 'name']
    lookup_field = 'pk'  # ← CAMBIADO de 'slug' a 'pk'
    
    def get_queryset(self):
        """Optimiza queries"""
        queryset = super().get_queryset().prefetch_related(
            Prefetch(
                'combo_products',
                queryset=ComboProduct.objects.select_related('product')
            )
        )
        
        # Filtros adicionales
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado"""
        if self.action == 'list':
            return ComboListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ComboCreateUpdateSerializer
        return ComboDetailSerializer
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Obtiene combos destacados"""
        combos = self.get_queryset().filter(
            is_featured=True,
            is_active=True
        )[:10]
        
        serializer = ComboListSerializer(combos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):  # ← CAMBIADO slug a pk
        """Obtiene productos incluidos en el combo"""
        combo = self.get_object()
        combo_products = combo.combo_products.all().select_related('product')
        
        # Retornar información detallada de los productos
        data = []
        for cp in combo_products:
            data.append({
                'id': cp.id,
                'product': ProductListSerializer(cp.product).data,
                'quantity': cp.quantity,
                'is_selectable': cp.is_selectable,
                'display_order': cp.display_order
            })
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def calculate_savings(self, request):
        """Calcula ahorro de todos los combos"""
        combos = self.get_queryset().filter(is_active=True)
        
        data = []
        for combo in combos:
            individual_price = sum(
                cp.product.price * cp.quantity 
                for cp in combo.combo_products.all()
            )
            savings = individual_price - combo.price
            savings_percentage = (savings / individual_price * 100) if individual_price > 0 else 0
            
            data.append({
                'id': combo.id,
                'name': combo.name,
                'combo_price': float(combo.price),
                'individual_price': float(individual_price),
                'savings': float(savings),
                'savings_percentage': round(savings_percentage, 2)
            })
        
        return Response(data)


class MenuViewSet(viewsets.ViewSet):
    """
    ViewSet para obtener el menú completo
    Endpoints personalizados para el menú
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def full(self, request):
        """
        Obtiene el menú completo con todas las categorías y productos
        """
        categories = Category.objects.filter(is_active=True).order_by('display_order')
        
        data = []
        for category in categories:
            category_data = CategorySerializer(category).data
            # Explicitly filter active products
            products = category.products.filter(
                is_active=True,
                is_available=True
            ).prefetch_related('sizes', 'extras', 'images').order_by('display_order', 'name')
            
            category_data['products'] = ProductListSerializer(
                products,
                many=True
            ).data
            data.append(category_data)
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Obtiene un resumen del menú (solo categorías con conteos)
        """
        categories = Category.objects.filter(is_active=True).order_by('display_order')
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
