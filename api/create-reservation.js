import admin from 'firebase-admin';

let db;

const ensureFirebaseAdminInitialized = () => {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase credentials missing');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
  } catch (e) {
    console.error('Firebase init error:', e);
    throw new Error('Firebase initialization failed');
  }
};

const getUserIdFromToken = async (req) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export default async (req, res) => {
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
    ensureFirebaseAdminInitialized();

    const { details } = req.body;
    const userId = await getUserIdFromToken(req);

    if (!details?.name || !details?.phone || !details?.reservationDate || !details?.reservationTime || !details?.numberOfPeople) {
      return res.status(400).json({ error: 'Dados da reserva incompletos' });
    }

    const counterRef = db.doc('_internal/counters');
    let orderNumber;

    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        orderNumber = 1;
        transaction.set(counterRef, { orderNumber: 2 });
      } else {
        orderNumber = counterDoc.data().orderNumber;
        transaction.update(counterRef, { orderNumber: orderNumber + 1 });
      }
    });

    const reservationData = {
      userId,
      orderNumber,
      customer: {
        name: details.name,
        phone: details.phone,
        orderType: 'local',
        reservationDate: details.reservationDate,
        reservationTime: details.reservationTime,
      },
      numberOfPeople: details.numberOfPeople,
      notes: details.notes || '',
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = await db.collection('orders').add(reservationData);

    return res.status(200).json({ orderId: orderRef.id, orderNumber });
  } catch (error) {
    console.error('Falha ao criar reserva:', error);
    return res.status(500).json({ error: error.message || 'Erro ao criar reserva' });
  }
};