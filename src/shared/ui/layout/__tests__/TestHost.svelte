<!--
  TestHost - Test wrapper for mounting layout components with children/snippets
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
