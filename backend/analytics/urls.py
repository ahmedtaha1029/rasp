# from django.urls import path
# from .views import (
#     MitreTechniqueFrequencyView,
#     ReportExportView,
#     ScenarioMetricsDashboardView,
# )

# urlpatterns = [
#     path("analytics/scenarios/<int:scenario_id>/", ScenarioMetricsDashboardView.as_view(), name="analytics-scenario"),
#     path("analytics/mitre/", MitreTechniqueFrequencyView.as_view(), name="analytics-mitre"),
#     path("analytics/export/", ReportExportView.as_view(), name="analytics-export"),
# ]

from django.urls import path

from .graph_views import AttackPathGraphView
from .views import (
    MitreTechniqueFrequencyView, OverallPlatformView,
    PersonalAnalyticsView, ReportExportView, ScenarioMetricsDashboardView,
    DwellTimeAnalyticsView, MitreResourceListView,
)

urlpatterns = [
    path("analytics/overview/",                       OverallPlatformView.as_view(),          name="analytics-overview"),
    path("analytics/scenarios/<int:scenario_id>/",    ScenarioMetricsDashboardView.as_view(), name="analytics-scenario"),
    path("analytics/mitre/",                          MitreTechniqueFrequencyView.as_view(),  name="analytics-mitre"),
    path("analytics/export/",                         ReportExportView.as_view(),             name="analytics-export"),
    path("analytics/me/",                             PersonalAnalyticsView.as_view(),        name="analytics-personal"),
    path("analytics/dwell/",                          DwellTimeAnalyticsView.as_view(),       name="analytics-dwell"),
    path("analytics/mitre-resources/",                MitreResourceListView.as_view(),        name="mitre-resources"),
    path("analytics/attack-graph/<int:scenario_id>/", AttackPathGraphView.as_view(),          name="attack-graph"),
]