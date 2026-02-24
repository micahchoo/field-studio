<!--
  MapView.svelte — Geographic Map View
  ======================================
  React source: src/features/map/ui/organisms/MapView.tsx

  ARCHITECTURE:
  - Feature organism: Geotagged canvas display with clustering
  - Uses PaneLayout with variant="canvas" (overflow-hidden)
  - Map rendering is custom (pixel-positioned markers via geoToPixel)
  - No external map library — pure CSS/div positioning

  PROPS:
  - root: IIIFItem — IIIF tree
  - cx: ContextualClassNames
  - fieldMode: boolean
  - t: TerminologyFn
  - isAdvanced: boolean
  - onSelect: (item: IIIFItem) => void
  - onSwitchView: (mode: string) => void
-->

<script lang="ts">
  import { PaneLayout, Row } from '@/src/shared/ui/layout';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Center from '@/src/shared/ui/layout/primitives/Center.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { MapStore } from '@/src/features/map/stores/map.svelte';
  import type { GeoItem, Cluster } from '@/src/features/map/stores/map.svelte';
  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    root: IIIFItem;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string, fallback?: string) => string;
    isAdvanced: boolean;
    onSelect: (item: IIIFItem) => void;
    onSwitchView: (mode: string) => void;
  }

  let { root, cx, fieldMode, t, isAdvanced, onSelect, onSwitchView }: Props = $props();

  // ── Feature Store ──
  const map = new MapStore();

  // ── Local State ──
  let containerEl = $state<HTMLDivElement | undefined>(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(600);

  // ── Derived ──
  const hasItems = $derived(map.hasGeoData);
  const clusters = $derived(map.clusters);
  const geoItems = $derived(map.geoItems);
  const hoveredId = $derived(map.hoveredItemId);
  const selectedClusterId = $derived(map.selectedClusterId);

  // Find the hovered geo item for tooltip rendering
  const hoveredGeoItem = $derived(
    hoveredId ? geoItems.find((g) => g.id === hoveredId) ?? null : null
  );

  // Find the selected cluster for popup rendering
  const selectedCluster = $derived(
    selectedClusterId ? clusters.find((c) => c.id === selectedClusterId) ?? null : null
  );

  // ── Effects ──

  // Initialize map store from root's items (canvases with metadata)
  $effect(() => {
    // @migration: root.items may be canvases or manifests; extract canvas-level metadata
    const items = root.items ?? [];
    const canvases = items
      .filter((item: IIIFItem) => item.type === 'Canvas' || item.type === 'Manifest')
      .flatMap((item: IIIFItem) => {
        if (item.type === 'Canvas') return [item];
        // For manifests, extract their child canvases
        return item.items ?? [];
      })
      .map((canvas: IIIFItem) => ({
        id: canvas.id,
        label: getIIIFValue(canvas.label) || canvas.id,
        metadata: canvas.metadata?.map((m) => ({
          label: getIIIFValue(m.label),
          value: getIIIFValue(m.value),
        })),
      }));

    map.loadFromManifest(canvases);
  });

  // Observe container size for pixel projection accuracy
  $effect(() => {
    const el = containerEl;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  // ── Handlers ──
  function handleClusterClick(cluster: Cluster): void {
    if (cluster.items.length === 1) {
      // Single-item cluster: select directly
      onSelect({ id: cluster.items[0].canvasId, type: 'Canvas' } as IIIFItem);
    } else {
      map.selectCluster(cluster.id);
    }
  }

  function handleMarkerClick(item: GeoItem): void {
    onSelect({ id: item.canvasId, type: 'Canvas' } as IIIFItem);
  }

  function handleMarkerHover(item: GeoItem | null): void {
    map.setHoveredItem(item?.id ?? null);
  }

  function handleClusterItemClick(item: GeoItem): void {
    map.selectCluster(null);
    onSelect({ id: item.canvasId, type: 'Canvas' } as IIIFItem);
  }

  function handleZoomIn(): void {
    map.zoomIn();
  }

  function handleZoomOut(): void {
    map.zoomOut();
  }

  function handleResetView(): void {
    map.resetView();
  }

  function dismissClusterPopup(): void {
    map.selectCluster(null);
  }

  // ── Panning via pointer drag ──
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);
  let panOriginX = $state(0);
  let panOriginY = $state(0);

  function handlePointerDown(e: PointerEvent): void {
    // Only initiate pan on the background (not markers/clusters)
    if ((e.target as HTMLElement).closest('[data-marker], [data-cluster], [data-popup]')) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOriginX = map.panX;
    panOriginY = map.panY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    map.setPan(panOriginX + dx, panOriginY + dy);
  }

  function handlePointerUp(): void {
    isPanning = false;
  }
</script>

<PaneLayout variant="canvas">
  {#snippet header()}
    <ViewHeader {cx}>
      {#snippet title()}
        <span class={cn('font-mono uppercase text-sm font-semibold', cx.text)}>
          {t('map', 'Map')}
        </span>
        {#if hasItems}
          <span class={cn(
            'ml-2 px-1.5 py-0.5 rounded text-xs font-bold',
            cx.accent || 'bg-nb-black text-nb-white'
          )}>
            {map.itemCount}
          </span>
        {/if}
      {/snippet}

      {#snippet actions()}
        <Row gap="xs">
          <Button
            variant="ghost"
            size="sm"
            onclick={handleZoomIn}
            aria-label={t('zoomIn', 'Zoom in')}
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={handleResetView}
            aria-label={t('resetZoom', 'Reset zoom')}
          >
            {t('reset', 'Reset')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={handleZoomOut}
            aria-label={t('zoomOut', 'Zoom out')}
          >
            &minus;
          </Button>
        </Row>
      {/snippet}
    </ViewHeader>
  {/snippet}

  {#snippet body()}
    {#if !hasItems}
      <Center flex class="h-full">
        <div class={cn('text-center p-8', cx.textMuted || 'text-nb-black/50')}>
          <div class="text-4xl mb-4" aria-hidden="true">&#x1f5fa;</div>
          <p class="text-lg font-medium">{t('noGeoItems', 'No geotagged items')}</p>
          <p class="text-sm mt-2">
            {t('noGeoItemsHint', 'Add GPS coordinates to canvas metadata to see them on the map.')}
          </p>
        </div>
      </Center>
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        bind:this={containerEl}
        class={cn(
          'h-full w-full relative select-none',
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style="background: radial-gradient(circle at 30% 40%, rgba(0, 85, 255, 0.08) 0%, transparent 60%),
               radial-gradient(circle at 70% 60%, rgba(0, 204, 102, 0.06) 0%, transparent 50%),
               linear-gradient(135deg, {fieldMode ? '#1a1a00' : '#f8f6f0'} 0%, {fieldMode ? '#0d0d00' : '#eee8d5'} 100%);"
        role="img"
        aria-label={t('mapAria', 'Geographic map of geotagged items')}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointercancel={handlePointerUp}
      >
        <!-- Grid pattern overlay -->
        <div
          class="absolute inset-0 pointer-events-none opacity-10"
          style="background-image:
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
            background-size: {40 * map.zoom}px {40 * map.zoom}px;
            background-position: {map.panX}px {map.panY}px;"
          aria-hidden="true"
        ></div>

        <!-- Cluster badges: circles with item counts -->
        {#each clusters as cluster (cluster.id)}
          {#if cluster.items.length > 1}
            {@const pos = map.geoToPixel(cluster.centerLat, cluster.centerLng, containerWidth, containerHeight)}
            {@const size = Math.min(24 + cluster.items.length * 4, 56)}
            <button
              data-cluster
              class={cn(
                'absolute rounded-full flex items-center justify-center font-mono font-bold text-xs',
                'border-2 transition-transform hover:scale-110 z-10',
                cx.accent || 'bg-nb-black text-nb-white border-nb-black',
                selectedClusterId === cluster.id && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
              )}
              style="left: {pos.x}px; top: {pos.y}px; transform: translate(-50%, -50%); width: {size}px; height: {size}px;"
              onclick={() => handleClusterClick(cluster)}
              aria-label="{cluster.items.length} {t('itemsInCluster', 'items in this area')}"
            >
              {cluster.items.length}
            </button>
          {/if}
        {/each}

        <!-- Individual markers (single-item clusters or all items if no clustering overlap) -->
        {#each clusters as cluster (cluster.id)}
          {#if cluster.items.length === 1}
            {@const item = cluster.items[0]}
            {@const pos = map.geoToPixel(item.lat, item.lng, containerWidth, containerHeight)}
            <button
              data-marker
              class={cn(
                'absolute w-8 h-8 rounded-full overflow-hidden border-2',
                'transition-all hover:scale-125 hover:z-20 z-10',
                hoveredId === item.id ? 'scale-125 z-20 ring-2 ring-blue-500' : '',
                cx.border || 'border-nb-black',
                cx.surface || 'bg-nb-white'
              )}
              style="left: {pos.x}px; top: {pos.y}px; transform: translate(-50%, -50%);"
              onclick={() => handleMarkerClick(item)}
              onmouseenter={() => handleMarkerHover(item)}
              onmouseleave={() => handleMarkerHover(null)}
              onfocus={() => handleMarkerHover(item)}
              onblur={() => handleMarkerHover(null)}
              aria-label="{item.label} ({map.formatCoordinates(item.lat, item.lng)})"
            >
              <!-- @migration: thumbnail URL would come from canvas thumbnail resolution -->
              <div
                class={cn('w-full h-full flex items-center justify-center text-xs font-bold', cx.accent || 'bg-nb-cream text-nb-black')}
                aria-hidden="true"
              >
                {item.label.charAt(0).toUpperCase()}
              </div>
            </button>
          {/if}
        {/each}

        <!-- Hover tooltip -->
        {#if hoveredGeoItem}
          {@const pos = map.geoToPixel(hoveredGeoItem.lat, hoveredGeoItem.lng, containerWidth, containerHeight)}
          <div
            class={cn(
              'absolute z-50 px-3 py-2 rounded shadow-lg pointer-events-none',
              'border-2 max-w-[200px]',
              cx.surface || 'bg-nb-white',
              cx.border || 'border-nb-black'
            )}
            style="left: {pos.x + 24}px; top: {pos.y - 12}px;"
            role="tooltip"
          >
            <p class={cn('text-sm font-semibold truncate', cx.text || 'text-nb-black')}>
              {hoveredGeoItem.label}
            </p>
            {#if isAdvanced}
              <p class={cn('text-xs mt-0.5', cx.textMuted || 'text-nb-black/50')}>
                {map.formatCoordinates(hoveredGeoItem.lat, hoveredGeoItem.lng)}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Cluster popup (expanded grid of items) -->
        {#if selectedCluster}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            data-popup
            class={cn(
              'absolute z-50 p-4 rounded-lg shadow-xl border-2 max-w-[320px]',
              cx.surface || 'bg-nb-white',
              cx.border || 'border-nb-black'
            )}
            style="left: 50%; top: 50%; transform: translate(-50%, -50%);"
            role="dialog"
            aria-label="{selectedCluster.items.length} {t('clusteredItems', 'clustered items')}"
            onkeydown={(e) => { if (e.key === 'Escape') dismissClusterPopup(); }}
            tabindex="0"
          >
            <div class="flex items-center justify-between mb-3">
              <span class={cn('text-sm font-bold', cx.text || 'text-nb-black')}>
                {selectedCluster.items.length} {t('items', 'items')}
              </span>
              <Button
                variant="ghost"
                size="bare"
                onclick={dismissClusterPopup}
                aria-label={t('closeCluster', 'Close cluster popup')}
                class="text-lg leading-none"
              >
                &#x2715;
              </Button>
            </div>
            <div class="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
              {#each selectedCluster.items as item (item.id)}
                <button
                  class={cn(
                    'rounded overflow-hidden border-2 transition-colors hover:border-blue-500',
                    cx.border || 'border-nb-black/20'
                  )}
                  onclick={() => handleClusterItemClick(item)}
                  aria-label={item.label}
                >
                  <div
                    class={cn('w-full aspect-square flex items-center justify-center text-sm font-bold', cx.accent || 'bg-nb-cream text-nb-black')}
                  >
                    {item.label.charAt(0).toUpperCase()}
                  </div>
                  <p class={cn('text-[10px] p-1 truncate text-center', cx.textMuted || 'text-nb-black/60')}>
                    {item.label}
                  </p>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Coordinates / bounds display (advanced mode) -->
        {#if isAdvanced && map.bounds}
          <div
            class={cn(
              'absolute bottom-2 left-2 text-[10px] font-mono px-2 py-1 rounded border',
              cx.surface || 'bg-nb-white/90',
              cx.border || 'border-nb-black/20',
              cx.textMuted || 'text-nb-black/60'
            )}
            aria-live="polite"
          >
            <span>{t('bounds', 'Bounds')}: {map.formatBounds()}</span>
            <span class="ml-2">{t('zoom', 'Zoom')}: {map.zoom.toFixed(1)}x</span>
          </div>
        {/if}

        <!-- Zoom level indicator (bottom right) -->
        <div
          class={cn(
            'absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 rounded border',
            cx.surface || 'bg-nb-white/90',
            cx.border || 'border-nb-black/20',
            cx.textMuted || 'text-nb-black/60'
          )}
          aria-hidden="true"
        >
          {map.itemCount} {t('points', 'points')}
        </div>
      </div>
    {/if}
  {/snippet}
</PaneLayout>
