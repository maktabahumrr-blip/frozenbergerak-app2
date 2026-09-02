// Utility for Web Push Notifications (VAPID / Service Worker Push API)

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    throw new Error('Format VAPID Public Key tidak sah.');
  }
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
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
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker tidak disokong pada pelayar ini.');
  }

  // Check existing registration or register anew
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Wait for ready with an 8-second timeout to prevent indefinite hanging
  const readyPromise = navigator.serviceWorker.ready;
  const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
    setTimeout(
      () => reject(new Error('Masa pendaftaran Service Worker tamat (timeout). Sila muat semula aplikasi.')),
      8000
    )
  );

  return await Promise.race([readyPromise, timeoutPromise]);
}

export async function fetchVapidPublicKey(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('/api/push/vapid-public-key', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gagal mendapatkan VAPID Public Key dari server (Status: ${response.status}).`);
    }
    const data = await response.json();
    if (!data.publicKey) {
      throw new Error('Kunci VAPID Public Key tiada pada server.');
    }
    return data.publicKey;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Masa sambungan ke pelayan tamat semasa memuatkan kunci notifikasi.');
    }
    throw err;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  
  try {
    const registration = await getOrRegisterServiceWorker();
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('Error checking existing push subscription:', err);
    return null;
  }
}

export async function subscribeUserToPush(): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Pelayar atau peranti ini tidak menyokong Web Push Notification secara natif.'
    };
  }

  try {
    // 1. Request browser Notification Permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied' 
          ? 'Kebenaran notifikasi telah ditolak dalam tetapan pelayar. Sila benarkan notifikasi di tetapan laman web.' 
          : 'Kebenaran notifikasi tidak diberikan.'
      };
    }

    // 2. Fetch VAPID key
    const vapidPublicKey = await fetchVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 3. Register & Ensure Service Worker is Ready
    const registration = await getOrRegisterServiceWorker();
    
    // 4. Check if subscription already exists or create new
    let subscription = await registration.pushManager.getSubscription();

    try {
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
    } catch (subErr: any) {
      console.warn('Initial subscription failed, trying unsubscribe + re-subscribe:', subErr);
      // In case the old subscription was using an outdated key or corrupted
      const existing = await registration.pushManager.getSubscription().catch(() => null);
      if (existing) {
        await existing.unsubscribe().catch(() => {});
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    if (!subscription) {
      throw new Error('Pelayar gagal mencipta langganan PushManager.');
    }

    // 5. Extract keys safely
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

    // 6. Send subscription payload to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Gagal menyimpan langganan pada server (Kod: ${response.status}).`);
    }

    return {
      success: true,
      subscription
    };
  } catch (err: any) {
    console.error('Error subscribing to push:', err);
    return {
      success: false,
      error: err?.message || 'Ralat tidak dijangka berlaku semasa mendaftar notifikasi.'
    };
  }
}

export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const registration = await getOrRegisterServiceWorker();
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      }).catch(() => {});

      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error unsubscribing from push:', err);
    return false;
  }
}

export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await getExistingPushSubscription();
    if (!subscription) {
      return {
        success: false,
        message: 'Tiada langganan notifikasi aktif pada peranti ini. Sila aktifkan notifikasi dahulu.'
      };
    }

    const response = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    const data = await response.json().catch(() => ({}));

    // Dispatch live event to animate moving vehicle inside the current view instantly as well
    if (response.ok && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frozen_live_notification', {
        detail: {
          title: "FrozenBergerak 📍 Team Bergerak Sekarang!",
          body: "Team Frozen kini dalam perjalanan ke lokasi anda. Stok sedia dihantar terus ke rumah!",
          url: "/#section-jadual-pergerakan",
          timestamp: Date.now()
        }
      }));
    }

    return {
      success: response.ok,
      message: data.message || (response.ok ? 'Notifikasi ujian berjaya dihantar ke telefon anda!' : (data.error || 'Gagal menghantar ujian.'))
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Ralat sambungan semasa menghantar notifikasi ujian.'
    };
  }
}
