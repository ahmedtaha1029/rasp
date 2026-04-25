"""
rasp_backend/middleware/auth.py

Additional auth enforcement layer.

JWT validation is already handled by DRF SimpleJWT on each view.
This middleware adds a secondary check specifically for BR-10:
if a previously valid token belongs to a user whose account has
since been deactivated, reject the request immediately rather than
waiting for the view to discover it.
"""

import logging

from django.http import JsonResponse

logger = logging.getLogger("rasp.auth")


class ActiveAccountMiddleware:
    """
    Checks that the authenticated user's account is still active
    on every request (BR-10).

    This catches the case where:
      1. User logs in and gets a valid JWT
      2. Admin deactivates their account mid-session
      3. User continues making requests with the still-valid token

    Without this middleware, the JWT would remain valid until expiry.
    With it, deactivation takes effect on the very next request.

    Must be placed AFTER Django's AuthenticationMiddleware in
    settings.MIDDLEWARE so request.user is already populated.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only check authenticated API requests
        if (
            request.path.startswith("/api/")
            and hasattr(request, "user")
            and request.user.is_authenticated
            and not request.user.is_active_account
        ):
            logger.warning(
                f"Blocked request from deactivated account "
                f"role={request.user.role} path={request.path} (BR-10)"
            )
            return JsonResponse(
                {"detail": "Account is disabled. Contact your administrator."},
                status=403,
            )

        return self.get_response(request)