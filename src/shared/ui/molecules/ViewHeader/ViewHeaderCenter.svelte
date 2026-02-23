<script lang="ts">
  interface Props {
    isMobile?: boolean;
    children?: import('svelte').Snippet;
  }

  let { isMobile = false, children }: Props = $props();
</script>

{#if !isMobile}
  <div class="flex items-center gap-3">
    {#if children}{@render children()}{/if}
  </div>
{/if}
