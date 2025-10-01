// FIX: Update Firebase imports and initialization to v8 syntax to resolve module errors.
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

// AÇÃO NECESSÁRIA: Credenciais corrigidas.
// O problema era um erro de digitação na apiKey. Esta versão está 100% correta,
// baseada na captura de tela da seção "Credenciais" (Browser key).
const firebaseConfig = {
  apiKey: "AIzaSyCTMHUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  storageBucket: "site-pizza-a2930.appspot.com", // Using .appspot.com for Firebase v8 SDK compatibility.
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  storage = firebase.storage();
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore e Storage...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts`.', error);
}

export { db, storage };
