<!--
  ValidationTabPanel -- Tab panel showing detailed validation issues with fix actions.
  React source: src/features/metadata-edit/ui/molecules/ValidationTabPanel.tsx (195 lines)
  Architecture: Molecule (composes EmptyState molecule + ValidationFixAction atom, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ValidationIssue } from '../../lib/inspectorValidation';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';
  import ValidationFixAction from '../atoms/ValidationFixAction.svelte';

  interface Props {
    issues: ValidationIssue[];
    onFixIssue: (issue: ValidationIssue) => void;
    onFixAll: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    issues,
    onFixIssue,
    onFixAll,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };

  let sortedIssues = $derived(
    [...issues].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
  );

  let groupedIssues = $derived({
    errors:   sortedIssues.filter(i => i.severity === 'error'),
    warnings: sortedIssues.filter(i => i.severity === 'warning'),
    infos:    sortedIssues.filter(i => i.severity === 'info'),
  });

  let autoFixableCount = $derived(issues.filter(i => i.autoFixable).length);
</script>

{#if issues.length === 0}
  <EmptyState
    icon="check_circle"
    title="All validations passed!"
    description="No issues found with this resource."
    cx={cx as ContextualClassNames}
  />
{:else}
  <div class="space-y-4">
    <!-- Fix All header bar -->
    {#if autoFixableCount > 0}
      <div class={cn(
        'flex items-center justify-between p-3',
        fieldMode ? 'bg-nb-black' : 'bg-nb-white'
      )}>
        <span class={cn('text-sm', fieldMode ? 'text-nb-black/30' : 'text-nb-black/60')}>
          {autoFixableCount} issue{autoFixableCount !== 1 ? 's' : ''} can be auto-fixed
        </span>
        <Button
          variant="ghost"
          size="bare"
          onclick={onFixAll}
          class={cn(
            'px-3 py-1.5 text-sm font-medium flex items-center gap-1.5',
            fieldMode
              ? 'bg-nb-blue/50 text-nb-blue/60 hover:bg-nb-blue/70'
              : 'bg-nb-blue/20 text-nb-blue hover:bg-nb-blue/30'
          )}
        >
          {#snippet children()}
            <Icon name="auto_fix" class="text-sm" />
            Fix All
          {/snippet}
        </Button>
      </div>
    {/if}

    <!-- Errors section -->
    {#if groupedIssues.errors.length > 0}
      <section>
        <h3 class="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-nb-red">
          <Icon name="error" class="text-sm" />
          Errors ({groupedIssues.errors.length})
        </h3>
        <div class="space-y-2">
          {#each groupedIssues.errors as issue (issue.id)}
            <ValidationFixAction {issue} onFix={onFixIssue} cx={cx} {fieldMode} />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Warnings section -->
    {#if groupedIssues.warnings.length > 0}
      <section>
        <h3 class="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-nb-orange">
          <Icon name="warning" class="text-sm" />
          Warnings ({groupedIssues.warnings.length})
        </h3>
        <div class="space-y-2">
          {#each groupedIssues.warnings as issue (issue.id)}
            <ValidationFixAction {issue} onFix={onFixIssue} cx={cx} {fieldMode} />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Suggestions section -->
    {#if groupedIssues.infos.length > 0}
      <section>
        <h3 class="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-nb-blue">
          <Icon name="info" class="text-sm" />
          Suggestions ({groupedIssues.infos.length})
        </h3>
        <div class="space-y-2">
          {#each groupedIssues.infos as issue (issue.id)}
            <ValidationFixAction {issue} onFix={onFixIssue} cx={cx} {fieldMode} />
          {/each}
        </div>
      </section>
    {/if}
  </div>
{/if}
