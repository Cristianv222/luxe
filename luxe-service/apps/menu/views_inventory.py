from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status
from django.http import HttpResponse # For file download
from .models import Product, Category
from .serializers import ProductListSerializer

import openpyxl
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

class InventoryExportExcelView(APIView):
    """Exporta inventario a Excel"""
    def get(self, request):
        products = Product.objects.all().select_related('category')
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inventario"
        
        # Headers
        headers = ['ID', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Mínimo', 'Activo', 'Disponible']
        ws.append(headers)
        
        for p in products:
            ws.append([
                str(p.id),
                p.name,
                p.category.name if p.category else '-',
                float(p.price),
                p.stock_quantity if p.track_stock else 'N/A',
                p.min_stock_alert if p.track_stock else 'N/A',
                'Sí' if p.is_active else 'No',
                'Sí' if p.is_available else 'No'
            ])
            
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="inventario_luxe.xlsx"'
        
        wb.save(response)
        return response

class InventoryExportPDFView(APIView):
    """Exporta inventario a PDF"""
    def get(self, request):
        products = Product.objects.all().select_related('category')
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        w, h = letter
        
        y = h - 50
        p.setFont("Helvetica-Bold", 16)
        p.drawString(30, y, "Reporte de Inventario - Luxe")
        y -= 30
        
        p.setFont("Helvetica-Bold", 10)
        p.drawString(30, y, "Nombre")
        p.drawString(200, y, "Categoría")
        p.drawString(350, y, "Precio")
        p.drawString(420, y, "Stock")
        p.drawString(500, y, "Estado")
        y -= 20
        
        p.setFont("Helvetica", 10)
        for product in products:
            if y < 50:
                p.showPage()
                y = h - 50
                p.setFont("Helvetica", 10)
                
            name = product.name[:30] + "..." if len(product.name) > 30 else product.name
            cat = product.category.name[:20] if product.category else "-"
            price = f"${product.price}"
            stock = str(product.stock_quantity) if product.track_stock else "-"
            status_txt = "Activo" if product.is_active else "Inactivo"
            
            p.drawString(30, y, name)
            p.drawString(200, y, cat)
            p.drawString(350, y, price)
            p.drawString(420, y, stock)
            p.drawString(500, y, status_txt)
            y -= 15
            
        p.save()
        buffer.seek(0)
        
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="inventario_luxe.pdf"'
        return response

class InventoryImportExcelView(APIView):
    """Importa inventario desde Excel"""
    parser_classes = [MultiPartParser]
    

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se proporcionó archivo'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.endswith('.xlsx'):
             return Response({'error': 'Formato no válido. Use .xlsx'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # data_only=True recupera el VALOR de la celda de fórmulas, no la fórmula en sí.
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
            
            count_updated = 0
            count_created = 0
            errors = []
            
            # Skip header
            rows = list(ws.rows)
            if not rows:
                 return Response({'error': 'Archivo vacío'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create generic category for imports if needed
            default_category, _ = Category.objects.get_or_create(
                name="Importados",
                defaults={'slug': 'importados', 'description': 'Categoría para productos importados'}
            )
                 
            for idx, row in enumerate(rows[1:], start=2):
                # Mapeo basado en imagen del usuario y descripción:
                # 0: Id
                # 1: Código del Producto (sku)
                # 2: Código de Barras (nuevo)
                # 3: Descripcion (nombre)
                # 4: Linea -> Category
                # 5: Categoria -> SubCategory? (usaremos lógica simple)
                # 8: Totales Existentes (Stock)
                # 9: Precio1 (Price)
                # 14: Costo Actual (cost_price)
                # 15: Costo ultima compra (last_purchase_cost)
                # 17: IVA (tax_rate) - Asumiendo formato "15%" o "0.15"
                # 18: Cuenta Contable (Ventas?) -> accounting_sales_account
                # 19: Cuenta Contable (Costos?) -> accounting_cost_account
                # 20: Cuenta Contable Inventarios -> accounting_inventory_account

                try:
                    # Safe cell reading
                    def get_val(idx):
                        try:
                            return row[idx].value
                        except IndexError:
                            return None

                    cell_id = get_val(0)
                    cell_code = get_val(1)
                    cell_barcode = get_val(2)
                    cell_name = get_val(3)
                    cell_linea = get_val(4) or ''
                    cell_categoria = get_val(5) or ''
                    cell_subgrupo = get_val(7) or ''
                    cell_medida = get_val(8) or 'Unidad'
                    
                    cell_stock = get_val(9)
                    cell_price = get_val(10)
                    
                    cell_cost = get_val(15)
                    cell_last_cost = get_val(16)
                    cell_tax = get_val(18)
                    
                    acc_sales = get_val(19) or ''
                    acc_cost = get_val(20) or ''
                    acc_inv = get_val(21) or ''

                    if not cell_name:
                        continue
                    
                    # 1. CATEGORÍA
                    # Usamos 'Linea' como categoría principal si existe, sino 'Importados'
                    category = default_category
                    if cell_linea:
                        category_slug = str(cell_linea).lower().strip().replace(' ', '-')[:90]
                        category, _ = Category.objects.get_or_create(
                            name=str(cell_linea).strip(),
                            defaults={'slug': category_slug}
                        )

                    # 2. MATCH PRODUCT
                    product = None
                    
                    # Search by Barcode first (if exists)
                    if cell_barcode:
                        product = Product.objects.filter(barcode=str(cell_barcode)).first()
                    
                    # Search by Code (SKU)
                    if not product and cell_code:
                        product = Product.objects.filter(code=str(cell_code)).first()

                    # Search by Name (last resort)
                    if not product and cell_name:
                        product = Product.objects.filter(name__iexact=str(cell_name)).first()
                    
                    # 3. PREPARE DATA
                    
                    # Precio
                    price_val = 0
                    if cell_price is not None:
                        try:
                            price_val = float(str(cell_price).replace(',', '.'))
                        except ValueError:
                            pass
                            
                    # Costos
                    cost_val = 0
                    if cell_cost is not None:
                        try:
                            cost_val = float(str(cell_cost).replace(',', '.'))
                        except ValueError:
                            pass
                    
                    last_cost_val = 0
                    if cell_last_cost is not None:
                         try:
                            last_cost_val = float(str(cell_last_cost).replace(',', '.'))
                         except ValueError:
                            pass

                    # Tax (IVA)
                    tax_val = 0
                    if cell_tax is not None:
                        try:
                            # Puede venir como "15%" o 0.15
                            val_str = str(cell_tax).replace('%', '').replace(',', '.')
                            tax_val = float(val_str)
                            # Si es > 1 (ej 15), es porcentaje literal. Si es < 1 (0.15), es decimal.
                            if tax_val > 1: # es 12 o 15
                                pass # se guarda como 15.00
                            elif 0 < tax_val < 1:
                                tax_val = tax_val * 100
                        except ValueError:
                            pass

                    # Stock
                    stock_val = 0
                    has_stock = False
                    if cell_stock is not None and str(cell_stock).lower() != 'n/a':
                         try:
                            stock_val = int(float(str(cell_stock).replace(',', '.')))
                            has_stock = True # Even if 0, we track it
                         except ValueError:
                            pass

                    # 4. CREATE OR UPDATE
                    is_new = False
                    if not product:
                        is_new = True
                        base_slug = str(cell_name).lower().replace(' ', '-').replace('/', '-')[:150]
                        import uuid
                        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
                        
                        product = Product(
                            slug=unique_slug,
                            is_active=True,
                            is_available=True
                        )
                    
                    # Update fields
                    product.name = str(cell_name)[:200]
                    product.category = category
                    product.price = price_val
                    
                    if cell_code:
                        product.code = str(cell_code)[:50]
                    if cell_barcode:
                        product.barcode = str(cell_barcode)[:100]
                        
                    product.cost_price = cost_val
                    product.last_purchase_cost = last_cost_val
                    product.tax_rate = tax_val
                    
                    product.accounting_sales_account = str(acc_sales)[:50]
                    product.accounting_cost_account = str(acc_cost)[:50]
                    product.accounting_inventory_account = str(acc_inv)[:50]
                    
                    product.line = str(cell_linea)[:100]
                    product.subgroup = str(cell_subgrupo)[:100]
                    product.unit_measure = str(cell_medida)[:50]
                    
                    # Stock logic
                    # User wants to UPDATE stock, likely replace or add? 
                    # Usually imports are snapshots. Let's set it.
                    if has_stock:
                        product.track_stock = True
                        product.stock_quantity = stock_val
                        if stock_val > 0:
                            product.is_available = True
                    
                    product.save()
                    
                    if is_new:
                        count_created += 1
                    else:
                        count_updated += 1

                except Exception as row_error:
                    print(f"Error procesando fila {row}: {row_error}")
                    errors.append(f"Fila {idx}: {str(row_error)}")
                    continue
                
            return Response({
                'message': f'Importación completada. {count_updated} actualizados, {count_created} creados.',
                'stats': {'updated': count_updated, 'created': count_created},
                'errors': errors[:20] if errors else []
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error procesando archivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
