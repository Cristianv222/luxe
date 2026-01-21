from django.contrib import admin
from .models import (
    LoyaltyProgramConfig, 
    EarningRule, 
    RewardRule, 
    LoyaltyAccount, 
    PointTransaction, 
    UserCoupon
)

@admin.register(LoyaltyProgramConfig)
class LoyaltyProgramConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')

@admin.register(EarningRule)
class EarningRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'rule_type', 'points_to_award', 'is_active')
    list_filter = ('rule_type', 'is_active')
    search_fields = ('name',)

@admin.register(RewardRule)
class RewardRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'points_cost', 'reward_type', 'discount_value', 'is_active')
    list_filter = ('reward_type', 'is_active')
    search_fields = ('name',)

class PointTransactionInline(admin.TabularInline):
    model = PointTransaction
    extra = 0
    readonly_fields = ('created_at',)
    can_delete = False

@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ('customer', 'points_balance', 'total_points_earned')
    search_fields = ('customer__first_name', 'customer__last_name', 'customer__email')
    inlines = [PointTransactionInline]

@admin.register(UserCoupon)
class UserCouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'customer', 'reward_rule', 'is_used', 'expires_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('code', 'customer__first_name')
