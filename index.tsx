
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GlowProvider } from './contexts/GlowContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlowProvider>
      <App />
    </GlowProvider>
  </React.StrictMode>
);
