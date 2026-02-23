<!--
  Card - Elevated surface container

  ORIGINAL: ui/primitives/Card.tsx (70 lines)
  CSS custom properties for theming factory compatibility.
  Neobrutalist: zero border-radius, offset shadow, thick borders.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    selected?: boolean;
    disabled?: boolean;
    class?: string;
    style?: string;
    [key: string]: unknown;
  }

  let {
    header,
    footer,
    children,
    selected = false,
    disabled = false,
    class: className = '',
    style: userStyle = '',
    ...rest
  }: Props = $props();

  let cardStyle = $derived.by(() => {
    const parts = [
      'display: flex',
      'flex-direction: column',
      'border-radius: 0',
      `border: 2px solid ${selected ? 'var(--theme-accent-primary, #0055FF)' : 'var(--theme-border-default, #000)'}`,
      `background-color: ${selected ? 'var(--theme-surface-accent, #FFF8E7)' : 'var(--theme-surface-primary, #FFF)'}`,
      'box-shadow: var(--theme-shadow-sm, 2px 2px 0 0 #000)',
      'transition: box-shadow 0.1s linear, border-color 0.1s linear',
    ];
    if (disabled) {
      parts.push('opacity: 0.6', 'pointer-events: none');
    }
    if (userStyle) parts.push(userStyle);
    return parts.join('; ');
  });

  const dividerStyle = 'border-top: 1px solid var(--theme-border-default, #000); margin: 0';
</script>

<div style={cardStyle} class={className || undefined} {...rest}>
  {#if header}
    <div style="padding: 0.75rem">{@render header()}</div>
    {#if children || footer}
      <hr style={dividerStyle} />
    {/if}
  {/if}
  {#if children}
    <div style="padding: 0.75rem; flex: 1">{@render children()}</div>
  {/if}
  {#if footer}
    {#if header || children}
      <hr style={dividerStyle} />
    {/if}
    <div style="padding: 0.75rem">{@render footer()}</div>
  {/if}
</div>
