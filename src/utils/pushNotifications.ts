// Utility for Web Push Notifications (VAPID / Service Worker Push API) and Standard Web Notification API Fallback

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    const safeStr = String(base64String || "");
    const padding = '='.repeat((4 - (safeStr.length % 4)) % 4);
    const base64 = (safeStr + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch {
    throw new Error('Format VAPID Public Key tidak sah.');
  }
}

/**
 * Returns true if the device / browser supports notifications (Standard Web Notification API or Web Push)
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('Notification' in window || ('serviceWorker' in navigator && 'PushManager' in window))
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Ensures the Service Worker is registered and active without hanging
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // Check existing registration or register anew
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    // Wait for ready with a safe timeout
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration | null>((resolve) =>
      setTimeout(() => resolve(reg || null), 4000)
    );

    return await Promise.race([readyPromise, timeoutPromise]);
  } catch (swErr) {
    console.warn('[PushNotification] Service Worker registration warning (non-fatal):', swErr);
    return null;
  }
}

/**
 * Fetch VAPID Public Key from server with fallback endpoints.
 * Returns null smoothly on 404 or network errors so standard Web Notification API can take over.
 */
export async function fetchVapidPublicKey(): Promise<string | null> {
  const endpoints = ['/api/push/vapid-public-key', '/api/vapid-public-key'];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.publicKey && typeof data.publicKey === 'string' && data.publicKey.length > 10) {
          return data.publicKey;
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  console.warn('[PushNotification] VAPID Public Key endpoint unavailable or returned 404. Proceeding with standard Web Notification API fallback.');
  return null;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | any | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration && 'pushManager' in registration) {
      const sub = await registration.pushManager.getSubscription();
      if (sub) return sub;
    }
  } catch (err) {
    console.warn('Error checking existing push subscription:', err);
  }

  // Fallback: check if standard browser notification was granted and enabled
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted' && localStorage.getItem('web_notification_enabled') === 'true') {
      return {
        endpoint: 'standard-web-notification',
        isStandardNotification: true
      };
    }
  }

  return null;
}

export interface SubscribeResult {
  success: boolean;
  subscription?: PushSubscription | any;
  error?: string;
  isStandardWebNotification?: boolean;
  message?: string;
}

/**
 * Subscribes user to Push Notifications.
 * If server returns 404 for VAPID key, it smoothly falls back to standard Web Notification API
 * without crashing or showing error 404 to the user.
 */
