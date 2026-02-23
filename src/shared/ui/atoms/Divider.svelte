<!--
  Divider - Neobrutalist thick horizontal/vertical rule

  ORIGINAL: src/shared/ui/atoms/Divider.tsx (21 lines)
  Uses style directive for thickness to avoid Tailwind JIT scanning issues.
  Theme-aware via cx prop — derives color from cx.separator token.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    thickness?: 2 | 4;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let { direction = 'horizontal', thickness = 2, cx, class: className = '' }: Props = $props();

  let bg = $derived(cx?.separator ?? 'bg-nb-black');
</script>

{#if direction === 'vertical'}
  <div class="self-stretch {bg} {className}" style:width="{thickness}px"></div>
{:else}
  <div class="w-full {bg} {className}" style:height="{thickness}px"></div>
{/if}
