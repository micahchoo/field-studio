<!--
  MediaErrorOverlay — Error state overlay

  ORIGINAL: src/features/viewer/ui/atoms/MediaErrorOverlay.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Error state display overlay for media player. Zero state, pure presentational.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  type MediaErrorType = 'aborted' | 'network' | 'decode' | 'format' | 'unknown' | 'notfound' | 'unsupported';

  interface Props {
    /** Error message to display */
    message?: string;
    /** Type of error for icon selection */
    errorType?: MediaErrorType;
    /** Callback to retry loading */
    onRetry?: () => void;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    message = 'Failed to load media',
    errorType = 'network',
    onRetry,
    class: className = '',
    fieldMode = false,
  }: Props = $props();

  const errorIcons: Record<MediaErrorType, string> = {
    aborted: 'stop_circle',
    network: 'wifi_off',
    decode: 'broken_image',
    format: 'video_file',
    unknown: 'error_outline',
    notfound: 'search_off',
    unsupported: 'block',
  };

  const defaultMessages: Record<MediaErrorType, string> = {
    aborted: 'Media loading was aborted',
    network: 'Network error while loading media',
    decode: 'Media decoding failed',
    format: 'Media format not supported',
    unknown: 'An unknown error occurred',
    notfound: 'Media not found',
    unsupported: 'Media type not supported',
  };

  let displayMessage = $derived(message || defaultMessages[errorType] || defaultMessages.unknown);
  let iconName = $derived(errorIcons[errorType] || errorIcons.unknown);

  let bgClass = $derived(fieldMode ? 'bg-nb-black/90' : 'bg-nb-black/80');
  let titleColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-white');
</script>

<div
  class={cn('absolute inset-0 flex items-center justify-center z-20', bgClass, className)}
  role="alert"
  aria-live="assertive"
>
  <div class="text-center p-6 max-w-md">
    <span class="material-icons text-5xl text-nb-red mb-4 block" aria-label="Error">
      {iconName}
    </span>
    <h3 class="text-lg font-medium mb-2 {titleColor}">
      Media Error
    </h3>
    <p class="text-sm mb-4 text-nb-black/30">
      {displayMessage}
    </p>
    {#if onRetry}
      <button
        class={cn(
          'px-4 py-2 text-sm font-bold border-2 transition-nb',
          fieldMode
            ? 'bg-nb-yellow text-nb-black border-nb-yellow hover:bg-nb-yellow/80'
            : 'bg-nb-blue text-white border-nb-blue hover:bg-nb-blue/80'
        )}
        onclick={onRetry}
        aria-label="Retry loading media"
      >
        Retry
      </button>
    {/if}
  </div>
</div>
