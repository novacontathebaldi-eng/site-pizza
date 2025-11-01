// /api/create-order.js
const admin = require("firebase-admin");

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

const getUserIdFromToken = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return null;
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        return null;
    }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Garante que o Firebase Admin está inicializado antes de usar
    ensureFirebaseAdminInitialized();
    const db = admin.firestore();

    const {details, cart, total, orderId} = req.body;
    
    const userId = await getUserIdFromToken(req);

    if (!details || !cart || !total || !orderId) {
      return res.status(400).json({ error: "Dados do pedido incompletos." });
    }

    const counterRef = db.doc("_internal/counters");
    let orderNumber;
    
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        orderNumber = 1;
        transaction.set(counterRef, {orderNumber: orderNumber + 1});
      } else {
        orderNumber = counterDoc.data().orderNumber;
        transaction.update(counterRef, {orderNumber: orderNumber + 1});
      }
    });

    const orderData = {
      userId,
      orderNumber,
      customer: {
        name: details.name,
        phone: details.phone,
        orderType: details.orderType,
        neighborhood: details.neighborhood || "",
        street: details.street || "",
        number: details.number || "",
        complement: details.complement || "",
      },
      items: cart,
      total,
      deliveryFee: details.deliveryFee || 0,
      paymentMethod: details.paymentMethod,
      changeNeeded: details.changeNeeded || false,
      changeAmount: details.changeAmount || "",
      notes: details.notes || "",
      status: "pending",
      paymentStatus: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = db.collection("orders").doc(orderId);
    await orderRef.set(orderData);

    return res.status(200).json({orderId, orderNumber});

  } catch (error) {
    console.error("Falha ao criar o pedido:", error);
    return res.status(500).json({ error: error.message || "Não foi possível criar o pedido." });
  }
};
