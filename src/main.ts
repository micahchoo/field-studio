import { mount } from 'svelte';
import App from './app/ui/App.svelte';
import './app.css';

// Register service worker for asset serving (/image/* and /media/* routes)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW unavailable (non-HTTPS, private browsing) — assets served via blob URLs only
    });
  });
}

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
