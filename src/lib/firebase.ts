import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  updatePassword,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  deleteDoc,
  Firestore 
} from "firebase/firestore";
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  isSupported as isFcmSupported,
  Messaging,
  MessagePayload
} from "firebase/messaging";
import { ScheduleItem } from "../types";

const envVars = ((import.meta as any).env || {}) as Record<string, string | undefined>;

export const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "AIzaSyDj2prRasRQ35xLzmxCbxJj2X0APh0gWIg",
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN || "frozen-bergerak-app.firebaseapp.com",
  projectId: envVars.VITE_FIREBASE_PROJECT_ID || "frozen-bergerak-app",
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET || "frozen-bergerak-app.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "263646526368",
  appId: envVars.VITE_FIREBASE_APP_ID || "1:263646526368:web:66d4e42ced2e20821682c5",
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID || "G-JYDW6KSGCS"
};

// Initialize Firebase App instance singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore safely without crashing if offline or unavailable
let firestoreDb: Firestore | null = null;
try {
  firestoreDb = getFirestore(app);
} catch (err) {
  console.warn("[Firebase] Firestore initialization warning:", err);
}
export const db = firestoreDb;

// Deterministic safe Firestore document ID from an FCM registration token
export function getFcmTokenDocId(token: string): string {
  let h1 = 2166136261;
  let h2 = 3735928559;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ ch, 2246822519);
  }
  return `fcm_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${token.length}`;
}

export async function saveFcmTokenToFirestore(
  token: string,
  metadata?: { userAgent?: string }
): Promise<boolean> {
  if (!db || !token) return false;
  try {
    const docId = getFcmTokenDocId(token);
    await setDoc(
      doc(db, "fcm_tokens", docId),
      {
        token,
        userAgent: metadata?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : ""),
        active: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn("[FCM] Firestore token save note:", err?.message || err);
    return false;
  }
}

export async function removeFcmTokenFromFirestore(token: string): Promise<boolean> {
  if (!db || !token) return false;
  try {
    const docId = getFcmTokenDocId(token);
    await deleteDoc(doc(db, "fcm_tokens", docId));
    return true;
  } catch (err: any) {
    console.warn("[FCM] Firestore token delete note:", err?.message || err);
    return false;
  }
}

// Lazy singleton for Firebase Cloud Messaging (FCM)
let messagingPromise: Promise<Messaging | null> | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isFcmSupported();
        if (!supported) return null;
        return getMessaging(app);
      } catch (err) {
        console.warn("[FCM] Messaging not supported in this browser:", err);
        return null;
      }
    })();
  }
  return messagingPromise;
}

export async function requestFcmToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration | null,
  vapidKeyOverride?: string | null
): Promise<string | null> {
  const previousToken = (() => {
    try {
      return localStorage.getItem("fb_fcm_token");
    } catch {
      return null;
    }
  })();

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const envVapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || "";
    const resolvedVapidKey = (vapidKeyOverride || envVapidKey || "").trim();

    let swReg = serviceWorkerRegistration || undefined;
    if (!swReg && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      swReg = await navigator.serviceWorker
        .register("/firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope" })
        .catch(() => navigator.serviceWorker.getRegistration().catch(() => undefined));
    }

    const tokenOptions: any = {};
    if (resolvedVapidKey) tokenOptions.vapidKey = resolvedVapidKey;
    if (swReg) tokenOptions.serviceWorkerRegistration = swReg;

    const token = await getToken(messaging, tokenOptions);
    if (token) {
      if (previousToken && previousToken !== token) {
        removeFcmTokenFromFirestore(previousToken).catch(() => {});
      }
      try {
        localStorage.setItem("fb_fcm_token", token);
      } catch {}
      await saveFcmTokenToFirestore(token);
      return token;
    }
    return null;
  } catch (err: any) {
    const errMsg = String(err?.message || err || "");
    if (
      previousToken &&
      (errMsg.includes("token") || errMsg.includes("permission") || errMsg.includes("unregistered"))
    ) {
      removeFcmTokenFromFirestore(previousToken).catch(() => {});
      try {
        localStorage.removeItem("fb_fcm_token");
      } catch {}
    }
    console.warn("[FCM] Token generation note:", errMsg);
    return null;
  }
}

