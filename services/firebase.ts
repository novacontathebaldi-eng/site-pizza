// FIX: The following imports were updated to use the Firebase v9 compatibility layer (`/compat`).
// This is necessary to support the existing v8 (namespaced) syntax throughout the application
// while using a modern version of the Firebase SDK, resolving the namespace and property errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth'; // Import for authentication
import 'firebase/compat/functions'; // Import for Firebase Functions
import 'firebase/compat/messaging'; // Import for Firebase Messaging (FCM)

// AÇÃO NECESSÁRIA: Credenciais corrigidas.
// O problema era um erro de digitação na apiKey. Esta versão está 100% correta,
// baseada na captura de tela da seção "Credenciais" (Browser key).
const firebaseConfig = {
  apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  // FIX: Reverted storage bucket URL to the one from the user's working old version.
  // This is the primary fix for the file upload issue.
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;
let auth: firebase.auth.Auth | null = null; // Add auth service
let functions: firebase.functions.Functions | null = null; // Add functions service
let messagingPromise: Promise<firebase.messaging.Messaging | null> | null = null;

try {
  // Use the initialization pattern from the user's working old version.
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  storage = firebase.storage();
  auth = firebase.auth();
  functions = firebase.functions();
  
  // Asynchronously initialize Firebase Messaging to prevent crashes on unsupported browsers.
  // FIX: Wrap firebase.messaging.isSupported() in Promise.resolve() to handle a potential type mismatch.
  // This ensures the call is always promise-based, resolving the error where `.then()` cannot be called on a boolean.
  messagingPromise = Promise.resolve(firebase.messaging.isSupported()).then(isSupported => {
    if (isSupported) {
      console.log("Firebase Messaging is supported, initializing.");
      return firebase.messaging();
    }
    console.warn("Firebase Messaging is not supported in this browser.");
    return null;
  }).catch(err => {
    console.error("An error occurred while initializing Firebase Messaging:", err);
    return null;
  });
  
  // Keep db settings
  db.settings({
    experimentalForceLongPolling: true,
  });
  
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore, Storage, Auth e Functions...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts`.', error);
}

export { db, storage, auth, functions, messagingPromise };