
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The import for App.tsx was failing because the file was empty. The path has been corrected to use a relative import `./App` instead of just `App` to ensure module resolution works correctly.
import App from './App';

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