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
import { ScheduleItem } from "../types";

export const firebaseConfig = {
  apiKey: "AIzaSyDj2prRasRQ35xLzmxCbxJj2X0APh0gWIg",
  authDomain: "frozen-bergerak-app.firebaseapp.com",
  projectId: "frozen-bergerak-app",
  storageBucket: "frozen-bergerak-app.firebasestorage.app",
  messagingSenderId: "263646526368",
  appId: "1:263646526368:web:66d4e42ced2e20821682c5",
  measurementId: "G-JYDW6KSGCS"
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

/**
 * Fetch schedule records from Firebase Firestore with a quick timeout.
 * Crucial rule: Firebase never blocks public access or throws uncaught exceptions.
 * If empty or permissions error occurs, returns [] gracefully so caller falls back to Google Sheets.
 */
export async function fetchSchedulesFromFirestore(): Promise<ScheduleItem[]> {
  if (!db) {
    console.log("[ScheduleSync] Firestore db is not initialized. Skipping Firestore.");
    return [];
  }

  try {
    console.log("[ScheduleSync] Checking Firebase Database for schedule data...");
    
    // Quick timeout to guarantee non-blocking access for public customers
    const timeoutPromise = new Promise<ScheduleItem[]>((resolve) => {
      setTimeout(() => resolve([]), 2500);
    });

    const fetchPromise = async (): Promise<ScheduleItem[]> => {
      // 1. Try 'schedules' collection
      const schedulesColl = collection(db!, "schedules");
      const schedSnap = await getDocs(schedulesColl);
      if (!schedSnap.empty) {
        const items: ScheduleItem[] = [];
        schedSnap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id || data.id || `JAD-${items.length + 1}`,
            teamName: data.teamName || data.namaTeam || data.driverName || "Team Frozen 1",
            driverName: data.driverName || data.teamName || data.namaTeam || "Team Frozen 1",
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

      // 2. Try 'jadual' collection
      const jadualColl = collection(db!, "jadual");
      const jadualSnap = await getDocs(jadualColl);
      if (!jadualSnap.empty) {
        const items: ScheduleItem[] = [];
        jadualSnap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id || data.id || data.idJadual || `JAD-${items.length + 1}`,
            teamName: data.namaTeam || data.teamName || data.driverName || "Team Frozen 1",
            driverName: data.namaTeam || data.teamName || data.driverName || "Team Frozen 1",
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
      console.log(`[ScheduleSync] ✅ Loaded ${results.length} schedule records from Firebase Database.`);
      return results;
    }

    console.warn("[ScheduleSync] ℹ️ Firebase Database is empty. Proceeding to Google Sheets fallback...");
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
    // Also mirror to jadual collection for backwards compatibility
    try {
      const jadualRef = doc(db, "jadual", item.id);
      await setDoc(jadualRef, item, { merge: true });
    } catch {}
    console.log(`[ScheduleSync] ✅ Saved schedule ${item.id} to Firebase Database.`);
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
    console.log(`[ScheduleSync] 🗑️ Deleted schedule ${id} from Firebase Database.`);
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
export type { User, Firestore };


