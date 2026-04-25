from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "status", "is_staff"]
    list_filter = ["role", "status"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("RASP", {"fields": ("role", "status")}),
    )