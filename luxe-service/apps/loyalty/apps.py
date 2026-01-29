from django.apps import AppConfig

class LoyaltyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.loyalty'
    verbose_name = 'Sistema de Fidelidad'

    def ready(self):
        try:
            import apps.loyalty.signals
        except ImportError:
            pass

