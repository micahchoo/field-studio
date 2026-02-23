<!--
  Button - Atomic UI Primitive (Neobrutalist)

  ORIGINAL: ui/primitives/Button.tsx (162 lines)
  CSS custom properties for full theming factory compatibility.
  Sharp corners, thick borders, offset shadow, UPPERCASE text.
  size="bare" preserves 650+ usages (no height/padding).
-->
<script module lang="ts">
  import type { ButtonVariant, ButtonSize } from './types';

  const VARIANT_STYLES: Record<ButtonVariant, string> = {
    primary: [
      'background-color: var(--theme-accent-primary, #0055FF)',
      'color: var(--theme-text-inverse, #FFFFFF)',
      'border: 2px solid var(--theme-border-default, #000)',
      'box-shadow: var(--theme-shadow-base, 4px 4px 0 0 #000)',
    ].join('; '),
    secondary: [
      'background-color: var(--theme-surface-secondary, #FFF8E7)',
      'color: var(--theme-text-primary, #000)',
      'border: 2px solid var(--theme-border-default, #000)',
      'box-shadow: var(--theme-shadow-sm, 2px 2px 0 0 #000)',
    ].join('; '),
    ghost: 'background-color: transparent; color: inherit; border: 2px solid transparent',
    danger: [
      'background-color: var(--theme-error-color, #FF3333)',
      'color: var(--theme-text-inverse, #FFFFFF)',
      'border: 2px solid var(--theme-border-default, #000)',
      'box-shadow: var(--theme-shadow-base, 4px 4px 0 0 #000)',
    ].join('; '),
    success: [
      'background-color: var(--theme-success-color, #00CC66)',
      'color: var(--theme-text-primary, #000)',
      'border: 2px solid var(--theme-border-default, #000)',
      'box-shadow: var(--theme-shadow-base, 4px 4px 0 0 #000)',
    ].join('; '),
  };

  const SIZE_STYLES: Record<ButtonSize, string> = {
    bare: '',
    sm: 'height: 32px; padding: 0 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; position: relative',
    base: 'height: 40px; padding: 0 16px; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em',
    lg: 'height: 48px; padding: 0 24px; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em',
    xl: 'height: 56px; padding: 0 32px; font-size: 1.125rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em',
  };

  const BASE_STYLE = 'display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: "Space Grotesk", system-ui, sans-serif; transition: all 0.1s linear; border-radius: 0';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: Snippet;
    iconAfter?: Snippet;
    fullWidth?: boolean;
    minimal?: boolean;
    disabled?: boolean;
    children?: Snippet;
    class?: string;
    style?: string;
    onclick?: (e: MouseEvent) => void;
    type?: 'button' | 'submit' | 'reset';
    id?: string;
    title?: string;
    'aria-label'?: string;
    [key: string]: unknown;
  }

  let {
    variant = 'primary',
    size = 'base',
    loading = false,
    icon,
    iconAfter,
    fullWidth = false,
    minimal = false,
    disabled = false,
    children,
    class: className = '',
    style: userStyle = '',
    onclick,
    type = 'button',
    ...rest
  }: Props = $props();

  let isDisabled = $derived(disabled || loading);

  let buttonStyle = $derived.by(() => {
    const parts = [BASE_STYLE, VARIANT_STYLES[variant], SIZE_STYLES[size]];
    parts.push(isDisabled ? 'cursor: not-allowed; opacity: 0.5' : 'cursor: pointer; opacity: 1');
    if (fullWidth) parts.push('width: 100%');
    if (minimal) parts.push('background-color: transparent; border-color: transparent; box-shadow: none');
    if (userStyle) parts.push(userStyle);
    return parts.filter(Boolean).join('; ');
  });

  let touchClass = $derived(size === 'sm' ? 'touch-target-sm' : '');
  let combinedClass = $derived([touchClass, className].filter(Boolean).join(' '));
</script>

<button
  {type}
  style={buttonStyle}
  disabled={isDisabled}
  aria-disabled={isDisabled || undefined}
  class={combinedClass || undefined}
  {onclick}
  {...rest}
>
  {#if loading}
    <span style="margin-right: 0.5rem" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="square"
        style="animation: spin 1s linear infinite"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
    </span>
  {/if}
  {#if icon && !loading}
    <span style="display: flex">{@render icon()}</span>
  {/if}
  {#if children}
    <span>{@render children()}</span>
  {/if}
  {#if iconAfter}
    <span style="display: flex">{@render iconAfter()}</span>
  {/if}
</button>

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
