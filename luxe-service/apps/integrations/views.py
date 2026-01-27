
import logging
import requests
from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import MaytapiConfig, WhatsAppLog
from .serializers import MaytapiConfigSerializer, WhatsAppLogSerializer
from django.conf import settings
from datetime import date
from apps.customers.models import Customer

logger = logging.getLogger(__name__)

class MaytapiConfigView(generics.RetrieveUpdateAPIView):
    """
    Vista para obtener y actualizar la configuración de Maytapi.
    """
    serializer_class = MaytapiConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, created = MaytapiConfig.objects.get_or_create(pk=1)
        return obj

class WhatsAppHistoryView(generics.ListAPIView):
    """
    Vista para obtener el historial de mensajes.
    """
    serializer_class = WhatsAppLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    queryset = WhatsAppLog.objects.all().order_by('-created_at')[:100] # Limit to last 100 for performance

class WhatsAppStatusView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = MaytapiConfig.objects.first()
        if not config or not config.phone_id:
            return Response({'status': 'unknown', 'message': 'No configurado'}, status=200)
        
        url = f"{config.api_url.rstrip('/')}/{config.phone_id}/status"
        headers = {'x-maytapi-key': config.token.strip()}
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            # Maytapi devuelve: {"connected": true, ...}
            return Response(resp.json(), status=resp.status_code)
        except Exception as e:
            return Response({'error': str(e)}, status=503)

class WhatsAppQrView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = MaytapiConfig.objects.first()
        if not config or not config.phone_id:
            return Response({'error': 'No configurado'}, status=400)
        
        # Ojo: QR Code se obtiene usualmente si no está conectado.
        # Endpoint: /{phone_id}/qrCode
        url = f"{config.api_url.rstrip('/')}/{config.phone_id}/qrCode"
        headers = {'x-maytapi-key': config.token.strip()}
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            return Response(resp.json(), status=resp.status_code)
        except Exception as e:
            return Response({'error': str(e)}, status=503)

class TestMessageView(views.APIView):
    """
    Vista para probar el envío de mensajes desde el panel.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .utils import normalize_ec_phone
        
        phone = request.data.get('phone')
        message = request.data.get('message', 'Hola desde Luxe! Prueba de conexión Maytapi.')
        
        if not phone:
            return Response({'error': 'Teléfono requerido'}, status=status.HTTP_400_BAD_REQUEST)

        phone = normalize_ec_phone(phone)
        
        config = MaytapiConfig.objects.first()
        if not config or not config.is_active:
            return Response({'error': 'Maytapi no configurado o inactivo'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        base_url = config.api_url.rstrip('/')
        
        # Auto-detect phone_id logic (Simplified for brevity, same as before)
        if not config.phone_id:
            try:
                headers_check = {'x-maytapi-key': config.token.strip(), 'Content-Type': 'application/json'}
                phones_resp = requests.get(base_url, headers=headers_check)
                if phones_resp.status_code == 200:
                    phones_data = phones_resp.json()
                    phones_list = phones_data if isinstance(phones_data, list) else []
                    if phones_list:
                        config.phone_id = phones_list[0].get('id')
                        config.save()
            except:
                pass

        target_url = f"{base_url}/sendMessage"
        if config.phone_id:
             target_url = f"{base_url}/{config.phone_id}/sendMessage"

        headers = {
            'x-maytapi-key': config.token.strip(),
            'Content-Type': 'application/json'
        }
        
        payload = {
            "to_number": phone,
            "type": "text",
            "message": message
        }

        try:
            logger.info(f"Test Msg to {target_url}")
            response = requests.post(target_url, json=payload, headers=headers)
            
            status_text = 'sent' if response.status_code in [200, 201, 202] else 'failed'
            
            WhatsAppLog.objects.create(
                phone_number=phone,
                message=message,
                message_type='TEST',
                status=status_text,
                response_data=response.text
            )
            
            response.raise_for_status()
            return Response(response.json())

        except Exception as e:
            logger.error(f"Error test msg: {e}")
            WhatsAppLog.objects.create(
                phone_number=phone,
                message=message,
                message_type='TEST',
                status='error',
                response_data=str(e)
            )
            return Response({'error': str(e)}, status=500)

class ProcessBirthdayGreetingsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from .utils import check_and_send_birthday_greetings
            count = check_and_send_birthday_greetings()
            return Response({'message': f'Proceso ejecutado. {count} mensajes enviados.'})
        except Exception as e:
             import logging
             logger = logging.getLogger(__name__)
             logger.error(f"Error in run-birthdays: {e}", exc_info=True)
             return Response({'error': f'Error interno: {str(e)}'}, status=500)
