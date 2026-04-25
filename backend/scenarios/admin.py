from django.contrib import admin
from .models import Scenario, Stage, AttackVector

admin.site.register(Scenario)
admin.site.register(Stage)
admin.site.register(AttackVector)