<!--
  ValidationFixAction — Fix button for a validation issue with severity indicator.
  React source: src/features/metadata-edit/ui/atoms/ValidationFixAction.tsx
  Architecture: Atom (zero state, props-only, Rule 2.F: static data in script module)
-->
<script module lang="ts">
  import type { ValidationIssue } from '../../lib/inspectorValidation';

  export type { ValidationIssue };

  export interface ValidationFixActionProps {
    issue: ValidationIssue;
    onFix: (issue: ValidationIssue) => void;
    cx?: Partial<import('@/src/shared/lib/contextual-styles').ContextualClassNames>;
    fieldMode?: boolean;
  }

  const SEVERITY_CONFIG = {
    error:   { icon: 'error',   color: 'text-nb-red',    bg: 'bg-nb-red/10',    fieldBg: 'bg-nb-red/20' },
    warning: { icon: 'warning', color: 'text-nb-orange', bg: 'bg-nb-orange/10', fieldBg: 'bg-nb-orange/20' },
    info:    { icon: 'info',    color: 'text-nb-blue',   bg: 'bg-nb-blue/10',   fieldBg: 'bg-nb-blue/20' },
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';

  let { issue, onFix, cx = {}, fieldMode = false }: ValidationFixActionProps = $props();

  let config = $derived(SEVERITY_CONFIG[issue.severity]);
  let bgClass = $derived(fieldMode ? config.fieldBg : config.bg);
</script>

<div class={cn(
  'flex items-start gap-3 p-3 border',
  bgClass,
  fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
)}>
  <Icon name={config.icon} class={cn('text-lg mt-0.5 shrink-0', config.color)} />

  <div class="flex-1 min-w-0">
    <p class={cn(
      'text-sm font-bold',
      fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black'
    )}>
      {issue.title}
    </p>
    <p class={cn(
      'text-xs mt-0.5',
      fieldMode ? 'text-nb-yellow/70' : cx.textMuted ?? 'text-nb-black/60'
    )}>
      {issue.description}
    </p>
    {#if issue.fixSuggestion}
      <p class={cn('text-xs mt-1 font-mono', config.color)}>
        {issue.fixSuggestion}
      </p>
    {/if}
  </div>

  {#if issue.autoFixable}
    <IconButton
      icon="build"
      onclick={() => onFix(issue)}
      label="Apply fix"
      size="sm"
      cx={cx as ContextualClassNames}
    />
  {/if}
</div>
