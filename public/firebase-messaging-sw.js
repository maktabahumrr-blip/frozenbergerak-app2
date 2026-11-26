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
    url: '/#section-jadual-pergerakan'
  };

  if (event.data) {
    try {
      const raw = event.data.json();
      const notif = raw.notification || {};
      const data = raw.data || {};
      payload = {
        ...payload,
        title: notif.title || raw.title || data.title || payload.title,
        body: notif.body || raw.body || data.body || payload.body,
        icon: notif.icon || raw.icon || payload.icon,
        badge: notif.badge || raw.badge || payload.badge,
        url: data.url || raw.url || (raw.fcmOptions && raw.fcmOptions.link) || payload.url
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
        vibrate: [200, 100, 200],
        tag: 'frozenbergerak-fcm-notification',
        renotify: true,
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
