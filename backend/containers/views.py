"""
containers/views.py
"""

import json
import logging
import time
from urllib.parse import parse_qsl, urlencode

from django.http import JsonResponse, StreamingHttpResponse, HttpResponse, HttpResponseNotFound, HttpResponseForbidden
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
import requests as http_requests
from django.core import signing
from .models import ScenarioContainer
from .serializers import ScenarioContainerSerializer

from django.core.exceptions import ValidationError as DjangoValidationError


logger = logging.getLogger(__name__)

PROXY_COOKIE_PREFIX = "rasp_proxy_"
PROXY_COOKIE_MAX_AGE = 7200

class ContainerStatusView(APIView):
    """
    GET /api/containers/{session_id}/status/
    Returns current container status (polled by frontend every 3s).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request, session_id: str) -> Response:
        try:
            container = ScenarioContainer.objects.get(
                session__id=session_id,
                session__user=request.user,  # ← ownership enforced
            )
        except ScenarioContainer.DoesNotExist:
            return Response(
                {"detail": "Container not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ScenarioContainerSerializer(container)
        return Response(serializer.data)


class ContainerSSEView(View):
    """
    GET /api/containers/{session_id}/stream/
    Server-Sent Events stream for container provisioning status.
    Uses plain Django View (NOT DRF APIView) to avoid 406 on text/event-stream.
    """

    def get(self, request, session_id: str):
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Authentication required."}, status=401)

        def event_stream():
            max_wait = 120
            interval = 3
            elapsed = 0

            while elapsed < max_wait:
                try:
                    container = ScenarioContainer.objects.get(
                        session__id=session_id,
                        session__user=request.user,  # ← ownership enforced
                    )
                except ScenarioContainer.DoesNotExist:
                    yield f"data: {json.dumps({'event': 'error', 'detail': 'container not found'})}\n\n"
                    return

                if container.status == ScenarioContainer.Status.ACTIVE:
                    payload = {
                        "event": "session_ready",
                        "base_url": container.base_url,
                        "session_id": session_id,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                    return

                if container.status == ScenarioContainer.Status.ERROR:
                    yield f"data: {json.dumps({'event': 'provisioning_failed'})}\n\n"
                    return

                yield f"data: {json.dumps({'event': 'provisioning', 'status': container.status})}\n\n"
                time.sleep(interval)
                elapsed += interval

            yield f"data: {json.dumps({'event': 'timeout'})}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


@method_decorator(csrf_exempt, name="dispatch")
class ContainerProxyView(View):
    def dispatch(self, request, session_id, path=""):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        User = get_user_model()
        cookie_name = f"{PROXY_COOKIE_PREFIX}{session_id}"
        set_proxy_cookie = False

        # ── Step 1: JWT Bearer header (API clients, Postman, etc.) ────────────
        jwt_auth = JWTAuthentication()
        token_auth_done = False
        try:
            result = jwt_auth.authenticate(request)
            if result is not None:
                request.user = result[0]
                token_auth_done = True
        except (InvalidToken, TokenError):
            pass

        # ── Step 2: ?token= query param (initial iframe src load) ─────────────
        # Must run even if step 1 succeeded, so an explicit token always wins.
        raw_token = request.GET.get("token")
        if raw_token:
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                validated = AccessToken(raw_token)
                request.user = User.objects.get(pk=int(validated["user_id"]))
                set_proxy_cookie = True   # ← arm the cookie on this response
                token_auth_done = True
            except Exception:
                return JsonResponse({"detail": "Invalid token."}, status=401)

        # ── Step 3: Path-scoped proxy cookie (subrequests from inside iframe) ──
        # Guard on token_auth_done, NOT on request.user.is_authenticated.
        #
        # Django's AuthenticationMiddleware runs before this view and may have
        # already set request.user from a session cookie belonging to a *different*
        # logged-in user (e.g. an admin browsing in the same browser as the
        # participant). The proxy cookie is the authoritative identity for all
        # iframe subrequests, so it must override the session-middleware user
        # whenever no explicit JWT was presented in this request.
        if not token_auth_done:
            cookie_val = request.COOKIES.get(cookie_name)
            if cookie_val:
                try:
                    user_pk = signing.loads(
                        cookie_val,
                        max_age=PROXY_COOKIE_MAX_AGE,
                    )
                    request.user = User.objects.get(pk=user_pk)
                except (signing.BadSignature, signing.SignatureExpired,
                        User.DoesNotExist):
                    # Expired or tampered cookie — force re-auth
                    return JsonResponse(
                        {"detail": "Proxy session expired. Reload the simulation."},
                        status=401,
                    )

        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Authentication required."}, status=401)

        logger.warning(
            "[proxy] user=%s is_auth=%s session=%s path=%s",
            request.user, request.user.is_authenticated, session_id, path,
        )

        # ── Ownership check ────────────────────────────────────────────────────
        # Administrators may proxy into any session (monitoring / QA).
        # Participants may only proxy their own session.
        try:
            ownership_filter = {"session__id": session_id, "status": ScenarioContainer.Status.ACTIVE}
            if not request.user.is_administrator:
                ownership_filter["session__user"] = request.user
            container = ScenarioContainer.objects.select_related("session").get(
                **ownership_filter
            )
        except (ScenarioContainer.DoesNotExist, DjangoValidationError):
            return HttpResponseNotFound()

        # ── Ethical warning gate (BR-04) ───────────────────────────────────────
        if not container.session.ethical_warning_acknowledged:
            return HttpResponseForbidden(
                "Ethical warning must be acknowledged first. (BR-04)"
            )

        if not container.base_url:
            return HttpResponse("Container not ready", status=503)

        # ── Build upstream URL — strip ?token= so JWT never reaches container ──
        qs_pairs = [(k, v) for k, v in parse_qsl(request.META.get("QUERY_STRING", ""))
                    if k != "token"]
        url = f"{container.base_url}/{path}"
        if qs_pairs:
            url += f"?{urlencode(qs_pairs)}"

        # ── Proxy the request ──────────────────────────────────────────────────
        try:
            resp = http_requests.request(
                method=request.method,
                url=url,
                headers={k: v for k, v in request.headers.items() if k != "Host"},
                data=request.body,
                allow_redirects=False,
                timeout=10,
            )
        except Exception as e:
            return HttpResponse(f"Proxy error: {e}", status=502)

        response = HttpResponse(
            content=resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "text/html"),
        )
        for header in ["X-Frame-Options", "Content-Security-Policy"]:
            if header in resp.headers:
                response[header] = "SAMEORIGIN" if header == "X-Frame-Options" else ""

        # ── Set proxy cookie on first authenticated load ───────────────────────
        # Scoped to this session's proxy path only, so it can't bleed into
        # other sessions and never gets sent to non-proxy endpoints.
        if set_proxy_cookie:
            response.set_cookie(
                cookie_name,
                signing.dumps(request.user.pk),   # signed with SECRET_KEY
                max_age=PROXY_COOKIE_MAX_AGE,
                httponly=True,
                samesite="Lax",
                path=f"/api/containers/{session_id}/proxy/",  # ← path-scoped
            )

        return response