<!--
  Tag - Neobrutalist label pill for types/status

  ORIGINAL: src/shared/ui/atoms/Tag.tsx (46 lines)
  Chunky bordered label with UPPERCASE monospace text.
  Theme-aware via cx prop — border color adapts to any theme.
  Semantic content colors (bg) are theme-independent.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { TagColor } from './types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    children: Snippet;
    color?: TagColor;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let { children, color = 'black', cx, class: className = '' }: Props = $props();

  /** Semantic content colors — same in all themes */
  const colorMap: Record<TagColor, { bg: string; text: string }> = {
    blue:   { bg: 'bg-nb-blue',   text: 'text-nb-white' },
    red:    { bg: 'bg-nb-red',    text: 'text-nb-white' },
    yellow: { bg: 'bg-nb-yellow', text: 'text-nb-black' },
    green:  { bg: 'bg-nb-green',  text: 'text-nb-black' },
    pink:   { bg: 'bg-nb-pink',   text: 'text-nb-black' },
    orange: { bg: 'bg-nb-orange', text: 'text-nb-black' },
    purple: { bg: 'bg-nb-purple', text: 'text-nb-white' },
    black:  { bg: 'bg-nb-black',  text: 'text-nb-white' },
  };

  /** Border adapts to theme via cx token */
  let borderClass = $derived(cx?.border ?? 'border-nb-black');
  let colors = $derived(colorMap[color]);
</script>

<span class="inline-flex items-center px-2 py-0.5 border-2 font-mono text-[10px] font-bold uppercase tracking-wider {colors.bg} {colors.text} {borderClass} {className}">
  {@render children()}
</span>
