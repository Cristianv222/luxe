import requests
import json
from decimal import Decimal
from django.conf import settings
from .models import SRIConfiguration, SRIDocument

class SRIIntegrationService:
    """Servicio para interactuar con la API de Facturación VENDO"""
    
    @staticmethod
    def get_config():
        return SRIConfiguration.get_settings()

    @staticmethod
    def identify_customer_type(identification):
        """
        Determina el tipo de identificación según las reglas del SRI
        04: RUC (13 dígitos)
        05: Cédula (10 dígitos)
        06: Pasaporte (Otros)
        07: Consumidor Final (9999999999999)
        """
        if not identification:
            return "07"
            
        identification = identification.strip()
        
        if identification == "9999999999999":
            return "07"
        elif len(identification) == 13:
            return "04"
        elif len(identification) == 10 and identification.isdigit():
            return "05"
        else:
            return "06" # Por defecto pasaporte si no cuadra cédula/ruc

    @staticmethod
    def emit_invoice(order):
        """
        Envía una orden a la API VENDO para generar factura electrónica.
        ACTUALIZADO: Envía JSON según la documentación de la API Vendo.
        """
        config = SRIIntegrationService.get_config()
        if not config.is_active or not config.auth_token:
            raise Exception("Integración SRI no activa o token faltante")

        from datetime import datetime
        
        # 1. Preparar Datos del Cliente
        customer = order.customer
        if customer:
            ident_type = SRIIntegrationService.identify_customer_type(customer.cedula)
            ident_number = customer.cedula or "9999999999999"
            name = customer.get_full_name() or "CONSUMIDOR FINAL"
            email = customer.email or ""
            phone = customer.phone or ""
            address = customer.address or "S/D"
        else:
            # Consumidor Final
            ident_type = "07"
            ident_number = "9999999999999"
            name = "CONSUMIDOR FINAL"
            email = ""
            phone = ""
            address = "S/D"

        # 2. Preparar Items según formato API Vendo
        # IMPORTANTE: Los precios en el sistema YA INCLUYEN IVA
        # Debemos desglosar el IVA antes de enviar a la API
        items = []
        for item in order.items.all():
            # Obtener tax_rate del producto
            tax_rate = float(item.product.tax_rate) if item.product.tax_rate else 0.0
            
            # Normalizar tax_rate (si viene como 0.15, convertir a 15)
            if 0 < tax_rate < 1:
                tax_rate = tax_rate * 100
            
            # Determinar el código de impuesto según SRI Ecuador
            # Código 0 = IVA 0% (sin IVA)
            # Código 2 = IVA 12% o 15% (con IVA)
            # Código 6 = No objeto de impuesto
            # Código 7 = Exento de IVA
            if tax_rate == 0:
                tax_code = "0"  # IVA 0%
            elif tax_rate > 0:
                tax_code = "2"  # IVA 12% o 15%
            else:
                tax_code = "0"  # Por defecto, sin IVA
            
            # El unit_price del item YA INCLUYE IVA
            unit_price_with_tax = float(item.unit_price)
            
            # Desglosar el IVA para obtener el precio base
            if tax_rate > 0:
                # Precio SIN IVA = Precio CON IVA / (1 + tasa_iva)
                # Ejemplo: $15.00 / 1.15 = $13.04
                divisor = 1 + (tax_rate / 100)
                unit_price_without_tax = unit_price_with_tax / divisor
            else:
                # Si no tiene IVA, el precio es el mismo
                unit_price_without_tax = unit_price_with_tax
            
            # Calcular descuento por item (si aplica)
            discount = float(item.discount) if hasattr(item, 'discount') and item.discount else 0.00
            
            item_data = {
                "main_code": item.product.code or f"PROD{item.product.id}",
                "auxiliary_code": "",  # Opcional
                "description": item.product.name[:300],  # Máximo 300 caracteres
                "quantity": float(item.quantity),
                "unit_price": round(unit_price_without_tax, 2),  # ← PRECIO SIN IVA
                "discount": discount,
                "tax_code": tax_code  # ← CÓDIGO DE IMPUESTO EXPLÍCITO
            }
            items.append(item_data)

        # 3. Construir Payload JSON según documentación
        payload = {
            "issue_date": order.created_at.strftime('%Y-%m-%d'),  # Formato YYYY-MM-DD
            "customer_identification_type": ident_type,
            "customer_identification": ident_number,
            "customer_name": name[:300],  # Máximo 300 caracteres
            "customer_address": address,
            "customer_email": email,
            "customer_phone": phone,
            "send_email": True,  # Enviar email al cliente
            "items": items
        }

        # Si el token NO es VSR (Token Usuario), agregar company_id
        # Los tokens VSR detectan la empresa automáticamente
        if config.company_id and not config.auth_token.startswith('vsr_'):
            payload["company"] = config.company_id

        # 4. Configurar Headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {config.auth_token}"
        }

        # LOG: Ver payload completo antes de enviar
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📤 === ENVIANDO A API VENDO ===")
        logger.info(f"Orden: {order.order_number}")
        logger.info(f"URL: {config.api_url}")
        logger.info(f"Payload completo:")
        import json
        logger.info(json.dumps(payload, indent=2, ensure_ascii=False))
        logger.info(f"Items detallados:")
        for idx, item in enumerate(items, 1):
            logger.info(f"  {idx}. {item.get('description')}")
            logger.info(f"     - Cantidad: {item.get('quantity')}")
            logger.info(f"     - Precio unitario (sin IVA): ${item.get('unit_price')}")
            logger.info(f"     - Tax Code: '{item.get('tax_code')}'")
            logger.info(f"     - Descuento: ${item.get('discount')}")
        logger.info(f"=================================")

        # 5. Enviar Request
        url = config.api_url
        
        try:
            response = requests.post(
                url,
                json=payload,  # Enviamos JSON
                headers=headers,
                timeout=30  # Aumentado timeout para procesamiento completo
            )
            
            # Intentar decodificar respuesta JSON
            try:
                data = response.json()
            except:
                data = {"raw_response": response.text}
            
            # 6. Guardar Resultado como SRIDocument
            sri_doc, created = SRIDocument.objects.get_or_create(order=order)
            sri_doc.api_response = data
            
            if response.status_code in [200, 201]:
                # Respuesta exitosa según documentación
                if data.get('success'):
                    sri_doc.status = 'AUTHORIZED'
                    # Extraer información de la factura
                    invoice_data = data.get('invoice', {})
                    sri_doc.sri_number = invoice_data.get('number', '')
                    
                    # Intentar extraer el ID externo de la factura
                    if 'id' in invoice_data:
                        sri_doc.external_id = invoice_data.get('id')
                    
                    # Intentar extraer la clave de acceso de varios campos posibles
                    access_key = (
                        invoice_data.get('access_key') or 
                        invoice_data.get('accessKey') or 
                        invoice_data.get('clave_acceso') or
                        data.get('access_key') or
                        data.get('accessKey') or
                        data.get('clave_acceso') or
                        ''
                    )
                    if access_key:
                        sri_doc.access_key = access_key
                    
                    # Intentar extraer fecha de autorización
                    auth_date = (
                        invoice_data.get('authorization_date') or
                        invoice_data.get('authorizationDate') or
                        invoice_data.get('fecha_autorizacion') or
                        data.get('authorization_date') or
                        None
                    )
                    if auth_date:
                        from django.utils.dateparse import parse_datetime
                        sri_doc.authorization_date = parse_datetime(auth_date)
                    
                else:
                    # Factura creada pero con error en procesamiento
                    sri_doc.status = 'FAILED'
                    sri_doc.error_message = data.get('message', 'Error desconocido')
            else:
                # Error HTTP
                sri_doc.status = 'FAILED'
                error_detail = data.get('error', data.get('detail', response.text[:200]))
                sri_doc.error_message = f"HTTP {response.status_code}: {error_detail}"
            
            
            sri_doc.save()
            
            # Si la emisión fue exitosa y tenemos external_id, consultar detalles completos
            # para obtener la clave de acceso
            if sri_doc.status == 'AUTHORIZED' and sri_doc.external_id:
                try:
                    import time
                    time.sleep(2)  # Esperar 2 segundos para que el SRI procese
                    SRIIntegrationService.fetch_document_details(sri_doc)
                except Exception as e:
                    # Si falla la consulta de detalles, no es crítico
                    # El documento ya está emitido correctamente
                    pass
            
            return sri_doc

        except requests.exceptions.Timeout:
            # Timeout específico
            sri_doc, _ = SRIDocument.objects.get_or_create(order=order)
            sri_doc.status = 'FAILED'
            sri_doc.error_message = "Timeout: La solicitud excedió el tiempo de espera"
            sri_doc.save()
            raise Exception("Timeout al conectar con API Vendo")
            
        except requests.exceptions.RequestException as e:
            # Errores de conexión
            sri_doc, _ = SRIDocument.objects.get_or_create(order=order)
            sri_doc.status = 'FAILED'
            sri_doc.error_message = f"Error de conexión: {str(e)}"
            sri_doc.save()
            raise e
            
        except Exception as e:
            # Otros errores
            sri_doc, _ = SRIDocument.objects.get_or_create(order=order)
            sri_doc.status = 'FAILED'
            sri_doc.error_message = str(e)
            sri_doc.save()
            raise e

    @staticmethod
    def fetch_document_details(sri_document):
        """
        Consulta los detalles completos de un documento ya emitido en la API Vendo
        para obtener la clave de acceso y otros datos adicionales.
        """
        if not sri_document.external_id:
            raise Exception("No se puede consultar documento sin external_id")
        
        config = SRIIntegrationService.get_config()
        if not config.is_active or not config.auth_token:
            raise Exception("Integración SRI no activa o token faltante")
        
        # Endpoint para obtener detalles (ajustar según la API de Vendo)
        # Formato común: /api/sri/documents/{id}/
        base_url = config.api_url.rsplit('/', 2)[0]  # Remover el endpoint específico
        detail_url = f"{base_url}/{sri_document.external_id}/"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {config.auth_token}"
        }
        
        try:
            response = requests.get(
                detail_url,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Actualizar campos si están disponibles
                if 'access_key' in data:
                    sri_document.access_key = data['access_key']
                elif 'accessKey' in data:
                    sri_document.access_key = data['accessKey']
                elif 'clave_acceso' in data:
                    sri_document.access_key = data['clave_acceso']
                
                if 'authorization_date' in data:
                    from django.utils.dateparse import parse_datetime
                    sri_document.authorization_date = parse_datetime(data['authorization_date'])
                
                if 'status' in data:
                    # Mapear estados si es necesario
                    api_status = data['status'].upper()
                    if api_status in ['AUTHORIZED', 'AUTORIZADO']:
                        sri_document.status = 'AUTHORIZED'
                    elif api_status in ['REJECTED', 'RECHAZADO']:
                        sri_document.status = 'REJECTED'
                
                # Actualizar api_response con los datos más recientes
                sri_document.api_response.update(data)
                sri_document.save()
                
                return sri_document
            else:
                raise Exception(f"Error al consultar documento: HTTP {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Error al obtener detalles del documento: {str(e)}")

