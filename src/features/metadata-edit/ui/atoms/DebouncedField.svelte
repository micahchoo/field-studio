<!--
  DebouncedField — Debounced input/textarea that delays onchange until pause or blur.
  React source: src/features/metadata-edit/ui/atoms/DebouncedField.tsx (36 lines)
  Architecture: Atom (internal debounce state, props-driven, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export type InputType = 'input' | 'textarea';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    value: string;
    onchange: (value: string) => void;
    inputType?: InputType;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    delay?: number;
  }

  let {
    value,
    onchange,
    inputType = 'input',
    rows = 3,
    placeholder = '',
    disabled = false,
    class: className = '',
    cx = {},
    fieldMode = false,
    delay = 300,
  }: Props = $props();

  let localValue = $state(value);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Sync external value changes into local state
  $effect(() => {
    localValue = value;
  });

  function scheduleFlush(val: string) {
    localValue = val;
    clearTimeout(timer);
    timer = setTimeout(() => {
      onchange(localValue);
    }, delay);
  }

  function flush() {
    clearTimeout(timer);
    if (localValue !== value) {
      onchange(localValue);
    }
  }

  let inputClasses = $derived(
    cn(
      'w-full px-2 py-1.5 text-sm border outline-none focus:ring-2 focus:ring-nb-blue focus:border-nb-blue font-mono',
      fieldMode
        ? 'bg-nb-black text-nb-yellow border-nb-yellow/30 focus:ring-nb-yellow focus:border-nb-yellow'
        : cx.input ?? 'bg-nb-white text-nb-black/80 border-nb-black/20',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )
  );
</script>

{#if inputType === 'textarea'}
  <textarea
    value={localValue}
    oninput={(e) => scheduleFlush(e.currentTarget.value)}
    onblur={flush}
    {rows}
    {placeholder}
    {disabled}
    class={inputClasses}
  ></textarea>
{:else}
  <input
    type="text"
    value={localValue}
    oninput={(e) => scheduleFlush(e.currentTarget.value)}
    onblur={flush}
    {placeholder}
    {disabled}
    class={inputClasses}
  />
{/if}
