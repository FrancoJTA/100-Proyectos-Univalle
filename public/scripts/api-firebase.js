import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, query, where, addDoc, deleteDoc  } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAgMLt61surQjZ4sprvsgLa9Y0APF8ESIg",
    authDomain: "proyecto1-480d9.firebaseapp.com",
    projectId: "proyecto1-480d9",
    storageBucket: "proyecto1-480d9.appspot.com",
    messagingSenderId: "1080122082071",
    appId: "1:1080122082071:web:51eb568c8487f341d4ad52"
};
// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore y Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta las funcionalidades necesarias
export {
  app,
  db,
  auth,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
};