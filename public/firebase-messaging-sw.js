// Import the Firebase app and messaging modules.
// IMPORTANT: Use the same version as your main app to avoid conflicts.
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Add an install event listener for debugging purposes.
// This will confirm in the browser console that the service worker is being installed.
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing.');
});

// Handler for background messages.
// This is triggered when a push notification is received and the page is not in the foreground.
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const data = payload.data;

  // Handler for the silent "dismiss" message
  if (data && data.type === 'DISMISS_NOTIFICATION') {
    const orderIdToDismiss = data.orderId;
    if (orderIdToDismiss) {
      console.log(`[firebase-messaging-sw.js] Attempting to dismiss notification with tag: ${orderIdToDismiss}`);
      // Find all notifications with the matching tag (orderId) and close them.
      self.registration.getNotifications({ tag: orderIdToDismiss }).then((notifications) => {
        if (notifications.length > 0) {
          console.log(`[firebase-messaging-sw.js] Found ${notifications.length} notification(s) to close.`);
          notifications.forEach((notification) => notification.close());
        } else {
          console.log(`[firebase-messaging-sw.js] No notification found with tag: ${orderIdToDismiss}`);
        }
      });
    }
    return; // Stop processing since this was a silent message
  }

  // Handler for a new order notification from a data-only payload
  if (data && data.type === 'NEW_ORDER') {
    const notificationTitle = data.title || 'Novo Pedido!';
    const notificationOptions = {
      body: data.body || 'Você tem um novo pedido pendente.',
      icon: data.icon || '/assets/logo para icones.png',
      tag: data.orderId, // Use the orderId as a unique tag
      data: {
          url: data.url || '/#admin' // The URL to open on click
      }
    };

    // Use the Service Worker's registration to show the notification.
    // This is the most reliable way to display a notification from the background.
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// Event listener for when the user clicks on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');

  event.notification.close();

  const urlToOpen = event.notification.data.url || '/#admin';

  event.waitUntil(
    clients.matchAll({
      type: "window",
    }).then((clientList) => {
      // Check if a window is already open.
      for (const client of clientList) {
        // Attempt to focus and navigate an existing window.
        // The URL check is relaxed to '/' to find the app even if it's on a different page.
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});