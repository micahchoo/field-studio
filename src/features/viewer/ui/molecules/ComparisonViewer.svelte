<!--
  ComparisonViewer — Side-by-side / overlay / curtain comparison of two canvases

  ORIGINAL: src/features/viewer/ui/molecules/ComparisonViewer.tsx (313 lines)
  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Three comparison modes:
  - side-by-side: two equal flex halves with independent OSD viewers
  - overlay: secondary on top of primary with opacity slider
  - curtain: secondary clipped from left with draggable divider

  Creates/destroys a secondary OSD viewer instance. Supports viewport sync
  between primary and secondary viewers with loop guard.
-->

<script lang="ts" module>
  import type { ComparisonMode } from '../../model/comparison.svelte';
</script>

<script lang="ts">
  /* eslint-disable @field-studio/lifecycle-restrictions -- OSD secondary viewer lifecycle requires $effect for getBoundingClientRect and viewport sync */
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Opacity slider requires native range input for comparison overlay */
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ComparisonStore } from '../../model/comparison.svelte';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    comparison: ComparisonStore;
    primaryCanvas: IIIFCanvas;
    secondCanvas: IIIFCanvas | null;
    primaryViewerRef: any;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    comparison,
    primaryCanvas,
    secondCanvas,
    primaryViewerRef,
    cx,
    fieldMode = false,
  }: Props = $props();

  // Derived from comparison store
  let mode = $derived(comparison.mode);
  let overlayOpacity = $derived(comparison.overlayOpacity);
  let curtainPosition = $derived(comparison.curtainPosition);
  let syncViewports = $derived(comparison.syncViewports);

  // Local state
  let isDraggingCurtain = $state(false);
  let curtainContainerEl: HTMLDivElement | undefined = $state(undefined);
  let secondContainerEl: HTMLDivElement | undefined = $state(undefined);

  // Secondary OSD viewer (non-reactive to avoid proxy overhead)
  let secondViewer: any = null;

  // Derived labels
  let primaryLabel = $derived(getIIIFValue(primaryCanvas.label) || 'Canvas A');
  let secondLabel = $derived(secondCanvas ? getIIIFValue(secondCanvas.label) || 'Canvas B' : 'Canvas B');
  let accentColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-nb-blue');

  // --- Secondary OSD viewer lifecycle ---

  $effect(() => {
    if (!secondCanvas || mode === 'off' || !secondContainerEl) return;

    // Track secondCanvas.id for reactivity
    const canvasId = secondCanvas.id;

    // Wait a frame for container to be in DOM with proper dimensions
    const timer = setTimeout(() => {
      if (!secondContainerEl) return;
      const rect = secondContainerEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Destroy existing viewer
      if (secondViewer) {
        try {
          secondViewer.removeAllHandlers();
          secondViewer.destroy();
        } catch { /* ignore */ }
        secondViewer = null;
      }

      // Resolve image URL for second canvas
      // Use a simple approach: look for painting annotation body
      let tileSource: any = { type: 'image', url: '' };
      try {
        const items = secondCanvas.items || [];
        for (const page of items) {
          const pageItems = (page as any).items || [];
          for (const anno of pageItems) {
            const body = anno.body;
            if (body) {
              const bodyObj = Array.isArray(body) ? body[0] : body;
              if (bodyObj?.service) {
                const services = Array.isArray(bodyObj.service) ? bodyObj.service : [bodyObj.service];
                const iiifService = services.find((s: any) =>
                  s?.type === 'ImageService3' || s?.type === 'ImageService2' ||
                  s?.['@type']?.includes?.('ImageService')
                );
                if (iiifService) {
                  const serviceId = iiifService['@id'] || iiifService.id;
                  tileSource = `${serviceId}/info.json`;
                }
              }
              if (tileSource === null || (typeof tileSource === 'object' && !tileSource.url)) {
                const url = bodyObj?.id || bodyObj?.['@id'] || '';
                if (url) tileSource = { type: 'image', url };
              }
            }
          }
        }
      } catch { /* fallback to empty */ }

      try {
        const OSD = (window as any).OpenSeadragon;
        secondViewer = OSD({
          element: secondContainerEl,
          prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
          tileSources: tileSource,
          gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
          gestureSettingsTouch: { pinchToZoom: true },
          showNavigationControl: false,
          showNavigator: false,
          blendTime: 0.1,
          immediateRender: true,
          minZoomLevel: 0.1,
          maxZoomLevel: 20,
          visibilityRatio: 0.5,
          crossOriginPolicy: 'Anonymous',
        });

        // Setup viewport sync after viewer is ready
        if (syncViewports && primaryViewerRef) {
          secondViewer.addOnceHandler('open', () => {
            setupViewportSync();
          });
        }
      } catch { /* ignore init errors */ }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (secondViewer) {
        try {
          secondViewer.removeAllHandlers();
          secondViewer.destroy();
        } catch { /* ignore */ }
        secondViewer = null;
      }
    };
  });

  // --- Viewport sync ---

  let isSyncing = false;

  function setupViewportSync() {
    if (!primaryViewerRef || !secondViewer) return;

    const syncPrimaryToSecond = () => {
      if (isSyncing || !secondViewer?.viewport || !primaryViewerRef?.viewport) return;
      isSyncing = true;
      try {
        const zoom = primaryViewerRef.viewport.getZoom();
        const center = primaryViewerRef.viewport.getCenter();
        secondViewer.viewport.zoomTo(zoom, undefined, true);
        secondViewer.viewport.panTo(center, true);
      } catch { /* ignore */ }
      requestAnimationFrame(() => { isSyncing = false; });
    };

    const syncSecondToPrimary = () => {
      if (isSyncing || !secondViewer?.viewport || !primaryViewerRef?.viewport) return;
      isSyncing = true;
      try {
        const zoom = secondViewer.viewport.getZoom();
        const center = secondViewer.viewport.getCenter();
        primaryViewerRef.viewport.zoomTo(zoom, undefined, true);
        primaryViewerRef.viewport.panTo(center, true);
      } catch { /* ignore */ }
      requestAnimationFrame(() => { isSyncing = false; });
    };

    primaryViewerRef.addHandler('viewport-change', syncPrimaryToSecond);
    secondViewer.addHandler('viewport-change', syncSecondToPrimary);
  }

  // Re-setup sync when toggled
  $effect(() => {
    if (syncViewports && primaryViewerRef && secondViewer) {
      setupViewportSync();
    }
  });

  // --- Curtain drag handling ---

  function handleCurtainDrag(e: MouseEvent) {
    if (!curtainContainerEl) return;
    const rect = curtainContainerEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    comparison.setCurtainPosition((x / rect.width) * 100);
  }

  $effect(() => {
    if (!isDraggingCurtain) return;

    const handleMove = (e: MouseEvent) => handleCurtainDrag(e);
    const handleUp = () => { isDraggingCurtain = false; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  });

  // --- Mode selector ---

  function handleModeChange(newMode: ComparisonMode) {
    comparison.setMode(newMode);
  }

  function handleOpacityChange(e: Event) {
    comparison.setOverlayOpacity(parseInt((e.target as HTMLInputElement).value) / 100);
  }

  function handleClose() {
    comparison.reset();
    if (secondViewer) {
      try {
        secondViewer.removeAllHandlers();
        secondViewer.destroy();
      } catch { /* ignore */ }
      secondViewer = null;
    }
  }
</script>

{#if mode !== 'off' && secondCanvas}
  <div class="absolute inset-0 z-30 flex flex-col">
    <!-- Comparison toolbar -->
    <div class={cn(
      'h-10 flex items-center justify-between px-3 border-b shrink-0',
      fieldMode ? 'bg-nb-black/95 border-nb-yellow/20' : 'bg-nb-white border-nb-black/10'
    )}>
      <div class="flex items-center gap-3">
        <span class={cn('text-xs font-semibold', accentColor)}>
          <Icon name="compare" class="text-sm mr-1" />
          Compare
        </span>

        <!-- Mode selector -->
        <div class="flex items-center gap-1">
          <IconButton
            icon="view_column"
            label="Side by side"
            onclick={() => handleModeChange('side-by-side')}
            size="sm"
            class={cn(mode === 'side-by-side' && 'bg-nb-blue/20')}
          />
          <IconButton
            icon="layers"
            label="Overlay"
            onclick={() => handleModeChange('overlay')}
            size="sm"
            class={cn(mode === 'overlay' && 'bg-nb-blue/20')}
          />
          <IconButton
            icon="vertical_split"
            label="Curtain"
            onclick={() => handleModeChange('curtain')}
            size="sm"
            class={cn(mode === 'curtain' && 'bg-nb-blue/20')}
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Overlay opacity slider -->
        {#if mode === 'overlay'}
          <div class="flex items-center gap-1.5">
            <span class={cn('text-[10px]', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}>
              Opacity
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(overlayOpacity * 100)}
              oninput={handleOpacityChange}
              class="w-20 h-1 accent-current"
            />
            <span class={cn('text-[10px] font-mono w-7', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}>
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        {/if}

        <!-- Sync toggle -->
        <Button
          variant={syncViewports ? 'primary' : 'ghost'}
          size="sm"
          onclick={() => comparison.toggleSyncViewports()}
        >
          <Icon name="sync" class="text-xs mr-0.5" />
          <span class="text-[10px]">Sync</span>
        </Button>

        <!-- Close comparison -->
        <Button variant="ghost" size="sm" onclick={handleClose}>
          <Icon name="close" class="text-sm" />
        </Button>
      </div>
    </div>

    <!-- Canvas labels -->
    <div class={cn(
      'flex items-center justify-between px-3 py-1 text-[10px] font-mono',
      fieldMode ? 'bg-nb-black/80 text-nb-yellow/50' : 'bg-nb-black/5 text-nb-black/40'
    )}>
      <span>A: {primaryLabel}</span>
      <span>B: {secondLabel}</span>
    </div>

    <!-- Comparison content -->
    <div class="flex-1 relative min-h-0">
      {#if mode === 'side-by-side'}
        <div class="flex h-full">
          <!-- Primary viewer takes left half (rendered by parent) -->
          <div class="flex-1 relative border-r border-dashed border-nb-black/20"></div>
          <!-- Secondary viewer -->
          <div class="flex-1 relative">
            <div bind:this={secondContainerEl} class="absolute inset-0"></div>
          </div>
        </div>
      {:else if mode === 'overlay'}
        <div class="relative h-full">
          <!-- Primary viewer underneath (rendered by parent) -->
          <div class="absolute inset-0"></div>
          <!-- Secondary viewer overlaid -->
          <div
            class="absolute inset-0"
            style:opacity={overlayOpacity}
            style:pointer-events={overlayOpacity > 0.1 ? 'auto' : 'none'}
          >
            <div bind:this={secondContainerEl} class="absolute inset-0"></div>
          </div>
        </div>
      {:else if mode === 'curtain'}
        <div bind:this={curtainContainerEl} class="relative h-full overflow-hidden">
          <!-- Primary viewer underneath (rendered by parent) -->
          <div class="absolute inset-0"></div>
          <!-- Secondary viewer with clip -->
          <div
            class="absolute inset-0"
            style:clip-path="inset(0 0 0 {curtainPosition}%)"
          >
            <div bind:this={secondContainerEl} class="absolute inset-0"></div>
          </div>
          <!-- Curtain handle -->
          <div
            class="absolute top-0 bottom-0 w-1 cursor-ew-resize z-10"
            style:left="{curtainPosition}%"
            style:transform="translateX(-50%)"
            onmousedown={() => { isDraggingCurtain = true; }}
            role="separator"
            aria-valuenow={curtainPosition}
            aria-valuemin={5}
            aria-valuemax={95}
            aria-label="Comparison curtain divider"
            tabindex="0"
          >
            <div class={cn('absolute inset-0', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')}></div>
            <div class={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-6 h-10 rounded flex items-center justify-center shadow-md',
              fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-blue text-white'
            )}>
              <Icon name="drag_indicator" class="text-sm" />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
