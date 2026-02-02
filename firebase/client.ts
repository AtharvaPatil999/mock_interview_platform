// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-ND5OnAma4HUaW7OMPsVmncccjGMOPfY",
  authDomain: "mock-interview-platform-f4e01.firebaseapp.com",
  databaseURL: "https://mock-interview-platform-f4e01-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mock-interview-platform-f4e01",
  storageBucket: "mock-interview-platform-f4e01.firebasestorage.app",
  messagingSenderId: "1050045054337",
  appId: "1:1050045054337:web:393f6ade70b651030e3c80",
  measurementId: "G-R6LR3D37NN"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
