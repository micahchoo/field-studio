<!--
  MetadataTab — Tab button for metadata panel sections.
  React source: src/features/metadata-edit/ui/atoms/MetadataTab.tsx (74 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Props {
    active: boolean;
    onclick: () => void;
    label: string;
    cx: Partial<ContextualClassNames>;
    fieldMode: boolean;
    class?: string;
  }

  let {
    active,
    onclick,
    label,
    cx,
    fieldMode,
    class: className = '',
  }: Props = $props();

  let tabClass = $derived(
    cn(
      'flex-1 py-3 text-[10px] font-bold uppercase tracking-wider',
      active
        ? cn(cx.accent ?? 'text-nb-blue', 'border-b-2 border-current')
        : fieldMode
          ? 'text-nb-yellow/50 hover:text-nb-yellow/70'
          : 'text-nb-black/50 hover:text-nb-black',
      className
    )
  );
</script>

<Button
  {onclick}
  variant={active ? 'primary' : 'ghost'}
  size="sm"
  fullWidth
  class={tabClass}
>
  {label}
</Button>
