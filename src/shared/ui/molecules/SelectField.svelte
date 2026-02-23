<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Select from '../atoms/Select.svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface OptionGroup {
    label: string;
    options: Option[];
  }

  interface Props {
    value?: string;
    options?: Option[];
    groups?: OptionGroup[];
    label?: string;
    hint?: string;
    disabled?: boolean;
    required?: boolean;
    cx: ContextualClassNames;
    onchange?: (value: string) => void;
    class?: string;
  }

  let {
    value = $bindable(''),
    options = [],
    groups = [],
    label,
    hint,
    disabled = false,
    required = false,
    cx,
    onchange,
    class: className = ''
  }: Props = $props();

  const id = `sf-${Math.random().toString(36).slice(2, 8)}`;
  const hasGroups = $derived(groups.length > 0);

  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)}>
  {#if label}
    <div class="flex items-center gap-2">
      <label for={id} class={cn(cx.label || 'text-[11px] font-bold uppercase tracking-wider font-mono')}>
        {label}
        {#if required}<span class="text-red-500"> *</span>{/if}
      </label>
      {#if hint}
        <span class={cn('text-xs font-mono', cx.textMuted || 'text-nb-black/50')}>({hint})</span>
      {/if}
    </div>
  {/if}

  <Select
    {id}
    bind:value
    {disabled}
    {required}
    cx={cx}
    onchange={handleChange}
  >
    {#snippet children()}
      {#if options.length > 0}
        {#each options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      {/if}

      {#if hasGroups}
        {#each groups as group (group.label)}
          <optgroup label={group.label}>
            {#each group.options as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </optgroup>
        {/each}
      {/if}
    {/snippet}
  </Select>
</div>
