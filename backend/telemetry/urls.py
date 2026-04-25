from django.urls import path
from .views import UserActionDetailView, UserActionListView

urlpatterns = [
    path("telemetry/actions/", UserActionListView.as_view(), name="action-list"),
    path("telemetry/actions/<int:pk>/", UserActionDetailView.as_view(), name="action-detail"),
]