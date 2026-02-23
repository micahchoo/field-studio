<!--
  AutoMapButton — Button that triggers automatic column mapping detection.
  React source: src/features/metadata-edit/ui/atoms/AutoMapButton.tsx (62 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    onclick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    label?: string;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    onclick,
    isLoading = false,
    disabled = false,
    label = 'Auto-Detect Mappings',
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

<Button
  {onclick}
  disabled={disabled || isLoading}
  variant="secondary"
  size="sm"
>
  {#snippet icon()}
    {#if isLoading}
      <span class="animate-spin inline-flex">
        <Icon name="refresh" />
      </span>
    {:else}
      <Icon name="auto_fix_high" />
    {/if}
  {/snippet}
  {isLoading ? 'Detecting...' : label}
</Button>
