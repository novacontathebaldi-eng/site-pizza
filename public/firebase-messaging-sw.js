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

// Handler for background messages.
// This is triggered when a push notification is received and the page is not in the foreground.
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  if (!payload.notification) {
    return;
  }

  // Customize the notification here
  const notificationTitle = payload.notification.title || 'Novo Pedido!';
  const notificationOptions = {
    body: payload.notification.body || 'Você tem um novo pedido pendente.',
    icon: '/assets/logo para icones.png', // Path to your notification icon
    data: {
        url: payload.data?.url || '/#admin' // The URL to open on click
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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
        if (client.url === '/' && 'focus' in client) {
          // If a window is already open, focus it and navigate.
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
