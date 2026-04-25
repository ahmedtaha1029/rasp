"""
datasets/views.py
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdministrator
from .models import DatasetFeature
from .serializers import (
    DatasetFeatureBulkImportSerializer,
    DatasetFeatureSerializer,
)


class DatasetFeatureListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    serializer_class = DatasetFeatureSerializer

    def get_queryset(self):
        qs = DatasetFeature.objects.all()
        source = self.request.query_params.get("source")
        if source:
            qs = qs.filter(source=source)
        return qs


class DatasetFeatureDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    queryset = DatasetFeature.objects.all()
    serializer_class = DatasetFeatureSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e.message)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class DatasetFeatureBulkImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def post(self, request: Request) -> Response:
        serializer = DatasetFeatureBulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = serializer.save()
        return Response(
            {"detail": f"Successfully imported {len(created)} features.", "count": len(created)},
            status=status.HTTP_201_CREATED,
        )