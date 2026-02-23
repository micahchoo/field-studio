<!--
  CopyableSection — Wrapper adding copy-to-markdown functionality
  React source: ui/CopyableSection.tsx (54 lines)
  Architecture: Atom (minimal state — copied boolean)
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    title: string;
    getMarkdown: () => string;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    getMarkdown,
    class: className = '',
    children,
  }: Props = $props();

  let copied = $state(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {
      // Clipboard API may not be available
    }
  }
</script>

<section class={cn('relative group', className)}>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-nb-black/70 flex items-center gap-2">
      {title}
    </h2>
    <button
      type="button"
      onclick={handleCopy}
      class={cn(
        'px-3 py-1 text-xs font-mono border transition-nb',
        copied
          ? 'bg-nb-green/20 border-nb-green/30 text-nb-green'
          : 'bg-nb-cream border-nb-black/20 text-nb-black/50 hover:text-nb-black hover:bg-nb-cream/80'
      )}
    >
      {copied ? '✓ Copied!' : '⧉ Copy'}
    </button>
  </div>
  {@render children()}
</section>
