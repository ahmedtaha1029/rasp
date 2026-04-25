"""
users/serializers.py

Serializers for user registration, authentication, and admin user management.

Key additions vs original:
  - SelfRegistrationSerializer  : for individual users who sign up themselves
  - CustomTokenObtainPairSerializer updated to accept email OR username,
    and to embed account_type in the token response
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


# ---------------------------------------------------------------------------
# Auth serializers
# ---------------------------------------------------------------------------

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to:
      1. Accept email OR username in the login field
      2. Embed role, account_type, username in the token payload
      3. BR-10: reject inactive accounts
    """

    # Rename the field to make it clear both formats are accepted
    username = serializers.CharField(
        label="Email or Username",
        help_text="Your email address or username.",
    )

    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["role"]         = user.role
        token["username"]     = user.username
        token["account_type"] = user.account_type
        return token

    def validate(self, attrs: dict) -> dict:
        # Resolve email → username so the parent validator can authenticate
        login_value = attrs.get("username", "")
        if "@" in login_value:
            try:
                user_obj = User.objects.get(email=login_value)
                attrs["username"] = user_obj.username
            except User.DoesNotExist:
                pass  # Let parent raise the standard "no active account" error

        data = super().validate(attrs)

        # BR-10: reject inactive accounts after credentials pass
        if not self.user.is_active_account:
            raise serializers.ValidationError(
                {"detail": "Account is disabled. Contact your administrator."},
                code="account_disabled",
            )

        # Embed user info in the response body (not just the JWT payload)
        data["role"]         = self.user.role
        data["username"]     = self.user.username
        data["account_type"] = self.user.account_type
        data["status"]       = self.user.status
        data["user_id"]      = self.user.pk
        return data


# ---------------------------------------------------------------------------
# Self-registration (individual users)
# ---------------------------------------------------------------------------

class SelfRegistrationSerializer(serializers.ModelSerializer):
    """
    Used by POST /api/auth/register/ — open to the public.

    Individual users choose their own role (hr_personnel, job_seeker, or both).
    account_type is automatically set to 'individual'.
    Username is auto-derived from email to keep registration simple.
    """

    password = serializers.CharField(
        write_only=True, required=True,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        write_only=True, required=True,
        style={"input_type": "password"},
    )
    # Individual users pick hr, job_seeker, or both
    role = serializers.ChoiceField(
        choices=[
            ("hr_personnel", "HR Personnel"),
            ("job_seeker",   "Job Seeker"),
            ("both",         "Both (HR + Job Seeker)"),
        ],
        default="job_seeker",
    )

    class Meta:
        model  = User
        fields = ["id", "email", "role", "password", "confirm_password"]

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        email    = validated_data["email"]

        # Auto-generate a username from the email prefix
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{suffix}"
            suffix += 1

        user = User(
            username=username,
            account_type=User.AccountType.INDIVIDUAL,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


# ---------------------------------------------------------------------------
# Admin registration (creates org users — existing behaviour unchanged)
# ---------------------------------------------------------------------------

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Admin-only: creates organizational user accounts.
    account_type is set to 'organizational' automatically.
    """

    password = serializers.CharField(
        write_only=True, required=True,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        write_only=True, required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model  = User
        fields = ["id", "username", "email", "role", "password", "confirm_password"]
        extra_kwargs = {"role": {"required": True}}

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        user = User(account_type=User.AccountType.ORGANIZATIONAL, **validated_data)
        user.set_password(password)
        user.full_clean()
        user.save()
        return user


# ---------------------------------------------------------------------------
# Read serializers
# ---------------------------------------------------------------------------

class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal read-only representation used in nested contexts."""

    class Meta:
        model        = User
        fields       = ["id", "username", "role"]
        read_only_fields = fields


class UserDetailSerializer(serializers.ModelSerializer):
    """Full user record for admin-facing user management endpoints."""

    class Meta:
        model        = User
        fields       = ["id", "username", "email", "role", "account_type", "status", "date_joined"]
        read_only_fields = ["id", "date_joined"]


# ---------------------------------------------------------------------------
# Password change
# ---------------------------------------------------------------------------

class PasswordChangeSerializer(serializers.Serializer):
    current_password   = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password       = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_new_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs: dict) -> dict:
        user: User = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "New passwords do not match."})
        return attrs

    def save(self, **kwargs) -> User:
        user: User = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


# ---------------------------------------------------------------------------
# Admin: activate / deactivate
# ---------------------------------------------------------------------------

class UserStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["id", "status"]

    def update(self, instance: User, validated_data: dict) -> User:
        instance._change_triggered_by_admin = True
        instance.status = validated_data["status"]
        instance.full_clean()
        instance.save(update_fields=["status"])
        return instance