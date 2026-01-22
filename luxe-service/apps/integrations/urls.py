from django.urls import path
from . import views

urlpatterns = [
    path('whatsapp/settings/', views.WhatsAppSettingsView.as_view(), name='whatsapp-settings'),
    path('whatsapp/settings/<int:pk>/', views.WhatsAppSettingsDetailView.as_view(), name='whatsapp-settings-detail'),
    path('whatsapp/status/', views.WhatsAppStatusView.as_view(), name='whatsapp-status'),
    path('whatsapp/start-session/', views.WhatsAppStartSessionView.as_view(), name='whatsapp-start-session'),
    path('whatsapp/qrcode/', views.WhatsAppQRCodeView.as_view(), name='whatsapp-qrcode'),
    path('whatsapp/test-message/', views.WhatsAppTestMessageView.as_view(), name='whatsapp-test-message'),
    path('whatsapp/logout/', views.WhatsAppLogoutView.as_view(), name='whatsapp-logout'),
    path('whatsapp/history/', views.MessageHistoryListView.as_view(), name='whatsapp-history'),
]
