<!--
  GeoPreview -- Read-only mini map preview for IIIF navPlace.
  React source: src/features/metadata-edit/ui/molecules/GeoEditor.tsx (508 lines, component 2 of 2)
  Architecture: Molecule (non-interactive Leaflet map, auto-fit bounds, empty state icon)

  Separated from GeoEditor per Svelte one-component-per-file rule.
-->
<script module lang="ts">
  import { navPlaceService, TILE_URL, TILE_ATTRIBUTION } from '../../lib/navPlaceService';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    item: IIIFItem;
    height?: number;
    onClick?: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    item,
    height = 120,
    onClick,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  /* ── Local State ── */
  let mapContainer: HTMLDivElement | undefined = $state(undefined);
   
  let leafletMap: any = $state(null);
  let hasFeatures = $state(false);

  /* ── Derived ── */
  let navPlace = $derived(navPlaceService.getNavPlace(item));
  let isClickable = $derived(!!onClick);

  /* ── Leaflet Init Effect ── */
  /* eslint-disable @field-studio/lifecycle-restrictions -- Leaflet map init (external library, arch guide §7.A) */
  $effect(() => {
    if (!mapContainer) return;

    // Guard: no navPlace means nothing to render
    const np = navPlaceService.getNavPlace(item);
    if (!np) {
      hasFeatures = false;
      return;
    }

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Non-interactive map
      const map = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      leafletMap = map;

      // Load navPlace GeoJSON
      try {
        const geoJSON = navPlaceService.toGeoJSON(np);
        if (geoJSON) {
          const geoLayer = L.geoJSON(geoJSON, {
            pointToLayer: (_feature: unknown, latlng: { lat: number; lng: number }) => {
              return L.circleMarker([latlng.lat, latlng.lng], {
                radius: 6,
                fillColor: '#0055FF',
                color: '#000',
                weight: 2,
                fillOpacity: 0.7,
              });
            },
            style: () => ({
              color: '#0055FF',
              weight: 2,
              fillOpacity: 0.1,
            }),
          }).addTo(map);

          const bounds = geoLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
            hasFeatures = true;
          }
        }
      } catch {
        hasFeatures = false;
      }

      // Also try service-provided bounds
      if (!hasFeatures) {
        const b = navPlaceService.getBounds(np);
        if (b) {
          map.fitBounds([
            [b.south, b.west],
            [b.north, b.east],
          ]);
          hasFeatures = true;
        }
      }

      // Fallback view
      if (!hasFeatures) {
        map.setView([20, 0], 2);
      }
    };

    initMap();

    return () => {
      if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
      }
      hasFeatures = false;
    };
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */

  function handleClick() {
    if (onClick) onClick();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  }
</script>

{#if navPlace}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_static_element_interactions -->
  <div
    class={cn(
      'relative border border-nb-black/20 overflow-hidden',
      isClickable && 'cursor-pointer hover:border-nb-black/40 transition-colors',
      fieldMode && 'border-yellow-700/30',
      cx.surface
    )}
    style="height: {height}px"
    onclick={isClickable ? handleClick : undefined}
    onkeydown={isClickable ? handleKeydown : undefined}
    role={isClickable ? 'button' : 'img'}
    tabindex={isClickable ? 0 : undefined}
    aria-label="Geographic location preview"
  >
    <div bind:this={mapContainer} class="absolute inset-0"></div>

    <!-- Hover overlay for clickable state -->
    {#if isClickable}
      <div class={cn(
        'absolute inset-0 z-10 flex items-center justify-center',
        'bg-nb-black/0 hover:bg-nb-black/10 transition-colors',
        'pointer-events-none'
      )}>
        <span class={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-white/90 px-2 py-1 text-[10px] font-mono border border-nb-black/20'
        )}>
          Click to edit
        </span>
      </div>
    {/if}
  </div>
{:else}
  <!-- Empty State (no navPlace) -->
  {#if isClickable}
    <button
      type="button"
      class={cn(
        'relative border border-dashed border-nb-black/15 overflow-hidden',
        'flex items-center justify-center bg-nb-cream/30 cursor-pointer hover:border-nb-black/30 hover:bg-nb-cream/50 transition-colors',
        fieldMode && 'border-yellow-700/20 bg-yellow-50/20',
        cx.surface
      )}
      style="height: {height}px"
      onclick={handleClick}
      aria-label="Add geographic location"
    >
      <div class="text-center">
        <Icon
          name="map"
          class={cn(
            'text-2xl opacity-20',
            fieldMode && 'opacity-30'
          )}
        />
        <p class={cn(
          'text-[10px] font-mono opacity-30 mt-1',
          fieldMode && 'opacity-40'
        )}>
          Click to add location
        </p>
      </div>
    </button>
  {:else}
    <div
      class={cn(
        'relative border border-dashed border-nb-black/15 overflow-hidden',
        'flex items-center justify-center bg-nb-cream/30',
        fieldMode && 'border-yellow-700/20 bg-yellow-50/20',
        cx.surface
      )}
      style="height: {height}px"
      aria-label="No geographic location set"
    >
      <div class="text-center">
        <Icon
          name="map"
          class={cn(
            'text-2xl opacity-20',
            fieldMode && 'opacity-30'
          )}
        />
        <p class={cn(
          'text-[10px] font-mono opacity-30 mt-1',
          fieldMode && 'opacity-40'
        )}>
          No location
        </p>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Leaflet CSS is loaded from CDN; ensure container sizing */
  :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    font-family: inherit;
  }
</style>
