<!--
  FullscreenButton — Browser fullscreen toggle

  ORIGINAL: src/features/viewer/ui/atoms/FullscreenButton.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Handles fullscreen state and webkit variants. Tracks fullscreen state
  via document.fullscreenchange / webkitfullscreenchange events.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';

  interface Props {
    /** Callback when fullscreen state changes */
    onFullscreenChange?: (isFullscreen: boolean) => void;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Field mode flag */
    fieldMode?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    onFullscreenChange,
    size = 'md',
    fieldMode = false,
    class: className = '',
  }: Props = $props();

  let isFullscreen = $state(false);

  let resolvedCx: ContextualClassNames = $derived(
    fieldMode ? FIELD_CLASSES : LIGHT_CLASSES
  );

  let icon = $derived(isFullscreen ? 'fullscreen_exit' : 'fullscreen');
  let label = $derived(isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');

  function handleFullscreenChange() {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const fullscreenElement = document.fullscreenElement || doc.webkitFullscreenElement;
    const newState = !!fullscreenElement;
    isFullscreen = newState;
    onFullscreenChange?.(newState);
  }

  $effect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  });

  async function toggleFullscreen() {
    try {
      if (isFullscreen) {
        const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch {
      // Silently fail if fullscreen is not supported or blocked
    }
  }
</script>

<IconButton
  {icon}
  {label}
  onclick={toggleFullscreen}
  {size}
  cx={resolvedCx}
  class={className}
/>
