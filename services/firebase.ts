// FIX: The following imports were updated to use the Firebase v9 compatibility layer (`/compat`).
// This is necessary to support the existing v8 (namespaced) syntax throughout the application
// while using a modern version of the Firebase SDK, resolving the namespace and property errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth'; // Import for authentication

// FIX: The Firebase configuration has been updated with the correct API key from your project settings.
// This resolves the connection issue that caused the infinite loading screen on the admin page.
const firebaseConfig = {
  // The API key is now correctly set based on your project's configuration.
  apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
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
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();

  // FIX: Force long-polling to prevent WebSocket connection issues in restrictive environments.
  // This helps ensure a stable connection on browsers like Chrome that might have issues
  // with WebSockets due to proxies, firewalls, or sandbox restrictions.
  db.settings({
    experimentalForceLongPolling: true,
  });

  storage = firebase.storage();
  auth = firebase.auth(); // Initialize auth
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore, Storage e Auth...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts`.', error);
}

export { db, storage, auth };