from django.urls import path
from . import views

urlpatterns = [
    path('history/', views.BirthdaySentHistoryListView.as_view(), name='birthday-history'),
]
