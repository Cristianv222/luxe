from django.core.management.base import BaseCommand
from apps.whatsapp_bot.models import RemoteCustomer, BirthdaySentHistory
from apps.whatsapp_bot.models_config import RemoteWhatsAppSettings
from django.utils import timezone
import requests
import json

class Command(BaseCommand):
    help = 'Checks for birthdays and sends WhatsApp congratulations using WPPConnect'

    def handle(self, *args, **options):
        # 1. Load Configuration from Luxe DB
        config = self.get_whatsapp_settings()

        if config and not config.is_active:
            self.stdout.write(self.style.WARNING("⏹️ Automation is disabled in settings."))
            return

        session_name = config.session_name if config else 'luxe_session'
        message_template = config.birthday_message_template if config else '🎉 ¡Feliz Cumpleaños {first_name}!'

        # 2. Check Session Status before proceeding
        if not self.check_session_status(session_name):
            self.stdout.write(self.style.ERROR(f"❌ WhatsApp Session '{session_name}' is not CONNECTED. Skipping birthday task."))
            self.stdout.write(self.style.WARNING("💡 Please scan the QR code in the settings panel to activate the session."))
            return

        # 3. Check for Birthdays
        today = timezone.localtime().date()
        self.stdout.write(f"🔍 Checking birthdays for: {today.strftime('%d/%m')}")

        birthday_people = RemoteCustomer.objects.using('luxe_db').filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
            is_active=True
        )

        if not birthday_people.exists():
            self.stdout.write("✨ No birthdays today. Nothing to do.")
            return

        count = 0
        wpp_url = f"http://luxe_wppconnect:21465/api/{session_name}/send-message"
        
        token = self.get_session_token(session_name)
        if not token:
            self.stdout.write(self.style.ERROR("❌ Could not get authentication token. Skipping."))
            return

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
                    
                    # Log to history
                    BirthdaySentHistory.objects.create(
                        customer_id=customer.id,
                        customer_name=full_name,
                        phone=customer.phone,
                        message=message,
                        status='sent'
                    )
                    
                    count += 1
                else:
                    self.stdout.write(self.style.ERROR(f"❌ Failed: {response.text}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Connection Error: {e}"))

        self.stdout.write(self.style.SUCCESS(f"✨ Completed. Sent {count} messages."))

    def get_whatsapp_settings(self):
        try:
            return RemoteWhatsAppSettings.objects.using('luxe_db').first()
        except Exception:
            return None

    def check_session_status(self, session):
        """Checks if the WPPConnect session is actually connected"""
        try:
            # First try the status endpoint
            token = self.get_session_token(session)
            if not token:
                self.stdout.write("⚠️ Could not get token for status check")
                return False
                
            headers = {'Authorization': f'Bearer {token}'}
            
            # Try the status endpoint
            url = f"http://luxe_wppconnect:21465/api/{session}/status-session"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.stdout.write(f"📊 Session status: {data}")
                
                # WPPConnect returns status in different formats
                status = data.get('status')
                if status == 'CONNECTED' or status == 'isLogged' or status is True:
                    return True
                    
                # Also check for nested response
                if isinstance(data.get('response'), dict):
                    inner_status = data['response'].get('status')
                    if inner_status == 'CONNECTED' or inner_status == 'isLogged':
                        return True
                
            return False
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Status check error: {e}"))
            return False

    def get_session_token(self, session):
        try:
            secret = "THISISMYSECURETOKEN"
            url = f"http://luxe_wppconnect:21465/api/{session}/{secret}/generate-token"
            response = requests.post(url, timeout=10)
            if response.status_code in [200, 201]:
                return response.json().get('token')
            return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error generating token: {e}"))
            return None

    def format_phone(self, phone):
        # Basic formatter for 593 (Ecuador)
        if not phone: return ""
        clean = ''.join(filter(str.isdigit, phone))
        if clean.startswith('09'):
            return '593' + clean[1:]
        if not clean.startswith('593'):
            return '593' + clean
        return clean
