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
        """
        config = SRIIntegrationService.get_config()
        if not config.is_active or not config.auth_token:
            raise Exception("Integración SRI no activa o token faltante")

        # 1. Preparar Datos del Cliente
        customer = order.customer
        if customer:
            ident_type = SRIIntegrationService.identify_customer_type(customer.cedula)
            ident_number = customer.cedula
            name = customer.get_full_name()
            email = customer.email
            phone = customer.phone
            address = customer.address or "Ciudad"
        else:
            # Consumidor Final
            ident_type = "07"
            ident_number = "9999999999999"
            name = "CONSUMIDOR FINAL"
            email = "consumidor@final.com"
            phone = "9999999999"
            address = "S/D"

        # 2. Preparar Items
        # La API espera precios unitarios SIN IMPUESTOS (normalmente), pero la doc dice:
        # "Impuesto por item: subtotal x 15%".
        # Asumiremos que debemos enviar el precio base (Subtotal / Cantidad).
        # Como nuestro modelo OrderItem ya tiene unit_price (que suele incluir IVA en retail), debemos desglosarlo.
        # O si unit_price es base, lo enviamos directo.
        # Asumiremos que Product.price es con IVA incluido (común en B2C).
        # Tax Rate viene en el producto.
        
        items_payload = []
        for item in order.items.all():
            product = item.product
            
            # Calcular precio unitario SIN IMPUESTOS para la API
            # Precio Base = Precio Con IVA / (1 + Tasa%)
            tax_rate = float(product.tax_rate or 0)
            price_with_tax = float(item.unit_price) # Asumiendo que esto es lo que pagó el cliente por unidad
            
            if tax_rate > 0:
                unit_price_base = price_with_tax / (1 + (tax_rate / 100))
            else:
                unit_price_base = price_with_tax
            
            # Determinar códigos de impuesto SRI
            # Código 2 = IVA
            # Porcentajes: 0=0%, 2=12%, 3=14%, 4=15%, 5=5%
            tax_code = "2" # IVA
            if tax_rate == 0:
                perc_code = "0"
            elif tax_rate == 12:
                perc_code = "2"
            elif tax_rate == 14:
                perc_code = "3"
            elif tax_rate == 15:
                # Nuevo IVA 15% (Desde abril 2024 en Ecuador)
                # Nota: Algunos sitemas usan código 4 para el 15%. Verificar.
                perc_code = "4"
            elif tax_rate == 5:
                perc_code = "5"
            else:
                # Fallback, quizás enviar como exento o el más cercano
                perc_code = "0"

            item_data = {
                "main_code": product.code or f"PROD-{product.id}"[:25],
                "auxiliary_code": f"ORD-{order.order_number}"[:25],
                "description": product.name[:300],
                "quantity": round(float(item.quantity), 6),
                "unit_price": round(unit_price_base, 6),
                "discount": 0.00,
                "taxes": [
                    {
                        "code": tax_code,
                        "percentage_code": perc_code,
                        "rate": tax_rate
                    }
                ]
            }
            items_payload.append(item_data)

        # Manejar descuentos globales de la orden distribuyéndolos o agregando item negativo (si la API lo permite)
        # La API tiene campo 'discount' por item. Lo ideal es prorratear el descuento global.
        if order.discount_amount > 0:
            total_subtotal = sum(i['unit_price'] * i['quantity'] for i in items_payload)
            if total_subtotal > 0:
                for i in items_payload:
                    item_subtotal = i['unit_price'] * i['quantity']
                    # Prorrateo del descuento base (sin iva)
                    # Descuento Order es total (con iva). Debemos desglosar descuento base.
                    # Simplificación: Asumimos descuento proporcional
                    ratio = item_subtotal / total_subtotal
                    # Descuento por item = (DescuentoTotal / 1.IVA) * ratio
                    # Mejor enviamos descuento al item si podemos.
                    # Por ahora dejaremos descuento en 0 para simplificar primera versión.
                    pass

        # 3. Construir Payload Completo
        payload = {
            "issue_date": order.created_at.strftime('%Y-%m-%d'),
            "customer_identification_type": ident_type,
            "customer_identification": ident_number,
            "customer_name": name,
            "customer_address": address,
            "customer_email": email,
            "customer_phone": phone,
            "send_email": True,
            "items": items_payload
        }
        
        # Si no es token VSR, agregar company
        if config.company_id:
            payload["company"] = config.company_id

        # 4. Enviar Request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {config.auth_token}"
        }

        try:
            response = requests.post(
                config.api_url,
                json=payload,
                headers=headers,
                timeout=10 # 10 segundos como dice la doc
            )
            
            data = response.json()
            
            # 5. Guardar Resultado como SRIDocument
            sri_doc, created = SRIDocument.objects.get_or_create(order=order)
            sri_doc.api_response = data
            
            if response.status_code == 201 and data.get('success'):
                inv = data.get('invoice', {})
                sri_doc.status = 'AUTHORIZED' if inv.get('status') == 'Autorizado' else 'SENT'
                sri_doc.external_id = inv.get('id')
                sri_doc.sri_number = inv.get('number')
                # La API VENDO retorna 'invoice.status' como texto. Mapear si es necesario.
            else:
                sri_doc.status = 'FAILED'
                sri_doc.error_message = data.get('message', 'Error desconocido')
                if 'error' in data:
                    sri_doc.error_message += f" - {data['error']}"
            
            sri_doc.save()
            return sri_doc

        except Exception as e:
            # Registrar error local
            sri_doc, _ = SRIDocument.objects.get_or_create(order=order)
            sri_doc.status = 'FAILED'
            sri_doc.error_message = str(e)
            sri_doc.save()
            raise e

