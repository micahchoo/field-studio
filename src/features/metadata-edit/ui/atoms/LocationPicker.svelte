<!--
  LocationPicker — Button trigger for GPS coordinate picker.
  React source: src/features/metadata-edit/ui/atoms/LocationPicker.tsx (60 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    onclick: () => void;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
    title?: string;
  }

  let {
    onclick,
    disabled = false,
    cx = {},
    fieldMode = false,
    class: className = '',
    title = 'Pick Location on Map',
  }: Props = $props();

  let buttonClass = $derived(
    cn(
      'bg-nb-green/20 hover:bg-nb-green/30 text-nb-green p-1.5 border border-nb-green/30 transition-nb flex-shrink-0',
      fieldMode && 'bg-nb-green/30 text-nb-green border-nb-green',
      className
    )
  );
</script>

<Button
  variant="ghost"
  size="sm"
  {onclick}
  {disabled}
  class={buttonClass}
  {title}
  aria-label={title}
>
  {#snippet icon()}
    <Icon name="location_on" class="text-sm" />
  {/snippet}
</Button>
