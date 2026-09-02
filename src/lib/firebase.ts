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

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword
};
export type { User };
