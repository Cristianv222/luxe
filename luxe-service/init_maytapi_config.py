from apps.integrations.models import MaytapiConfig

def init_maytapi():
    print("Iniciando configuración automática de Maytapi...")
    
    # Datos proporcionados por el usuario
    product_id = '9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71'
    token = 'd570e2e2-a96c-4da6-a5b2-eefc30e92d9b'
    # La API URL base correcta suele ser sin el endpoint final, pero guardaremos
    # la que dio el usuario asegurando el formato
    api_url = 'https://api.maytapi.com/api/9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71'
    
    config, created = MaytapiConfig.objects.get_or_create(pk=1)
    
    config.product_id = product_id
    config.token = token
    config.api_url = api_url
    config.is_active = True
    config.save()
    
    action = "Creada" if created else "Actualizada"
    print(f"Configuración {action} exitosamente.")
    print(f"Product ID: {config.product_id}")
    print(f"Token: {config.token[:5]}... (oculto)")

if __name__ == '__main__':
    init_maytapi()
