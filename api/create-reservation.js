// /api/create-reservation.js
const admin = require("firebase-admin");

// --- INICIALIZAÇÃO DO FIREBASE ADMIN ---
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.stack);
}
// --- FIM DA INICIALIZAÇÃO ---

const db = admin.firestore();

// Função para verificar o token de autenticação do Firebase (opcional, mas recomendado)
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
    const { details } = req.body;
    
    // Opcional: Pega o ID do usuário se ele estiver logado
    const userId = await getUserIdFromToken(req);

    if (!details || !details.name || !details.phone || !details.reservationDate || !details.reservationTime || !details.numberOfPeople) {
      return res.status(400).json({ error: "Dados da reserva incompletos." });
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
        orderType: "local",
        reservationDate: details.reservationDate,
        reservationTime: details.reservationTime,
      },
      numberOfPeople: details.numberOfPeople,
      notes: details.notes || "",
      status: "pending",
      paymentStatus: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = await db.collection("orders").add(orderData);
    const orderId = orderRef.id;

    return res.status(200).json({orderId, orderNumber});

  } catch (error) {
    console.error("Falha ao criar a reserva:", error);
    return res.status(500).json({ error: "Não foi possível criar a reserva." });
  }
};
