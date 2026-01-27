from django.contrib import admin
from .models import MaytapiConfig

@admin.register(MaytapiConfig)
class MaytapiConfigAdmin(admin.ModelAdmin):
    list_display = ('product_id', 'is_active', 'updated_at')
    search_fields = ('product_id', 'phone_id')
    
    def has_add_permission(self, request):
        # Limitar a una sola configuración
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
