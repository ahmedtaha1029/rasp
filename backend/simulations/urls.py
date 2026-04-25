from django.urls import path
from .views import (
    AssignmentDetailView,
    AssignmentListCreateView,
    SessionAcknowledgeView,
    SessionAdvanceView,
    SessionCompleteView,
    SessionDetailView,
    SessionListMineView,   # ← new
    SessionStartView,
)
from .pause_resume_views import SessionPauseView, SessionResumeView

urlpatterns = [
    path("assignments/",              AssignmentListCreateView.as_view(), name="assignment-list-create"),
    path("assignments/<int:pk>/",     AssignmentDetailView.as_view(),     name="assignment-detail"),
    path("sessions/mine/",            SessionListMineView.as_view(),      name="session-list-mine"),  # ← new
    path("sessions/start/<int:scenario_id>/", SessionStartView.as_view(), name="session-start"),
    path("sessions/<str:pk>/",        SessionDetailView.as_view(),        name="session-detail"),
    path("sessions/<str:pk>/acknowledge/", SessionAcknowledgeView.as_view(), name="session-acknowledge"),
    path("sessions/<str:pk>/advance/", SessionAdvanceView.as_view(),     name="session-advance"),
    path("sessions/<str:pk>/complete/", SessionCompleteView.as_view(),   name="session-complete"),
    path("sessions/<str:pk>/pause/",  SessionPauseView.as_view(),        name="session-pause"),
    path("sessions/<str:pk>/resume/", SessionResumeView.as_view(),       name="session-resume"),
]