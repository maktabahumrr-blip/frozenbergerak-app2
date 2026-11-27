// Firebase Cloud Messaging (FCM) background push service worker for FrozenBergerak PWA

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'FrozenBergerak 📍 Jadual Pergerakan',
    body: 'Semak lokasi terkini & laluan penghantaran pasukan kami hari ini.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/#section-jadual-pergerakan',
    tag: `frozenbergerak-fcm-${Date.now()}`,
    silent: false,
    renotify: true,
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const raw = event.data.json();
      const webpushNotif = (raw.webpush && raw.webpush.notification) || {};
      const notif = raw.notification || webpushNotif || {};
      const data = raw.data || {};
      const explicitSilent =
        notif.silent === true ||
        webpushNotif.silent === true ||
        raw.silent === true ||
        data.silent === 'true';

      payload = {
        ...payload,
        title: notif.title || webpushNotif.title || raw.title || data.title || payload.title,
        body: notif.body || webpushNotif.body || raw.body || data.body || payload.body,
        icon: notif.icon || webpushNotif.icon || raw.icon || payload.icon,
        badge: notif.badge || webpushNotif.badge || raw.badge || payload.badge,
        url: data.url || raw.url || (raw.fcmOptions && raw.fcmOptions.link) || (raw.webpush && raw.webpush.fcm_options && raw.webpush.fcm_options.link) || payload.url,
        tag: notif.tag || webpushNotif.tag || raw.tag || data.tag || payload.tag,
        silent: explicitSilent ? true : false,
        renotify: typeof notif.renotify === 'boolean' ? notif.renotify : true,
        vibrate: Array.isArray(notif.vibrate) ? notif.vibrate : payload.vibrate
      };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const origin = self.location.origin;
  const toAbs = (p, fb) => {
    const val = p || fb;
    if (!val) return `${origin}/icons/icon-192.png`;
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    return `${origin}${val.startsWith('/') ? '' : '/'}${val}`;
  };

  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: {
          title: payload.title,
          body: payload.body,
          url: payload.url,
          timestamp: Date.now()
        }
      });
    }
  });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: toAbs(payload.icon, '/icons/icon-192.png'),
        badge: toAbs(payload.badge, '/icons/icon-192.png'),
        vibrate: payload.vibrate,
        tag: payload.tag,
        renotify: true,
        silent: false,
        requireInteraction: false,
        timestamp: Date.now(),
        data: { url: payload.url }
      }),
      broadcastPromise
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/#section-jadual-pergerakan';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
