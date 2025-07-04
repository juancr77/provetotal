// firebase.js

// Se importan las funciones necesarias del SDK de Firebase.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Es necesario reemplazar este objeto con la configuración
// del proyecto de Firebase del usuario.
const firebaseConfig = {
  apiKey: "AIzaSyBcLVqVy0vVXxlSFpKC6yn28sl8P_pP_JA",
  authDomain: "facturas-688b6.firebaseapp.com",
  projectId: "facturas-688b6",
  storageBucket: "facturas-688b6.firebasestorage.app",
  messagingSenderId: "858379261395",
  appId: "1:858379261395:web:ba33b7b042e1108c424b26",
  measurementId: "G-GXVFE9HYNP"
};

// Se inicializa la aplicación de Firebase.
const app = initializeApp(firebaseConfig);

// Se exporta la instancia de Firestore para ser utilizada en otros componentes.
export const db = getFirestore(app);