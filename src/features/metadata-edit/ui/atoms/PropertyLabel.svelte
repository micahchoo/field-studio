<!--
  PropertyLabel — Label with optional Dublin Core hint badge and ValidationDot.
  React source: src/features/metadata-edit/ui/atoms/PropertyLabel.tsx (71 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export interface ValidationState {
    status: 'pristine' | 'invalid';
    message?: string;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ValidationDot from './ValidationDot.svelte';

  interface Props {
    label: string;
    dcHint?: string;
    fieldMode?: boolean;
    cx?: Partial<ContextualClassNames>;
    class?: string;
    showHint?: boolean;
    validation?: ValidationState;
  }

  let {
    label,
    dcHint,
    fieldMode = false,
    cx = {},
    class: className = '',
    showHint = true,
    validation,
  }: Props = $props();

  let labelClasses = $derived(
    cn(
      'block text-xs font-bold',
      fieldMode ? 'text-nb-black/30' : cx.label ?? 'text-nb-black/80',
      className
    )
  );

  let hintClasses = $derived(
    cn(
      'text-[9px] font-mono px-1',
      fieldMode
        ? 'bg-nb-black text-nb-black/50'
        : 'bg-nb-white text-nb-black/40'
    )
  );
</script>

<div class="flex justify-between items-center">
  <span class={cn('flex items-center gap-1', labelClasses)}>
    {label}
    {#if validation}
      <ValidationDot status={validation.status} message={validation.message} />
    {/if}
  </span>
  {#if showHint && dcHint}
    <span class={hintClasses} title="Dublin Core Mapping">
      {dcHint}
    </span>
  {/if}
</div>
