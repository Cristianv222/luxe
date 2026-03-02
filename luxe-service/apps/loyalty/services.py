import logging
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from .models import EarningRule, LoyaltyAccount, PointTransaction, LoyaltyProgramConfig

logger = logging.getLogger(__name__)

class LoyaltyService:
    @staticmethod
    def calculate_points_to_earn(order):
        """
        Calcula los puntos que se ganarían por una orden dada.
        REGLA DE NEGOCIO: Solo se aplica la regla con el monto mínimo (umbral) más alto 
        que el cliente haya superado, FILTRANDO por el canal de venta (Web vs POS).
        """
        config = LoyaltyProgramConfig.objects.first()
        if config and not config.is_active:
            logger.info("Loyalty program is inactive.")
            return 0
            
        if not order:
            return 0

        try:
            amount = float(order.total)
        except (ValueError, TypeError):
            return 0
            
        # Determinar el canal de la orden para filtrar reglas
        # Asumimos que order.source existe (agregado anteriormente). Si no, fallback a ALL.
        # Mapeo: 'web' -> 'WEB', 'pos' -> 'POS', otros -> 'ALL'
        order_source_code = 'ALL'
        if hasattr(order, 'source'):
             if order.source == 'web':
                 order_source_code = 'WEB'
             elif order.source == 'pos':
                 order_source_code = 'POS'
        
        # Filtramos reglas activas que coincidan con el canal O sean para todos
        active_rules = EarningRule.objects.filter(
            is_active=True, 
            order_source__in=[order_source_code, 'ALL']
        ).select_related('rule_type')
        
        # 1. Encontrar todas las reglas que el monto supera
        applicable_rules = []
        for rule in active_rules:
            if amount >= float(rule.min_order_value):
                applicable_rules.append(rule)
        
        if not applicable_rules:
            return 0
            
        # 2. Seleccionar la MEJOR regla (la que tenga el min_order_value más alto)
        # IMPORTANTE: Si hay empate en montos, priorizamos la regla específica del canal sobre 'ALL'
        # Sort priority: 1. Min Value (Desc), 2. is Specific channel (WEB/POS > ALL)
        def sort_key(r):
            source_priority = 1 if r.order_source == order_source_code else 0
            return (float(r.min_order_value), source_priority)

        applicable_rules.sort(key=sort_key, reverse=True)
        best_rule = applicable_rules[0]
        
        logger.info(f"Applying best rule: {best_rule.name} (Source: {best_rule.order_source}, Threshold: {best_rule.min_order_value}) for amount {amount}")

        # 3. Calcular puntos según el tipo de esa única regla (Hardcodeado a petición)
        points_to_earn = 0
        
        code = best_rule.rule_type.code.upper() if best_rule.rule_type and best_rule.rule_type.code else ''
        nombre = best_rule.rule_type.name.upper() if best_rule.rule_type and best_rule.rule_type.name else ''
        
        # Hardcodeamos dos lógicas principales: "Por Monto" (acumulable por cada X dolares) y "Por Factura Total" (fijo)
        # Determinamos si es por monto verificando si el nombre o código hace referencia, o si configuró el amount_step en la BD.
        es_por_monto = (
            'MONTO' in code or 'AMOUNT' in code or 
            'MONTO' in nombre or 
            (best_rule.amount_step and best_rule.amount_step > 0)
        )

        if es_por_monto:
            # REGLA 1: POR MONTO (ej: 1 punto por cada $15)
            step = float(best_rule.amount_step) if best_rule.amount_step and best_rule.amount_step > 0 else 15.0
            multiplier = int(amount / step)
            points_to_earn = (multiplier * best_rule.points_to_award)
        else:
            # REGLA 2: POR FACTURA TOTAL (ej: un puntaje fijo solo por enviar la factura mayor al min_order_value)
            points_to_earn = best_rule.points_to_award
        
        return points_to_earn

    @staticmethod
    def award_points_for_order(order):
        """
        Otorga puntos a un usuario cuando una orden es pagada.
        """
        if not order or not order.customer:
            return
            
        # Check if points already awarded for this order
        if PointTransaction.objects.filter(related_order_id=str(order.id), transaction_type='EARN').exists():
            return

        # Ensure order total is refreshed/correct
        points_to_earn = LoyaltyService.calculate_points_to_earn(order)
        
        if points_to_earn <= 0:
            return

        try:
            with transaction.atomic():
                # Get or Create Loyalty Account linked to Customer
                account, created = LoyaltyAccount.objects.get_or_create(customer=order.customer)
                
                # Update balance
                account.points_balance += points_to_earn
                account.total_points_earned += points_to_earn
                account.save()
                
                # Record transaction
                PointTransaction.objects.create(
                    account=account,
                    transaction_type='EARN',
                    points=points_to_earn,
                    description=f"Ganancia por Orden #{order.order_number}",
                    related_order_id=str(order.id)
                )
                logger.info(f"Awarded {points_to_earn} points to {order.customer} for order {order.order_number}")
        except Exception as e:
            logger.error(f"Error awarding loyalty points: {str(e)}")

