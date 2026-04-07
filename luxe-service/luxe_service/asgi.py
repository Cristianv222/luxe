import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import apps.notifications.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')

# Initialize Django ASGI application early to ensure AppRegistry is populated
# before importing consumers and routing.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            apps.notifications.routing.websocket_urlpatterns
        )
    ),
})
