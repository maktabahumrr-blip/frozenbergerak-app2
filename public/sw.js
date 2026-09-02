/**
 * Service Worker for FrozenBergerak PWA
 * Version: 1.0.0
 */

const CACHE_NAME = 'frozenbergerak-static-v4';
const DATA_CACHE_NAME = 'frozenbergerak-data-v4';
const IMAGE_CACHE_NAME = 'frozenbergerak-images-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/apple-touch-icon.png'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. API Calls (/api/products, /api/categories, /api/config)
  // Strategy: Network-First with Cache Fallback (Ensures fresh Google Sheets data, but offline-accessible)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Images (Google Drive, Unsplash, external or local images)
  // Strategy: Stale-While-Revalidate with Cache Fallback
  if (
    event.request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i) ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('images.unsplash.com')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Navigation and App Shell (HTML, JS, CSS, Fonts)
  // Strategy: Network-First with cache fallback for navigation, Cache-First for versioned assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Default: Cache First, Fallback to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});

// Listen for message to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==========================================
// TRUE PUSH NOTIFICATION HANDLERS (Web Push)
// ==========================================

self.addEventListener('push', (event) => {
  let data = {
    title: 'FrozenBergerak 📍 Jadual Pergerakan Dikemaskini',
    body: 'Sila semak laluan dan masa pergerakan terkini kami!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    image: '/icons/icon-512.png',
    url: '/#section-jadual-pergerakan'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  // Ensure absolute URLs so OS notification managers (Android, Windows, Mac, iOS) load the FrozenBergerak logo properly even when the browser/app is completely closed
  const origin = self.location.origin;
  const toAbsoluteUrl = (path, fallback) => {
    const val = path || fallback;
    if (!val) return `${origin}/icons/icon-192.png`;
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    return `${origin}${val.startsWith('/') ? '' : '/'}${val}`;
  };

  const finalIcon = toAbsoluteUrl(data.icon, '/icons/icon-192.png');
  // Android OS notification badge strictly requires PNG raster format (SVG causes blank/fallback globe)
  const finalBadge = toAbsoluteUrl(data.badge && !data.badge.endsWith('.svg') ? data.badge : '/icons/icon-192.png', '/icons/icon-192.png');
  const finalImage = toAbsoluteUrl(data.image, '/icons/icon-512.png');

  const notificationOptions = {
    body: data.body,
    icon: finalIcon,
    badge: finalBadge,
    image: finalImage,
    vibrate: [200, 100, 200, 100, 200],
    tag: 'frozenbergerak-schedule-update',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/#section-jadual-pergerakan',
      title: data.title,
      body: data.body,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open-schedule',
        title: 'Lihat Jadual 📍'
      }
    ]
  };

  // Inform open window clients directly so they can display the animated moving Frozen vehicle banner
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: {
          title: data.title,
          body: data.body,
          url: data.url || '/#section-jadual-pergerakan',
          timestamp: Date.now()
        }
      });
    }
  });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, notificationOptions),
      broadcastPromise
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/#section-jadual-pergerakan';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
