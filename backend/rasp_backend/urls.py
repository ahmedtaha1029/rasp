from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("users.urls")),
    path("api/", include("datasets.urls")),
    path("api/", include("scenarios.urls")),
    path("api/", include("simulations.urls")),
    path("api/", include("containers.urls")),
    path("api/", include("analytics.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("telemetry.urls")),
]