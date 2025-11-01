// /api/verify-google-token.js
const admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");

// --- INICIALIZAÇÃO DO FIREBASE ADMIN ---
// Utiliza as variáveis de ambiente individuais configuradas no Vercel.
try {
  if (!admin.apps.length) {
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada é lida diretamente da variável de ambiente.
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.stack);
}
// --- FIM DA INICIALIZAÇÃO ---

const db = admin.firestore();

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
  
  const { idToken } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!idToken) {
    return res.status(400).json({ error: "The function must be called with an idToken." });
  }
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID not set.");
    return res.status(500).json({ error: "Authentication is not configured correctly." });
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