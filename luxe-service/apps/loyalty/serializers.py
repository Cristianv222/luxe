from rest_framework import serializers
from .models import (
    LoyaltyProgramConfig, 
    EarningRule, 
    EarningRuleType,
    RewardRule, 
    LoyaltyAccount, 
    PointTransaction, 
    UserCoupon
)

class EarningRuleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EarningRuleType
        fields = '__all__'

class EarningRuleSerializer(serializers.ModelSerializer):
    rule_type_code = serializers.CharField(source='rule_type.code', read_only=True)
    rule_type_name = serializers.CharField(source='rule_type.name', read_only=True)

    class Meta:
        model = EarningRule
        fields = '__all__'

class RewardRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardRule
        fields = '__all__'

class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = '__all__'

class UserCouponSerializer(serializers.ModelSerializer):
    reward_name = serializers.CharField(source='reward_rule.name', read_only=True)
    discount_value = serializers.DecimalField(source='reward_rule.discount_value', max_digits=10, decimal_places=2, read_only=True)
    reward_type = serializers.CharField(source='reward_rule.reward_type', read_only=True)

    class Meta:
        model = UserCoupon
        fields = ['id', 'code', 'customer', 'reward_rule', 'reward_name', 'discount_value', 'reward_type', 'is_used', 'expires_at', 'created_at']

class LoyaltyAccountSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_cedula = serializers.CharField(source='customer.cedula', read_only=True)
    
    class Meta:
        model = LoyaltyAccount
        fields = ['id', 'customer', 'customer_name', 'customer_cedula', 'points_balance', 'total_points_earned']

class LoyaltyAccountDetailSerializer(LoyaltyAccountSerializer):
    transactions = PointTransactionSerializer(many=True, read_only=True)
    coupons = serializers.SerializerMethodField()
    available_rewards = serializers.SerializerMethodField()

    class Meta(LoyaltyAccountSerializer.Meta):
        fields = LoyaltyAccountSerializer.Meta.fields + ['transactions', 'coupons', 'available_rewards']

    def get_coupons(self, obj):
        # Solo cupones NO usados (disponibles para usar)
        available_coupons = UserCoupon.objects.filter(
            customer=obj.customer, 
            is_used=False
        ).order_by('-created_at')
        return UserCouponSerializer(available_coupons, many=True, context=self.context).data

    def get_available_rewards(self, obj):
        # Recompensas que puede canjear con sus puntos actuales
        rewards = RewardRule.objects.filter(
            is_active=True,
            points_cost__lte=obj.points_balance  # Solo las que puede pagar
        ).order_by('points_cost')
        return RewardRuleSerializer(rewards, many=True).data

