from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT personalizada que no requiere que el usuario
    exista en la base de datos local de luxe-service.
    """
    def get_user(self, validated_token):
        user_id = validated_token.get('user_id')
        if not user_id:
            raise exceptions.AuthenticationFailed('Token no contiene user_id')

        # Intentamos obtener el usuario de la base de datos local por si existe
        # (por ejemplo si es un admin creado localmente)
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            # Si no existe, creamos un usuario "virtual" o "shadow"
            # para que DRF no falle la autenticación.
            # No lo guardamos en la base de datos.
            
            user = User(
                id=user_id,
                username=validated_token.get('username', f'user_{user_id}'),
                email=validated_token.get('email', ''),
                is_active=True
            )
            # Marcar como autenticado externamente
            user.is_external = True
            
            # Asignar roles desde el token si están presentes
            user.role = validated_token.get('role')
            user.is_staff = validated_token.get('is_staff', False)
            user.is_superuser = validated_token.get('is_superuser', False)
            
            return user