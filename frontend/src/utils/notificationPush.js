import api from "../services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

export async function getNotificationPreferences() {
  const response = await api.get(
    "/notifications/preferences"
  );

  return response.data;
}

export async function updateNotificationPreferences(payload) {
  const response = await api.put(
    "/notifications/preferences",
    payload
  );

  return response.data;
}

export async function enableBrowserPush() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    throw new Error(
      "Browser push notifications are not supported by this browser."
    );
  }

  if (!("Notification" in window)) {
    throw new Error(
      "Browser notifications are not supported by this browser."
    );
  }

  const permission =
    await window.Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Browser notification permission was not granted."
    );
  }

  const configResponse = await api.get(
    "/notifications/push-config"
  );

  const config = configResponse.data || {};

  if (!config.enabled || !config.public_key) {
    throw new Error(
      "Browser push is not configured on the server yet."
    );
  }

  const registration =
    await navigator.serviceWorker.register("/sw.js");

  await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(config.public_key),
      });
  }

  const subscriptionJson =
    subscription.toJSON();

  if (
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys?.auth
  ) {
    throw new Error(
      "Browser push subscription keys are missing."
    );
  }

  await api.post(
    "/notifications/push-subscriptions",
    {
      endpoint: subscription.endpoint,

      keys: {
        p256dh:
          subscriptionJson.keys.p256dh,

        auth:
          subscriptionJson.keys.auth,
      },

      user_agent: navigator.userAgent,
    }
  );

  return subscription;
}

export async function disableBrowserPush() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration =
    await navigator.serviceWorker.getRegistration(
      "/sw.js"
    );

  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;

  if (!subscription) {
    return;
  }

  try {
    await api.delete(
      "/notifications/push-subscriptions",
      {
        params: {
          endpoint: subscription.endpoint,
        },
      }
    );
  } catch (error) {
    /*
     * A 404 means the browser has a subscription,
     * but the server does not currently have that
     * subscription recorded.
     *
     * That is safe to ignore because we are
     * unsubscribing the browser locally below.
     */
    if (error.response?.status !== 404) {
      throw error;
    }

    console.warn(
      "Push subscription was not found on the server; continuing with local unsubscribe."
    );
  }

  await subscription.unsubscribe();
}