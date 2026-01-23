from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'printer'

# Router para ViewSets
router = DefaultRouter()
router.register(r'printers', views.PrinterViewSet, basename='printer')
router.register(r'jobs', views.PrintJobViewSet, basename='printjob')
router.register(r'cash-events', views.CashDrawerEventViewSet, basename='cashdrawerevent')

urlpatterns = [
    # ============================================================================
    # ENDPOINTS PARA EL AGENTE DE WINDOWS
    # ============================================================================
    path('agente/registrar/', views.agente_registrar, name='agente-registrar'),
    path('agente/registrar', views.agente_registrar),  # No slash support
    path('agente/trabajos/', views.agente_trabajos_pendientes, name='agente-trabajos'),
    path('agente/trabajos', views.agente_trabajos_pendientes),
    path('agente/resultado/', views.agente_reportar_resultado, name='agente-resultado'),
    path('agente/resultado', views.agente_reportar_resultado),
    path('agente/estado/', views.agente_estado, name='agente-estado'),
    path('agente/estado', views.agente_estado),
    path('agente/abrir-caja/', views.agente_abrir_caja, name='agente-abrir-caja'),
    path('agente/abrir-caja', views.agente_abrir_caja),
    
    # ============================================================================
    # APIS DE IMPRESIÓN DIRECTA
    # ============================================================================
    path('print/', views.PrintAPIView.as_view(), name='print'),
    path('print/receipt/', views.PrintReceiptView.as_view(), name='print-receipt'),
    path('print/label/', views.PrintLabelView.as_view(), name='print-label'),
    
    # ============================================================================
    # ENDPOINTS DE UTILIDAD
    # ============================================================================
    path('status/', views.print_status, name='print-status'),
    path('open-drawer/', views.open_cash_drawer, name='open-cash-drawer'),
    
    # ============================================================================
    # CONFIGURACIÓN GLOBAL
    # ============================================================================
    path('settings/', views.PrinterSettingsView.as_view(), name='printer-settings'),
    
    # ============================================================================
    # INCLUIR RUTAS DEL ROUTER (CRUD)
    # ============================================================================
    path('', include(router.urls)),
]