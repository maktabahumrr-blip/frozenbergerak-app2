// Utility for Web Push Notifications (Firebase Cloud Messaging + VAPID Push API + Standard Notification Fallback)
import { requestFcmToken, revokeFcmToken } from "../lib/firebase";

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
 * Returns true if the device / browser supports notifications (Standard Web Notification API, FCM, or Web Push)
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

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem('fb_fcm_token');
  } catch {
    return null;
  }
}

/**
 * Ensures the Service Worker is registered and active without hanging
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

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

  return null;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | any | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const fcmToken = getStoredFcmToken();
    if (fcmToken && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      return {
        endpoint: `fcm:${fcmToken.slice(0, 20)}`,
        fcmToken,
        isFcm: true
      };
    }

    const registration = await getOrRegisterServiceWorker();
    if (registration && 'pushManager' in registration) {
      const sub = await registration.pushManager.getSubscription();
      if (sub) return sub;
    }
  } catch (err) {
    console.warn('Error checking existing push subscription:', err);
  }

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
  fcmToken?: string | null;
  error?: string;
  isStandardWebNotification?: boolean;
  message?: string;
}

/**
 * Subscribes user to Firebase Cloud Messaging (FCM) Web Push AND VAPID PushManager.
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
    // 1. Request native notification permission
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

    try {
      localStorage.setItem('web_notification_enabled', 'true');
      localStorage.setItem('push_notification_permission', 'granted');
    } catch {}

    const previousFcmToken = getStoredFcmToken();
    const registration = await getOrRegisterServiceWorker();
    const vapidPublicKey = await fetchVapidPublicKey();

    // 2. Register Firebase Cloud Messaging (FCM) token via firebase-messaging-sw.js + VITE_FIREBASE_VAPID_KEY
    let fcmToken: string | null = null;
    try {
      fcmToken = await requestFcmToken(undefined, undefined);
      if (fcmToken) {
        fetch('/api/push/fcm-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: fcmToken,
            previousToken: previousFcmToken && previousFcmToken !== fcmToken ? previousFcmToken : undefined,
            userAgent: navigator.userAgent
          })
        }).catch(() => {});
      }
    } catch (fcmErr) {
      console.warn('[FCM] Non-fatal registration warning:', fcmErr);
    }

    // 3. Also register standard Web Push VAPID subscription if available
    if (vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window && registration && registration.pushManager) {
      try {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();

        try {
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });
          }
        } catch {
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
              fcmToken: fcmToken || undefined,
              userAgent: navigator.userAgent
            })
          }).catch(() => {});

          return {
            success: true,
            subscription,
            fcmToken,
            message: fcmToken
              ? 'Notifikasi Firebase Cloud Messaging (FCM) & Web Push berjaya diaktifkan!'
              : 'Notifikasi Web Push berjaya diaktifkan sepenuhnya!'
          };
        }
      } catch (pushErr: any) {
        console.warn('VAPID Push setup warning (non-fatal):', pushErr);
      }
    }

    // 4. FCM token alone or Standard Web Notification fallback
    try {
      if (Notification.permission === 'granted') {
        const welcomeTitle = "FrozenBergerak 📍 Notifikasi Diaktifkan!";
        const welcomeBody = "Anda akan menerima makluman pergerakan pasukan dan kemaskini terkini secara terus.";
        if (registration && registration.showNotification) {
          registration.showNotification(welcomeTitle, {
            body: welcomeBody,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png'
          }).catch(() => {
            try {
              new Notification(welcomeTitle, { body: welcomeBody, icon: '/icons/icon-192.png' });
            } catch {}
          });
        } else {
          try {
            new Notification(welcomeTitle, { body: welcomeBody, icon: '/icons/icon-192.png' });
          } catch {}
        }
      }
    } catch {}

    return {
      success: true,
      fcmToken,
      isStandardWebNotification: !fcmToken,
      subscription: fcmToken
        ? { endpoint: `fcm:${fcmToken}`, fcmToken, isFcm: true }
        : { endpoint: 'standard-web-notification', isStandardNotification: true },
      message: fcmToken
        ? 'Notifikasi Firebase Cloud Messaging (FCM) berjaya diaktifkan pada peranti ini!'
        : 'Kebenaran notifikasi pelayar berjaya diaktifkan!'
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
    const oldFcm = getStoredFcmToken();
    if (oldFcm) {
      fetch('/api/push/fcm-unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: oldFcm })
      }).catch(() => {});
    }
    await revokeFcmToken();

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

    const storedFcmToken = getStoredFcmToken();
    const hasHttpEndpoint = Boolean(subscription?.endpoint && subscription.endpoint.startsWith('http'));
    const hasFcmToken = Boolean(subscription?.fcmToken || storedFcmToken);

    if (hasHttpEndpoint || hasFcmToken) {
      try {
        const response = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: hasHttpEndpoint ? subscription.endpoint : undefined,
            fcmToken: subscription?.fcmToken || storedFcmToken || undefined
          })
        });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data?.sent > 0) {
            dispatchLiveEvent();
            return {
              success: true,
              message: data.message || 'Notifikasi ujian berjaya dihantar ke telefon anda!'
            };
          }
        }
      } catch {}
    }

    dispatchLiveEvent();

    const title = "FrozenBergerak 📍 Team Bergerak Sekarang!";
    const body = "Team Frozen kini dalam perjalanan ke lokasi anda. Stok sedia dihantar terus ke rumah!";

    try {
      const reg = await getOrRegisterServiceWorker();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png'
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    } catch {}

    return {
      success: true,
      message: 'Notifikasi ujian berjaya dipaparkan pada peranti ini!'
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

/**
 * Silently refreshes & syncs FCM token if user has already granted Notification permission.
 */
export async function syncExistingFcmSubscription(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const hasOptedIn =
    Boolean(getStoredFcmToken()) || localStorage.getItem('web_notification_enabled') === 'true';
  if (!hasOptedIn) return null;

  const previousToken = getStoredFcmToken();
  try {
    const token = await requestFcmToken(undefined, undefined);
    if (token) {
      fetch('/api/push/fcm-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          previousToken: previousToken && previousToken !== token ? previousToken : undefined,
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
      return token;
    }
  } catch {}
  return null;
}

