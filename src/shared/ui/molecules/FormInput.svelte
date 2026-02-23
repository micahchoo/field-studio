<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import TextArea from '../atoms/TextArea.svelte';

  interface Props {
    value?: string;
    type?: 'text' | 'textarea' | 'number' | 'datetime-local' | 'email' | 'url' | 'password';
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    cx: ContextualClassNames;
    action?: Snippet;
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    oninput?: (value: string) => void;
    onblur?: () => void;
    class?: string;
  }

  let {
    value = $bindable(''),
    type = 'text',
    label,
    hint,
    error,
    required = false,
    disabled = false,
    placeholder,
    cx,
    action,
    min,
    max,
    step,
    rows = 3,
    oninput,
    onblur,
    class: className = ''
  }: Props = $props();

  const id = `fi-${Math.random().toString(36).slice(2, 8)}`;
  const hasError = $derived(!!error);
  const inputClasses = $derived(cn(
    cx.input || 'w-full border-2 border-nb-black px-3 py-2 font-mono',
    hasError && 'border-red-500 bg-red-50',
    disabled && 'opacity-50 cursor-not-allowed'
  ));

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    value = target.value;
    oninput?.(value);
  }

  function handleBlur() {
    onblur?.();
  }
</script>

<div class={cn('flex flex-col gap-1.5', className)}>
  {#if label}
    <label for={id} class={cn(cx.label || 'text-[11px] font-bold uppercase tracking-wider font-mono', cx.text)}>
      {label}
      {#if required}<span class="text-red-500"> *</span>{/if}
    </label>
  {/if}

  <div class="relative">
    {#if type === 'textarea'}
      <TextArea
        {id}
        {placeholder}
        {disabled}
        {rows}
        class={inputClasses}
        value={value}
        oninput={handleInput}
        onblur={handleBlur}
      />
    {:else}
      <input
        {id}
        {type}
        {placeholder}
        {disabled}
        {min}
        {max}
        {step}
        class={inputClasses}
        value={value}
        oninput={handleInput}
        onblur={handleBlur}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    {/if}

    {#if action}
      <div class="absolute right-2 top-1/2 -translate-y-1/2">
        {@render action()}
      </div>
    {/if}
  </div>

  {#if error}
    <span id="{id}-error" role="alert" class="text-xs font-bold text-red-600 font-mono">{error}</span>
  {:else if hint}
    <span id="{id}-hint" class={cn('text-xs', cx.textMuted || 'text-nb-black/50')}>{hint}</span>
  {/if}
</div>
