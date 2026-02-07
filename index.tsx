
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './src/app/App';
import { ErrorBoundary } from '@/src/shared/ui/molecules/ErrorBoundary';
import { searchService } from '@/src/shared/services/searchService';
import { storage } from '@/src/shared/services/storage';
import { FEATURE_FLAGS, IIIF_SPEC } from '@/src/shared/constants';
import { initializeI18n } from './i18n';

// Initialize i18n if feature flag is enabled
if (FEATURE_FLAGS.USE_I18N) {
  initializeI18n();
}

// Global Error Handlers for debugging startup issues
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Global Error]', message, source, lineno, colno, error);
  const root = document.getElementById('root');
  if (root) {
    // Sanitize error values to prevent XSS
    const sanitizeError = (str: unknown): string => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#x27;');
    };
    
    root.innerHTML = `
      <div style="padding: 20px; color: #7f1d1d; background: #fef2f2; border: 1px solid #fecaca; margin: 20px; font-family: sans-serif; border-radius: 8px;">
        <h2 style="margin-top:0">Startup Error</h2>
        <p><strong>Message:</strong> ${sanitizeError(message)}</p>
        <p><strong>Source:</strong> ${sanitizeError(source)}:${sanitizeError(lineno)}:${sanitizeError(colno)}</p>
        <pre style="background: #fff; padding: 10px; overflow: auto; font-size: 11px;">${sanitizeError(error?.stack) || 'No stack trace'}</pre>
        <button id="reload-btn" style="padding: 8px 16px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload</button>
      </div>
    `;
    // Add event listener instead of inline onclick for CSP and XSS safety
    const reloadBtn = document.getElementById('reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => window.location.reload());
    }
  }
  return false;
};

window.addEventListener('unhandledrejection', event => {
  console.error('[Unhandled Rejection]', event.reason);
});

console.log("[Index] Starting application bootstrap...");

// Service Worker Registration - done early to ensure IIIF requests are intercepted
const swReadyPromise = (async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return false;
  }

  // Set up message handler for SW communication
  navigator.serviceWorker.addEventListener('message', async (event) => {
    // Handle search queries from service worker
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
      return;
    }

    // Handle tile requests from service worker
    if (event.data && event.data.type === 'TILE_REQUEST') {
      const { requestId, assetId, level, x, y, format } = event.data;

      try {
        const blob = await storage.tiles.getTile(assetId, level, x, y);

        if (blob) {
          // Convert blob to array buffer for transfer
          const arrayBuffer = await blob.arrayBuffer();

          // Send response back to service worker
          navigator.serviceWorker.controller?.postMessage({
            type: 'TILE_RESPONSE',
            requestId,
            blob: arrayBuffer,
            contentType: format === 'png' ? 'image/png' : 'image/jpeg'
          }, [arrayBuffer]);
        } else {
          // Tile not found
          navigator.serviceWorker.controller?.postMessage({
            type: 'TILE_RESPONSE',
            requestId,
            blob: null
          });
        }
      } catch (error) {
        console.error('[Main] Error fetching tile:', error);
        navigator.serviceWorker.controller?.postMessage({
          type: 'TILE_RESPONSE',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      return;
    }

    // Handle tile manifest requests from service worker
    if (event.data && event.data.type === 'TILE_MANIFEST_REQUEST') {
      const { requestId, assetId } = event.data;

      try {
        const manifest = await storage.tiles.getTileManifest(assetId);

        navigator.serviceWorker.controller?.postMessage({
          type: 'TILE_MANIFEST_RESPONSE',
          requestId,
          manifest: manifest || null
        });
      } catch (error) {
        console.error('[Main] Error fetching tile manifest:', error);
        navigator.serviceWorker.controller?.postMessage({
          type: 'TILE_MANIFEST_RESPONSE',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      return;
    }
  });

  try {
    // Register SW immediately, don't wait for window.load
    const registration = await navigator.serviceWorker.register('sw.js');
    console.log('[SW] Registered successfully with scope:', registration.scope);

    // Wait for the SW to be active and controlling the page
    if (navigator.serviceWorker.controller) {
      console.log('[SW] Already controlling page');
      return true;
    }

    // Wait for the SW to become active
    const sw = registration.installing || registration.waiting || registration.active;
    if (sw) {
      await new Promise<void>((resolve) => {
        if (sw.state === 'activated') {
          resolve();
          return;
        }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') {
            resolve();
          }
        });
      });

      // Force the new SW to take control immediately
      if (registration.active) {
        await registration.active.postMessage({ type: 'SKIP_WAITING' });
      }

      // Wait a brief moment for the controller to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[SW] Activated and controlling:', !!navigator.serviceWorker.controller);
    }

    return true;
  } catch (registrationError) {
    console.warn('[SW] Registration failed:', registrationError);
    return false;
  }
})();

// Export for use in other modules that need to wait for SW
(window as any).__swReady = swReadyPromise;

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
