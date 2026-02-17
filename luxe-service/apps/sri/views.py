from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import SRIConfiguration, SRIDocument
from .serializers import SRIConfigurationSerializer, SRIDocumentSerializer
from .services import SRIIntegrationService
from apps.orders.models import Order
from django.template.loader import get_template
from django.http import HttpResponse
from xhtml2pdf import pisa
import requests
from apps.printer.models import PrinterSettings
import qrcode
import base64
from io import BytesIO

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

    @action(detail=True, methods=['post'], url_path='refresh-details')
    def refresh_details(self, request, pk=None):
        """
        Endpoint para consultar y actualizar los detalles completos de un documento SRI,
        incluyendo la clave de acceso.
        POST /api/sri/documents/{id}/refresh-details/
        """
        try:
            document = self.get_object()
            
            if not document.external_id:
                return Response(
                    {'error': 'Este documento no tiene ID externo. No se puede consultar.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Consultar detalles actualizados
            updated_doc = SRIIntegrationService.fetch_document_details(document)
            serializer = SRIDocumentSerializer(updated_doc)
            
            return Response({
                'message': 'Detalles actualizados correctamente',
                'document': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        """Generar PDF de la factura (RIDE)"""
        document = self.get_object()
        order = document.order
    
        # Configuración de impresora (usa datos de empresa)
        settings = PrinterSettings.get_settings()

        # Generar código QR
        qr_image_base64 = None
        if document.access_key:
            try:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=0,
                )
                qr.add_data(document.access_key)
                qr.make(fit=True)
            
                img = qr.make_image(fill_color="black", back_color="white")
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                qr_image_base64 = base64.b64encode(buffer.getvalue()).decode()
            except Exception as e:
                print(f"Error generando QR: {e}")
    
        # Contexto para el template - USANDO EL CÓDIGO ORIGINAL QUE FUNCIONA
        context = {
            'document': document,
            'order': order,
            'settings': settings,
            'environment': SRIConfiguration.get_settings().get_environment_display(),
            'items': order.items.all(),  # ← ESTO funciona porque en el template usas item.line_total
            'qr_code': qr_image_base64,
        }
    
        template_path = 'sri/invoice_pdf.html'
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="factura_{document.sri_number}.pdf"'
    
        # Renderizar el template con el contexto
        from django.template.loader import render_to_string
        html = render_to_string(template_path, context, request=request)
        
        # Generar PDF
        pisa_status = pisa.CreatePDF(html, dest=response)
    
        if pisa_status.err:
            return HttpResponse('Error generando PDF', status=500)
        return response

    @action(detail=True, methods=['get'], url_path='debug-html')
    def debug_html(self, request, pk=None):
        """DEBUG TEMPORAL: Ver el HTML renderizado sin convertir a PDF"""
        document = self.get_object()
        order = document.order
    
        settings = PrinterSettings.get_settings()
    
        qr_image_base64 = None
        if document.access_key:
            try:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=0,
                )
                qr.add_data(document.access_key)
                qr.make(fit=True)
            
                img = qr.make_image(fill_color="black", back_color="white")
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                qr_image_base64 = base64.b64encode(buffer.getvalue()).decode()
            except Exception as e:
                print(f"Error generando QR: {e}")
    
        context = {
            'document': document,
            'order': order,
            'settings': settings,
            'environment': SRIConfiguration.get_settings().get_environment_display(),
            'items': order.items.all(),
            'qr_code': qr_image_base64,
        }
    
        template_path = 'sri/invoice_pdf.html'
        
        from django.template.loader import render_to_string
        html = render_to_string(template_path, context, request=request)
        
        return HttpResponse(html, content_type='text/html')


    @action(detail=True, methods=['get'])
    def xml(self, request, pk=None):
        """Descargar XML desde API Vendo (Proxy)"""
        document = self.get_object()
        
        # Si no tenemos key, intentar refrescar
        if not document.access_key:
             SRIIntegrationService.fetch_document_details(document)
             document.refresh_from_db()
             
        if not document.access_key:
             return Response({'error': 'No se tiene la clave de acceso'}, status=400)
             
        # Obtener URL del XML
        config = SRIIntegrationService.get_config()
        if not config.api_url:
             return Response({'error': 'Configuración SRI incompleta'}, status=500)
             
        # Construir URL proxy a Vendo
        base_url = config.api_url
        if '/create_and_process_invoice_complete' in base_url:
            base_url = base_url.split('/create_and_process_invoice_complete')[0]
        base_url = base_url.rstrip('/')
        
        target_url = f"{base_url}/xml/{document.access_key}/"
        
        try:
            r = requests.get(target_url, headers={'Authorization': f"Token {config.auth_token}"})
            if r.status_code == 200:
                response = HttpResponse(r.content, content_type='application/xml')
                response['Content-Disposition'] = f'attachment; filename="factura_{document.sri_number}.xml"'
                return response
            else:
                 return Response({'error': 'Error obteniendo XML de proveedor'}, status=502)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
