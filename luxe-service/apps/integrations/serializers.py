from rest_framework import serializers
from .models import WhatsAppSettings

class WhatsAppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSettings
        fields = '__all__'
