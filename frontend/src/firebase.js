import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDoDMAVeVi30JWB4Ft4sIFOJp1MOd673AI",
  authDomain: "mental-vault-73bca.firebaseapp.com",
  projectId: "mental-vault-73bca",
  storageBucket: "mental-vault-73bca.firebasestorage.app",
  messagingSenderId: "740775839942",
  appId: "1:740775839942:web:e7f541de0976fb1b262fc7",
  measurementId: "G-Q3ZPG1Z3V8V"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
