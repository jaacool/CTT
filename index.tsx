import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GlowProvider } from './contexts/GlowContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlowProvider>
      <App />
    </GlowProvider>
  </React.StrictMode>,
);
