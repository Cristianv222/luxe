from django.db import transaction
from django.db.models import Sum
from apps.loyalty.models import LoyaltyAccount, EarningRule, PointTransaction

def sync_loyalty_cumulative(customer):
    """
    Sincroniza los puntos de lealtad de un cliente basándose en su Gasto Total acumulado.
    REGLA DE NEGOCIO: (Total Spent / Rule Step) * Points to Award.
    """
    # 1. Buscar regla activa
    monto_rule = EarningRule.objects.filter(is_active=True, amount_step__gt=0).first()
    if not monto_rule:
        return False, "No hay una regla activa por monto."

    step = float(monto_rule.amount_step)
    award = monto_rule.points_to_award
    total_spent = float(customer.total_spent or 0)
    
    # 2. Calcular puntos totales que debería haber ganado
    new_total_earned = int(total_spent / step) * award

    with transaction.atomic():
        account, _ = LoyaltyAccount.objects.get_or_create(customer=customer)
        
        # 3. Limpiar transacciones de ganancia (EARN) anteriores para este cliente
        # Esto asegura que el historial coincida con el nuevo cálculo global
        PointTransaction.objects.filter(account=account, transaction_type='EARN').delete()
        
        # 4. Obtener suma de transacciones negativas (canjes/expiraciones)
        neg_transactions = PointTransaction.objects.filter(
            account=account, 
            points__lt=0
        ).aggregate(Sum('points'))['points__sum'] or 0
        
        # 5. Actualizar cuenta
        account.total_points_earned = new_total_earned
        account.points_balance = max(0, new_total_earned + neg_transactions)
        account.save()
        
        # 6. Crear transacción consolidada para que el historial sea coherente
        if new_total_earned > 0:
            PointTransaction.objects.create(
                account=account,
                transaction_type='EARN',
                points=new_total_earned,
                description=f"Sincronización Global: Puntos basados en Gasto Total (${total_spent:.2f})"
            )
            
        # 7. Sincronizar sistema antiguo (si existe)
        if hasattr(customer, 'loyalty'):
            old_loyalty = customer.loyalty
            old_loyalty.points_balance = account.points_balance
            old_loyalty.save()
            
    return True, account.points_balance
