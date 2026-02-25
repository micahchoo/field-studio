/* eslint-disable @typescript-eslint/no-explicit-any -- TYPE_DEBT: framework shim requires any for generic component typing */
declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<any, any>;
  export default component;
}
