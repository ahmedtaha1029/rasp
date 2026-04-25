"""
rasp_backend/middleware/audit.py

Request audit middleware for security logging (NFR-14, NFR-15).

Logs every API request with:
  - HTTP method and path
  - Response status code
  - Request duration in milliseconds
  - User role (if authenticated)

Deliberately EXCLUDES:
  - Username or email (BR-05: no PII in logs)
  - Request body (may contain credentials)
  - IP address (BR-05)

Log entries are structured as JSON for easy ingestion by log aggregators.
Sensitive paths (login, password change) are flagged but body is never logged.
"""

import json
import logging
import time

logger = logging.getLogger("rasp.audit")

# Paths that should be flagged as sensitive in the audit log
SENSITIVE_PATHS = {
    "/api/auth/login/",
    "/api/auth/password/change/",
    "/api/auth/refresh/",
}


class AuditMiddleware:
    """
    Structured audit log middleware.

    Attaches to every HTTP request. Does NOT log WebSocket connections
    — those are tracked via the TelemetryConsumer connect/disconnect events.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.monotonic()

        response = self.get_response(request)

        duration_ms = int((time.monotonic() - start_time) * 1000)

        # Only log API requests to reduce noise
        if not request.path.startswith("/api/"):
            return response

        user = getattr(request, "user", None)
        role = None
        if user and user.is_authenticated:
            role = user.role  # role only — no username (BR-05)

        log_entry = {
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "role": role,
            "sensitive": request.path in SENSITIVE_PATHS,
        }

        # Log level based on response status
        if response.status_code >= 500:
            logger.error(json.dumps(log_entry))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_entry))
        else:
            logger.info(json.dumps(log_entry))

        return response