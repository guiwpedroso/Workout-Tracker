import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyC9lv1UgdxOP4d99LJeiFZuVIN5BipuwlU",
  authDomain: "workout-tracker-e5db6.firebaseapp.com",
  projectId: "workout-tracker-e5db6",
  storageBucket: "workout-tracker-e5db6.firebasestorage.app",
  messagingSenderId: "191332131973",
  appId: "1:191332131973:web:c465cab49fb255a06b75ec"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);