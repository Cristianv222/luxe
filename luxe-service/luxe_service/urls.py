from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('luxe/admin/', admin.site.urls),
    path('luxe/api/menu/', include('apps.inventario.urls')),  # Inventario (productos, categorías)
    
    # Auth Service Endpoints (Merged)
    path('auth/api/authentication/', include('apps.authentication.urls')),
    path('auth/api/users/', include('apps.users.urls')),
    path('auth/api/roles/', include('apps.roles.urls')),

    path('luxe/api/pos/', include('apps.pos.urls')),
    path('luxe/api/orders/', include('apps.orders.urls')),
    path('luxe/api/payments/', include('apps.payments.urls')),
    path('luxe/api/hardware/', include('apps.printer.urls')),
    path('luxe/api/customers/', include('apps.customers.urls')),
    path('luxe/api/loyalty/', include('apps.loyalty.urls')),
    path('luxe/api/integrations/', include('apps.integrations.urls')), # Light API
    path('luxe/api/sri/', include('apps.sri.urls')),

]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
