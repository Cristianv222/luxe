from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt  # ← AGREGADO
from rest_framework import viewsets, status, generics, mixins
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.contrib.auth import get_user_model
import json
import logging
import base64
from io import BytesIO
from PIL import Image

from .models import Printer, PrintJob, CashDrawerEvent, PrinterSettings
from .serializers import (
    PrinterSerializer, PrintJobSerializer,
    CashDrawerEventSerializer, PrinterSettingsSerializer,
    PrintRequestSerializer, TestConnectionSerializer,
    # Serializers del agente
    AgenteRegistroSerializer,
    AgenteResultadoSerializer,
)
from .print_manager import PrinterManager

User = get_user_model()
logger = logging.getLogger(__name__)


# ============================================================================
# VIEWSETS ESTÁNDAR (CRUD)
# ============================================================================

class PrinterViewSet(viewsets.ModelViewSet):
    """API para gestión de impresoras"""
    queryset = Printer.objects.all()
    serializer_class = PrinterSerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['post'])
    def test_print(self, request, pk=None):
        """Prueba de impresión simple"""
        printer = self.get_object()
        
        try:
            success, message = PrinterManager.print_test_page(
                printer,
                user=request.user.username if request.user.is_authenticated else 'system'
            )
            
            if success:
                return Response({
                    'status': 'success',
                    'message': message
                })
            else:
                return Response({
                    'status': 'error',
                    'message': message
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error en prueba de impresión: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def test_cash_drawer(self, request, pk=None):
        """Prueba de apertura de caja registradora"""
        printer = self.get_object()
        
        try:
            success, message = PrinterManager.open_cash_drawer(printer)
            
            if success:
                CashDrawerEvent.objects.create(
                    printer=printer,
                    event_type='test',
                    success=True,
                    notes='Prueba manual de caja registradora',
                    triggered_by=request.user.username if request.user.is_authenticated else 'system'
                )
                
                return Response({
                    'status': 'success',
                    'message': message
                })
            else:
                return Response({
                    'status': 'error',
                    'message': message
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error en prueba de caja: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        """Prueba de conexión a impresora"""
        serializer = TestConnectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            success, message = PrinterManager.test_connection(
                data['connection_type'],
                data['connection_string'],
                data.get('port')
            )
            
            return Response({
                'success': success,
                'message': message
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Obtener impresora por defecto"""
        printer = Printer.get_default()
        if printer:
            serializer = self.get_serializer(printer)
            return Response(serializer.data)
        return Response({'detail': 'No hay impresora por defecto'}, 
                       status=status.HTTP_404_NOT_FOUND)


class PrintJobViewSet(mixins.ListModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     viewsets.GenericViewSet):
    """API para historial de trabajos de impresión"""
    queryset = PrintJob.objects.all().order_by('-created_at')
    serializer_class = PrintJobSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        printer_id = self.request.query_params.get('printer_id')
        if printer_id:
            queryset = queryset.filter(printer_id=printer_id)
        
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Reintentar un trabajo fallido"""
        print_job = self.get_object()
        
        if print_job.status != 'failed':
            return Response({
                'error': 'Solo se pueden reintentar trabajos fallidos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cache_key = f'print_retry_{print_job.id}_{request.user.id if request.user.is_authenticated else "system"}'
        if cache.get(cache_key):
            return Response({
                'error': 'Debe esperar 30 segundos antes de reintentar'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        try:
            print_job.status = 'pending'
            print_job.error_message = ''
            print_job.save(update_fields=['status', 'error_message'])
            
            success, message = PrinterManager.print_job(print_job)
            
            if success:
                return Response({
                    'status': 'success',
                    'message': 'Trabajo reimpreso exitosamente',
                    'job_id': str(print_job.id)
                })
            else:
                print_job.mark_as_failed(message)
                return Response({
                    'status': 'error',
                    'message': message
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error al reintentar impresión: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            cache.set(cache_key, True, 30)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de trabajos de impresión"""
        from datetime import timedelta
        from django.db.models import Count
        
        hace_24h = timezone.now() - timedelta(hours=24)
        
        stats = {
            'total': PrintJob.objects.count(),
            'pendientes': PrintJob.objects.filter(status='pending').count(),
            'completados': PrintJob.objects.filter(status='completed').count(),
            'fallidos': PrintJob.objects.filter(status='failed').count(),
            'ultimas_24h': PrintJob.objects.filter(created_at__gte=hace_24h).count(),
            'ultimas_24h_completados': PrintJob.objects.filter(
                created_at__gte=hace_24h,
                status='completed'
            ).count(),
            'por_impresora': list(
                PrintJob.objects.values('printer__name')
                .annotate(total=Count('id'))
                .order_by('-total')
            )
        }
        
        return Response(stats)


class CashDrawerEventViewSet(mixins.ListModelMixin,
                            mixins.RetrieveModelMixin,
                            viewsets.GenericViewSet):
    """API para historial de eventos de caja"""
    queryset = CashDrawerEvent.objects.all().order_by('-created_at')
    serializer_class = CashDrawerEventSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        printer_id = self.request.query_params.get('printer_id')
        if printer_id:
            queryset = queryset.filter(printer_id=printer_id)
        
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(created_at__date=date)
        
        success = self.request.query_params.get('success')
        if success is not None:
            queryset = queryset.filter(success=success.lower() == 'true')
        
        return queryset


class PrinterSettingsView(generics.RetrieveUpdateAPIView):
    """API para configuración global de impresión"""
    queryset = PrinterSettings.objects.all()
    serializer_class = PrinterSettingsSerializer
    permission_classes = [AllowAny]
    
    def get_object(self):
        return PrinterSettings.get_settings()


# ============================================================================
# ENDPOINTS PARA EL AGENTE DE WINDOWS
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt  # ← AGREGADO
def agente_registrar(request):
    """Endpoint para registro del agente de Windows"""
    logger.info(f"🔍 Headers recibidos: {request.META.get('HTTP_AUTHORIZATION', 'NO HAY HEADER')}")
    logger.info(f"🔍 Usuario autenticado: {request.user}")
    logger.info(f"🔍 Is authenticated: {request.user.is_authenticated}")

    serializer = AgenteRegistroSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'error': 'Datos inválidos', 'detalles': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    data = serializer.validated_data
    
    username = request.user.username if request.user.is_authenticated else 'system'
    cache_key = f"agente_{username}_{data['computadora']}"
    cache.set(cache_key, {
        'computadora': data['computadora'],
        'usuario': data['usuario'],
        'version_agente': data['version_agente'],
        'impresoras': data['impresoras'],
        'ultima_conexion': timezone.now().isoformat(),
        'user_id': request.user.id if request.user.is_authenticated else 'system',
        'username': username
    }, timeout=3600)
    
    logger.info(
        f"✅ Agente registrado: {data['computadora']} "
        f"(Usuario: {data['usuario']}, Version: {data['version_agente']}, "
        f"Impresoras: {len(data['impresoras'])})"
    )
    
    es_sistema = request.user.is_superuser or request.user.is_staff if request.user.is_authenticated else True
    
    return Response({
        'message': 'Agente registrado exitosamente',
        'es_sistema': es_sistema,
        'usuario': username,
        'impresoras_detectadas': len(data['impresoras']),
        'servidor_time': timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def agente_trabajos_pendientes(request):
    """Endpoint para obtener trabajos pendientes"""
    es_sistema = (request.user.is_superuser or request.user.is_staff) if request.user.is_authenticated else True
    
    if es_sistema:
        trabajos = PrintJob.objects.filter(
            status='pending'
        ).select_related('printer').order_by('created_at')[:10]
    else:
        trabajos = PrintJob.objects.filter(
            status='pending',
            created_by=request.user.username
        ).select_related('printer').order_by('created_at')[:10]
    
    trabajos_data = []
    for trabajo in trabajos:
        try:
            if not trabajo.printer:
                logger.warning(f"⚠️ Trabajo {trabajo.id} sin impresora asignada, marcando como fallido")
                trabajo.mark_as_failed("Impresora no asignada")
                continue
            
            trabajo.mark_as_printing()
            
            # Detectar si es trabajo de etiquetas (TSPL) o de tickets (ESC/POS)
            job_data = trabajo.data or {}
            is_label_job = job_data.get('type') == 'label'
            
            if is_label_job:
                # Para etiquetas, enviar comandos TSPL directamente en HEX
                comandos_hex = trabajo.content.encode('utf-8', errors='ignore').hex()
                tipo_impresora = 'label'
            else:
                # Para tickets, generar comandos ESC/POS
                comandos_hex = generar_comandos_escpos(trabajo)
                tipo_impresora = 'receipt'
            
            trabajos_data.append({
                'id': str(trabajo.id),
                'impresora': trabajo.printer.name,
                'comandos': comandos_hex,
                'tipo': trabajo.document_type,
                'tipo_impresora': tipo_impresora,  # Nuevo campo para el Bot
                'copias': trabajo.copies,
                'usuario': trabajo.created_by or 'Sistema',
                'abrir_caja': trabajo.open_cash_drawer
            })
            
        except Exception as e:
            logger.error(f"❌ Error procesando trabajo {trabajo.id}: {e}")
            trabajo.mark_as_failed(f"Error al preparar impresión: {str(e)}")
            continue
    
    username = request.user.username if request.user.is_authenticated else 'system'
    logger.info(
        f"📥 Agente {username} consultó trabajos: "
        f"{len(trabajos_data)} pendientes [{'SISTEMA' if es_sistema else 'NORMAL'}]"
    )
    
    return Response({
        'es_sistema': es_sistema,
        'trabajos': trabajos_data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt  # ← AGREGADO
def agente_reportar_resultado(request):
    """Endpoint para reportar resultado de impresión"""
    serializer = AgenteResultadoSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'error': 'Datos inválidos', 'detalles': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    data = serializer.validated_data
    
    try:
        trabajo = PrintJob.objects.get(id=data['trabajo_id'])
    except PrintJob.DoesNotExist:
        return Response(
            {'error': 'Trabajo no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if data['success']:
        trabajo.mark_as_completed()
        logger.info(f"✅ Trabajo {trabajo.job_number} completado exitosamente")
    else:
        trabajo.mark_as_failed(data.get('mensaje', 'Error desconocido'))
        logger.error(f"❌ Trabajo {trabajo.job_number} falló: {data.get('mensaje')}")
    
    if trabajo.open_cash_drawer and data['success'] and trabajo.printer:
        trabajo.cash_drawer_opened = True
        trabajo.save(update_fields=['cash_drawer_opened'])
        
        username = request.user.username if request.user.is_authenticated else 'system'
        CashDrawerEvent.objects.create(
            printer=trabajo.printer,
            print_job=trabajo,
            event_type='print',
            success=True,
            triggered_by=username,
            notes=f"Apertura automática - Trabajo #{trabajo.job_number}"
        )
    
    return Response({
        'message': 'Resultado registrado exitosamente',
        'trabajo_id': str(trabajo.id),
        'job_number': trabajo.job_number,
        'status': trabajo.status
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def agente_estado(request):
    """Endpoint para obtener estado del sistema"""
    computadora = request.query_params.get('computadora', 'unknown')
    username = request.user.username if request.user.is_authenticated else 'system'
    cache_key = f"agente_{username}_{computadora}"
    agente_data = cache.get(cache_key, {})
    
    trabajos_pendientes = PrintJob.objects.filter(status='pending').count()
    trabajos_completados_hoy = PrintJob.objects.filter(
        status='completed',
        completed_at__date=timezone.now().date()
    ).count()
    
    impresoras_activas = Printer.objects.filter(is_active=True).count()
    
    return Response({
        'agente_conectado': bool(agente_data),
        'ultima_conexion': agente_data.get('ultima_conexion'),
        'version_agente': agente_data.get('version_agente', 'N/A'),
        'computadora': agente_data.get('computadora', 'N/A'),
        'usuario': agente_data.get('usuario', 'N/A'),
        'trabajos_pendientes': trabajos_pendientes,
        'trabajos_completados_hoy': trabajos_completados_hoy,
        'impresoras_activas': impresoras_activas,
        'servidor_time': timezone.now().isoformat()
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt  # ← AGREGADO
def agente_abrir_caja(request):
    """Endpoint para abrir caja registradora manualmente"""
    printer_id = request.data.get('printer_id')
    notas = request.data.get('notas', '')
    
    if not printer_id:
        return Response(
            {'error': 'printer_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        printer = Printer.objects.get(id=printer_id, is_active=True)
    except Printer.DoesNotExist:
        return Response(
            {'error': 'Impresora no encontrada o inactiva'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not printer.has_cash_drawer:
        return Response(
            {'error': 'Esta impresora no tiene caja registradora'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    comandos_hex = generar_comando_abrir_caja(printer)
    
    username = request.user.username if request.user.is_authenticated else 'system'
    job = PrintJob.objects.create(
        printer=printer,
        document_type='other',
        content='Apertura manual de caja',
        data={'accion': 'abrir_caja', 'notas': notas},
        open_cash_drawer=True,
        status='pending',
        created_by=username
    )
    
    CashDrawerEvent.objects.create(
        printer=printer,
        print_job=job,
        event_type='manual',
        success=True,
        notes=notas,
        triggered_by=username
    )
    
    logger.info(f"🔓 Caja abierta manualmente por {username} - Impresora: {printer.name}")
    
    return Response({
        'message': 'Solicitud de apertura de caja enviada',
        'job_id': str(job.id),
        'job_number': job.job_number
    })


# ============================================================================
# FUNCIONES AUXILIARES PARA COMANDOS ESC/POS
# ============================================================================

def generar_comandos_escpos(trabajo):
    """Genera comandos ESC/POS en hexadecimal para el trabajo de impresión"""
    try:
        ESC = b'\x1b'
        GS = b'\x1d'
        
        comandos = bytearray()
        
        comandos.extend(ESC + b'@')
        comandos.extend(ESC + b'a' + b'\x01')
        comandos.extend(ESC + b'E' + b'\x01')
        
        try:
            contenido = trabajo.content.encode('utf-8', errors='ignore')
        except Exception as e:
            logger.warning(f"Error en encoding de contenido: {e}")
            contenido = b'Error en contenido\n'
        
        comandos.extend(contenido)
        comandos.extend(ESC + b'E' + b'\x00')
        comandos.extend(b'\n\n\n')
        comandos.extend(GS + b'V' + b'\x41' + b'\x00')
        
        if trabajo.open_cash_drawer and trabajo.printer and trabajo.printer.has_cash_drawer:
            try:
                pin = trabajo.printer.cash_drawer_pin if trabajo.printer.cash_drawer_pin is not None else 0
                on_time = trabajo.printer.cash_drawer_on_time if trabajo.printer.cash_drawer_on_time is not None else 50
                off_time = trabajo.printer.cash_drawer_off_time if trabajo.printer.cash_drawer_off_time is not None else 50
                
                pin = max(0, min(255, pin))
                on_time = max(0, min(255, on_time))
                off_time = max(0, min(255, off_time))
                
                comandos.extend(ESC + b'p' + bytes([pin, on_time, off_time]))
                logger.debug(f"Comando abrir caja agregado: pin={pin}, on={on_time}, off={off_time}")
                
            except Exception as e:
                logger.warning(f"⚠️ No se pudo agregar comando de caja: {e}")
        
        return comandos.hex()
        
    except Exception as e:
        logger.error(f"❌ Error generando comandos ESC/POS: {e}")
        ESC = b'\x1b'
        comando_emergencia = ESC + b'@' + b'Error generando ticket\n\n\n'
        return comando_emergencia.hex()


def generar_comando_abrir_caja(printer):
    """Genera comando ESC/POS para abrir caja registradora"""
    try:
        ESC = b'\x1b'
        
        pin = printer.cash_drawer_pin if hasattr(printer, 'cash_drawer_pin') and printer.cash_drawer_pin is not None else 0
        on_time = printer.cash_drawer_on_time if hasattr(printer, 'cash_drawer_on_time') and printer.cash_drawer_on_time is not None else 50
        off_time = printer.cash_drawer_off_time if hasattr(printer, 'cash_drawer_off_time') and printer.cash_drawer_off_time is not None else 50
        
        pin = max(0, min(255, pin))
        on_time = max(0, min(255, on_time))
        off_time = max(0, min(255, off_time))
        
        comando = ESC + b'p' + bytes([pin, on_time, off_time])
        
        logger.debug(f"Comando caja generado: pin={pin}, on={on_time}, off={off_time}")
        
        return comando.hex()
        
    except Exception as e:
        logger.error(f"❌ Error generando comando de caja: {e}")
        return b'\x1bp\x00\x32\x32'.hex()


# ============================================================================
# OTRAS APIs DE IMPRESIÓN
# ============================================================================

class PrintAPIView(APIView):
    """API principal para impresión directa"""
    permission_classes = [AllowAny]
    
    @csrf_exempt  # ← AGREGADO
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    @transaction.atomic
    def post(self, request):
        serializer = PrintRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            printer = data['printer']
            content = data['content']
            document_type = data['document_type']
            open_cash_drawer = data['open_cash_drawer']
            copies = data['copies']
            
            username = request.user.username if request.user.is_authenticated else 'system'
            print_job = PrintJob.objects.create(
                printer=printer,
                document_type=document_type,
                content=content,
                data={'request_data': request.data},
                open_cash_drawer=open_cash_drawer,
                copies=copies,
                created_by=username,
                status='pending'
            )
            
            return Response({
                'status': 'success',
                'message': 'Trabajo de impresión creado',
                'job_id': str(print_job.id),
                'job_number': print_job.job_number
            })
                
        except Exception as e:
            logger.error(f"Error en impresión: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PrintReceiptView(APIView):
    """API para imprimir tickets de venta preformateados"""
    permission_classes = [AllowAny]
    
    @csrf_exempt  # ← AGREGADO
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        order_data = request.data.get('order')
        if not order_data:
            return Response({
                'error': 'Debe proporcionar datos de la orden'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        items = order_data.get('items', [])
        if not items:
            return Response({
                'error': 'La orden debe tener al menos un producto'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        printer_id = request.data.get('printer_id')
        
        if not printer_id:
            printer = Printer.get_default()
            if not printer:
                # No hay impresora, pero la orden se procesa igual sin imprimir
                logger.warning("No hay impresora configurada - orden procesada sin imprimir")
                return Response({
                    'status': 'success',
                    'message': 'Orden procesada correctamente (sin impresión - no hay impresora configurada)',
                    'warning': 'No hay impresora configurada',
                    'printed': False
                })
        else:
            try:
                printer = Printer.objects.get(pk=printer_id, is_active=True)
            except Printer.DoesNotExist:
                # Impresora específica no encontrada, pero la orden se procesa igual
                logger.warning(f"Impresora {printer_id} no encontrada - orden procesada sin imprimir")
                return Response({
                    'status': 'success',
                    'message': 'Orden procesada correctamente (sin impresión - impresora no disponible)',
                    'warning': 'Impresora no encontrada o inactiva',
                    'printed': False
                })
        
        try:
            content = self.generate_receipt_content(printer, order_data)
            
            username = request.user.username if request.user.is_authenticated else 'system'
            print_job = PrintJob.objects.create(
                printer=printer,
                document_type='receipt',
                content=content,
                data=order_data,
                open_cash_drawer=True,
                created_by=username,
                status='pending'
            )
            
            return Response({
                'status': 'success',
                'message': 'Ticket creado, el agente lo imprimirá',
                'job_id': str(print_job.id),
                'job_number': print_job.job_number,
                'printed': True
            })
                
        except Exception as e:
            logger.error(f"Error al crear ticket: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def generate_receipt_content(self, printer, order_data):
        """Genera el contenido formateado para el ticket estilo SRI"""
        settings = PrinterSettings.get_settings()
        chars_per_line = printer.characters_per_line or 42
    
        lines = []

        # Helper para centrar
        def center(text):
            return text[:chars_per_line].center(chars_per_line)
        
        # Helper para línea de total
        def print_total_line(label, value):
            try:
                val_str = f"{float(value):.2f}"
            except:
                val_str = "0.00"
            padding = chars_per_line - len(label) - len(val_str)
            if padding < 1: padding = 1
            return f"{label}{' ' * padding}{val_str}"

        # --- ENCABEZADO ---
        lines.append(center(settings.get_company_name()))
        lines.append(center(f"RUC: {settings.get_tax_id()}"))
        
        # Información SRI
        sri_info = order_data.get('sri_info', {})
        # Mostrar como factura si hay info SRI, incluso si está pendiente/generada
        if sri_info:
            sri_num = sri_info.get('sri_number') or 'PENDIENTE'
            lines.append(center(f"FACTURA N. {sri_num}"))
            
            lines.append("NUMERO DE AUTORIZACION:")
            key = sri_info.get('key') or sri_info.get('access_key') or 'PENDIENTE'
            lines.append(key[:chars_per_line])
            if len(key) > chars_per_line:
                 lines.append(key[chars_per_line:])

            # Fecha Autorización
            auth_date = sri_info.get('authorization_date')
            if auth_date:
                # Intentar parsear si es string ISO
                if isinstance(auth_date, str):
                    try:
                        from django.utils.dateparse import parse_datetime
                        dt = parse_datetime(auth_date)
                        if dt:
                            auth_date = dt.strftime('%d/%m/%Y %H:%M:%S')
                    except:
                         pass
                lines.append(f"FECHA AUTORIZACION: {auth_date}")
            else:
                lines.append("FECHA AUTORIZACION: PENDIENTE")
            
            lines.append(f"AMBIENTE: {sri_info.get('environment', 'PRUEBAS')}")
            lines.append(f"EMISION: {sri_info.get('emission_type', 'NORMAL')}")
            
            lines.append("CLAVE DE ACCESO:")
            lines.append(key[:chars_per_line])
            if len(key) > chars_per_line:
                 lines.append(key[chars_per_line:])
                 
        else:
            lines.append(center("NOTA DE VENTA"))
            lines.append(center(f"Orden #: {order_data.get('order_number')}"))

        # Separador doble o simple
        lines.append("=" * chars_per_line)
        
        # --- INFO EMPRESA DETALLADA (como en la foto) ---
        lines.append(center(settings.get_company_name()))
        lines.append(f"Dirección Matriz: {settings.get_company_address()}")
        lines.append(f"Teléfono: {settings.get_company_phone()}")
        lines.append(f"Correo: {settings.get_company_email()}")
        lines.append("Obligado a Llevar Contabilidad: NO")  # Configurable en futuro
        lines.append("Contribuyente Régimen RIMPE")         # Configurable en futuro
        
        lines.append("-" * chars_per_line)
        
        # --- INFO CLIENTE ---
        # Recibir fecha de emisión del frontend o usar actual
        printed_at = order_data.get('printed_at')
        if printed_at:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(printed_at)
            fecha_emision = dt.strftime('%d/%m/%Y %H:%M:%S') if dt else ''
        else:
            fecha_emision = timezone.localtime(timezone.now()).strftime('%d/%m/%Y %H:%M:%S')

        lines.append(f"Nombres: {order_data.get('customer_name', 'CONSUMIDOR FINAL')}")
        lines.append(f"Direccion: {order_data.get('customer_address', 'Cuenca')}")
        lines.append(f"Telefono: {order_data.get('customer_phone', '--')}")
        lines.append(f"RUC: {order_data.get('customer_identification', '9999999999999')}")
        lines.append(f"Fecha Emisión: {fecha_emision}")
        
        lines.append("-" * chars_per_line)
        
        # --- DETALLE PRODUCTOS ---
        # Encabezado compacto: CANT PRODUCTO V.TOT
        # O intentamos replicar columnas: CANT ... V.UNI V.TOT
        # Usaremos formato: "Prod Name" \n "Cant  Code  V.Uni  V.Tot"
        
        lines.append(f"{'CANT':<5} {'DETA':<15} {'V.UNI':>8} {'V.TOT':>8}")
        lines.append("-" * chars_per_line)
        
        items = order_data.get('items', [])
        for item in items:
            name = item.get('name', 'Producto')
            try:
                qty = float(item.get('quantity', 0))
                price = float(item.get('price', 0))
                total = float(item.get('total', 0))
            except:
                qty, price, total = 0, 0, 0

            # Nombre producto (puede ser largo)
            lines.append(name)
            
            # Detalle valores (indentado)
            # CANT   COD(fake)   V.UNI    V.TOT
            line_vals = f"{qty:,.2f}   {'ITM'}     {price:,.2f}   {total:,.2f}"
            lines.append(line_vals.rjust(chars_per_line))

        lines.append("-" * chars_per_line)
        
        # --- TOTALES ---
        subtotal = float(order_data.get('subtotal', 0))
        tax = float(order_data.get('tax', 0))
        discount = float(order_data.get('discount', 0))
        total_val = float(order_data.get('total', 0))
        
        subtotal_neto = subtotal - discount
        
        lines.append(print_total_line("Subtotal:", subtotal))
        lines.append(print_total_line("Descuento:", discount))
        lines.append(print_total_line("Subtotal Neto:", subtotal_neto))
        lines.append(print_total_line("Subtotal 0%:", 0.00)) # Asumimos todo grava IVA por ahora o ajustar lógica
        lines.append(print_total_line("Subtotal 15%:", subtotal_neto))
        lines.append(print_total_line("IVA 15%:", tax))
        lines.append(print_total_line("Propina:", 0.00))
        lines.append(print_total_line("V TOTAL:", total_val))
        
        lines.append("=" * chars_per_line)
        
        # --- PIE DE PAGINA / INFO ADICIONAL ---
        lines.append("INFORMACION ADICIONAL")
        lines.append(f"vendedor: Vendedor") # Podría venir en order_data
        lines.append(f"correo: {settings.get_company_email()}")
        
        lines.append("\n\n")
        
        return "\n".join(lines)
        order_type_map = {
            'in_store': 'EN TIENDA',
            'pickup': 'PARA LLEVAR',
            'delivery': 'A DOMICILIO',
            'online': 'EN LÍNEA'
        }
        
        # Obtener tipo de orden (default: EN TIENDA)
        order_type_key = order_data.get('order_type', 'in_store')
        order_type_display = order_type_map.get(order_type_key, 'EN TIENDA')
        
        lines.append(f"TipoOrden: {order_type_display}")
        lines.append("-" * chars_per_line)

# Encabezado de productos
        lines.append(f"{'PRODUCTO':<20}{'CANT':>4}{'PRECIO':>8}{'TOTAL':>10}")
        lines.append("-" * chars_per_line)
    
        items = order_data.get('items', [])
        for item in items:
            name = str(item.get('name', 'Sin nombre')).strip()
            note = item.get('note', '').strip()
            qty = item.get('quantity', 0)
            price = item.get('price', 0)
            total = item.get('total', 0)
        
            # Crear el texto completo con nota entre paréntesis
            if note:
                full_text = f"{name} ({note})"
            else:
                full_text = name
        
            # Primera línea: intentar mostrar todo en 20 caracteres
            if len(full_text) <= 20:
                # Si cabe todo, mostrarlo normal
                lines.append(f"{full_text:<20}{qty:>4}{price:>8.2f}{total:>10.2f}")
            else:
             # Si no cabe, dividirlo inteligentemente
                # Primero mostrar lo que cabe en la primera línea (20 caracteres)
                first_line = full_text[:20]
            
            #        Buscar el último espacio en la primera línea para no cortar palabras
                last_space = first_line.rfind(' ')
                if last_space > 15:  # Si hay un espacio en una posición razonable
                    first_line = full_text[:last_space]
                    remaining_text = full_text[last_space+1:].strip()
                else:
                    # Si no hay espacio, cortar en 20 caracteres
                    remaining_text = full_text[20:].strip()

                # Imprimir primera línea con cantidades
                lines.append(f"{first_line:<20}{qty:>4}{price:>8.2f}{total:>10.2f}")
            
            # Imprimir el resto del texto en líneas adicionales
                while remaining_text:
                    if len(remaining_text) <= 20:
                        lines.append(f"{remaining_text:<20}")
                        break
                    else:
                        # Buscar espacio para no cortar palabras
                        space_pos = remaining_text[:20].rfind(' ')
                        if space_pos > 10:  # Si hay un espacio razonable
                            next_line = remaining_text[:space_pos]
                            remaining_text = remaining_text[space_pos+1:].strip()
                        else:
                        # Cortar en 20 caracteres si no hay espacio
                            next_line = remaining_text[:20]
                            remaining_text = remaining_text[20:].strip()
                    
                        lines.append(f"{next_line:<20}")
    
        lines.append("-" * chars_per_line)
    
        # Totales
        subtotal = order_data.get('subtotal', 0)
        tax = order_data.get('tax', 0)
        discount = order_data.get('discount', 0)
        total = order_data.get('total', 0)
    
        lines.append(f"{'Subtotal:':<30} ${subtotal:>10.2f}")
        if tax > 0:
            lines.append(f"{'IVA (15%):':<30} ${tax:>10.2f}")
        if discount > 0:
            lines.append(f"{'Descuento:':<30} -${discount:>10.2f}")
        lines.append("=" * chars_per_line)
        lines.append(f"{'TOTAL:':<30} ${total:>10.2f}")
        lines.append("=" * chars_per_line)
        
        # INFORMACIÓN FISCAL SRI - Mostrar si está disponible
        if sri_info and sri_info.get('access_key'):
            lines.append("")
            lines.append("INFORMACION FISCAL".center(chars_per_line))
            lines.append("-" * chars_per_line)
            access_key = sri_info.get('access_key', '')
            # Dividir clave de acceso en 3 líneas para mejor lectura
            if len(access_key) == 49:  # Clave de acceso estándar del SRI
                lines.append(f"CLAVE DE ACCESO:")
                lines.append(access_key[:17])
                lines.append(access_key[17:34])
                lines.append(access_key[34:49])
            else:
                lines.append(f"Clave: {access_key}")
            
            # Mostrar estado de autorización
            if sri_info.get('authorization_date'):
                lines.append(f"Aut: {sri_info.get('authorization_date')}")
            lines.append("-" * chars_per_line)
    
        lines.append("¡GRACIAS POR SU COMPRA!".center(chars_per_line))
        lines.append("*** VUELVA PRONTO ***".center(chars_per_line))
    
        lines.append("\n" * 3)
    
        return "\n".join(lines)

# ============================================================================
# IMPRESIÓN DE ETIQUETAS (TSPL - 3nStar LDT114)
# ============================================================================

class PrintLabelView(APIView):
    """API para imprimir etiquetas de productos con código de barras"""
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """
        Imprime etiquetas para uno o varios productos.
        Payload esperado:
        {
            "products": [
                {"name": "Producto 1", "code": "12345678", "price": 15.99},
                ...
            ],
            "copies": 1,  # Copias por etiqueta
            "printer_id": null  # Opcional, usa default si no se especifica
        }
        """
        products = request.data.get('products', [])
        copies = request.data.get('copies', 1)
        printer_id = request.data.get('printer_id')
        
        if not products:
            return Response({
                'error': 'Debe proporcionar al menos un producto'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener impresora
        if not printer_id:
            try:
                # 1. Intentar buscar una impresora marcada específicamente como de ETIQUETAS
                # Opción A: Buscar por tipo (si existe el campo y valor 'label')
                label_printer = Printer.objects.filter(printer_type='label', is_active=True).first()
                
                # Opción B: Si no hay tipo 'label', buscar por nombre
                if not label_printer:
                     label_printer = Printer.objects.filter(name__icontains='etiqueta', is_active=True).first()
                
                if not label_printer:
                     label_printer = Printer.objects.filter(name__icontains='label', is_active=True).first()

                # Si encontramos una específica, la usamos
                if label_printer:
                    printer = label_printer
                else:
                    # Si no, caemos en la por defecto
                    printer = Printer.get_default()
            except Exception as e:
                logger.error(f"Error buscando impresora de etiquetas: {e}")
                printer = Printer.get_default()
            
            if not printer:
                return Response({
                    'error': 'No se encontró ninguna impresora de etiquetas activa'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                printer = Printer.objects.get(pk=printer_id, is_active=True)
            except Printer.DoesNotExist:
                return Response({
                    'error': 'Impresora no encontrada o inactiva'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Generar contenido TSPL para todas las etiquetas
            # Pasa el objeto printer para usar su configuración
            tspl_content = self.generate_tspl_labels(products, printer, copies)
            
            username = request.user.username if request.user.is_authenticated else 'system'
            print_job = PrintJob.objects.create(
                printer=printer,
                document_type='other',
                content=tspl_content,
                data={'products': products, 'copies': copies, 'type': 'label'},
                open_cash_drawer=False,
                created_by=username,
                status='pending'
            )
            
            return Response({
                'status': 'success',
                'message': f'{len(products)} etiqueta(s) enviada(s) al Bot',
                'job_id': str(print_job.id),
                'job_number': print_job.job_number
            })
                
        except Exception as e:
            logger.error(f"Error al crear etiqueta: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def generate_tspl_labels(self, products, printer, copies=1):
        """
        Genera comandos TSPL dinámicos basados en la configuración de la impresora
        """
        # Configuración dinámica desde la impresora
        WIDTH_MM = printer.paper_width if printer and printer.paper_width else 57
        
        # Obtener configuración extendida (height, gap) del campo JSON 'config'
        printer_config = printer.config if printer and hasattr(printer, 'config') and printer.config else {}
        
        # Default de altura 27mm, pero configurable
        HEIGHT_MM = float(printer_config.get('label_height', 27))
        
        # Default de Gap 0mm, pero configurable
        GAP_MM = float(printer_config.get('label_gap', 0))
        
        # Límite de caracteres para el nombre
        # Default 22 para 57mm. Para 104mm (4") podría ser ~40-50
        NAME_LIMIT = printer.characters_per_line if printer and printer.characters_per_line else 22
        
        lines = []
        
        # Configuración inicial TSPL
        lines.append(f"SIZE {WIDTH_MM} mm, {HEIGHT_MM} mm")
        lines.append(f"GAP {GAP_MM} mm, 0 mm")
        lines.append("DIRECTION 1")
        lines.append("CLS")
        
        for product in products:
            name = product.get('name', 'Sin nombre')[:NAME_LIMIT]
            code = product.get('code', '0000')
            price = product.get('price', 0)
            
            price_str = f"${float(price):.2f}"
            
            # Limpiar buffer de imagen para esta etiqueta
            lines.append("CLS")
            
            # 1. Nombre (Arriba). Fuente 2 (pequeña/media). 
            # Coordenadas: x=10, y=10
            lines.append(f'TEXT 10,10,"2",0,1,1,"{name}"')
            
            # 2. Código de Barras (Centro). Tipo 128.
            # Coordenadas: x=10, y=35, altura=50.
            lines.append(f'BARCODE 10,35,"128",50,1,0,2,2,"{code}"')
            
            # 3. Precio (Abajo). Fuente 3 (Grande).
            # Coordenadas: x=10, y=100.
            lines.append(f'TEXT 10,110,"3",0,1,1,"{price_str}"')
            
            # Imprimir
            lines.append(f"PRINT {copies}")
        
        # Unir con CR+LF por seguridad
        return "\r\n".join(lines) + "\r\n"


def generar_comandos_tspl_hex(trabajo):
    """Genera comandos TSPL en hexadecimal para el trabajo de impresión de etiquetas"""
    try:
        contenido = trabajo.content
        # Convertir a bytes y luego a hex
        comandos = contenido.encode('utf-8', errors='ignore')
        return comandos.hex()
    except Exception as e:
        logger.error(f"❌ Error generando comandos TSPL: {e}")
        return b'SIZE 57 mm, 27 mm\nCLS\nTEXT 10,10,"2",0,1,1,"ERROR"\nPRINT 1\n'.hex()


@api_view(['GET'])
@permission_classes([AllowAny])
def print_status(request):
    """Estado del sistema de impresión"""
    try:
        from django.db.models import Count
        
        total_jobs = PrintJob.objects.count()
        pending_jobs = PrintJob.objects.filter(status='pending').count()
        today_jobs = PrintJob.objects.filter(
            created_at__date=timezone.now().date()
        ).count()
        
        active_printers = Printer.objects.filter(is_active=True)
        
        return Response({
            'system': 'online',
            'printers_active': active_printers.count(),
            'jobs_total': total_jobs,
            'jobs_pending': pending_jobs,
            'jobs_today': today_jobs,
            'default_printer': Printer.get_default().name if Printer.get_default() else None
        })
        
    except Exception as e:
        return Response({
            'system': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt  # ← AGREGADO
def open_cash_drawer(request):
    """Abrir caja registradora manualmente"""
    printer_id = request.data.get('printer_id')
    
    if not printer_id:
        printer = Printer.get_default()
    else:
        try:
            printer = Printer.objects.get(pk=printer_id, is_active=True)
        except Printer.DoesNotExist:
            return Response({
                'error': 'Impresora no encontrada'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    if not printer:
        return Response({
            'error': 'No hay impresora configurada'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not printer.has_cash_drawer:
        return Response({
            'error': 'Esta impresora no tiene caja registradora'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        username = request.user.username if request.user.is_authenticated else 'system'
        job = PrintJob.objects.create(
            printer=printer,
            document_type='other',
            content='Apertura manual de caja',
            open_cash_drawer=True,
            status='pending',
            created_by=username
        )
        
        return Response({
            'status': 'success',
            'message': 'Solicitud de apertura enviada',
            'job_id': str(job.id)
        })
            
    except Exception as e:
        logger.error(f"Error al abrir caja: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
