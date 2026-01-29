from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EarningRuleViewSet, EarningRuleTypeViewSet, RewardRuleViewSet, LoyaltyAccountViewSet

router = DefaultRouter()
router.register(r'config/earning-rule-types', EarningRuleTypeViewSet)
router.register(r'config/earning-rules', EarningRuleViewSet)
router.register(r'config/reward-rules', RewardRuleViewSet)
router.register(r'accounts', LoyaltyAccountViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

