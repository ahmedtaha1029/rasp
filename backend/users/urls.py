"""users/urls.py"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserView,
    CustomTokenObtainPairView,
    PasswordChangeView,
    SelfRegisterView,
    UserDetailView,
    UserListCreateView,
    UserStatusView,
)

urlpatterns = [
    # Auth
    path("auth/login/",            CustomTokenObtainPairView.as_view(), name="token-obtain"),
    path("auth/refresh/",          TokenRefreshView.as_view(),          name="token-refresh"),
    path("auth/register/",         SelfRegisterView.as_view(),          name="self-register"),
    path("auth/password/change/",  PasswordChangeView.as_view(),        name="password-change"),
    path("auth/me/",               CurrentUserView.as_view(),           name="current-user"),

    # User management (admin only)
    path("users/",                 UserListCreateView.as_view(),        name="user-list-create"),
    path("users/<int:pk>/",        UserDetailView.as_view(),            name="user-detail"),
    path("users/<int:pk>/status/", UserStatusView.as_view(),           name="user-status"),
]