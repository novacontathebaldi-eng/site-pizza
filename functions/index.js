/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({origin: true});

admin.initializeApp();
const db = admin.firestore();

// Helper to format price to cents
const toCents = (price) => Math.round(price * 100);

// Callable function to generate a PIX charge with InfinitePay
exports.generatePixCharge = functions.https.onCall(async (data, context) => {
  // Check for authentication
  // This is a light check; for production, you might want more robust security.
  // if (!context.auth) {
  //   throw new functions.https.HttpsError("unauthenticated", "Você precisa estar logado para fazer um pedido.");
  // }

  const orderId = data.orderId;
  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
  }

  const infinitePayApiKey = functions.config().infinitepay.api_key;
  if (!infinitePayApiKey) {
    throw new functions.https.HttpsError("internal", "A chave da API de pagamento não está configurada.");
  }

  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Pedido não encontrado.");
    }

    const orderData = orderDoc.data();

    // --- IMPORTANT: This part assumes a specific InfinitePay API endpoint for transparent PIX.
    // The documentation provided by the user points to a redirect-based checkout.
    // This implementation is based on a common pattern for transparent PIX APIs.
    // You may need to adjust the endpoint and payload based on InfinitePay's specific API for this.
    // A potential endpoint might be 'https://api.infinitepay.io/v2/pix' or similar.
    // For now, we use the checkout link creation API and log a warning.
    console.warn("Using redirect-based checkout API. For a true transparent QR code, a different InfinitePay endpoint is needed.");

    const payload = {
      handle: "thebaldi", // Your InfiniteTag
      webhook_url: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/infinitePayWebhook`,
      redirect_url: "https://www.santasensacao.me", // Not used in transparent flow, but might be required
      order_nsu: orderId,
      customer: {
        name: orderData.customer.name,
        phone_number: orderData.customer.phone.replace(/\D/g, ""), // Digits only
      },
      items: orderData.items.map((item) => ({
        quantity: item.quantity,
        price: toCents(item.price),
        description: `${item.name} (${item.size})`,
      })),
    };
    
    // This is the API call to InfinitePay.
    const response = await axios.post("https://api.infinitepay.io/invoices/public/checkout/links", payload, {
      headers: {
        "Content-Type": "application/json",
        // NOTE: The public checkout link API might not require an API key.
        // If you get a specific transparent PIX API, it will likely require an Authorization header:
        // "Authorization": `Bearer ${infinitePayApiKey}`
      },
    });

    // --- MOCK RESPONSE FOR TRANSPARENT CHECKOUT ---
    // Since the API call above returns a redirect URL, we cannot get QR code data from it.
    // We will simulate the data that a true transparent PIX API would return.
    // **ACTION REQUIRED:** Replace this mock with the actual data from the correct InfinitePay API response.
    const pixData = {
      qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=PIX_DATA_PLACEHOLDER", // Placeholder QR Code
      copyPaste: "00020126360014br.gov.bcb.pix0114+55279965003415204000053039865802BR5913SANTA SENSACAO6009SAO PAULO62070503***6304E7C6", // Placeholder Copy/Paste
      chargeId: response.data.slug || orderId, // Use the slug from the response if available
    };

    // Store the charge ID back to the order for reconciliation
    await orderRef.update({pixChargeId: pixData.chargeId});

    return pixData;
  } catch (error) {
    console.error("Error creating InfinitePay charge:", error.response ? error.response.data : error.message);
    throw new functions.https.HttpsError("internal", "Falha ao comunicar com o gateway de pagamento.");
  }
});


// Webhook receiver for InfinitePay payment confirmations
exports.infinitePayWebhook = functions.https.onRequest(async (req, res) => {
  // Use CORS to allow requests from any origin (as required by some webhook providers)
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const {order_nsu, transaction_nsu, capture_method, status} = req.body;
    console.log("Webhook received:", req.body);

    // The provided documentation is ambiguous on the success payload.
    // We check for a `status` field that might indicate success, or fallback to checking `capture_method`.
    // Adjust this logic based on actual webhook payloads from InfinitePay.
    const isPaid = status === "paid" || (!!transaction_nsu && !!capture_method);


    if (!order_nsu) {
      console.error("Webhook payload missing 'order_nsu'.");
      res.status(400).json({success: false, message: "Missing order_nsu"});
      return;
    }

    if (isPaid) {
      try {
        const orderRef = db.collection("orders").doc(order_nsu);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          // Update payment status to 'paid'
          await orderRef.update({
            paymentStatus: "paid",
          });
          console.log(`Order ${order_nsu} marked as paid.`);
          res.status(200).json({success: true, message: "Order updated"});
        } else {
          console.error(`Order ${order_nsu} not found for webhook.`);
          res.status(404).json({success: false, message: "Order not found"});
        }
      } catch (error) {
        console.error("Error updating order from webhook:", error);
        res.status(500).json({success: false, message: "Internal server error"});
      }
    } else {
      console.log(`Webhook for order ${order_nsu} received, but payment not confirmed.`);
      res.status(200).json({success: true, message: "Webhook received, no action taken."});
    }
  });
});
