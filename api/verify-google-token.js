// /api/verify-google-token.js
const admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");

// --- INICIALIZAÇÃO DO FIREBASE ADMIN ---
// As credenciais são verificadas dentro do handler para garantir que um erro claro seja retornado se estiverem faltando.
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

try {
  if (!admin.apps.length && serviceAccount.project_id) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.stack);
}
// --- FIM DA INICIALIZAÇÃO ---

module.exports = async (req, res) => {
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
  
  // **NOVAS VERIFICAÇÕES DE SEGURANÇA**
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error("Firebase Admin credentials are not set in environment variables.");
    return res.status(500).json({ error: "Configuration error: Firebase Admin credentials missing." });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID not set.");
    return res.status(500).json({ error: "Configuration error: Google Client ID is missing." });
  }
  
  const db = admin.firestore();
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "The function must be called with an idToken." });
  }

  const client = new OAuth2Client(clientId);

  try {
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
    console.error("Error verifying Google token:", error);
    return res.status(401).json({ error: "Token verification failed.", message: error.message });
  }
};