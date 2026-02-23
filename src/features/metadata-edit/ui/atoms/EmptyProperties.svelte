<!--
  EmptyProperties — Empty state with icon and message when no resource is selected.
  React source: src/features/metadata-edit/ui/atoms/EmptyProperties.tsx (50 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    icon?: string;
    message?: string;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    icon = 'info',
    message = 'Select an item to view properties',
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let containerClasses = $derived(
    cn(
      'w-80 border-l flex flex-col items-center justify-center',
      fieldMode
        ? 'bg-nb-black border-nb-black text-nb-black/50'
        : cx.surface ?? 'bg-nb-white border-nb-black/20 text-nb-black/40'
    )
  );
</script>

<div class={containerClasses}>
  <Icon name={icon} class="text-4xl mb-2" />
  <p class="text-sm text-center">{message}</p>
</div>
