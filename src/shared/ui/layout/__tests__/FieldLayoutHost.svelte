<!--
  Test wrapper for FieldLayout (uses control: Snippet, label: Snippet, hint: Snippet)
  Uses conditional rendering to provide optional snippets
-->
<script lang="ts">
  import FieldLayout from '../composites/FieldLayout.svelte';

  interface Props {
    showLabel?: boolean;
    showHint?: boolean;
    class?: string;
  }

  let { showLabel = false, showHint = false, class: className }: Props = $props();
</script>

{#if showLabel && showHint}
  <FieldLayout class={className}>
    {#snippet control()}<input type="text" placeholder="test" />{/snippet}
    {#snippet label()}<label>Field Label</label>{/snippet}
    {#snippet hint()}<span>Hint text</span>{/snippet}
  </FieldLayout>
{:else if showLabel}
  <FieldLayout class={className}>
    {#snippet control()}<input type="text" placeholder="test" />{/snippet}
    {#snippet label()}<label>Field Label</label>{/snippet}
  </FieldLayout>
{:else if showHint}
  <FieldLayout class={className}>
    {#snippet control()}<input type="text" placeholder="test" />{/snippet}
    {#snippet hint()}<span>Hint text</span>{/snippet}
  </FieldLayout>
{:else}
  <FieldLayout class={className}>
    {#snippet control()}<input type="text" placeholder="test" />{/snippet}
  </FieldLayout>
{/if}
