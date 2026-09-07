import json
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None

    class WebPushException(Exception):
        pass


VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL")


def push_is_configured():
    configured = bool(
        webpush
        and VAPID_PUBLIC_KEY
        and VAPID_PRIVATE_KEY
        and VAPID_CLAIMS_EMAIL
    )

    logger.info(
        "STEP66 PUSH CONFIGURED: %s | "
        "webpush=%s | public_key=%s | private_key=%s | claims_email=%s",
        configured,
        bool(webpush),
        bool(VAPID_PUBLIC_KEY),
        bool(VAPID_PRIVATE_KEY),
        bool(VAPID_CLAIMS_EMAIL),
    )

    return configured


def send_web_push(
    subscription,
    title,
    message,
    target_type=None,
    target_id=None,
):
    if not push_is_configured():
        logger.error(
            "STEP66 PUSH NOT CONFIGURED"
        )

        return {
            "sent": False,
            "stale": False,
            "reason": "push_not_configured",
        }

    payload = json.dumps(
        {
            "title": title,
            "body": message,
            "target_type": target_type,
            "target_id": target_id,
        }
    )

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    logger.info(
        "STEP66 PUSH ATTEMPT: endpoint=%s",
        subscription.endpoint,
    )

    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": VAPID_CLAIMS_EMAIL,
            },
        )

        logger.info(
            "STEP66 PUSH SUCCESS"
        )

        return {
            "sent": True,
            "stale": False,
            "reason": None,
        }

    except WebPushException as exc:
        status = getattr(
            getattr(exc, "response", None),
            "status_code",
            None,
        )

        logger.error(
            "STEP66 PUSH FAILED: status=%s error=%s",
            status,
            exc,
        )

        return {
            "sent": False,
            "stale": status in {404, 410},
            "reason": str(exc),
        }

    except Exception as exc:
        logger.error(
            "STEP66 PUSH UNEXPECTED ERROR: %s",
            exc,
        )

        return {
            "sent": False,
            "stale": False,
            "reason": str(exc),
        }