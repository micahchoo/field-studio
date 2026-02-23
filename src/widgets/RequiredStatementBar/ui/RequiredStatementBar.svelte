<!--
  RequiredStatementBar.svelte -- IIIF requiredStatement display bar
  =================================================================
  React source: src/widgets/RequiredStatementBar/ui/RequiredStatementBar.tsx (66 lines)

  Architecture:
    - Widget layer: pure presentational, no business logic
    - IIIF Presentation 3.0 spec: clients MUST display requiredStatement
    - Non-dismissible info bar: label + value in a single row
    - Receives cx theme tokens from parent template
    - Zero state, zero effects -- purely derived from props

  Props:
    requiredStatement? -- IIIF requiredStatement object { label, value }
    cx?               -- ContextualClassNames for theming
    fieldMode?        -- Yellow/black field mode toggle
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    requiredStatement?: {
      label: Record<string, string[]>;
      value: Record<string, string[]>;
    };
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    requiredStatement,
    cx,
    fieldMode = false,
  }: Props = $props();

  // Derived: extract label and value text for the current language
  const label = $derived(requiredStatement ? getIIIFValue(requiredStatement.label) : '');
  const value = $derived(requiredStatement ? getIIIFValue(requiredStatement.value) : '');

  // Derived: theme-aware classes
  const bgClass = $derived(
    fieldMode
      ? 'bg-yellow-900/20 border-yellow-700/40'
      : cx?.surface || 'bg-amber-50 border-amber-200'
  );
  const textClass = $derived(
    fieldMode
      ? 'text-yellow-200/80'
      : cx?.text || 'text-amber-800'
  );
  const iconClass = $derived(
    fieldMode
      ? 'text-yellow-400/70'
      : cx?.accent || 'text-amber-600'
  );
</script>

{#if requiredStatement && value}
  <div
    class={cn('flex items-center gap-2 px-4 py-1.5 border-b text-xs', bgClass)}
    role="status"
    aria-label="Required statement"
  >
    <Icon name="info" class={cn('text-sm flex-shrink-0', iconClass)} />
    <span class={textClass}>
      {#if label}
        <span class="font-medium">{label}:&nbsp;</span>
      {/if}
      <span>{value}</span>
    </span>
  </div>
{/if}
