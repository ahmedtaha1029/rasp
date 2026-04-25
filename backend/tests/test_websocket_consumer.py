"""
backend/tests/test_websocket_consumer.py

Direct WebSocket tests for TelemetryConsumer using
channels.testing.WebsocketCommunicator.

These tests simulate the full WS handshake, send mock telemetry events,
and verify the scoring/feedback responses — covering the path that was
previously tested only indirectly.

Test matrix:
  1. Unauthenticated connection is rejected (code 4001)
  2. Authenticated connection to a non-existent session is rejected (4004)
  3. Authenticated connection to an active session is accepted
  4. hover event is silently stored (no feedback message returned)
  5. flag event with correct reason → detected=True, detection_quality=1.0
  6. click event on attack element → detected=False (miss)
  7. delete event → partial credit (0.5)
  8. Unknown/malformed JSON is rejected with error key
  9. stage_complete=True is included when all vectors are scored
 10. session_complete flag propagates when last stage is finished
"""

import json
import uuid

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import override_settings

from rasp_backend.asgi import application

User = get_user_model()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ws_url(session_id):
    return f"/ws/telemetry/{session_id}/"


def _auth_scope(user, session_id):
    """
    Build a scope dict that mimics what JWTAuthMiddleware injects after a
    successful token verification. In tests we skip the real JWT step and
    inject the user object directly.
    """
    return {
        "type": "websocket",
        "url_route": {"kwargs": {"session_id": str(session_id)}},
        "user": user,
        "headers": [],
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="ws_admin",
        email="wsadmin@test.com",
        password="Pass1234!",
        role=User.Role.ADMINISTRATOR,
        status=User.Status.ACTIVE,
    )


@pytest.fixture
def participant_user(db):
    return User.objects.create_user(
        username="ws_participant",
        email="wspart@test.com",
        password="Pass1234!",
        role=User.Role.JOB_SEEKER,
        status=User.Status.ACTIVE,
    )


@pytest.fixture
def active_session(db, participant_user):
    """
    Create a minimal but complete active session with one stage and one
    attack vector so the StageEngine has something to evaluate.
    """
    from scenarios.models import Scenario, Stage, AttackVector
    from simulations.models import SimulationSession

    scenario = Scenario.objects.create(
        title="WS Test Scenario",
        container_image="rasp/phishing-recruiter:latest",
        active_status=True,
        difficulty=Scenario.Difficulty.BASIC,
    )
    stage = Stage.objects.create(
        scenario=scenario,
        stage_order=1,
        name=Stage.PhaseName.APPLICATION,
    )
    AttackVector.objects.create(
        stage=stage,
        vector_type=AttackVector.VectorType.PHISHING_LINK,
        mitre_id="T1566",
        container_path="/",
        detection_criteria={
            "target_elements": ["phishing-link"],
            "passing_conditions": [
                {"action": "flag", "element": "phishing-link"}
            ],
            "fail_conditions": [
                {"action": "click", "element": "phishing-link"}
            ],
            "partial_credit_events": [
                {"action": "delete"}
            ],
            "time_pressure_ms": 60000,
            "indicators": ["Spoofed domain: linkedln.com"],
            "best_practice": "Always hover over links to verify the actual URL.",
            "mitre_description": "Spearphishing Link",
        },
    )
    session = SimulationSession.objects.create(
        user=participant_user,
        scenario=scenario,
        version_snapshot=scenario.version,
        status=SimulationSession.Status.ACTIVE,
        ethical_warning_acknowledged=True,
    )
    return session, stage


