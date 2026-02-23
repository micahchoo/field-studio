<!--
  ValidationSummary -- Prominent validation feedback with error/warning counts and fix actions.
  React source: src/features/metadata-edit/ui/molecules/ValidationSummary.tsx (179 lines)
  Architecture: Molecule (composes Icon atom + ActionButton molecule, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  import type { ValidationIssue } from '../../lib/inspectorValidation';

  export type { ValidationIssue };

  type SummaryStatus = 'error' | 'warning' | 'info' | 'success';

  interface StatusStyle {
    bg: string;
    border: string;
    icon: string;
    iconColor: string;
    text: string;
  }

  const STATUS_STYLES: Record<'normal' | 'field', Record<SummaryStatus, StatusStyle>> = {
    normal: {
      error:   { bg: 'bg-nb-red/10',   border: 'border-nb-red/30',   icon: 'error',        iconColor: 'text-nb-red',    text: 'text-nb-red' },
      warning: { bg: 'bg-nb-orange/10', border: 'border-nb-orange/20', icon: 'warning',     iconColor: 'text-nb-orange', text: 'text-nb-orange' },
      info:    { bg: 'bg-nb-blue/10',   border: 'border-nb-blue/30',  icon: 'info',         iconColor: 'text-nb-blue',   text: 'text-nb-blue' },
      success: { bg: 'bg-nb-green/10',  border: 'border-nb-green/30', icon: 'check_circle', iconColor: 'text-nb-green',  text: 'text-nb-green' },
    },
    field: {
      error:   { bg: 'bg-red-950/50',   border: 'border-nb-red',   icon: 'error',        iconColor: 'text-nb-red',    text: 'text-nb-red/40' },
      warning: { bg: 'bg-nb-orange/10',  border: 'border-nb-orange', icon: 'warning',     iconColor: 'text-nb-orange', text: 'text-nb-orange/40' },
      info:    { bg: 'bg-blue-950/50',   border: 'border-nb-blue',  icon: 'info',         iconColor: 'text-nb-blue',   text: 'text-nb-blue/40' },
      success: { bg: 'bg-green-950/50',  border: 'border-nb-green', icon: 'check_circle', iconColor: 'text-nb-green',  text: 'text-nb-green/40' },
    },
  };
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ActionButton from '@/src/shared/ui/molecules/ActionButton.svelte';

  interface Props {
    issues: ValidationIssue[];
    errorCount: number;
    warningCount: number;
    infoCount: number;
    autoFixableCount: number;
    onFixAll: () => void;
    onViewDetails: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    issues,
    errorCount,
    warningCount,
    infoCount,
    autoFixableCount,
    onFixAll,
    onViewDetails,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let status = $derived<SummaryStatus>(
    errorCount > 0 ? 'error' :
    warningCount > 0 ? 'warning' :
    infoCount > 0 ? 'info' :
    'success'
  );

  let styles = $derived(STATUS_STYLES[fieldMode ? 'field' : 'normal'][status]);
</script>

{#if issues.length === 0}
  <!-- Empty state: all validations passed -->
  <div class={cn('p-3 border flex items-center gap-3', styles.bg, styles.border)}>
    <Icon name={styles.icon} class={cn('text-xl', styles.iconColor)} />
    <span class={cn('text-sm font-medium', styles.text)}>
      All validations passed
    </span>
  </div>
{:else}
  <!-- Issues present -->
  <div
    class={cn('p-3 border', styles.bg, styles.border)}
    role="alert"
    aria-live="polite"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <Icon name={styles.icon} class={cn('text-xl shrink-0', styles.iconColor)} />
        <div>
          <div class={cn('text-sm font-medium', styles.text)}>
            {#if errorCount > 0}
              {errorCount} error{errorCount !== 1 ? 's' : ''},
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            {:else if warningCount > 0}
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            {:else}
              {infoCount} suggestion{infoCount !== 1 ? 's' : ''}
            {/if}
          </div>
          {#if autoFixableCount > 0}
            <div class={cn('text-xs mt-0.5 opacity-75', styles.text)}>
              {autoFixableCount} can be auto-fixed
            </div>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if autoFixableCount > 0}
          <ActionButton
            onclick={onFixAll}
            label={`Fix All (${autoFixableCount})`}
            icon="auto_fix"
            cx={cx as ContextualClassNames}
          />
        {/if}
        <ActionButton
          onclick={onViewDetails}
          label="Details"
          icon="visibility"
          cx={cx as ContextualClassNames}
        />
      </div>
    </div>
  </div>
{/if}
