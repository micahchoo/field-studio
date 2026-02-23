<!--
  Test wrapper for PanelLayout (uses body: Snippet, not children)
-->
<script lang="ts">
  import PanelLayout from '../composites/PanelLayout.svelte';

  interface Props {
    showHeader?: boolean;
    showFooter?: boolean;
    class?: string;
    bodyScroll?: boolean;
    bodyClass?: string;
  }

  let { showHeader = false, showFooter = false, class: className, bodyScroll, bodyClass }: Props = $props();
</script>

<PanelLayout {bodyScroll} {bodyClass} class={className}>
  {#snippet body()}<p>Body Content</p>{/snippet}
  {#if showHeader}{#snippet header()}<p>Header Content</p>{/snippet}{/if}
  {#if showFooter}{#snippet footer()}<p>Footer Content</p>{/snippet}{/if}
</PanelLayout>
