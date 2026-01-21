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
    
    class Meta:
        model = LoyaltyAccount
        fields = ['id', 'customer', 'customer_name', 'points_balance', 'total_points_earned']

class LoyaltyAccountDetailSerializer(LoyaltyAccountSerializer):
    transactions = PointTransactionSerializer(many=True, read_only=True)
    coupons = serializers.SerializerMethodField()

    class Meta(LoyaltyAccountSerializer.Meta):
        fields = LoyaltyAccountSerializer.Meta.fields + ['transactions', 'coupons']

    def get_coupons(self, obj):
        active_coupons = UserCoupon.objects.filter(customer=obj.customer, is_used=False)
        return UserCouponSerializer(active_coupons, many=True).context(self.context).data
