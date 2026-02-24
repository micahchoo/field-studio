<!--
  ValidationIssuesBar -- Displays validation issues with fix buttons.
  Extracted from MetadataFieldsPanel molecule.
  Architecture: Atom (composes Button + Icon)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ValidationIssue } from '../../lib/inspectorValidation';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    issues: ValidationIssue[];
    onFixAll: () => void;
    onFixIssue: (issueId: string) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    issues,
    onFixAll,
    onFixIssue,
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

{#if issues.length > 0}
  <div class={cn('p-3 border text-[10px] space-y-2', cx.warningBg)}>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 font-bold uppercase tracking-wider text-nb-orange">
        <Icon name="report_problem" class="text-sm" />
        <span>Issues ({issues.length})</span>
      </div>
      {#if issues.some(i => i.autoFixable)}
        <Button
          variant="ghost"
          size="bare"
          onclick={onFixAll}
          class={cn(
            'text-[8px] font-bold uppercase px-2 py-1',
            fieldMode ? 'bg-nb-green text-nb-green' : 'bg-nb-green/20 text-nb-green'
          )}
        >
          {#snippet children()}Fix All{/snippet}
        </Button>
      {/if}
    </div>
    {#each issues as issue (issue.id)}
      <div class={cn(
        'flex items-start gap-2 text-[10px]',
        issue.severity === 'error'
          ? 'text-nb-red'
          : (fieldMode ? 'text-nb-yellow/40' : 'text-nb-orange')
      )}>
        <span class="shrink-0">{issue.title}</span>
        {#if issue.autoFixable}
          <Button
            variant="ghost"
            size="bare"
            onclick={() => onFixIssue(issue.id)}
            class="text-[8px] text-nb-green hover:underline"
          >
            {#snippet children()}Fix{/snippet}
          </Button>
        {/if}
      </div>
    {/each}
  </div>
{/if}
