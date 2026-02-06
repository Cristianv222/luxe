from django.core.management.base import BaseCommand
from apps.customers.models import Customer
from apps.orders.signals import update_customer_stats
import logging

class Command(BaseCommand):
    help = 'Recalcula las estadísticas de todos los clientes basándose en sus órdenes existentes'

    def handle(self, *args, **options):
        customers = Customer.objects.all()
        count = customers.count()
        self.stdout.write(f"Iniciando recálculo para {count} clientes...")
        
        updated = 0
        for customer in customers:
             try:
                 # Esta función recalcula total_spent, total_orders, etc. desde cero
                 # basándose solo en las órdenes con payment_status='paid' existentes.
                 update_customer_stats(customer)
                 updated += 1
                 if updated % 100 == 0:
                     self.stdout.write(f"Procesados {updated}/{count}")
             except Exception as e:
                 self.stdout.write(self.style.ERROR(f"Error cliente {customer.id} / {customer.email}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Finalizado. {updated} clientes actualizados."))
