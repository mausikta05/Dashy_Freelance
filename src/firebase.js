import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYR3bSng40frOQmftmGaKJxGLT7WW8--k",
  authDomain: "stellar-39682.firebaseapp.com",
  projectId: "stellar-39682",
  storageBucket: "stellar-39682.firebasestorage.app",
  messagingSenderId: "461504642752",
  appId: "1:461504642752:web:73a6eaea4cb68cf3787725"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
