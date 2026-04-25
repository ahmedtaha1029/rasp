# backend/tests/test_notifications.py
import pytest
from datetime import timedelta
from django.utils import timezone

@pytest.mark.django_db
class TestDeadlineNotifications:
    def test_sends_notification_for_assignment_due_in_24h(self, hr_user, db):
        from simulations.deadline_tasks import send_deadline_notifications
        from simulations.models import Assignment
        from notifications.models import Notification
        from scenarios.models import Scenario

        scenario = Scenario.objects.create(
            title="Deadline Test", container_image="rasp:latest"
        )
        Assignment.objects.create(
            user=hr_user,
            scenario=scenario,
            deadline=timezone.now() + timedelta(hours=24)
        )
        result = send_deadline_notifications()
        assert result["notifications_sent"] >= 1
        assert Notification.objects.filter(
            user=hr_user,
            notification_type="session_deadline_approaching"
        ).exists()

    def test_no_notification_for_assignment_not_due_yet(self, hr_user, db):
        from simulations.deadline_tasks import send_deadline_notifications
        from simulations.models import Assignment
        from notifications.models import Notification
        from scenarios.models import Scenario

        scenario = Scenario.objects.create(
            title="Far Deadline", container_image="rasp:latest"
        )
        Assignment.objects.create(
            user=hr_user,
            scenario=scenario,
            deadline=timezone.now() + timedelta(days=7)
        )
        send_deadline_notifications()
        assert not Notification.objects.filter(
            user=hr_user,
            notification_type="session_deadline_approaching"
        ).exists()

    def test_no_duplicate_notifications_on_double_run(self, hr_user, db):
        from simulations.deadline_tasks import send_deadline_notifications
        from simulations.models import Assignment
        from notifications.models import Notification
        from scenarios.models import Scenario

        scenario = Scenario.objects.create(
            title="Dup Test", container_image="rasp:latest"
        )
        Assignment.objects.create(
            user=hr_user,
            scenario=scenario,
            deadline=timezone.now() + timedelta(hours=24)
        )
        send_deadline_notifications()
        send_deadline_notifications()
        count = Notification.objects.filter(
            user=hr_user,
            notification_type="session_deadline_approaching"
        ).count()
        assert count == 1  # not 2