<!--
  Input - Neobrutalist text input primitive

  ORIGINAL: ui/primitives/Input.tsx (90 lines)
  CSS custom properties for full theming factory compatibility.
  Sharp corners, thick border, monospace values, UPPERCASE labels.
-->
<script lang="ts">
  import type { InputSize } from './types';
  interface Props {
    label?: string;
    size?: InputSize;
    helpText?: string;
    error?: string;
    required?: boolean;
    autoFocusOnMount?: boolean;
    disabled?: boolean;
    id?: string;
    value?: string;
    placeholder?: string;
    type?: string;
    name?: string;
    style?: string;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onblur?: (e: Event) => void;
    onfocus?: (e: Event) => void;
    [key: string]: unknown;
  }

  let {
    label,
    size = 'base',
    helpText,
    error,
    required = false,
    autoFocusOnMount = false,
    disabled = false,
    id,
    value = $bindable(''),
    style: userStyle = '',
    class: className = '',
    ...rest
  }: Props = $props();

  // Svelte action for autofocus (avoids a11y warning on native autofocus attr)
  function autofocus(node: HTMLInputElement) {
    if (autoFocusOnMount) node.focus();
  }

  const SIZE_STYLES: Record<InputSize, string> = {
    sm: 'height: 32px; font-size: 0.875rem',
    base: 'height: 40px; font-size: 1rem',
    lg: 'height: 48px; font-size: 1.125rem',
  };

  let inputStyle = $derived.by(() => {
    const parts = [
      'display: block',
      'width: 100%',
      'padding: 0 12px',
      `border: var(--theme-border-width-thick, 2px) solid ${error ? 'var(--theme-error-color, #FF3333)' : 'var(--theme-input-border, var(--theme-border-default, #000))'}`,
      'border-radius: 0',
      `color: ${disabled ? 'var(--theme-text-muted, #999)' : 'var(--theme-text-primary, #000)'}`,
      `background-color: ${disabled ? 'var(--theme-surface-secondary, #FFF8E7)' : 'var(--theme-input-bg, var(--theme-surface-primary, #FFF))'}`,
      'font-family: var(--theme-font-family-mono, "JetBrains Mono", ui-monospace, monospace)',
      'transition: all 0.1s linear',
      'box-sizing: border-box',
      SIZE_STYLES[size],
    ];
    if (userStyle) parts.push(userStyle);
    return parts.join('; ');
  });

  const labelStyle = [
    'display: block',
    'font-family: var(--theme-font-family-mono, "JetBrains Mono", ui-monospace, monospace)',
    'font-size: 0.6875rem',
    'font-weight: 700',
    'color: var(--theme-text-primary, #000)',
    'margin-bottom: 6px',
    'text-transform: uppercase',
    'letter-spacing: 0.08em',
  ].join('; ');
</script>

<div style="display: flex; flex-direction: column" class={className || undefined}>
  {#if label}
    <label for={id} style={labelStyle}>
      {label}
      {#if required}
        <span aria-hidden="true" style="color: var(--theme-error-color, #FF3333)"> *</span>
      {/if}
    </label>
  {/if}
  <input
    {id}
    bind:value
    style={inputStyle}
    {disabled}
    use:autofocus
    aria-invalid={error ? true : undefined}
    aria-required={required || undefined}
    aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
    {...rest}
  />
  {#if error}
    <span
      id="{id}-error"
      role="alert"
      style="display: block; font-size: 0.75rem; color: var(--theme-error-color, #FF3333); margin-top: 4px; font-weight: 700; font-family: 'JetBrains Mono', monospace"
    >{error}</span>
  {:else if helpText}
    <span
      id="{id}-help"
      style="display: block; font-size: 0.75rem; color: var(--theme-text-muted, #666); margin-top: 4px; font-family: 'JetBrains Mono', monospace"
    >{helpText}</span>
  {/if}
</div>
