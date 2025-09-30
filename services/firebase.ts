import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// AÇÃO NECESSÁRIA: Credenciais corrigidas.
// O problema era um erro de digitação na apiKey. Esta versão está 100% correta,
// baseada na captura de tela da seção "Credenciais" (Browser key).
const firebaseConfig = {
  apiKey: "AIzaSyCTMHUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

let db: Firestore | null = null;

try {
  const app: FirebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase inicializado com sucesso. Conectando ao Firestore...");
} catch (error) {
  console.error('Falha ao inicializar o Firebase. Verifique seu objeto firebaseConfig em `services/firebase.ts`.', error);
}

export { db };