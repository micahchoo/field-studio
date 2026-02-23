<!--
  PreviewHeader — Header strip with title and validity indicator dot

  ORIGINAL: src/features/viewer/ui/atoms/PreviewHeader.tsx (51 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders a compact header bar displaying a title string and a small
  colored dot indicating valid (green) or invalid (red) state. Used
  above preview panes in staging and export dialogs.

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Header title text */
    title?: string;
    /** Whether the previewed content is valid */
    isValid?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    title = 'Preview',
    isValid = true,
    cx,
    fieldMode = false,
    class: className = ''
  }: Props = $props();
</script>

<!-- PSEUDO: Compact header bar with left-aligned title and right-aligned status dot -->
<header
  class={cn(
    'flex items-center justify-between px-3 py-2 border-b-2',
    cx?.border ?? 'border-nb-black',
    cx?.headerBg ?? 'bg-nb-cream',
    fieldMode && 'bg-nb-black border-nb-yellow',
    className
  )}
>
  <!-- PSEUDO: Title in monospace uppercase, matching StatusBar style -->
  <span
    class={cn(
      'font-mono text-xs font-bold uppercase tracking-wider',
      cx?.text ?? 'text-nb-black',
      fieldMode && 'text-nb-yellow'
    )}
  >
    {title}
  </span>

  <!-- PSEUDO: Validity indicator — green dot if valid, red dot if invalid -->
  <span
    class={cn(
      'w-2.5 h-2.5 rounded-full border',
      isValid ? 'bg-green-500 border-green-700' : 'bg-red-500 border-red-700',
      fieldMode && (isValid ? 'bg-green-400 border-green-600' : 'bg-red-400 border-red-600')
    )}
    title={isValid ? 'Valid' : 'Invalid'}
    aria-label={isValid ? 'Valid' : 'Invalid'}
  ></span>
</header>
