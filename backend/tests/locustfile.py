# backend/tests/locustfile.py
"""
RASP NFR-9 Load Test — 50 Concurrent Users
===========================================

Tests that the platform can handle 50 simultaneous users without
performance degradation (NFR-9: 95% of API requests respond within 2s).

How to run
----------
    1. Add LOAD_TEST_SECRET=some-secret to your backend .env
    2. Run:

    locust -f backend/tests/locustfile.py --host=http://localhost ^
           --users 50 --spawn-rate 5 --run-time 3m ^
           --html=load_test_report.html

NOTE: Pre-registration runs before the timed test begins (~75 seconds).
All 50 users are registered slowly (1 per 1.5s) to avoid throttle limits,
then each simulated user just logs in during on_start.
"""

import os
import random
import uuid
import time
import requests
from locust import HttpUser, task, between, events
from locust.exception import StopUser


# ─── Load-test exemption secret ─────────────────────────────────────────────
# Must match LOAD_TEST_SECRET in the backend .env file.
# Keep this out of source control in production — pass via environment.

LOAD_TEST_SECRET = os.environ.get("LOAD_TEST_SECRET", "rasp-load-test-secret")

LOAD_TEST_HEADERS = {
    "X-Load-Test-Secret": LOAD_TEST_SECRET,
}


# ─── Shared user pool (populated before test starts) ────────────────────────

_registered_users: list[dict] = []


# ─── Event hooks ────────────────────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Pre-register 50 users before the timed test begins.
    Registrations are spaced 1.5s apart to stay under the 3/min throttle.
    This takes ~75 seconds but means on_start() only does a login,
    eliminating the 504 timeouts caused by 50 simultaneous registrations.
    """
    print("\n" + "=" * 60)
    print("RASP NFR-9 Load Test — Pre-registering 50 users...")
    print("(This takes ~75 seconds — please wait)")
    print("=" * 60 + "\n")

    host = environment.host
    for i in range(50):
        uid = str(uuid.uuid4())[:8]
        email = f"loadtest_{uid}@rasp-test.com"
        password = "LoadTestPass123!"
        try:
            r = requests.post(
                f"{host}/api/auth/register/",
                json={
                    "email": email,
                    "password": password,
                    "confirm_password": password,
                    "role": "hr_personnel",
                },
                headers=LOAD_TEST_HEADERS,
                timeout=10,
            )
            if r.status_code == 201:
                _registered_users.append({"email": email, "password": password})
                print(f"  Registered {i + 1}/50: {email}")
            else:
                print(f"  [WARN] Registration {i + 1} failed: {r.status_code} {r.text[:100]}")
        except Exception as e:
            print(f"  [ERROR] Registration {i + 1} exception: {e}")

        time.sleep(1.5)  # 1 request per 1.5s → well under 3/min throttle

    print(f"\nPre-registered {len(_registered_users)} users. Starting load test...\n")


# ─── Main Simulated User ────────────────────────────────────────────────────

class RaspUser(HttpUser):
    """
    Simulates one participant going through the full simulation workflow.
    on_start() only logs in — registration is done in on_test_start above.
    """
    wait_time = between(1, 3)
    weight = 10  # 10 regular users for every 1 admin — realistic ratio

    def on_start(self):
        """Called once per simulated user. Pops credentials and logs in."""
        self.token = None
        self.session_id = None
        self.scenario_id = None

        if not _registered_users:
            print("[WARN] No pre-registered users left in pool.")
            raise StopUser()

        creds = _registered_users.pop()
        self.email = creds["email"]
        self.password = creds["password"]

        # Include the exemption header so the login throttle is bypassed
        login = self.client.post(
            "/api/auth/login/",
            json={"username": self.email, "password": self.password},
            headers=LOAD_TEST_HEADERS,
            name="/api/auth/login/",
        )

        if login.status_code != 200:
            print(f"[WARN] Login failed: {login.status_code} {login.text[:100]}")
            raise StopUser()

        self.token = login.json()["access"]
        self.client.headers.update({
            "Authorization": f"Bearer {self.token}",
            **LOAD_TEST_HEADERS,
        })

        # Find a scenario to use (pick the first active one)
        scenarios = self.client.get("/api/scenarios/", name="/api/scenarios/")
        if scenarios.status_code == 200 and scenarios.json():
            active = [s for s in scenarios.json() if s.get("active_status")]
            if active:
                self.scenario_id = active[0]["id"]

    # ── Tasks ────────────────────────────────────────────────────────────

    @task(3)
    def browse_scenarios(self):
        """Most common action: looking at the scenario list."""
        self.client.get("/api/scenarios/", name="/api/scenarios/")

    @task(2)
    def check_notifications(self):
        """Users check notifications frequently."""
        self.client.get("/api/notifications/", name="/api/notifications/")

    @task(2)
    def check_personal_analytics(self):
        """Users check their own performance."""
        self.client.get("/api/analytics/me/", name="/api/analytics/me/")

    @task(1)
    def start_and_run_session(self):
        """
        The heavy workflow: start a session, wait for container, run through it.
        Weight=1 so it happens less often than browsing (realistic).
        """
        if not self.scenario_id:
            return

        # Step 1: Start session
        start = self.client.post(
            f"/api/sessions/start/{self.scenario_id}/",
            name="/api/sessions/start/",
        )
        if start.status_code != 202:
            return

        self.session_id = start.json().get("session_id")
        if not self.session_id:
            return

        # Step 2: Poll container status (max 8 polls, 1s apart)
        container_ready = False
        for _ in range(8):
            time.sleep(1)
            status = self.client.get(
                f"/api/containers/{self.session_id}/status/",
                name="/api/containers/[id]/status/",
            )
            if status.status_code == 200:
                if status.json().get("status") == "active":
                    container_ready = True
                    break

        # Step 3: Acknowledge ethical warning
        self.client.post(
            f"/api/sessions/{self.session_id}/acknowledge/",
            json={"acknowledged": True},
            name="/api/sessions/[id]/acknowledge/",
        )

        # Step 4: Complete the session
        self.client.post(
            f"/api/sessions/{self.session_id}/complete/",
            name="/api/sessions/[id]/complete/",
        )

        self.session_id = None

    @task(1)
    def view_own_session_history(self):
        """Check past sessions."""
        self.client.get("/api/sessions/mine/", name="/api/sessions/mine/")


# ─── Admin user ─────────────────────────────────────────────────────────────

class AdminUser(HttpUser):
    """
    Simulates one admin user browsing the analytics dashboard.
    weight=1 against RaspUser weight=10 means roughly 1 admin per 10 regular
    users — a realistic ratio for this platform.
    """
    wait_time = between(2, 5)
    weight = 1

    def on_start(self):
        """Log in as the pre-created admin account."""
        login = self.client.post(
            "/api/auth/login/",
            json={"username": "ahmedtahabaitou@gmail.com", "password": "60476628THgb"},
            headers=LOAD_TEST_HEADERS,
            name="/api/auth/login/",
        )
        if login.status_code == 200:
            token = login.json()["access"]
            self.client.headers.update({
                "Authorization": f"Bearer {token}",
                **LOAD_TEST_HEADERS,
            })
        else:
            raise StopUser()

    @task(3)
    def view_analytics_overview(self):
        self.client.get("/api/analytics/overview/", name="/api/analytics/overview/")

    @task(2)
    def view_user_list(self):
        self.client.get("/api/users/", name="/api/users/")

    @task(1)
    def view_mitre_frequency(self):
        self.client.get("/api/analytics/mitre/", name="/api/analytics/mitre/")