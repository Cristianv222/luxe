from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class WhatsAppProvider(ABC):
    @abstractmethod
    def send_message(self, phone_number: str, message: str):
        pass

import requests
from django.conf import settings

class RestAPIWhatsAppProvider(WhatsAppProvider):
    """
    Provider that connects to a WhatsApp Web Gateway (like GreenAPI, UltraMsg, or local WppConnect).
    This allows sending messages from the user's personal number (0994712899) via HTTP.
    """
    def send_message(self, phone_number: str, message: str):
        api_url = getattr(settings, 'WHATSAPP_API_URL', '')
        api_token = getattr(settings, 'WHATSAPP_API_TOKEN', '')
        
        if not api_url:
            logger.warning("WHATSAPP_API_URL not configured. Message logged but not sent.")
            return False

        # Example payload structure (compatible with many gateways)
        payload = {
            "phone": phone_number,
            "message": message,
            "sender": "0994712899" # The user's number
        }
        
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(api_url, json=payload, headers=headers, timeout=10)
            if response.status_code in [200, 201]:
                return True
            else:
                logger.error(f"WhatsApp API Error: {response.text}")
                # Fallback print for debugging
                print(f"[FAIL-SAFE LOG] To: {phone_number} | Msg: {message}")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to WhatsApp API: {e}")
            return False

class ServiceFactory:
    @staticmethod
    def get_whatsapp_provider():
        provider_type = getattr(settings, 'WHATSAPP_PROVIDER', 'console')
        
        if provider_type == 'rest_api':
            return RestAPIWhatsAppProvider()
        return ConsoleWhatsAppProvider()
