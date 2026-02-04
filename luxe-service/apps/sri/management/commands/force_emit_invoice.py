from django.core.management.base import BaseCommand
from apps.orders.models import Order
from apps.sri.services import SRIIntegrationService
import json

class Command(BaseCommand):
    help = 'Force emit invoice to SRI for a specific order'

    def add_arguments(self, parser):
        parser.add_argument('order_number', type=str, help='Order Number (e.g. ORD-123...)')

    def handle(self, *args, **options):
        order_number = options['order_number']
        
        try:
            order = Order.objects.get(order_number=order_number)
            self.stdout.write(f"🚀 Enviando factura para orden: {order_number}")
            
            # Forzamos el envío real
            try:
                sri_doc = SRIIntegrationService.emit_invoice(order)
                
                self.stdout.write("\n📡 Respuesta de API Vendo:")
                self.stdout.write(json.dumps(sri_doc.api_response, indent=2))
                
                if sri_doc.status == 'FAILED':
                     self.stdout.write(self.style.ERROR(f"\n❌ Error devuelto por la API: {sri_doc.error_message}"))
                else:
                     self.stdout.write(self.style.SUCCESS(f"\n✅ Factura autorizada/enviada. Estado: {sri_doc.status}"))
                     
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"\n❌ Error de conexión o proceso: {str(e)}"))

        except Order.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Orden {order_number} no encontrada"))
