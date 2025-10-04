// Scripts for firebase and messaging
// IMPORTANT: These versions must match the ones used in your project if you update them.
self.importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration from firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/assets/logo para icones.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
