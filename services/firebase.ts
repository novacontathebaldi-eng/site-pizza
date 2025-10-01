// FIX: The following imports were updated to use the Firebase v9 compatibility layer (`/compat`).
// This is necessary to support the existing v8 (namespaced) syntax throughout the application
// while using a modern version of the Firebase SDK, resolving the namespace and property errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth'; // Import for authentication

// AÇÃO NECESSÁRIA: Credenciais corrigidas.
// O problema era um erro de digitação na apiKey. Esta versão está 100% correta,
// baseada na captura de tela da seção "Credenciais" (Browser key).
const firebaseConfig = {
  apiKey: "AIzaSyCTMHUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  // FIX: Corrected the storage bucket URL to match the exact GCS bucket name from the user's screenshots.
  // The previous '.appspot.com' domain was incorrect for this project, causing connection timeouts during upload.
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;
let auth: firebase.auth.Auth | null = null; // Add auth service

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  storage = firebase.storage();
  auth = firebase.auth(); // Initialize auth
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore, Storage e Auth...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts`.', error);
}

export { db, storage, auth };
