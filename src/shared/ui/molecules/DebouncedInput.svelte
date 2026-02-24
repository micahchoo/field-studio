<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    value?: string;
    delay?: number;
    maxLength?: number;
    showCharCount?: boolean;
    sanitize?: boolean;
    label?: string;
    placeholder?: string;
    autoFocus?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
    id?: string;
  }

  let {
    value = $bindable(''),
    delay = 300,
    maxLength,
    showCharCount = false,
    sanitize = false,
    label,
    placeholder,
    autoFocus = false,
    cx,
    fieldMode = false,
    class: className = '',
    id,
  }: Props = $props();

  const fieldId = $derived(id ?? (label ? label.toLowerCase().replace(/[W_]+/g,'-').replace(/^-|-$/g,'') : undefined));
  let localValue = $state(value);
  let isPending = $state(false);
  let inputRef: HTMLInputElement | undefined = $state();

  function sanitizeForInput(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
  }

  // Debounce effect
  $effect(() => {
    // Track localValue
    const current = localValue;
    isPending = true;

    const timerId = setTimeout(() => {
      let newValue = current;
      if (sanitize) newValue = sanitizeForInput(newValue);
      if (maxLength && newValue.length > maxLength) newValue = newValue.slice(0, maxLength);
      value = newValue;
      isPending = false;
    }, delay);

    return () => clearTimeout(timerId);
  });

  // Sync external changes
  $effect(() => {
    if (value !== localValue && !isPending) {
      localValue = value;
    }
  });

  // Auto-focus
  $effect(() => {
    if (autoFocus && inputRef) inputRef.focus();
  });
</script>

<div class={className}>
  {#if label}
    <label for={fieldId} class={cn(cx.label || 'text-[11px] font-bold uppercase tracking-wider font-mono', 'block mb-2')}>
      {label}
    </label>
  {/if}

  <div class="relative">
    <input
      {id}
      bind:this={inputRef}
      bind:value={localValue}
      type="text"
      {placeholder}
      maxlength={maxLength}
      class={cx.input || 'w-full border-2 border-nb-black px-3 py-2 font-mono'}
      aria-busy={isPending || undefined}
    />

    {#if isPending}
      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-pulse">
        ...
      </span>
    {/if}
  </div>

  {#if showCharCount && maxLength}
    <div class="mt-1 text-xs text-right text-gray-500 font-mono" aria-live="polite">
      {localValue.length} / {maxLength}
    </div>
  {/if}
</div>
