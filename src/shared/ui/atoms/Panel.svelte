<!--
  Panel - Neobrutalist bordered container with optional header bar

  ORIGINAL: src/shared/ui/atoms/Panel.tsx (32 lines)
  Theme-aware via cx prop (ContextualClassNames).
  Falls back to light theme defaults when cx not provided.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    children: Snippet;
    header?: Snippet;
    class?: string;
    borderWidth?: 2 | 4;
    cx?: Partial<ContextualClassNames>;
  }

  let { children, header, class: className = '', borderWidth = 2, cx }: Props = $props();

  // Static class strings — Tailwind JIT must see full class names
  let surfaceClass = $derived(
    cx?.surface ?? (borderWidth === 4
      ? 'bg-nb-white border-4 border-nb-black'
      : 'bg-nb-white border-2 border-nb-black')
  );
  let headerBg = $derived(cx?.headerBg ?? 'bg-nb-cream');
  let border = $derived(cx?.border ?? 'border-nb-black');
  let headerBorder = $derived(borderWidth === 4 ? 'border-b-4' : 'border-b-2');
</script>

<div class="{surfaceClass} {className}">
  {#if header}
    <div class="px-4 py-2 {headerBg} {headerBorder} {border} font-mono text-xs font-bold uppercase tracking-wider">
      {@render header()}
    </div>
  {/if}
  {@render children()}
</div>
