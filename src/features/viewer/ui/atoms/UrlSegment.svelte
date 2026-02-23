<!--
  UrlSegment — Colored inline span for IIIF URL path segments

  ORIGINAL: src/features/viewer/ui/atoms/UrlSegment.tsx (53 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders a single URL path segment as a colored inline badge with a tooltip
  showing the label. Used by the IIIF URL breakdown display to distinguish
  parts of a URL (scheme, host, prefix, identifier, region, size, etc.).

  Static colorClasses map lives in <script module> per Rule 2.F.
  cx/fieldMode optional per Rule 5.D (atom).
-->

<script module lang="ts">
  /** Semantic segment colors — static data, shared across all instances */
  export type SegmentColor = 'green' | 'blue' | 'orange' | 'purple' | 'yellow';

  export const COLOR_CLASSES: Record<SegmentColor, { bg: string; text: string; border: string }> = {
    green:  { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** The URL segment text to display */
    value: string;
    /** Human-readable label (shown as tooltip) */
    label: string;
    /** Semantic color for this segment type */
    color: SegmentColor;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }

  let { value, label, color, cx, fieldMode = false, class: className = '' }: Props = $props();

  let colors = $derived(COLOR_CLASSES[color]);
</script>

<!-- PSEUDO: Inline span with colored background, border, monospace text, and tooltip on hover -->
<span
  class={cn(
    'inline-flex items-center px-1.5 py-0.5 border rounded font-mono text-xs',
    colors.bg,
    colors.text,
    colors.border,
    fieldMode && 'border-nb-yellow bg-nb-yellow/20 text-nb-yellow',
    className
  )}
  title={label}
>
  {value}
</span>
