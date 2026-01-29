from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SRIConfigurationViewSet, SRIDocumentViewSet

router = DefaultRouter()
router.register(r'config', SRIConfigurationViewSet, basename='sriconfig')
router.register(r'documents', SRIDocumentViewSet, basename='sridocuments')

urlpatterns = [
    path('', include(router.urls)),
]

