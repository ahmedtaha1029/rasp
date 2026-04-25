import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rasp_backend.settings')

app = Celery('rasp_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()