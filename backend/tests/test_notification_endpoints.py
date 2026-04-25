# backend/tests/test_notification_endpoints.py
import pytest

@pytest.mark.django_db
class TestNotificationsAPI:
    def _make_notification(self, user, db):
        from notifications.models import Notification
        from scenarios.models import Scenario
        scenario = Scenario.objects.create(
            title="Notif Test", container_image="rasp:latest"
        )
        return Notification.objects.create(
            user=user,
            notification_type="scenario_assigned",
            message="You have been assigned a scenario.",
            scenario=scenario,
        )

    def test_user_sees_only_own_notifications(self, hr_client, hr_user, job_seeker, db):
        from notifications.models import Notification
        from scenarios.models import Scenario
        scenario = Scenario.objects.create(title="S", container_image="rasp:latest")
        Notification.objects.create(user=job_seeker, notification_type="scenario_assigned",
                                    message="for seeker", scenario=scenario)
        self._make_notification(hr_user, db)
        response = hr_client.get("/api/notifications/")
        assert response.status_code == 200
        ids = [n["user"] if "user" in n else n.get("id") for n in response.data]
        # Verify none of the returned notifications belong to job_seeker
        for n in response.data:
            assert n.get("message") != "for seeker"

    def test_mark_notification_as_read(self, hr_client, hr_user, db):
        notif = self._make_notification(hr_user, db)
        response = hr_client.patch(f"/api/notifications/{notif.id}/read/")
        assert response.status_code == 200
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_mark_all_read(self, hr_client, hr_user, db):
        from notifications.models import Notification
        n1 = self._make_notification(hr_user, db)
        n2 = self._make_notification(hr_user, db)
        response = hr_client.post("/api/notifications/read-all/", {}, format="json")
        assert response.status_code == 200
        n1.refresh_from_db(); n2.refresh_from_db()
        assert n1.is_read is True
        assert n2.is_read is True

    def test_container_unavailable_notification_type_exists(self, db):
        from notifications.models import Notification
        valid_types = [c[0] for c in Notification.NotificationType.choices]
        assert "container_unavailable" in valid_types
        assert "session_deadline_approaching" in valid_types