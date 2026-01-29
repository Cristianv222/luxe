from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_config import BulkUpdateAccountsView, ClearInventoryView

# Crear el router para los ViewSets
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'sizes', views.SizeViewSet, basename='size')
router.register(r'extras', views.ExtraViewSet, basename='extra')
router.register(r'combos', views.ComboViewSet, basename='combo')
router.register(r'menu', views.MenuViewSet, basename='menu')

# URLs
urlpatterns = [
    # Health check y test endpoints
    path('health/', views.health_check, name='health-check'),
    path('test-auth/', views.test_auth_view, name='test-auth'),
    path('test-staff/', views.test_staff_view, name='test-staff'),
    
    # Configuración Global (priority before router)
    path('config/accounts/bulk-update/', BulkUpdateAccountsView.as_view(), name='bulk-update-accounts'),
    path('config/inventory/clear/', ClearInventoryView.as_view(), name='clear-inventory'),

    # Incluir las rutas del router
    path('', include(router.urls)),
    
    # Inventario
    path('inventory/export/excel/', views.InventoryExportExcelView.as_view(), name='inventory-export-excel'),
    path('inventory/export/pdf/', views.InventoryExportPDFView.as_view(), name='inventory-export-pdf'),
    path('inventory/import/excel/', views.InventoryImportExcelView.as_view(), name='inventory-import-excel'),
]
