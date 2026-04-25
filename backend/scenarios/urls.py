from django.urls import path
from .views import (
    AttackVectorDetailView,
    AttackVectorListCreateView,
    PublicScenarioListView,      # ← new
    ScenarioActivateView,
    ScenarioDetailView,
    ScenarioListCreateView,
    StageDetailView,
    StageListCreateView,
)

urlpatterns = [
    # Public endpoint MUST come before scenarios/<int:pk>/ to avoid
    # Django treating "public" as a numeric pk.
    path("scenarios/public/",                                  PublicScenarioListView.as_view(),     name="scenario-public-list"),
    path("scenarios/",                                         ScenarioListCreateView.as_view(),     name="scenario-list-create"),
    path("scenarios/<int:pk>/",                                ScenarioDetailView.as_view(),         name="scenario-detail"),
    path("scenarios/<int:pk>/activate/",                       ScenarioActivateView.as_view(),       name="scenario-activate"),
    path("scenarios/<int:scenario_pk>/stages/",                StageListCreateView.as_view(),        name="stage-list-create"),
    path("scenarios/<int:scenario_pk>/stages/<int:pk>/",       StageDetailView.as_view(),            name="stage-detail"),
    path("stages/<int:stage_pk>/vectors/",                     AttackVectorListCreateView.as_view(), name="vector-list-create"),
    path("stages/<int:stage_pk>/vectors/<int:pk>/",            AttackVectorDetailView.as_view(),     name="vector-detail"),
]