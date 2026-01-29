from django.db import models

class Role(models.Model):
    """Roles del sistema"""
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Administrador'),
        ('ADMIN_LUXE', 'Administrador Luxe'),
        ('ADMIN_RESTAURANT', 'Administrador Restaurante'),
        ('ADMIN_HOTEL', 'Administrador Hotel'),
        ('ADMIN_POOL', 'Administrador Piscinas'),
        ('CASHIER', 'Cajero'),
        ('COOK', 'Cocinero'),
        ('WAITER', 'Mesero'),
        ('RECEPTIONIST', 'Recepcionista'),
        ('CUSTOMER', 'Cliente'),
    ]
    
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
    
    def __str__(self):
        return self.get_name_display()


class Permission(models.Model):
    """Permisos específicos"""
    PERMISSION_CHOICES = [
        # Luxe
        ('luxe.view_menu', 'Ver menú luxe'),
        ('luxe.manage_menu', 'Gestionar menú luxe'),
        ('luxe.view_orders', 'Ver pedidos luxe'),
        ('luxe.manage_orders', 'Gestionar pedidos luxe'),
        ('luxe.view_reports', 'Ver reportes luxe'),
        
        # Restaurant
        ('restaurant.view_menu', 'Ver menú restaurante'),
        ('restaurant.manage_menu', 'Gestionar menú restaurante'),
        ('restaurant.view_tables', 'Ver mesas'),
        ('restaurant.manage_tables', 'Gestionar mesas'),
        ('restaurant.view_orders', 'Ver pedidos restaurante'),
        ('restaurant.manage_orders', 'Gestionar pedidos restaurante'),
        ('restaurant.view_reports', 'Ver reportes restaurante'),
        
        # Reporting
        ('reporting.view_all', 'Ver todos los reportes'),
        ('reporting.view_luxe', 'Ver reportes luxe'),
        ('reporting.view_restaurant', 'Ver reportes restaurante'),
        ('reporting.export', 'Exportar reportes'),
    ]
    
    code = models.CharField(max_length=100, choices=PERMISSION_CHOICES, unique=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'permissions'
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'
    
    def __str__(self):
        return self.get_code_display()