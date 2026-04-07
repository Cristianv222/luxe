import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def send_websocket_notification(message, type_notification="general", payload=None):
    """
    Utility function to send a real-time notification via WebSockets.
    Handles non-serializable objects like UUIDs by converting them to strings.
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        # Aseguramos que el payload sea serializable (convierte UUIDs, fechas, etc a strings)
        serializable_payload = {}
        if payload:
            try:
                # Truco rápido y seguro: pasar por JSON con default=str
                serializable_payload = json.loads(json.dumps(payload, default=str))
            except Exception as e:
                print(f"Error serializing WebSocket payload: {e}")
                serializable_payload = {"error": "Non-serializable data"}

        async_to_sync(channel_layer.group_send)(
            "luxe_notifications",
            {
                "type": "send_notification",
                "message": message,
                "type_notification": type_notification,
                "payload": serializable_payload
            }
        )
