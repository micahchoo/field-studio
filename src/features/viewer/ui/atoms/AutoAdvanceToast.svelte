<!--
  AutoAdvanceToast — Countdown toast for canvas auto-advance

  ORIGINAL: src/features/viewer/ui/atoms/AutoAdvanceToast.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Shows countdown timer with progress bar. When countdown reaches 0,
  calls onAdvance. User can cancel via the Cancel button.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Label of the next canvas */
    nextLabel: string;
    /** Duration of countdown in seconds */
    duration?: number;
    /** Called when countdown completes */
    onAdvance: () => void;
    /** Called when user cancels auto-advance */
    onCancel: () => void;
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    nextLabel,
    duration = 3,
    onAdvance,
    onCancel,
    fieldMode = false,
  }: Props = $props();

  let remaining = $state(duration);

  $effect(() => {
    if (remaining <= 0) {
      onAdvance();
      return;
    }
    const timer = setTimeout(() => {
      remaining -= 1;
    }, 1000);
    return () => clearTimeout(timer);
  });

  let progressPercent = $derived(((duration - remaining) / duration) * 100);
</script>

<div
  class={cn(
    'absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 shadow-brutal backdrop-blur-sm border animate-in slide-in-from-bottom-4',
    fieldMode
      ? 'bg-nb-black/95 border-nb-black/80'
      : 'bg-nb-white border-nb-black/20'
  )}
  role="status"
  aria-live="polite"
  aria-label="Auto-advance countdown"
>
  <span class={cn('material-icons text-lg', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
    skip_next
  </span>

  <div>
    <div class={cn('text-sm font-medium', fieldMode ? 'text-white' : 'text-nb-black/80')}>
      Next: {nextLabel}
    </div>
    <div class={cn('text-xs', fieldMode ? 'text-nb-black/40' : 'text-nb-black/50')}>
      in {remaining}s
    </div>
  </div>

  <!-- Progress bar -->
  <div class={cn('w-16 h-1 overflow-hidden', fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream')}>
    <div
      class={cn(
        'h-full transition-all duration-1000 ease-linear',
        fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue'
      )}
      style:width="{progressPercent}%"
    ></div>
  </div>

  <button
    class={cn(
      'text-xs px-2 py-1 border font-mono uppercase tracking-wide transition-nb',
      fieldMode
        ? 'border-nb-yellow/60 text-nb-yellow hover:bg-nb-yellow hover:text-nb-black'
        : 'border-nb-black/30 text-nb-black/70 hover:bg-nb-black hover:text-nb-white'
    )}
    onclick={onCancel}
    aria-label="Cancel auto-advance"
  >
    Cancel
  </button>
</div>
