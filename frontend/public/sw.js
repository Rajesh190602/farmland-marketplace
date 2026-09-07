self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Farmland Marketplace",
      body: event.data
        ? event.data.text()
        : "You have a new notification.",
    };
  }

  const title =
    data.title || "Farmland Marketplace";

  const options = {
    body:
      data.body ||
      "You have a new notification.",

    icon: "/favicon.ico",

    badge: "/favicon.ico",

    data: {
      target_type:
        data.target_type || null,

      target_id:
        data.target_id || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const data =
      event.notification.data || {};

    const targetType = String(
      data.target_type || ""
    ).toLowerCase();

    const targetId =
      data.target_id;

    let path =
      "/notifications";


    if (
      targetType === "land" &&
      targetId
    ) {
      path = `/lands/${targetId}`;

    } else if (
      targetType === "conversation" &&
      targetId
    ) {
      path = `/chat/${targetId}`;

    } else if (
      [
        "inquiry",
        "offer",
        "site_visit",
        "reservation",
        "sale",
        "transaction",
      ].includes(targetType)
    ) {
      path =
        "/marketplace-activity";
    }


    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {

          for (const client of clientList) {

            if ("focus" in client) {

              client.navigate(path);

              return client.focus();
            }
          }


          if (clients.openWindow) {
            return clients.openWindow(
              path
            );
          }

          return undefined;
        })
    );
  }
);