from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import (
    LoyaltyProgramConfig, 
    EarningRule, 
    EarningRuleType,
    RewardRule, 
    LoyaltyAccount, 
    PointTransaction, 
    UserCoupon
)
from .serializers import (
    LoyaltyAccountSerializer,
    LoyaltyAccountDetailSerializer,
    EarningRuleSerializer,
    EarningRuleTypeSerializer,
    RewardRuleSerializer,
    UserCouponSerializer
)
from .services import LoyaltyService

class LoyaltyAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet para configuración de reglas (Solo Admin)
    """
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['POST'])
    def reprocess_past_orders(self, request):
        """
        REINICIA Y RECALCULA todos los puntos desde cero basados en las órdenes pagadas.
        """
        from apps.orders.models import Order
        from django.db.models import Sum
        
        try:
            with transaction.atomic():
                # 1. Eliminar todas las transacciones de tipo 'EARN' (Ganancia)
                PointTransaction.objects.filter(transaction_type='EARN').delete()

                # 2. Resetear todas las cuentas
                # Para cada cuenta, recalculamos el balance basado en lo que queda (canjes, etc)
                # y reseteamos el total ganado.
                accounts = LoyaltyAccount.objects.all()
                for account in accounts:
                    # El balance actual es la suma de transacciones que NO son EARN (ajustes manuales, canjes)
                    other_tx_sum = PointTransaction.objects.filter(
                        account=account
                    ).exclude(transaction_type='EARN').aggregate(total=Sum('points'))['total'] or 0
                    
                    account.points_balance = other_tx_sum
                    account.total_points_earned = 0
                    account.save()

                # 3. Reprocesar todas las órdenes pagadas
                paid_orders = Order.objects.filter(payment_status='paid').order_by('created_at')
                
                processed_count = 0
                for order in paid_orders:
                    LoyaltyService.award_points_for_order(order)
                    processed_count += 1
                
            return Response({
                "message": "Sincronización completa: Puntos reiniciados y recalculados",
                "orders_processed": processed_count,
                "accounts_updated": accounts.count()
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EarningRuleTypeViewSet(LoyaltyAdminViewSet):
    queryset = EarningRuleType.objects.all()
    serializer_class = EarningRuleTypeSerializer

class EarningRuleViewSet(LoyaltyAdminViewSet):
    queryset = EarningRule.objects.all()
    serializer_class = EarningRuleSerializer

class RewardRuleViewSet(LoyaltyAdminViewSet):
    queryset = RewardRule.objects.all()
    serializer_class = RewardRuleSerializer

class LoyaltyAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver cuentas de fidelidad.
    """
    queryset = LoyaltyAccount.objects.all().select_related('customer')
    
    def get_queryset(self):
        return self.queryset.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LoyaltyAccountDetailSerializer
        return LoyaltyAccountSerializer

    @action(detail=False, methods=['POST'], permission_classes=[permissions.AllowAny])
    def check_balance_public(self, request):
        """
        Permite consultar puntos por cédula (público).
        Body: { "cedula": "1234567890" }
        """
        cedula = request.data.get('cedula')
        if not cedula:
            return Response({"error": "Cédula requerida"}, status=400)
            
        try:
            # Buscar cliente por cédula
            from apps.customers.models import Customer
            customer = Customer.objects.filter(cedula=cedula).first()
            
            if not customer:
                 return Response({"error": "Cliente no encontrado"}, status=404)
                 
            # Buscar cuenta de lealtad
            account = LoyaltyAccount.objects.get(customer=customer)
            serializer = LoyaltyAccountDetailSerializer(account)
            return Response(serializer.data)
            
        except LoyaltyAccount.DoesNotExist:
             return Response({"error": "El cliente no tiene cuenta de puntos activa"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['POST'])
    def calculate_earning_preview(self, request):
        """
        Calcula cuántos puntos ganaría una orden ficticia.
        Body: { "total_amount": 100.00 }
        """
        amount = request.data.get('total_amount')
        points = LoyaltyService.calculate_points_to_earn(amount)
        return Response({"points_to_earn": points})

    @action(detail=False, methods=['POST'])
    def redeem_reward(self, request):
        """
        Canjear puntos por un cupón.
        Body: { "reward_rule_id": 1, "customer_id": "uuid" }
        """
        reward_id = request.data.get('reward_rule_id')
        customer_id = request.data.get('customer_id')
        
        try:
            reward = RewardRule.objects.get(id=reward_id, is_active=True)
            account = LoyaltyAccount.objects.get(customer_id=customer_id)
        except (RewardRule.DoesNotExist, LoyaltyAccount.DoesNotExist):
            return Response({"error": "Recompensa o cuenta no válida"}, status=404)

        # Lógica de recompensa de cumpleaños
        is_free_redemption = False
        if reward.is_birthday_reward:
            customer = account.customer
            if not customer.birth_date:
                return Response({"error": "El cliente no tiene fecha de nacimiento registrada"}, status=400)
            
            from django.utils import timezone
            today = timezone.localtime().date()
            is_birthday = (customer.birth_date.day == today.day and customer.birth_date.month == today.month)
            
            if not is_birthday:
                 return Response({"error": "Esta recompensa solo es válida el día del cumpleaños"}, status=400)

            # Verificar si ya se usó este año
            if UserCoupon.objects.filter(customer=customer, reward_rule=reward, created_at__year=today.year).exists():
                 return Response({"error": "El regalo de cumpleaños ya fue canjeado este año"}, status=400)
            
            is_free_redemption = True

        if not is_free_redemption and account.points_balance < reward.points_cost:
            return Response({"error": "Puntos insuficientes"}, status=400)

        with transaction.atomic():
            if not is_free_redemption:
                # Deduct points
                account.points_balance -= reward.points_cost
                account.save()
                
                # Record transaction
                PointTransaction.objects.create(
                    account=account,
                    transaction_type='REDEEM',
                    points=-reward.points_cost,
                    description=f"Canje de recompensa: {reward.name}"
                )
            else:
                 # Registro de canje gratuito (0 puntos)
                 PointTransaction.objects.create(
                    account=account,
                    transaction_type='REDEEM',
                    points=0,
                    description=f"Canje de Cumpleaños: {reward.name}"
                 )
            
            # Issue Coupon
            import uuid
            code = f"LUXE-{uuid.uuid4().hex[:8].upper()}"
            coupon = UserCoupon.objects.create(
                customer=account.customer,
                reward_rule=reward,
                code=code
            )
            
        return Response(UserCouponSerializer(coupon).data)

    @action(detail=False, methods=['POST'], permission_classes=[permissions.AllowAny])
    def redeem_reward_public(self, request):
        """
        Canjear puntos por un cupón (público, por cédula).
        Body: { "cedula": "1234567890", "reward_rule_id": 1 }
        """
        cedula = request.data.get('cedula')
        reward_id = request.data.get('reward_rule_id')
        
        if not cedula or not reward_id:
            return Response({"error": "Cédula y reward_rule_id son requeridos"}, status=400)
        
        try:
            # Buscar cliente por cédula
            from apps.customers.models import Customer
            customer = Customer.objects.filter(cedula=cedula).first()
            
            if not customer:
                return Response({"error": "Cliente no encontrado"}, status=404)
            
            reward = RewardRule.objects.get(id=reward_id, is_active=True)
            account = LoyaltyAccount.objects.get(customer=customer)
        except RewardRule.DoesNotExist:
            return Response({"error": "Recompensa no encontrada o inactiva"}, status=404)
        except LoyaltyAccount.DoesNotExist:
            return Response({"error": "No tienes cuenta de puntos activa"}, status=404)

        # Lógica de recompensa de cumpleaños
        is_free_redemption = False
        if reward.is_birthday_reward:
            if not customer.birth_date:
                return Response({"error": "No tienes fecha de nacimiento registrada para validar el cumpleaños"}, status=400)
            
            from django.utils import timezone
            today = timezone.localtime().date()
            is_birthday = (customer.birth_date.day == today.day and customer.birth_date.month == today.month)
            
            if not is_birthday:
                 return Response({"error": "Este cupón de regalo solo está disponible el día de tu cumpleaños"}, status=400)

            # Verificar si ya se usó este año
            if UserCoupon.objects.filter(customer=customer, reward_rule=reward, created_at__year=today.year).exists():
                 return Response({"error": "Ya has canjeado tu regalo de cumpleaños este año"}, status=400)
            
            is_free_redemption = True

        if not is_free_redemption and account.points_balance < reward.points_cost:
            return Response({
                "error": f"Puntos insuficientes. Necesitas {reward.points_cost} puntos, tienes {account.points_balance}"
            }, status=400)

        with transaction.atomic():
            if not is_free_redemption:
                # Deducir puntos
                account.points_balance -= reward.points_cost
                account.save()
                
                # Registrar transacción
                PointTransaction.objects.create(
                    account=account,
                    transaction_type='REDEEM',
                    points=-reward.points_cost,
                    description=f"Canje de recompensa: {reward.name}"
                )
            else:
                # Registro de canje gratuito
                 PointTransaction.objects.create(
                    account=account,
                    transaction_type='REDEEM',
                    points=0,
                    description=f"Canje de Cumpleaños: {reward.name}"
                 )
            
            # Generar cupón con código único
            import uuid
            code = f"LUXE-{uuid.uuid4().hex[:8].upper()}"
            coupon = UserCoupon.objects.create(
                customer=customer,
                reward_rule=reward,
                code=code
            )
        
        return Response({
            "success": True,
            "message": f"¡Felicidades! Has canjeado '{reward.name}'" if not is_free_redemption else f"¡Feliz Cumpleaños! Disfruta tu '{reward.name}'",
            "coupon": UserCouponSerializer(coupon).data,
            "new_balance": account.points_balance
        })


