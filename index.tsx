import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registra o Service Worker para o Firebase Cloud Messaging
if ('serviceWorker' in navigator) {
  // FIX: Adicionado { type: 'module' } para registrar corretamente o service worker
  // que usa a sintaxe de módulo ES 'import'.
  navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'module' })
    .then((registration) => {
      console.log('Firebase Messaging Service Worker registrado com sucesso:', registration);
    }).catch((error) => {
      console.error('Erro ao registrar o Firebase Messaging Service Worker:', error);
    });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);