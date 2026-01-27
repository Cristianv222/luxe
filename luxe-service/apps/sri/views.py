from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import SRIConfiguration, SRIDocument
from .serializers import SRIConfigurationSerializer, SRIDocumentSerializer
from .services import SRIIntegrationService
from apps.orders.models import Order

class SRIConfigurationViewSet(viewsets.ModelViewSet):
    queryset = SRIConfiguration.objects.all()
    serializer_class = SRIConfigurationSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        return SRIConfiguration.get_settings()

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)


class SRIDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SRIDocument.objects.all()
    serializer_class = SRIDocumentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'document_type']

    @action(detail=False, methods=['post'], url_path='emit/(?P<order_number>[^/.]+)')
    def emit_invoice(self, request, order_number=None):
        """
        Endpoint para emitir factura electrónica de una orden específica.
        POST /api/sri/documents/emit/{order_number}/
        """
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'error': 'Orden no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        # Verificar si ya existe un documento autorizado
        if hasattr(order, 'sri_document') and order.sri_document.status == 'AUTHORIZED':
             return Response({'error': 'Esta orden ya tiene una factura autorizada'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            document = SRIIntegrationService.emit_invoice(order)
            serializer = SRIDocumentSerializer(document)
            
            if document.status == 'FAILED':
                return Response(serializer.data, status=status.HTTP_502_BAD_GATEWAY)
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
