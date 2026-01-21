import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luxe_service.settings')
django.setup()

from django.db import connection
from apps.orders.models import Order

print("=" * 80)
print("COMPARACIÓN: Modelo Order vs Base de Datos")
print("=" * 80)

# Obtener campos del modelo
model_fields = {f.name: f for f in Order._meta.fields}
print(f"\n✓ Campos en el modelo Order: {len(model_fields)}")
for name in sorted(model_fields.keys()):
    field = model_fields[name]
    null_status = "NULL" if field.null else "NOT NULL"
    print(f"  - {name} ({field.get_internal_type()}) [{null_status}]")

# Obtener campos de la base de datos
cursor = connection.cursor()
cursor.execute("""
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name='orders_order'
    ORDER BY column_name;
""")

db_columns = {}
for row in cursor.fetchall():
    db_columns[row[0]] = {
        'nullable': row[1] == 'YES',
        'type': row[2],
        'default': row[3]
    }

print(f"\n✓ Columnas en la tabla orders_order: {len(db_columns)}")
for name in sorted(db_columns.keys()):
    col = db_columns[name]
    null_status = "NULL" if col['nullable'] else "NOT NULL"
    print(f"  - {name} ({col['type']}) [{null_status}]")

# Encontrar diferencias
print("\n" + "=" * 80)
print("DIFERENCIAS ENCONTRADAS")
print("=" * 80)

# Campos en BD pero no en modelo (HUÉRFANOS)
orphan_columns = set(db_columns.keys()) - set(model_fields.keys())
if orphan_columns:
    print(f"\n❌ Columnas HUÉRFANAS en BD (no están en el modelo):")
    for col in sorted(orphan_columns):
        info = db_columns[col]
        null_status = "NULL" if info['nullable'] else "NOT NULL"
        print(f"  - {col} ({info['type']}) [{null_status}]")
        if not info['nullable'] and info['default'] is None:
            print(f"    ⚠️  PROBLEMA: Es NOT NULL sin default - causará IntegrityError!")
else:
    print("\n✓ No hay columnas huérfanas")

# Campos en modelo pero no en BD (FALTANTES)
missing_columns = set(model_fields.keys()) - set(db_columns.keys())
if missing_columns:
    print(f"\n⚠️  Columnas FALTANTES en BD (están en modelo pero no en BD):")
    for col in sorted(missing_columns):
        field = model_fields[col]
        print(f"  - {col} ({field.get_internal_type()})")
else:
    print("\n✓ No hay columnas faltantes")

# Verificar discrepancias en nullabilidad
print(f"\n🔍 Verificando nullabilidad...")
mismatches = []
for name in set(model_fields.keys()) & set(db_columns.keys()):
    model_nullable = model_fields[name].null
    db_nullable = db_columns[name]['nullable']
    if model_nullable != db_nullable:
        mismatches.append((name, model_nullable, db_nullable))

if mismatches:
    print(f"⚠️  Discrepancias en nullabilidad:")
    for name, model_null, db_null in mismatches:
        print(f"  - {name}: Modelo={'NULL' if model_null else 'NOT NULL'}, BD={'NULL' if db_null else 'NOT NULL'}")
else:
    print("✓ Nullabilidad consistente")

print("\n" + "=" * 80)
if orphan_columns:
    print("ACCIÓN REQUERIDA: Eliminar columnas huérfanas con una migración")
    print("=" * 80)
