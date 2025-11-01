// /api/verify-google-token.js
import admin from "firebase-admin";
import { OAuth2Client } from "google-auth-library";

// Função para garantir que o Firebase Admin seja inicializado apenas uma vez (lazy initialization)
const ensureFirebaseAdminInitialized = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error("Firebase Admin credentials are not set in environment variables.");
    throw new Error("Configuration error: Firebase Admin credentials missing.");
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e.stack);
    throw new Error("Could not initialize Firebase Admin.");
  }
};

export default async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Garante que o Firebase Admin está inicializado
    ensureFirebaseAdminInitialized();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID not set.");
      throw new Error("Configuration error: Google Client ID is missing.");
    }
    
    const db = admin.firestore();
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "The function must be called with an idToken." });
    }

    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ error: "Invalid ID token." });
    }

    const {sub: googleUid, email, name, picture} = payload;
    const uid = `google:${googleUid}`;
    let isNewUser = false;

    try {
      await admin.auth().updateUser(uid, {
        email: email,
        displayName: name,
        photoURL: picture,
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        isNewUser = true;
        await admin.auth().createUser({
          uid: uid,
          email: email,
          displayName: name,
          photoURL: picture,
        });
      } else {
        throw error;
      }
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (isNewUser || !userDoc.exists) {
      await userRef.set({
        name,
        email,
        photoURL: picture,
        addresses: [],
      }, {merge: true});
    }

    const customToken = await admin.auth().createCustomToken(uid);
    return res.status(200).json({ customToken });

  } catch (error) {
    console.error("Error in verify-google-token handler:", error);
    return res.status(500).json({ error: error.message || "Token verification failed." });
  }
};