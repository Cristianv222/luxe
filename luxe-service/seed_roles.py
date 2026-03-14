#!/usr/bin/env python
"""
Script para poblar los roles del sistema en la base de datos.
Ejecución: python manage.py shell < seed_roles.py
  o bien:  python seed_roles.py  (dentro del contenedor con DJANGO_SETTINGS_MODULE configurado)
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from apps.roles.models import Role

ROLES = [
    ('SUPER_ADMIN',       'Super Administrador',     'Acceso total al sistema'),
    ('ADMIN_LUXE',        'Administrador Luxe',      'Administrador del módulo Luxe'),
    ('ADMIN_RESTAURANT',  'Administrador Restaurante','Administrador del restaurante'),
    ('ADMIN_HOTEL',       'Administrador Hotel',     'Administrador del hotel'),
    ('ADMIN_POOL',        'Administrador Piscinas',  'Administrador de piscinas'),
    ('EMPLOYEE',          'Empleado',                'Empleado general con acceso básico'),
    ('CASHIER',           'Cajero',                  'Acceso al POS y caja'),
    ('COOK',              'Cocinero',                'Acceso a cocina'),
    ('WAITER',            'Mesero',                  'Acceso a mesas y órdenes'),
    ('RECEPTIONIST',      'Recepcionista',           'Acceso a recepción'),
    ('CUSTOMER',          'Cliente',                 'Cliente final del sistema'),
]

created = 0
updated = 0

for name, display, description in ROLES:
    role, was_created = Role.objects.get_or_create(
        name=name,
        defaults={'description': description}
    )
    if was_created:
        created += 1
        print(f"  ✅ Creado: {display} ({name})")
    else:
        # Actualiza la descripción si ya existía
        role.description = description
        role.save()
        updated += 1
        print(f"  🔄 Ya existe: {display} ({name})")

print(f"\n✅ Roles en BD: {Role.objects.count()} total ({created} nuevos, {updated} ya existían)")
