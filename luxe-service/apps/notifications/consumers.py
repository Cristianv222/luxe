import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "luxe_notifications"
        
        # Unirse al grupo
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Recibir mensaje del grupo
    async def send_notification(self, event):
        message = event['message']
        type = event.get('type_notification', 'general')
        payload = event.get('payload', {})

        # Enviar mensaje al WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'type': type,
            'payload': payload
        }))
