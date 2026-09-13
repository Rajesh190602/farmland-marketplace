"""
Step 77A - Authentication / Sensitive Endpoint Rate Limiting

In-memory rate limiter for the current backend instance.

Important:
- Returns HTTP 429 when a limit is exceeded.
- Uses endpoint-specific limits.
- Uses client IP as the initial abuse-protection key.
- Automatically removes expired entries.
- No database migration required.
- Designed as the first production-hardening layer.
"""

from collections import defaultdict, deque
from time import monotonic
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse


# =========================================================
# STEP 77A - RATE LIMIT CONFIGURATION
# =========================================================

RATE_LIMIT_RULES = {
    # Authentication
    ("POST", "/users/login"): (10, 15 * 60),

    # Registration / email verification
    ("POST", "/users/send-otp"): (5, 15 * 60),
    ("POST", "/users/verify-otp"): (10, 15 * 60),

    # Password recovery
    ("POST", "/users/forgot-password"): (5, 15 * 60),
    ("POST", "/users/verify-forgot-otp"): (10, 15 * 60),
    ("POST", "/users/reset-password"): (5, 15 * 60),

    # Password change
    ("PUT", "/users/change-password"): (5, 15 * 60),
}


# key -> deque of request timestamps
_requests = defaultdict(deque)

_lock = Lock()


def _get_client_ip(request: Request) -> str:
    """
    Determine the request source.

    Render/reverse proxies normally provide X-Forwarded-For.
    The first address represents the original client in the
    standard proxy chain.

    Fall back to request.client.host when unavailable.
    """

    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()

        if first_ip:
            return first_ip

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _get_rule(request: Request):
    method = request.method.upper()
    path = request.url.path

    return RATE_LIMIT_RULES.get((method, path))


def _cleanup_expired(entries: deque, now: float, window_seconds: int):
    cutoff = now - window_seconds

    while entries and entries[0] <= cutoff:
        entries.popleft()


def check_rate_limit(request: Request):
    """
    Return None when allowed.

    Return JSONResponse(429) when the request exceeds
    the configured endpoint limit.
    """

    rule = _get_rule(request)

    # Endpoint is not rate-limited.
    if not rule:
        return None

    max_requests, window_seconds = rule

    client_ip = _get_client_ip(request)
    method = request.method.upper()
    path = request.url.path

    # Keep each endpoint isolated.
    key = f"{client_ip}:{method}:{path}"

    now = monotonic()

    with _lock:
        entries = _requests[key]

        _cleanup_expired(
            entries,
            now,
            window_seconds,
        )

        if len(entries) >= max_requests:
            retry_after = max(
                1,
                int(
                    window_seconds
                    - (now - entries[0])
                ),
            )

            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        "Too many requests. "
                        "Please try again later."
                    )
                },
                headers={
                    "Retry-After": str(retry_after),
                },
            )

        entries.append(now)

        return None


def clear_rate_limit_state():
    """
    Test helper.

    Clears all in-memory rate-limit counters.
    """

    with _lock:
        _requests.clear()