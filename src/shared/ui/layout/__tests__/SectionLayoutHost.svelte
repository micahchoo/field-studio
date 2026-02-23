<!--
  Test wrapper for SectionLayout (uses body: Snippet, title: Snippet)
  Always renders body, conditionally renders title
-->
<script lang="ts">
  import SectionLayout from '../composites/SectionLayout.svelte';

  interface Props {
    showTitle?: boolean;
    bodyGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }

  let { showTitle = false, bodyGap, class: className }: Props = $props();
</script>

{#if showTitle}
  <SectionLayout {bodyGap} class={className}>
    {#snippet body()}<p>Section Body</p>{/snippet}
    {#snippet title()}<h3>Section Title</h3>{/snippet}
  </SectionLayout>
{:else}
  <SectionLayout {bodyGap} class={className}>
    {#snippet body()}<p>Section Body</p>{/snippet}
  </SectionLayout>
{/if}
