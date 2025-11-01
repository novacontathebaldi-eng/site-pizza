


import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Explicitly added the .tsx extension to the App import to resolve a module resolution error.
import App from './App.tsx';
import './index.css';

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