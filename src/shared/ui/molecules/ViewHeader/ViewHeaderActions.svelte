<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex items-center gap-3">
  {#if children}{@render children()}{/if}
</div>
