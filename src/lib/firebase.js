// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA8ktLyihrNQX4LNWgS9U4DZdCM9U-a3dU",
  authDomain: "chattang-92afe.firebaseapp.com",
  projectId: "chattang-92afe",
  storageBucket: "chattang-92afe.appspot.com",
  messagingSenderId: "1007241533706",
  appId: "1:1007241533706:web:70c815be99028320f582f3",
  databaseURL: "https://chattang-92afe-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);
