from rest_framework import serializers
from .models import BirthdaySentHistory

class BirthdaySentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BirthdaySentHistory
        fields = '__all__'
