from django.core.management.base import BaseCommand
from apps.integrations.models import MaytapiConfig

class Command(BaseCommand):
    help = 'Configura las credenciales de Maytapi'

    def handle(self, *args, **options):
        # Datos proporcionados por el usuario
        product_id = '9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71'
        token = 'd570e2e2-a96c-4da6-a5b2-eefc30e92d9b'
        api_url = 'https://api.maytapi.com/api/9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71'
        
        config, created = MaytapiConfig.objects.get_or_create(pk=1)
        
        config.product_id = product_id
        config.token = token
        config.api_url = api_url
        config.is_active = True
        config.save()
        
        action = "Creada" if created else "Actualizada"
        self.stdout.write(self.style.SUCCESS(f'Configuración {action} exitosamente.'))
