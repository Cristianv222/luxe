from rest_framework import serializers
from .models import SRIConfiguration, SRIDocument

class SRIConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SRIConfiguration
        fields = '__all__'

class SRIDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SRIDocument
        fields = '__all__'
