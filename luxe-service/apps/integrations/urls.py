
from django.urls import path
from . import views

urlpatterns = [
    path('maytapi/config/', views.MaytapiConfigView.as_view(), name='maytapi-config'),
    path('maytapi/test/', views.TestMessageView.as_view(), name='maytapi-test'),
    path('maytapi/run-birthdays/', views.ProcessBirthdayGreetingsView.as_view(), name='run-birthdays'),
    
    # Endpoints para Frontend WhatsAppConfig.js (adaptados a lo que pide el frontend)
    # El frontend llama a /api/luxe/api/integrations/whatsapp/...
    # Aquí estamos en apps.integrations.urls, prefix es integrations/.
    # Entonces urls deben ser whatsapp/history/, etc.
    
    path('whatsapp/history/', views.WhatsAppHistoryView.as_view(), name='whatsapp-history'),
    path('whatsapp/status/', views.WhatsAppStatusView.as_view(), name='whatsapp-status'),
    path('whatsapp/qrcode/', views.WhatsAppQrView.as_view(), name='whatsapp-qrcode'),
    
    # Alias por si el frontend llama a maytapi/history/ (consistencia)
    path('maytapi/history/', views.WhatsAppHistoryView.as_view(), name='maytapi-history'),
]

