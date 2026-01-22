from rest_framework import serializers
from .models import WhatsAppSettings, MessageHistory

class WhatsAppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSettings
        fields = '__all__'


class MessageHistorySerializer(serializers.ModelSerializer):
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = MessageHistory
        fields = ['id', 'phone', 'message', 'message_type', 'message_type_display', 
                  'status', 'status_display', 'customer_name', 'sent_at', 'error_message']
