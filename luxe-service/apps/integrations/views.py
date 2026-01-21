from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import WhatsAppSettings
from .serializers import WhatsAppSettingsSerializer
import requests

def get_wpp_token(session_name):
    """
    Generate a dynamic token for WPPConnect authentication
    """
    secret = "THISISMYSECURETOKEN" # Use default as the env var is not being picked up correctly
    url = f"http://luxe_wppconnect:21465/api/{session_name}/{secret}/generate-token"
    print(f"DEBUG: Generating token for {session_name} at {url}")
    try:
        response = requests.post(url, timeout=10)
        print(f"DEBUG: WPP Auth Response ({response.status_code}): {response.text}")
        if response.status_code in [200, 201]:
            try:
                token = response.json().get('token')
                if token:
                    return token
                print("DEBUG: Token field missing in response")
            except Exception as json_err:
                print(f"Error parsing WPP token JSON: {str(json_err)}")
    except Exception as e:
        print(f"Error generating WPP token: {str(e)}")
    return None

class WhatsAppSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve current WhatsApp configuration
    PUT/PATCH: Update configuration
    """
    serializer_class = WhatsAppSettingsSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get_object(self):
        # Singleton pattern - get or create the only instance
        obj, created = WhatsAppSettings.objects.get_or_create(pk=1)
        return obj

class WhatsAppStatusView(APIView):
    """
    Check the connection status of WhatsApp session
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Bypass authentication to avoid 401
    
    def get(self, request):
        try:
            settings = WhatsAppSettings.objects.first()
            session_name = settings.session_name if settings else 'luxe_session'
            
            token = get_wpp_token(session_name)
            if not token:
                return Response({
                    'status': 'offline',
                    'message': 'Failed to authenticate with WhatsApp service (Check Secret Key)'
                }, status=status.HTTP_200_OK)

            # Try to get status from WPPConnect
            url = f"http://luxe_wppconnect:21465/api/{session_name}/status-session"
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    return Response({
                        'status': 'connected' if data.get('status') == 'CONNECTED' else 'disconnected',
                        'session': session_name,
                        'details': data
                    })
                except Exception:
                    return Response({
                        'status': 'error',
                        'message': 'Invalid JSON response from WPPConnect status',
                        'raw': response.text[:100]
                    })
            else:
                return Response({
                    'status': 'error',
                    'message': f'WPPConnect returned {response.status_code}',
                    'details': response.text[:100]
                }, status=status.HTTP_200_OK)
        except requests.exceptions.RequestException as e:
            print(f"DEBUG: Request failed: {str(e)}")
            return Response({
                'status': 'offline',
                'message': 'WPPConnect service is not reachable',
                'error': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class WhatsAppStartSessionView(APIView):
    """
    Start a new WhatsApp session and get QR code
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Bypass authentication to avoid 401
    
    def post(self, request):
        try:
            settings = WhatsAppSettings.objects.first()
            session_name = settings.session_name if settings else 'luxe_session'
            
            token = get_wpp_token(session_name)
            if not token:
                return Response({
                    'status': 'error',
                    'message': 'Authentication failed with WPPConnect'
                }, status=status.HTTP_200_OK)

            url = f"http://luxe_wppconnect:21465/api/{session_name}/start-session"
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.post(url, json={"webhook": None}, headers=headers, timeout=30)
            
            try:
                return Response(response.json(), status=response.status_code)
            except Exception:
                return Response({
                    'status': 'initializing',
                    'message': 'Session started, preparing QR...',
                    'raw': response.text[:100]
                }, status=response.status_code)
        except requests.exceptions.RequestException as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class WhatsAppQRCodeView(APIView):
    """
    Get QR code for scanning
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            settings = WhatsAppSettings.objects.first()
            session_name = settings.session_name if settings else 'luxe_session'
            
            token = get_wpp_token(session_name)
            if not token:
                return Response({'status': 'error', 'message': 'Auth failed'}, status=status.HTTP_200_OK)

            # WPPConnect tiene varios formatos, intentamos capturarlos todos
            url = f"http://luxe_wppconnect:21465/api/{session_name}/qrcode-session"
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                # Si la respuesta es una imagen binaria (comienza con el marcador de PNG)
                if response.content.startswith(b'\x89PNG'):
                    import base64
                    encoded_string = base64.b64encode(response.content).decode('utf-8')
                    return Response({
                        'status': 'success',
                        'qrcode': f"data:image/png;base64,{encoded_string}"
                    })
                
                # Si no es binario, intentamos procesar como JSON
                try:
                    data = response.json()
                    qr_raw = data.get('qrcode') or data.get('base64') or data.get('code') or data.get('urlCode')
                    
                    if qr_raw:
                        if isinstance(qr_raw, str) and qr_raw.startswith('iVBORw'):
                            qr_raw = f"data:image/png;base64,{qr_raw}"
                        
                        return Response({
                            'status': 'success',
                            'qrcode': qr_raw
                        })
                except Exception as json_err:
                    # Si falla el JSON y no era imagen, devolvemos waiting
                    return Response({
                        'status': 'waiting',
                        'message': 'QR not ready yet (streaming)',
                        'qrcode': None
                    }, status=status.HTTP_200_OK)
            
            # Si no hay QR pero tampoco hay error de conexión, devolvemos un estado vacío para que el frontend siga intentando
            return Response({
                'status': 'waiting',
                'qrcode': None
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e),
                'qrcode': None
            }, status=status.HTTP_200_OK)

class WhatsAppTestMessageView(APIView):
    """
    Send a test message to verify connection
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        phone = request.data.get('phone')
        message = request.data.get('message', '🧪 Mensaje de prueba desde Luxe Sistema')
        
        if not phone:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            settings = WhatsAppSettings.objects.first()
            session_name = settings.session_name if settings else 'luxe_session'
            
            token = get_wpp_token(session_name)
            if not token:
                return Response({'error': 'Authentication failed'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Format phone number
            clean_phone = ''.join(filter(str.isdigit, phone))
            if clean_phone.startswith('09'):
                clean_phone = '593' + clean_phone[1:]
            elif not clean_phone.startswith('593'):
                clean_phone = '593' + clean_phone
            
            url = f"http://luxe_wppconnect:21465/api/{session_name}/send-message"
            headers = {'Authorization': f'Bearer {token}'}
            payload = {
                "phone": clean_phone,
                "message": message,
                "isGroup": False
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code in [200, 201]:
                return Response({
                    'status': 'sent',
                    'message': f'Test message sent to {phone}'
                })
            else:
                return Response({
                    'status': 'failed',
                    'details': response.json()
                }, status=status.HTTP_400_BAD_REQUEST)
        except requests.exceptions.RequestException as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class WhatsAppLogoutView(APIView):
    """
    Logout and unlink the current WhatsApp session
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            settings = WhatsAppSettings.objects.first()
            session_name = settings.session_name if settings else 'luxe_session'
            
            token = get_wpp_token(session_name)
            if not token:
                return Response({'error': 'Authentication failed'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            url = f"http://luxe_wppconnect:21465/api/{session_name}/logout-session"
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.post(url, headers=headers, timeout=20)
            
            return Response(response.json(), status=response.status_code)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

