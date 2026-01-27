
from rest_framework import serializers
from .models import MaytapiConfig, WhatsAppLog

class MaytapiConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaytapiConfig
        fields = ['id', 'product_id', 'token', 'api_url', 'phone_id', 'is_active', 'schedule_time', 'birthday_message_template']

class WhatsAppLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppLog
        fields = '__all__'
