// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");

// Mercado Pago SDK
const { MercadoPagoConfig, Payment } = require("mercadopago");

// Utility to handle CORS
const cors = require("cors")({origin: true});

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({ region: "us-central1" });

const secrets = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"];

// --- Helper Functions ---

/**
 * Gets the next sequential order number from a counter in Firestore.
 * @returns {Promise<number>} The next order number.
 */
const getNextOrderNumber = async () => {
    const counterRef = admin.firestore().doc('counters/orders');
    return admin.firestore().runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists) {
            transaction.set(counterRef, { currentNumber: 1 });
            return 1;
        }
        const newNumber = counterDoc.data().currentNumber + 1;
        transaction.update(counterRef, { currentNumber: newNumber });
        return newNumber;
    });
};

// --- Cloud Functions ---

/**
 * Cloud Function to create an order and optionally a Mercado Pago PIX payment.
 */
exports.createOrder = onCall({ secrets }, async (request) => {
    const { details, cart, total, pixOption } = request.data;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
        throw new onCall.HttpsError('internal', 'Server configuration error.');
    }
    
    if (!details || !cart || !total) {
        throw new onCall.HttpsError('invalid-argument', 'Missing required order data.');
    }
    
    const orderNumber = await getNextOrderNumber();

    const orderData = {
        orderNumber,
        customer: {
            name: details.name,
            phone: details.phone,
            orderType: details.orderType,
            address: details.address || '',
            reservationTime: details.reservationTime || '',
        },
        items: cart,
        total,
        paymentMethod: details.paymentMethod,
        changeNeeded: details.changeNeeded || false,
        changeAmount: details.changeAmount || '',
        notes: details.notes || '',
        status: pixOption === 'payNow' ? 'awaiting-payment' : 'pending',
        paymentStatus: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = await admin.firestore().collection('orders').add(orderData);

    if (pixOption === 'payNow') {
        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);
        
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 30);

        const notificationUrl = `https://${process.env.FUNCTION_REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

        try {
            const paymentResponse = await payment.create({
                body: {
                    transaction_amount: total,
                    description: `Pedido #${orderNumber} - Pizzaria Santa Sensação`,
                    payment_method_id: 'pix',
                    payer: {
                        email: "cliente@email.com", // Generic email, as it's required
                        first_name: details.name.split(' ')[0],
                        last_name: details.name.split(' ').slice(1).join(' ') || details.name.split(' ')[0],
                        identification: {
                            type: 'CPF',
                            number: details.cpf,
                        },
                    },
                    notification_url: notificationUrl,
                    external_reference: orderRef.id,
                    date_of_expiration: expirationDate.toISOString(),
                },
                requestOptions: {
                    idempotencyKey: orderRef.id,
                }
            });

            const pixData = {
                paymentId: paymentResponse.id,
                qrCodeBase64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
                qrCode: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
                ticketUrl: paymentResponse.point_of_interaction?.transaction_data?.ticket_url
            };

            await orderRef.update({
                mercadoPagoDetails: {
                    paymentId: pixData.paymentId,
                    status: paymentResponse.status,
                    ticketUrl: pixData.ticketUrl
                }
            });

            return { orderId: orderRef.id, orderNumber, pixData };
        } catch (error) {
            console.error("Mercado Pago API error:", error);
            throw new onCall.HttpsError('internal', 'Failed to create PIX payment.');
        }
    }

    return { orderId: orderRef.id, orderNumber };
});


/**
 * Webhook to receive payment notifications from Mercado Pago.
 */
exports.mercadoPagoWebhook = onRequest({ secrets }, async (request, response) => {
    cors(request, response, async () => {
        const { query, body } = request;
        const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("MERCADO_PAGO_WEBHOOK_SECRET is not configured.");
            return response.status(500).send("Webhook secret not configured.");
        }
        
        // Validate signature
        const signature = request.headers['x-signature'];
        const requestId = request.headers['x-request-id'];
        
        if (!signature || !requestId) {
            console.warn("Missing signature or request ID");
            return response.status(400).send("Missing signature headers.");
        }
        
        const [ts, hash] = signature.split(',').map(part => part.split('=')[1]);
        const manifest = `id:${query['data.id']};request-id:${requestId};ts:${ts};`;
        
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

        if (hmac !== hash) {
            console.warn("Invalid webhook signature.");
            return response.status(400).send("Invalid signature.");
        }

        if (body.type === 'payment' && body.action === 'payment.updated') {
            const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);
            
            try {
                const paymentInfo = await payment.get({ id: body.data.id });
                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const orderId = paymentInfo.external_reference;
                    const orderRef = admin.firestore().collection('orders').doc(orderId);
                    
                    // Update order status atomically
                    await orderRef.update({
                        paymentStatus: 'paid_online',
                        status: 'pending' // Move from 'awaiting-payment' to 'pending' for the kitchen
                    });
                    console.log(`Order ${orderId} updated to paid and pending.`);
                }
            } catch (error) {
                console.error("Error fetching payment info from Mercado Pago:", error);
            }
        }
        
        response.status(200).send("OK");
    });
});


/**
 * Cloud Function to process a full refund for an order.
 */
exports.refundPayment = onCall({ secrets }, async (request) => {
    const { orderId } = request.data;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
        throw new onCall.HttpsError('internal', 'Server configuration error.');
    }

    if (!orderId) {
        throw new onCall.HttpsError('invalid-argument', 'Missing required order ID.');
    }

    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
        throw new onCall.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();
    const paymentId = orderData.mercadoPagoDetails?.paymentId;

    if (!paymentId) {
        throw new onCall.HttpsError('failed-precondition', 'This order was not paid online and cannot be refunded automatically.');
    }
    
    if (orderData.paymentStatus === 'refunded') {
        throw new onCall.HttpsError('failed-precondition', 'This order has already been refunded.');
    }

    try {
        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);
        
        await payment.refund({ payment_id: paymentId });

        await orderRef.update({
            paymentStatus: 'refunded',
            status: 'cancelled'
        });

        return { success: true, message: "Payment refunded successfully." };

    } catch (error) {
        console.error("Mercado Pago refund error:", error);
        throw new onCall.HttpsError('internal', 'Failed to process refund with Mercado Pago.');
    }
});
