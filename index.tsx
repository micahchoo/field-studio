
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { searchService } from './services/searchService';
import { IIIF_SPEC } from './constants';

// Global Error Handlers for debugging startup issues
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Global Error]', message, source, lineno, colno, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #7f1d1d; background: #fef2f2; border: 1px solid #fecaca; margin: 20px; font-family: sans-serif; border-radius: 8px;">
        <h2 style="margin-top:0">Startup Error</h2>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="background: #fff; padding: 10px; overflow: auto; font-size: 11px;">${error?.stack || 'No stack trace'}</pre>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload</button>
      </div>
    `;
  }
  return false;
};

window.addEventListener('unhandledrejection', event => {
  console.error('[Unhandled Rejection]', event.reason);
});

console.log("[Index] Starting application bootstrap...");

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SEARCH_QUERY') {
      const { query, url } = event.data;
      const results = searchService.search(query);
      
      const iiifResponse = {
        "@context": IIIF_SPEC.SEARCH_2.CONTEXT,
        "id": url,
        "type": "AnnotationPage",
        "items": results.map(res => ({
          "id": `${res.id}/annotation/${crypto.randomUUID()}`,
          "type": "Annotation",
          "motivation": "supplementing",
          "body": {
            "type": "TextualBody",
            "value": res.match,
            "format": "text/plain"
          },
          "target": res.id
        }))
      };

      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(iiifResponse);
      }
    }
  });

  window.addEventListener('load', () => {
    // Simplified registration to avoid URL constructor issues in specific security contexts
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('[SW] Registered successfully with scope:', registration.scope);
      })
      .catch(registrationError => {
        console.warn('[SW] Registration failed:', registrationError);
      });
  });
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error("[Index] Fatal error during mount:", e);
}
