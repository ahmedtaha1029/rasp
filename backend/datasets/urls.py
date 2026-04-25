from django.urls import path
from .views import (
    DatasetFeatureBulkImportView,
    DatasetFeatureDetailView,
    DatasetFeatureListView,
)

urlpatterns = [
    path("datasets/", DatasetFeatureListView.as_view(), name="dataset-list"),
    path("datasets/<int:pk>/", DatasetFeatureDetailView.as_view(), name="dataset-detail"),
    path("datasets/import/", DatasetFeatureBulkImportView.as_view(), name="dataset-import"),
]