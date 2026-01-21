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
    queryset = LoyaltyAccount.objects.all()
    
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
            # Buscar cliente por cédula (campo identification_number en Customer)
            # Primero buscamos el cliente
            from apps.customers.models import Customer
            customer = Customer.objects.filter(identification_number=cedula).first()
            
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

        if account.points_balance < reward.points_cost:
            return Response({"error": "Puntos insuficientes"}, status=400)

        with transaction.atomic():
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
            
            # Issue Coupon
            import uuid
            code = f"LUXE-{uuid.uuid4().hex[:8].upper()}"
            coupon = UserCoupon.objects.create(
                customer=account.customer,
                reward_rule=reward,
                code=code
            )
            
        return Response(UserCouponSerializer(coupon).data)
