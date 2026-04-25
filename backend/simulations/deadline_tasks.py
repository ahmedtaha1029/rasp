from celery import shared_task
from django.utils import timezone
from django.db.models import F
from datetime import timedelta
# from notifications import models

# @shared_task(name="simulations.deadline_notifications")
# def send_deadline_notifications():
#     from simulations.models import Assignment
#     from notifications.models import Notification
#     now = timezone.now()
#     window_start = now + timedelta(hours=23)
#     window_end   = now + timedelta(hours=25)
#     # Find assignments whose deadline falls in the next 24 hours
#     upcoming = Assignment.objects.filter(
#         deadline__gte=window_start,
#         deadline__lte=window_end,
#     ).select_related("user", "scenario").exclude(
#         # Don't re-notify if already sent
#         user__notifications__notification_type="session_deadline_approaching",
#         user__notifications__scenario=models.F("scenario"),
#         user__notifications__created_at__gte=now - timedelta(hours=25),
#     )
#     count = 0
#     for assignment in upcoming:
#         hours_left = int((assignment.deadline - now).total_seconds() / 3600)
#         Notification.objects.create(
#             user=assignment.user,
#             notification_type=Notification.NotificationType.SESSION_DEADLINE_APPROACHING,
#             message=(
#                 f"Reminder: Your assignment '{assignment.scenario.title}' "
#                 f"is due in approximately {hours_left} hours."
#             ),
#             scenario=assignment.scenario,
#         )
#         count += 1
#     return {"notifications_sent": count}

@shared_task(name="simulations.deadline_notifications")
def send_deadline_notifications():
    from simulations.models import Assignment
    from notifications.models import Notification

    now          = timezone.now()
    window_start = now + timedelta(hours=23)
    window_end   = now + timedelta(hours=25)

    upcoming = Assignment.objects.filter(
        deadline__gte=window_start,
        deadline__lte=window_end,
    ).select_related("user", "scenario")

    # Deduplicate: build set of already-notified (user_id, scenario_id) pairs
    already_notified = set(
        Notification.objects.filter(
            notification_type="session_deadline_approaching",
            created_at__gte=now - timedelta(hours=25),
        ).values_list("user_id", "scenario_id")
    )

    count = 0
    for assignment in upcoming:
        key = (assignment.user_id, assignment.scenario_id)
        if key in already_notified:
            continue
        hours_left = int((assignment.deadline - now).total_seconds() / 3600)
        Notification.objects.create(
            user=assignment.user,
            notification_type=Notification.NotificationType.SESSION_DEADLINE_APPROACHING,
            message=(
                f"Reminder: Your assignment '{assignment.scenario.title}' "
                f"is due in approximately {hours_left} hours."
            ),
            scenario=assignment.scenario,
        )
        already_notified.add(key)
        count += 1

    return {"notifications_sent": count}