@pytest.fixture
def anon_user():
    """A user object that is not authenticated (is_authenticated=False)."""
    from django.contrib.auth.models import AnonymousUser
    return AnonymousUser()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_unauthenticated_connection_is_rejected(anon_user):
    """
    An unauthenticated connection (anonymous user) must be closed with
    code 4001 immediately after connect().
    """
    fake_session_id = uuid.uuid4()
    scope = _auth_scope(anon_user, fake_session_id)
    communicator = WebsocketCommunicator(application, _make_ws_url(fake_session_id), scope=scope)
    connected, subprotocol = await communicator.connect()
    # Either connect() returns False or we receive a close immediately
    if connected:
        response = await communicator.receive_output()
        assert response["type"] == "websocket.close"
        assert response.get("code") == 4001
    else:
        assert not connected
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_nonexistent_session_rejected(participant_user):
    """
    An authenticated user connecting with a session_id that does not exist
    (or does not belong to them) is closed with code 4004.
    """
    fake_session_id = uuid.uuid4()
    scope = _auth_scope(participant_user, fake_session_id)
    communicator = WebsocketCommunicator(application, _make_ws_url(fake_session_id), scope=scope)
    connected, _ = await communicator.connect()
    if connected:
        response = await communicator.receive_output()
        assert response["type"] == "websocket.close"
        assert response.get("code") == 4004
    else:
        assert not connected
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_valid_connection_accepted(participant_user, active_session):
    """
    An authenticated user connecting to their own active session is accepted.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected, "Expected the WebSocket connection to be accepted."
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_hover_event_no_feedback(participant_user, active_session):
    """
    A hover event should be silently stored. No scoring feedback message
    should be returned to the client.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "hover",
        "offset_ms": 1200,
        "element": "phishing-link",
        "stage_id": stage.id,
    })

    # No reply expected for hover events — timeout should hit
    assert await communicator.receive_nothing(timeout=0.5), (
        "Hover events should not generate a feedback response."
    )
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_flag_event_detected(participant_user, active_session):
    """
    A flag event on the target element should return detected=True with
    detection_quality=1.0.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "flag",
        "offset_ms": 5000,
        "element": "phishing-link",
        "stage_id": stage.id,
        "selected_reason_indices": [0],
    })

    response = await communicator.receive_json_from(timeout=5)
    assert response["detected"] is True
    assert response["detection_quality"] == 1.0
    assert response["detection_status"] == "detected"
    assert "stage_complete" in response
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_click_event_missed(participant_user, active_session):
    """
    A click event on the attack element should return detected=False (miss).
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "click",
        "offset_ms": 3000,
        "element": "phishing-link",
        "stage_id": stage.id,
    })

    response = await communicator.receive_json_from(timeout=5)
    assert response["detected"] is False
    assert response["detection_status"] == "missed"
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_delete_event_partial_credit(participant_user, active_session):
    """
    A delete event should return partial credit (detection_quality=0.5).
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "delete",
        "offset_ms": 4000,
        "element": "btn-delete",
        "stage_id": stage.id,
    })

    response = await communicator.receive_json_from(timeout=5)
    assert response["detected"] is True
    assert response["detection_quality"] == 0.5
    assert response["detection_status"] == "partial"
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_malformed_json_returns_error(participant_user, active_session):
    """
    Sending malformed JSON (not parseable) should return an error message.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    # Send raw text — not valid JSON
    await communicator.send_to(text_data="this is not json {{{")
    response_text = await communicator.receive_from(timeout=5)
    response = json.loads(response_text)
    assert "error" in response
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_missing_stage_id_returns_error(participant_user, active_session):
    """
    A payload without stage_id should return an error response.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "flag",
        "offset_ms": 5000,
        "element": "phishing-link",
        # stage_id intentionally omitted
    })

    response = await communicator.receive_json_from(timeout=5)
    assert "error" in response
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_stage_complete_flag_in_response(participant_user, active_session):
    """
    Any conclusive action should include stage_complete in the response.
    """
    session, stage = active_session
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "flag",
        "offset_ms": 8000,
        "element": "phishing-link",
        "stage_id": stage.id,
        "selected_reason_indices": [0],
    })

    response = await communicator.receive_json_from(timeout=5)
    assert "stage_complete" in response
    assert "session_complete" in response
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_session_complete_on_last_stage(participant_user, active_session):
    """
    When the stage is the final stage and a conclusive action is taken,
    session_complete should be True in the response.
    """
    session, stage = active_session
    # stage_order=1, scenario has only 1 stage → it IS the last stage
    scope = _auth_scope(participant_user, session.id)
    communicator = WebsocketCommunicator(application, _make_ws_url(session.id), scope=scope)
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({
        "event_type": "flag",
        "offset_ms": 10000,
        "element": "phishing-link",
        "stage_id": stage.id,
        "selected_reason_indices": [0],
    })

    response = await communicator.receive_json_from(timeout=5)
    assert response.get("session_complete") is True
    await communicator.disconnect()