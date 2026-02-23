<!--
  ValidatedField — Debounced input with inline validation feedback.
  React source: src/features/metadata-edit/ui/atoms/ValidatedField.tsx (84 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode via settings)
-->
<script module lang="ts">
  import type { ValidationIssue } from '../../lib/inspectorValidation';

  export interface ValidatedFieldProps {
    label: string;
    value: string;
    onchange: (val: string) => void;
    issues: ValidationIssue[];
    settings: { fieldMode?: boolean };
    inputType: 'input' | 'textarea';
    rows?: number;
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import DebouncedField from './DebouncedField.svelte';

  let {
    label,
    value,
    onchange,
    issues,
    settings,
    inputType,
    rows,
  }: ValidatedFieldProps = $props();

  let hasError = $derived(issues.some(i => i.severity === 'error'));
  let hasWarning = $derived(issues.some(i => i.severity === 'warning'));

  let borderColor = $derived(
    hasError
      ? 'border-nb-red'
      : hasWarning
        ? 'border-nb-orange'
        : settings.fieldMode
          ? 'border-nb-black focus:border-nb-yellow'
          : 'border-nb-black/20 focus:ring-2 focus:ring-nb-blue'
  );

  let inputClass = $derived(
    cn(
      'w-full text-sm p-3 outline-none border',
      borderColor,
      settings.fieldMode ? 'bg-nb-black text-white' : 'bg-nb-white',
      inputType === 'textarea' && 'resize-none'
    )
  );

  let labelClass = $derived(
    cn(
      'block text-[10px] font-bold mb-1.5 uppercase tracking-wider',
      settings.fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
    )
  );
</script>

<div>
  <label class={labelClass}>
    {label}
    {#if hasError}
      <Icon name="error" class="text-nb-red ml-1 text-xs" />
    {:else if hasWarning}
      <Icon name="warning" class="text-nb-orange ml-1 text-xs" />
    {/if}
  </label>

  <DebouncedField
    {inputType}
    {value}
    {onchange}
    rows={inputType === 'textarea' ? (rows ?? 3) : undefined}
    class={inputClass}
  />

  {#if issues.length > 0}
    <div class="mt-1.5 space-y-1">
      {#each issues as issue, idx (idx)}
        <div class={cn(
          'text-[10px] flex items-center gap-1',
          issue.severity === 'error' ? 'text-nb-red'
            : issue.severity === 'warning' ? 'text-nb-orange'
            : 'text-nb-blue'
        )}>
          <Icon
            name={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'}
            class="text-[10px]"
          />
          {issue.title}
          {#if issue.autoFixable}
            <Button
              variant="ghost"
              size="bare"
              class="ml-1 text-nb-green hover:underline"
            >
              Fix
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
