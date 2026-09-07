import json
import os

from dotenv import load_dotenv

load_dotenv()

try:
    from pywebpush import webpush, WebPushException
except ImportError:  # Keep the API importable until the dependency is installed.
    webpush = None

    class WebPushException(Exception):
        pass


VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@example.com")


def push_is_configured():
    return bool(
        webpush
        and VAPID_PUBLIC_KEY
        and VAPID_PRIVATE_KEY
        and VAPID_CLAIMS_EMAIL
    )


def send_web_push(subscription, title, message, target_type=None, target_id=None):
    if not push_is_configured():
        return {"sent": False, "stale": False, "reason": "push_not_configured"}

    payload = json.dumps({
        "title": title,
        "body": message,
        "target_type": target_type,
        "target_id": target_id,
    })

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
        )
        return {"sent": True, "stale": False, "reason": None}
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        return {
            "sent": False,
            "stale": status in {404, 410},
            "reason": str(exc),
        }
    except Exception as exc:
        return {"sent": False, "stale": False, "reason": str(exc)}
