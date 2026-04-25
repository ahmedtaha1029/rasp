"""
users/views.py
 
Added DRF throttle classes to CustomTokenObtainPairView and SelfRegisterView
to prevent brute-force and enumeration attacks (Section 6, NFR-9).
 
Throttle rates are defined in settings.py under REST_FRAMEWORK:
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/minute',
        'register': '3/minute',
    }

Throttle classes live in users/throttling.py. They extend the rate limits
with a load-test exemption: requests from localhost carrying the correct
X-Load-Test-Secret header bypass throttling so NFR-9 load tests can run
without hitting 429s. The exemption is inert in production (requires
LOAD_TEST_SECRET env var to be set).
"""
 
from django.db.models import QuerySet
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
 
from .models import User
from .permissions import IsAdministrator
from .throttling import LoginRateThrottle, RegisterRateThrottle
from .serializers import (
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    SelfRegistrationSerializer,
    UserDetailSerializer,
    UserRegistrationSerializer,
    UserStatusSerializer,
    UserSummarySerializer,
)
 
 
# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
 
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
 
    FIX #4: Rate limited to 5 requests/minute per IP (LoginRateThrottle).
    Accepts email OR username. Returns JWT + role + account_type.
    BR-10 (inactive account rejection) enforced inside the serializer.
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]  # ← FIX #4
 
 
class SelfRegisterView(APIView):
    """
    POST /api/auth/register/
 
    FIX #4: Rate limited to 3 requests/minute per IP (RegisterRateThrottle).
    Public endpoint for individual users to create their own account.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]  # ← FIX #4
 
    def post(self, request: Request) -> Response:
        serializer = SelfRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.pk,
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "account_type": user.account_type,
                "message": "Account created. You can now log in.",
            },
            status=status.HTTP_201_CREATED,
        )
 
 
class PasswordChangeView(APIView):
    """
    POST /api/auth/password/change/
    NFR-3: Requires current password before allowing a change.
    """
    permission_classes = [permissions.IsAuthenticated]
 
    def post(self, request: Request) -> Response:
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
 
 
# ---------------------------------------------------------------------------
# User management (admin-only for org users)
# ---------------------------------------------------------------------------
 
class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/users/ → list all org users (admin only)
    POST /api/users/ → create a new org user (admin only)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    queryset = User.objects.filter(
        account_type=User.AccountType.ORGANIZATIONAL
    ).order_by("username")
 
    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserRegistrationSerializer
        return UserDetailSerializer
 
 
class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/users/{id}/ → retrieve user details
    PATCH /api/users/{id}/ → update username, email, role (admin only for edits)
    """
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
 
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdministrator()]
 
    def get_object(self):
        obj = super().get_object()
        if not self.request.user.is_administrator and obj.pk != self.request.user.pk:
            self.permission_denied(self.request)
        return obj
 
 
class UserStatusView(APIView):
    """
    PATCH /api/users/{id}/status/
    Admin-only: activate or deactivate an account. BR-10.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
 
    def patch(self, request: Request, pk: int) -> Response:
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
 
        serializer = UserStatusSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
 
 
class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns the authenticated user's own profile.
    """
    permission_classes = [permissions.IsAuthenticated]
 
    def get(self, request: Request) -> Response:
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)