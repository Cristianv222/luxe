from django.core.management.base import BaseCommand
from apps.integrations.utils import check_and_send_birthday_greetings

class Command(BaseCommand):
    help = 'Revisa los cumpleaños del día y envía mensajes de WhatsApp vía Maytapi'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando proceso de felicitaciones...")
        try:
            count = check_and_send_birthday_greetings()
            if count > 0:
                self.stdout.write(self.style.SUCCESS(f'¡Éxito! Se enviaron {count} mensajes de cumpleaños.'))
            else:
                self.stdout.write(self.style.WARNING('No se enviaron mensajes (no hay cumpleañeros o falta configuración).'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error ejecutando el comando: {str(e)}'))
