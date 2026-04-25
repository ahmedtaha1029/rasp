from django.contrib import admin
from .models import UserAction, EventLog

admin.site.register(UserAction)
admin.site.register(EventLog)