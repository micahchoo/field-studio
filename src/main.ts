import { mount } from 'svelte';
import App from './app/ui/App.svelte';

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
