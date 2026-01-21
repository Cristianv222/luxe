from django.core.management.base import BaseCommand
from apps.whatsapp_bot.models import RemoteCustomer
from apps.whatsapp_bot.models_config import RemoteWhatsAppSettings
from django.utils import timezone
import requests
import json

class Command(BaseCommand):
    help = 'Checks for birthdays and sends WhatsApp congratulations using WPPConnect'

    def handle(self, *args, **options):
        # 1. Load Configuration from Luxe DB
        try:
            config = RemoteWhatsAppSettings.objects.using('luxe_db').first()
        except Exception:
            self.stdout.write(self.style.WARNING("⚠️ No configuration found in Luxe DB. Using defaults."))
            config = None

        if config and not config.is_active:
            self.stdout.write(self.style.WARNING("⏹️ Automation is disabled in settings."))
            return

        session_name = config.session_name if config else 'luxe_session'
        message_template = config.birthday_message_template if config else '🎉 ¡Feliz Cumpleaños {first_name}!'

        # 2. Check for Birthdays
        today = timezone.localtime().date()
        self.stdout.write(f"🔍 Checking birthdays for: {today.strftime('%d/%m')}")

        birthday_people = RemoteCustomer.objects.using('luxe_db').filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
            is_active=True
        )

        count = 0
        wpp_url = f"http://luxe_wppconnect:21465/api/{session_name}/send-message"
        
        # Simple check if WPPConnect is up (Token generation usually required first)
        # Authentication: WPPConnect creates a token that we need to use.
        # For this MVP, we assume the token is generated via the web UI step we added to Admin.
        # But we need to pass that token here. 
        # Since we don't have a secure way to share the token yet between services automatically without more complex logic,
        # we will assume a known secret or we will just try to hit the endpoint (some configs allow no-auth if local).
        # Assuming we need to Generate Token first...
        # Let's try to generate token dynamically for the session 'luxe_session' using the secret key
        
        token = self.get_session_token(session_name)
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

        for customer in birthday_people:
            full_name = f"{customer.first_name} {customer.last_name}"
            
            # Format message
            try:
                message = message_template.format(first_name=customer.first_name, last_name=customer.last_name)
            except KeyError:
                message = message_template # Fallback if format fails
                
            payload = {
                "phone": self.format_phone(customer.phone),
                "message": message,
                "isGroup": False
            }

            try:
                self.stdout.write(f"📤 Sending to {full_name}...")
                response = requests.post(wpp_url, json=payload, headers=headers, timeout=10)
                
                if response.status_code == 201 or response.status_code == 200:
                    self.stdout.write(self.style.SUCCESS(f"✅ Sent to {full_name}"))
                    count += 1
                else:
                    self.stdout.write(self.style.ERROR(f"❌ Failed: {response.text}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Connection Error: {e}"))

        self.stdout.write(self.style.SUCCESS(f"✨ Completed. Sent {count} messages."))

    def get_session_token(self, session):
        # In a real scenario, we would store this token in Redis or DB.
        # For now, we utilize the generate-token endpoint with the secret key defined in docker-compose.
        try:
            url = f"http://luxe_wppconnect:21465/api/{session}/generate-token"
            # It usually requires a secret key in header or body depending on version.
            # WPPConnect server by default uses SECRET_KEY env var validation if configured.
            # Simplified: We just try to get the token or assume we have one if we scanned the QR.
            # If we need to start session:
            start_response = requests.post(f"http://luxe_wppconnect:21465/api/{session}/start-session", 
                                           headers={'Authorization': 'Bearer luxe_wpp_secret'}, # Using secret as initial bearer
                                           json={"webhook": None})
            if start_response.status_code == 200:
                data = start_response.json()
                return data.get('token') or data.get('session') # Varies by version
            return "luxe_wpp_secret" # Fallback
        except:
            return "luxe_wpp_secret"

    def format_phone(self, phone):
        # Basic formatter for 593 (Ecuador)
        clean = ''.join(filter(str.isdigit, phone))
        if clean.startswith('09'):
            return '593' + clean[1:]
        if not clean.startswith('593'):
            return '593' + clean
        return clean
