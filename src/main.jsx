import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './lib/toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './styles/index.css';

// ── Global unhandled promise rejection handler ───────────────
window.addEventListener('unhandledrejection', (event) => {
  // Importación dinámica para no bloquear el arranque
  import('./lib/logger.js').then(({ logger }) => {
    logger.error('Unhandled promise rejection', event.reason);
  });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
