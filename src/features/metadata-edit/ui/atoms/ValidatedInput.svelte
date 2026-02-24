<!--
  ValidatedInput — Input/textarea with live validation feedback, debounce, and auto-fix.
  React source: src/features/metadata-edit/ui/atoms/ValidatedInput.tsx (278 lines)
  Architecture: Atom (internal debounce + focus state, Rule 5.D: fieldMode, Rule 2.F: static types)
-->
<script module lang="ts">
  export type ValidationStatus = 'pristine' | 'valid' | 'invalid' | 'validating';

  export interface FieldValidation {
    status: ValidationStatus;
    message?: string;
    fix?: () => void;
    fixDescription?: string;
  }
</script>

<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    value: string;
    onchange: (value: string) => void;
    validation: FieldValidation;
    label: string;
    id: string;
    type?: 'text' | 'textarea' | 'url';
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    fieldMode?: boolean;
    onfocus?: (e: FocusEvent) => void;
    onblur?: (e: FocusEvent) => void;
  }

  let {
    value,
    onchange,
    validation,
    label,
    id,
    type = 'text',
    placeholder = '',
    disabled = false,
    rows = 3,
    fieldMode = false,
    onfocus,
    onblur,
  }: Props = $props();

  // --- Internal state ---
  let innerValue = $state(value ?? '');
  let isFocused = $state(false);
  let showSuccess = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let successTimer: ReturnType<typeof setTimeout> | undefined;

  // Sync external value when not focused (parent-driven updates)
  $effect(() => {
    if (!isFocused) {
      innerValue = value ?? '';
    }
  });

  // Success fade: show checkmark for 2s when status becomes 'valid'
  $effect(() => {
    if (validation.status === 'valid') {
      showSuccess = true;
      clearTimeout(successTimer);
      successTimer = setTimeout(() => {
        showSuccess = false;
      }, 2000);
    } else {
      showSuccess = false;
    }

    return () => clearTimeout(successTimer);
  });

  // --- Debounced change handler ---
  function handleInput(newValue: string) {
    innerValue = newValue;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onchange(innerValue);
    }, 300);
  }

  function flushDebounce() {
    clearTimeout(debounceTimer);
    if (innerValue !== value) {
      onchange(innerValue);
    }
  }

  function handleFocus(e: FocusEvent) {
    isFocused = true;
    onfocus?.(e);
  }

  function handleBlur(e: FocusEvent) {
    isFocused = false;
    flushDebounce();
    onblur?.(e);
  }

  // --- Derived styles ---
  let borderColor = $derived.by(() => {
    switch (validation.status) {
      case 'invalid':
        return fieldMode ? 'border-nb-red' : 'border-nb-red';
      case 'valid':
        return fieldMode ? 'border-nb-green' : 'border-nb-green';
      case 'validating':
        return fieldMode ? 'border-nb-yellow/50' : 'border-nb-blue/50';
      default:
        return fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20';
    }
  });

  let statusIcon = $derived.by(() => {
    switch (validation.status) {
      case 'invalid':  return 'error';
      case 'valid':    return 'check_circle';
      case 'validating': return 'hourglass_empty';
      default:         return '';
    }
  });

  let statusIconColor = $derived.by(() => {
    switch (validation.status) {
      case 'invalid':    return 'text-nb-red';
      case 'valid':      return 'text-nb-green';
      case 'validating': return fieldMode ? 'text-nb-yellow/50' : 'text-nb-blue/50';
      default:           return '';
    }
  });

  let inputClasses = $derived(
    cn(
      'w-full px-3 py-2 text-sm border-2 outline-none font-mono transition-colors duration-100',
      'focus:ring-2',
      fieldMode
        ? 'bg-nb-black text-nb-yellow focus:ring-nb-yellow'
        : 'bg-nb-white text-nb-black focus:ring-nb-blue',
      borderColor,
      disabled && 'opacity-50 cursor-not-allowed'
    )
  );

  let labelClasses = $derived(
    cn(
      'flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider mb-1.5',
      fieldMode ? 'text-nb-yellow' : 'text-nb-black'
    )
  );

  let messageId = $derived(`${id}-message`);
  let isInvalid = $derived(validation.status === 'invalid');
</script>

<!-- Label row with status icon -->
<div class="flex flex-col gap-0.5">
  <label for={id} class={labelClasses}>
    <span>{label}</span>
    {#if statusIcon}
      <Icon
        name={statusIcon}
        class={cn('text-sm', statusIconColor)}
      />
    {/if}
  </label>

  <!-- Input / Textarea -->
  {#if type === 'textarea'}
    <textarea
      {id}
      value={innerValue}
      oninput={(e) => handleInput(e.currentTarget.value)}
      onfocus={handleFocus}
      onblur={handleBlur}
      {placeholder}
      {disabled}
      {rows}
      class={inputClasses}
      aria-invalid={isInvalid || undefined}
      aria-describedby={validation.message ? messageId : undefined}
      aria-errormessage={isInvalid ? messageId : undefined}
    ></textarea>
  {:else}
    <input
      {id}
      type={type === 'url' ? 'url' : 'text'}
      value={innerValue}
      oninput={(e) => handleInput(e.currentTarget.value)}
      onfocus={handleFocus}
      onblur={handleBlur}
      {placeholder}
      {disabled}
      class={inputClasses}
      aria-invalid={isInvalid || undefined}
      aria-describedby={validation.message ? messageId : undefined}
      aria-errormessage={isInvalid ? messageId : undefined}
    />
  {/if}

  <!-- Validation message area -->
  <div
    id={messageId}
    class="min-h-[20px] mt-1"
    aria-live="polite"
  >
    {#if validation.status === 'invalid' && validation.message}
      <div class={cn(
        'flex items-start gap-1.5 text-xs font-bold',
        fieldMode ? 'text-nb-red' : 'text-nb-red'
      )}>
        <Icon name="error" class="text-sm shrink-0 mt-px" />
        <span class="flex-1">{validation.message}</span>
        {#if validation.fix}
          <Button
            variant="ghost"
            size="bare"
            onclick={validation.fix}
            class={cn(
              'text-xs font-bold underline shrink-0',
              fieldMode ? 'text-nb-yellow' : 'text-nb-blue'
            )}
          >
            {#snippet children()}
              {validation.fixDescription ?? 'Fix'}
            {/snippet}
          </Button>
        {/if}
      </div>
    {:else if validation.status === 'validating'}
      <div class={cn(
        'flex items-center gap-1.5 text-xs',
        fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40'
      )}>
        <Icon name="hourglass_empty" class="text-sm animate-spin" />
        <span>Validating...</span>
      </div>
    {:else if validation.status === 'valid' && showSuccess}
      <div class={cn(
        'flex items-center gap-1.5 text-xs transition-opacity duration-500',
        'text-nb-green'
      )}>
        <Icon name="check_circle" class="text-sm" />
        <span>Valid</span>
      </div>
    {/if}
  </div>
</div>
