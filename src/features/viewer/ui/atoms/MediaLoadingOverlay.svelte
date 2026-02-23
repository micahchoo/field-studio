<!--
  MediaLoadingOverlay — Loading spinner overlay

  ORIGINAL: src/features/viewer/ui/atoms/MediaLoadingOverlay.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Loading/buffering state overlay for media player. Zero state, pure presentational.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  type SpinnerSize = 'sm' | 'md' | 'lg';
  type OpacityLevel = 'light' | 'medium' | 'dark';

  interface Props {
    /** Optional loading message */
    message?: string;
    /** Size of the spinner */
    spinnerSize?: SpinnerSize;
    /** Opacity of the overlay background (number 0-1 or string preset) */
    opacity?: number | OpacityLevel;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    message,
    spinnerSize = 'md',
    opacity = 0.7,
    class: className = '',
    fieldMode = false,
  }: Props = $props();

  const spinnerSizes: Record<SpinnerSize, { width: string; height: string; border: string }> = {
    sm: { width: '24px', height: '24px', border: '3px' },
    md: { width: '48px', height: '48px', border: '4px' },
    lg: { width: '64px', height: '64px', border: '5px' },
  };

  const opacityClasses: Record<OpacityLevel, string> = {
    light: 'bg-nb-black/30',
    medium: 'bg-nb-black/50',
    dark: 'bg-nb-black/70',
  };

  let size = $derived(spinnerSizes[spinnerSize]);

  let bgClass = $derived(
    fieldMode
      ? 'bg-nb-black/60'
      : typeof opacity === 'string'
        ? opacityClasses[opacity as OpacityLevel]
        : `bg-nb-black/${Math.round(Number(opacity) * 100)}`
  );

  let spinnerColor = $derived(fieldMode ? '#facc15' : '#ffffff');
  let textColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-white');
</script>

<div
  class={cn('absolute inset-0 flex flex-col items-center justify-center z-20', bgClass, className)}
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <div
    class="animate-spin"
    style:width={size.width}
    style:height={size.height}
    style:border="{size.border} solid rgba(255, 255, 255, 0.2)"
    style:border-top-color={spinnerColor}
    aria-hidden="true"
  ></div>
  {#if message}
    <p class="mt-4 text-sm {textColor} text-center px-4">
      {message}
    </p>
  {/if}
  <span class="sr-only">Loading media...</span>
</div>
