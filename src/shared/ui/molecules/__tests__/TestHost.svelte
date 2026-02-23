<!--
  TestHost - Test wrapper for mounting molecules with children/snippets

  Used by vitest tests to render Svelte components that expect
  children (Snippet) props. Uses Svelte 5 dynamic component syntax.
-->
<script lang="ts">
  import type { Component } from 'svelte';

  interface Props {
    component: Component<any>;
    componentProps?: Record<string, any>;
    text?: string;
  }

  let { component: C, componentProps = {}, text = '' }: Props = $props();
</script>

{#if text}
  <C {...componentProps}>
    {text}
  </C>
{:else}
  <C {...componentProps} />
{/if}