export async function revokeFcmToken(): Promise<void> {
  const existingToken = (() => {
    try {
      return localStorage.getItem("fb_fcm_token");
    } catch {
      return null;
    }
  })();

  try {
    if (existingToken) {
      await removeFcmTokenFromFirestore(existingToken);
    }
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      await deleteToken(messaging).catch(() => {});
    }
    localStorage.removeItem("fb_fcm_token");
  } catch {}
}

export async function subscribeToFcmForegroundMessages(
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;
    return onMessage(messaging, callback);
  } catch {
    return null;
  }
}

/**
 * Fetch schedule records from Firebase Firestore with a quick timeout.
 * Crucial rule: Firebase never blocks public access or throws uncaught exceptions.
 * If empty or permissions error occurs, returns [] gracefully.
 */
export async function fetchSchedulesFromFirestore(): Promise<ScheduleItem[]> {
  if (!db) {
    return [];
  }

  try {
    const timeoutPromise = new Promise<ScheduleItem[]>((resolve) => {
      setTimeout(() => resolve([]), 2500);
    });

    const fetchPromise = async (): Promise<ScheduleItem[]> => {
      const schedulesColl = collection(db!, "schedules");
      const schedSnap = await getDocs(schedulesColl);
      if (!schedSnap.empty) {
        const items: ScheduleItem[] = [];
        schedSnap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id || data.id || `JAD-${items.length + 1}`,
            teamName: data.teamName || data.team || data.namaTeam || data.nama_team || data.driverName || "Team Frozen 1",
            driverName: data.driverName || data.teamName || data.team || data.namaTeam || data.nama_team || "Team Frozen 1",
            date: data.date || data.tarikh || "Hari Ini",
            timeSlot: data.timeSlot || data.masa || "Waktu Operasi",
            locations: data.locations || data.kawasan || "",
            notes: data.notes || data.catatan || "",
            status: data.status || "Sedang Bergerak",
            lastUpdated: data.lastUpdated || new Date().toISOString()
          });
        });
        return items;
      }

      const jadualColl = collection(db!, "jadual");
      const jadualSnap = await getDocs(jadualColl);
      if (!jadualSnap.empty) {
        const items: ScheduleItem[] = [];
        jadualSnap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id || data.id || data.idJadual || `JAD-${items.length + 1}`,
            teamName: data.namaTeam || data.teamName || data.team || data.nama_team || data.driverName || "Team Frozen 1",
            driverName: data.namaTeam || data.teamName || data.team || data.nama_team || data.driverName || "Team Frozen 1",
            date: data.tarikh || data.date || "Hari Ini",
            timeSlot: data.masa || data.timeSlot || "Waktu Operasi",
            locations: data.kawasan || data.locations || "",
            notes: data.catatan || data.notes || "",
            status: data.status || "Sedang Bergerak",
            lastUpdated: data.lastUpdated || new Date().toISOString()
          });
        });
        return items;
      }

      return [];
    };

    const results = await Promise.race([fetchPromise(), timeoutPromise]);
    if (results && results.length > 0) {
      return results;
    }

    return [];
  } catch (err: any) {
    console.warn("[ScheduleSync] Firebase Database read skipped or error encountered:", err?.message || err);
    return [];
  }
}

/**
 * Persists a schedule item to Firebase Firestore globally
 */
export async function saveScheduleToFirestore(item: ScheduleItem): Promise<boolean> {
  if (!db || !item || !item.id) return false;
  try {
    const docRef = doc(db, "schedules", item.id);
    await setDoc(docRef, item, { merge: true });
    try {
      const jadualRef = doc(db, "jadual", item.id);
      await setDoc(jadualRef, item, { merge: true });
    } catch {}
    return true;
  } catch (err: any) {
    console.warn(`[ScheduleSync] Firebase Database save warning (${item.id}):`, err?.message || err);
    return false;
  }
}

/**
 * Deletes a schedule item globally from Firebase Firestore
 */
export async function deleteScheduleFromFirestore(id: string): Promise<boolean> {
  if (!db || !id) return false;
  try {
    const schedulesRef = doc(db, "schedules", id);
    await deleteDoc(schedulesRef);
    try {
      const jadualRef = doc(db, "jadual", id);
      await deleteDoc(jadualRef);
    } catch {}
    return true;
  } catch (err: any) {
    console.warn(`[ScheduleSync] Firebase Database delete warning (${id}):`, err?.message || err);
    return false;
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
};
export type { User, Firestore, MessagePayload };


