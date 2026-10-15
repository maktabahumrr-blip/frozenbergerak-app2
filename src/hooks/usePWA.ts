import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // Detect iOS & Android devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Clean up outdated Service Worker caches and register/update freshest version immediately
    if ("serviceWorker" in navigator) {
      // 1. Purge outdated SW caches so mobile browsers pull fresh assets
      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          const currentVersion = "v6";
          cacheNames.forEach((name) => {
            if (!name.includes(currentVersion)) {
              console.log(`[PWA] Removing outdated cache: ${name}`);
              caches.delete(name).catch(() => {});
            }
          });
        }).catch(() => {});
      }

      // 2. Unregister any stale SW registrations and update active SW
      const registerAndUpdateSW = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            // Unregister obsolete service workers with non-root scopes or wrong script URLs
            const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
            if (scriptURL && !scriptURL.endsWith("/sw.js")) {
              console.log("[PWA] Unregistering obsolete service worker:", scriptURL);
              await reg.unregister().catch(() => {});
            } else {
              // Force update to fetch latest sw.js from server
              await reg.update().catch(() => {});
            }
          }

          // Register or refresh primary service worker
          const primaryReg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          primaryReg.update().catch(() => {});

          // If a new worker is found waiting, prompt skipWaiting immediately
          if (primaryReg.waiting) {
            primaryReg.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          primaryReg.onupdatefound = () => {
            const installingWorker = primaryReg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  installingWorker.postMessage({ type: "SKIP_WAITING" });
                  console.log("[PWA] New version installed and activated.");
                }
              };
            }
          };

          console.log("[PWA] Service Worker verified and active on scope:", primaryReg.scope);
        } catch (error) {
          console.warn("[PWA] Service Worker registration/update notice:", error);
        }
      };

      if (document.readyState === "complete" || document.readyState === "interactive") {
        registerAndUpdateSW();
      } else {
        window.addEventListener("load", registerAndUpdateSW);
      }
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("FrozenBergerak PWA successfully installed!");
    };

    // Online/Offline tracking
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error invoking PWA install prompt:", err);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    isIOS,
    isAndroid,
    promptInstall
  };
}
