// FIX: The following imports were updated to use the Firebase v9 compatibility layer (`/compat`).
// This is necessary to support the existing v8 (namespaced) syntax throughout the application
// while using a modern version of the Firebase SDK, resolving the namespace and property errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth'; // Import for authentication

// FIX: Firebase configuration updated to use environment variables for the API key
// and corrected the storage bucket URL for full functionality.
const firebaseConfig = {
  // The API key is now securely sourced from the environment variables.
  apiKey: process.env.API_KEY,
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  // The storage bucket URL has been corrected to the standard format.
  storageBucket: "site-pizza-a2930.appspot.com",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;
let auth: firebase.auth.Auth | null = null; // Add auth service

try {
  if (!firebase.apps.length) {
    if (!process.env.API_KEY) {
      throw new Error("A chave de API do Firebase não foi configurada. Verifique as variáveis de ambiente.");
    }
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  storage = firebase.storage();
  auth = firebase.auth(); // Initialize auth
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore, Storage e Auth...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts` e se a API_KEY está definida.', error);
}

export { db, storage, auth };