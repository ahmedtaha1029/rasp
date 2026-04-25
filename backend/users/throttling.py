# users/throttling.py
"""
Custom throttle classes for RASP.
Extends DRF's defaults to exempt load-test traffic without weakening
production security. The exemption requires the correct secret header
matching the LOAD_TEST_SECRET env var. If that var is empty (production
default), the exemption is completely inert.

Note: localhost IP check is intentionally omitted — requests arrive via
Nginx so REMOTE_ADDR inside Django is never 127.0.0.1. The secret alone
is sufficient protection.
"""

import os
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


LOAD_TEST_SECRET = os.environ.get("LOAD_TEST_SECRET", "")


def _is_load_test(request) -> bool:
    if not LOAD_TEST_SECRET:
        return False
    return request.META.get("HTTP_X_LOAD_TEST_SECRET", "") == LOAD_TEST_SECRET


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"

    def allow_request(self, request, view):
        if _is_load_test(request):
            return True
        return super().allow_request(request, view)


class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"

    def allow_request(self, request, view):
        if _is_load_test(request):
            return True
        return super().allow_request(request, view)