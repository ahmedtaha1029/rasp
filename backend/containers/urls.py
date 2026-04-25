"""
containers/urls.py
"""

from django.urls import path

from .views import ContainerSSEView, ContainerStatusView, ContainerProxyView

urlpatterns = [
    path("containers/<str:session_id>/status/", ContainerStatusView.as_view(), name="container-status"),
    path("containers/<str:session_id>/stream/", ContainerSSEView.as_view(), name="container-stream"),
    path("containers/<str:session_id>/proxy/", ContainerProxyView.as_view(), name="container-proxy"),
    path("containers/<str:session_id>/proxy/<path:path>", ContainerProxyView.as_view(), name="container-proxy-path"),
]