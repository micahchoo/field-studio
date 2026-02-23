<!--
  MediaControlGroup — Flex container for media controls

  ORIGINAL: src/features/viewer/ui/atoms/MediaControlGroup.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Container for organizing media control buttons with consistent layout.
  Layout-only, zero state.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { Snippet } from 'svelte';

  type Direction = 'horizontal' | 'vertical';
  type Align = 'start' | 'center' | 'end' | 'between';
  type Gap = 'xs' | 'sm' | 'md' | 'lg';

  interface Props {
    /** Layout direction */
    direction?: Direction;
    /** Alignment within the group */
    align?: Align;
    /** Gap between controls */
    gap?: Gap;
    /** Whether to wrap items */
    wrap?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
    /** Child controls */
    children: Snippet;
  }

  let {
    direction = 'horizontal',
    align = 'start',
    gap = 'md',
    wrap = false,
    class: className = '',
    fieldMode = false,
    children,
  }: Props = $props();

  const gapClasses: Record<Gap, string> = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClasses: Record<Align, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  let flexDirection = $derived(direction === 'horizontal' ? 'flex-row' : 'flex-col');
  let wrapClass = $derived(wrap ? 'flex-wrap' : 'flex-nowrap');
  let itemsAlign = $derived(direction === 'horizontal' ? 'items-center' : 'items-start');
  let fieldModeClass = $derived(fieldMode ? 'field-mode' : '');
</script>

<div class={cn(
  'flex',
  flexDirection,
  itemsAlign,
  alignClasses[align],
  gapClasses[gap],
  wrapClass,
  fieldModeClass,
  className
)}>
  {@render children()}
</div>
