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
            wb = openpyxl.load_workbook(file)
            ws = wb.active
            
            count_updated = 0
            count_created = 0
            
            # Skip header
            rows = list(ws.rows)
            if not rows:
                 return Response({'error': 'Archivo vacío'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create generic category for imports if needed
            default_category, _ = Category.objects.get_or_create(
                name="Importados",
                defaults={'slug': 'importados', 'description': 'Categoría para productos importados'}
            )
                 
            for row in rows[1:]:
                # Expected: ID (0), Nombre (1), Categoría (2), Precio (3), Stock (4), Min (5), Active (6), Available (7)
                
                cell_id = row[0].value
                cell_name = row[1].value
                cell_category_name = row[2].value
                cell_price = row[3].value
                cell_stock = row[4].value
                
                if not cell_name:
                    continue
                
                product = None
                
                # 1. Tratar de buscar por ID
                if cell_id and len(str(cell_id)) > 30: 
                    try:
                        product = Product.objects.get(id=str(cell_id))
                    except Product.DoesNotExist:
                        pass
                
                # 2. Si no, buscar por nombre
                if not product and cell_name:
                    product = Product.objects.filter(name__iexact=str(cell_name)).first()
                    
                if product:
                    # ACTUALIZAR (Sumar Stock)
                    try:
                        if cell_stock is not None and str(cell_stock).lower() != 'n/a':
                             try:
                                qty_to_add = int(cell_stock)
                                product.track_stock = True
                                product.stock_quantity += qty_to_add # SUMAR stock
                             except ValueError:
                                pass
                        
                        # Actualizar precio si es diferente (opcional, usuario pidió sumar stock pero precio usually overrides)
                        if cell_price is not None:
                            try:
                                product.price = float(cell_price)
                            except ValueError:
                                pass
                        
                        product.save()
                        count_updated += 1
                    except Exception as e:
                        print(f"Error updating {cell_name}: {e}")
                
                else:
                    # CREAR PRODUCTO
                    try:
                        category = default_category
                        if cell_category_name:
                            category = Category.objects.filter(name__iexact=str(cell_category_name)).first() or default_category

                        new_stock = 0
                        track_stock = False
                        if cell_stock is not None and str(cell_stock).lower() != 'n/a':
                             try:
                                new_stock = int(cell_stock)
                                track_stock = True
                             except ValueError:
                                pass
                        
                        new_price = 0
                        if cell_price is not None:
                             try:
                                new_price = float(cell_price)
                             except ValueError:
                                pass

                        base_slug = str(cell_name).lower().replace(' ', '-').replace('/', '-')
                        import uuid
                        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

                        Product.objects.create(
                            name=str(cell_name),
                            slug=unique_slug,
                            description="Importado desde Excel",
                            category=category,
                            price=new_price,
                            track_stock=track_stock,
                            stock_quantity=new_stock,
                            is_active=True,
                            is_available=True
                        )
                        count_created += 1
                    except Exception as e:
                        print(f"Error creating {cell_name}: {e}")
                
            return Response({
                'message': f'Importación completada. {count_updated} actualizados (stock sumado), {count_created} creados.',
                'stats': {'updated': count_updated, 'created': count_created}
            })
            
        except Exception as e:
            return Response({'error': f'Error procesando archivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
