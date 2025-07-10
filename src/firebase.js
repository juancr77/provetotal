// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Se importa la función para obtener el servicio de autenticación
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase
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

// Se obtienen los servicios de Firestore y Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Se exportan ambas instancias para ser utilizadas en otros componentes.
export { db, auth };