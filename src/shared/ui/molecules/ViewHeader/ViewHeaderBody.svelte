<script lang="ts">
  interface Props {
    maxWidth?: string;
    children?: import('svelte').Snippet;
  }

  let { maxWidth, children }: Props = $props();
</script>

<div class={maxWidth ?? 'w-full'}>
  {#if children}{@render children()}{/if}
</div>
