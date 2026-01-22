from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import BirthdaySentHistory
from .serializers import BirthdaySentHistorySerializer

class BirthdaySentHistoryListView(generics.ListAPIView):
    """
    GET: List the history of sent birthday messages.
    """
    queryset = BirthdaySentHistory.objects.all()
    serializer_class = BirthdaySentHistorySerializer
    permission_classes = [AllowAny]
    authentication_classes = []