export async function subscribeUserToPush(): Promise<SubscribeResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Persekitaran pelayar tidak sah.' };
  }

  if (!('Notification' in window)) {
    return {
      success: false,
      error: 'Pelayar ini tidak menyokong sistem Web Notification secara natif.'
    };
  }

  try {
    // 1. Trigger native browser/mobile permission prompt directly
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied'
          ? 'Kebenaran notifikasi telah ditolak dalam tetapan pelayar. Sila buka tetapan pelayar anda dan benarkan notifikasi bagi laman ini.'
          : 'Kebenaran notifikasi tidak diberikan.'
      };
    }

    // Mark standard web notification as enabled locally immediately upon user granting permission
    try {
      localStorage.setItem('web_notification_enabled', 'true');
      localStorage.setItem('push_notification_permission', 'granted');
    } catch {}

    // 2. Fetch VAPID key (supports smooth fallback on 404 or connection issues)
    const vapidPublicKey = await fetchVapidPublicKey();

    // 3. If VAPID is available and PushManager supported, register background push subscription
    if (vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const registration = await getOrRegisterServiceWorker();

        if (registration && registration.pushManager) {
          let subscription = await registration.pushManager.getSubscription();

          try {
            if (!subscription) {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
              });
            }
          } catch (subErr) {
            console.warn('Initial PushManager subscription failed, trying re-subscribe:', subErr);
            const existing = await registration.pushManager.getSubscription().catch(() => null);
            if (existing) {
              await existing.unsubscribe().catch(() => {});
            }
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });
          }

          if (subscription) {
            // Extract keys safely
            const subJSON = subscription.toJSON();
            let p256dh = subJSON.keys?.p256dh;
            let auth = subJSON.keys?.auth;

            if (!p256dh && subscription.getKey) {
              const rawKey = subscription.getKey('p256dh');
              if (rawKey) {
                p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
              }
            }

            if (!auth && subscription.getKey) {
              const rawAuth = subscription.getKey('auth');
              if (rawAuth) {
                auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));
              }
            }

            // Sync subscription to server
            fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: p256dh || '',
                    auth: auth || ''
                  }
                },
                userAgent: navigator.userAgent
              })
            }).catch((syncErr) => {
              console.warn('Could not sync subscription to server (non-fatal):', syncErr);
            });

            return {
              success: true,
              subscription,
              message: 'Notifikasi Web Push berjaya diaktifkan sepenuhnya!'
            };
          }
        }
      } catch (pushErr: any) {
        console.warn('VAPID / Service Worker Push setup encountered non-fatal issue, using Web Notification fallback:', pushErr);
      }
    }

    // 4. Smooth fallback to Standard Web Notification API
    // User already approved Notification.permission === 'granted'!
    console.log('[PushNotification] ✅ Standard Web Notification API is active and granted.');

    // Display welcome notification if supported
    try {
      if (Notification.permission === 'granted') {
        const welcomeTitle = "FrozenBergerak 📍 Notifikasi Diaktifkan!";
        const welcomeBody = "Notifikasi pelayar aktif. Anda akan menerima makluman pergerakan pasukan dan kemaskini pesanan terkini.";
        
        const reg = await getOrRegisterServiceWorker();
        if (reg && reg.showNotification) {
          reg.showNotification(welcomeTitle, {
            body: welcomeBody,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          }).catch(() => {
            try {
              new Notification(welcomeTitle, { body: welcomeBody, icon: '/favicon.ico' });
            } catch {}
          });
        } else {
          try {
            new Notification(welcomeTitle, { body: welcomeBody, icon: '/favicon.ico' });
          } catch {}
        }
      }
    } catch {}

    return {
      success: true,
      isStandardWebNotification: true,
      subscription: {
        endpoint: 'standard-web-notification',
        isStandardNotification: true
      },
      message: 'Kebenaran notifikasi pelayar berjaya diaktifkan! Anda akan menerima makluman pergerakan pasukan terus ke telefon anda.'
    };
  } catch (err: any) {
    console.error('Error activating notification permission:', err);
    return {
      success: false,
      error: err?.message || 'Ralat berlaku semasa meminta kebenaran notifikasi.'
    };
  }
}

export async function unsubscribeUserFromPush(): Promise<boolean> {
  try {
    localStorage.removeItem('web_notification_enabled');
    localStorage.removeItem('push_notification_permission');

    const registration = await getOrRegisterServiceWorker();
    if (registration && registration.pushManager) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});

        await subscription.unsubscribe();
      }
    }
    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await getExistingPushSubscription();
    const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

    if (!subscription && !hasPermission) {
      return {
        success: false,
        message: 'Tiada kebenaran notifikasi aktif pada peranti ini. Sila aktifkan notifikasi terlebih dahulu.'
      };
    }

    // 1. If standard real VAPID subscription exists on server, trigger via server
    if (subscription && subscription.endpoint && subscription.endpoint.startsWith('http')) {
      try {
        const response = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          dispatchLiveEvent();
          return {
            success: true,
            message: data.message || 'Notifikasi ujian berjaya dihantar ke telefon anda!'
          };
        }
      } catch {
        // Fallback to local notification below
      }
    }

    // 2. Standard Web Notification API fallback
    dispatchLiveEvent();

    const title = "FrozenBergerak 📍 Team Bergerak Sekarang!";
    const body = "Team Frozen kini dalam perjalanan ke lokasi anda. Stok sedia dihantar terus ke rumah!";

    try {
      const reg = await getOrRegisterServiceWorker();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch {}

    return {
      success: true,
      message: 'Notifikasi ujian berjaya dipaparkan pada telefon anda!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Ralat sambungan semasa memaparkan notifikasi ujian.'
    };
  }
}

function dispatchLiveEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('frozen_live_notification', {
      detail: {
        title: "FrozenBergerak 📍 Team Bergerak Sekarang!",
        body: "Team Frozen kini dalam perjalanan ke lokasi anda. Stok sedia dihantar terus ke rumah!",
        url: "/#section-jadual-pergerakan",
        timestamp: Date.now()
      }
    }));
  }
}
