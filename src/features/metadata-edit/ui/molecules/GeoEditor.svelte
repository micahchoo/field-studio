<!--
  GeoEditor -- Full map editor with Leaflet for IIIF navPlace properties.
  React source: src/features/metadata-edit/ui/molecules/GeoEditor.tsx (508 lines, component 1 of 2)
  Architecture: Molecule (composes Button + Icon, Leaflet side-effects in $effect)

  Features:
  - Dynamic Leaflet import (CDN)
  - Map initialization with OSM tiles
  - navPlace loading (GeoJSON -> Leaflet layers)
  - Draw modes: marker (click on map), bounds (current viewport)
  - Geocoding search (navPlaceService.geocode)
  - Search results dropdown
  - Feature management (add, clear)
  - Status bar (feature count, current center coordinates)
  - Draw mode indicator overlay
-->
<script module lang="ts">
  /* ── NavPlace types (stubbed until navPlaceService migration) ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NavPlace = any;

  export type GeoFeature = {
    type: 'Feature';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: any;
    properties: Record<string, unknown>;
  };

  export type GeocodedLocation = {
    name: string;
    lat: number;
    lng: number;
    bounds?: { north: number; south: number; east: number; west: number };
  };

  export type LatLng = { lat: number; lng: number };

  export type DrawMode = 'none' | 'marker' | 'bounds';

  /* ── Stubbed navPlaceService ── */

  const navPlaceService = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNavPlace: (item: any): NavPlace | null => (item as any).navPlace || null,
    toGeoJSON: (np: NavPlace): NavPlace => np,
    getBounds: (_np: NavPlace): { north: number; south: number; east: number; west: number } | null => null,
    createPointFeature: (lat: number, lng: number, props?: Record<string, unknown>): GeoFeature => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: props || {},
    }),
    createBoundsFeature: (bounds: { north: number; south: number; east: number; west: number }): GeoFeature => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [bounds.west, bounds.south],
          [bounds.east, bounds.south],
          [bounds.east, bounds.north],
          [bounds.west, bounds.north],
          [bounds.west, bounds.south],
        ]],
      },
      properties: {},
    }),
    geocode: async (_query: string): Promise<GeocodedLocation[]> => [],
    formatCoordinates: (lat: number, lng: number): string =>
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  };

  /* ── Constants ── */
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';
  const DEFAULT_CENTER: LatLng = { lat: 20, lng: 0 };
  const DEFAULT_ZOOM = 2;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    item: IIIFItem;
    onChange: (navPlace: NavPlace | null) => void;
    height?: number;
    editable?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    item,
    onChange,
    height = 300,
    editable = true,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  /* ── Local State ── */
  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leafletMap: any = $state(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let drawnItems: any = $state(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let L: any = $state(null);

  let searchQuery = $state('');
  let searchResults = $state<GeocodedLocation[]>([]);
  let isSearching = $state(false);
  let showSearchResults = $state(false);
  let currentCenter = $state<LatLng>(DEFAULT_CENTER);
  let drawMode = $state<DrawMode>('none');
  let featureCount = $state(0);

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  /* ── Derived ── */
  let statusText = $derived(
    `${featureCount} feature${featureCount !== 1 ? 's' : ''} | ${navPlaceService.formatCoordinates(currentCenter.lat, currentCenter.lng)}`
  );

  let drawModeLabel = $derived(
    drawMode === 'marker' ? 'Click map to place marker'
    : drawMode === 'bounds' ? 'Click to capture current viewport as bounds'
    : ''
  );

  /* ── Leaflet Init Effect ── */
  /* eslint-disable @field-studio/lifecycle-restrictions -- Leaflet map init (external library, arch guide §7.A) */
  $effect(() => {
    if (!mapContainer) return;

    const initMap = async () => {
      // Dynamic Leaflet import
      const leaflet = (await import('leaflet')).default;
      L = leaflet;

      // Create map
      const map = leaflet.map(mapContainer, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      leaflet.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      // Feature group for drawn items
      const items = leaflet.featureGroup().addTo(map);
      drawnItems = items;
      leafletMap = map;

      // Load existing navPlace
      loadNavPlace(leaflet, map, items);

      // Map move handler -- update center
      map.on('moveend', () => {
        const center = map.getCenter();
        currentCenter = { lat: center.lat, lng: center.lng };
      });

      // Map click handler -- drawing modes
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        if (!editable) return;

        if (drawMode === 'marker') {
          addMarkerFeature(leaflet, items, e.latlng.lat, e.latlng.lng);
          setDrawMode('none');
        } else if (drawMode === 'bounds') {
          addBoundsFeature(leaflet, map, items);
          setDrawMode('none');
        }
      });

      // Initial center
      const center = map.getCenter();
      currentCenter = { lat: center.lat, lng: center.lng };
    };

    initMap();

    return () => {
      if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
      }
      drawnItems = null;
      L = null;
    };
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */

  /* ── navPlace Loading ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadNavPlace(leaflet: any, map: any, items: any) {
    const navPlace = navPlaceService.getNavPlace(item);
    if (!navPlace) return;

    try {
      const geoJSON = navPlaceService.toGeoJSON(navPlace);
      if (!geoJSON) return;

      const geoLayer = leaflet.geoJSON(geoJSON, {
        pointToLayer: (feature: GeoFeature, latlng: LatLng) => {
          return leaflet.marker([latlng.lat, latlng.lng]);
        },
      });

      geoLayer.eachLayer((layer: { addTo: (group: unknown) => void }) => {
        layer.addTo(items);
      });

      updateFeatureCount(items);

      // Fit map to loaded features
      const bounds = items.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch {
      // Silently handle invalid GeoJSON
    }
  }

  /* ── Feature Management ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addMarkerFeature(leaflet: any, items: any, lat: number, lng: number) {
    const marker = leaflet.marker([lat, lng]);
    marker.addTo(items);
    updateFeatureCount(items);
    emitChange(items);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addBoundsFeature(leaflet: any, map: any, items: any) {
    const bounds = map.getBounds();
    const rect = leaflet.rectangle(bounds, {
      color: '#0055FF',
      weight: 2,
      fillOpacity: 0.1,
    });
    rect.addTo(items);
    updateFeatureCount(items);
    emitChange(items);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateFeatureCount(items: any) {
    featureCount = items ? items.getLayers().length : 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emitChange(items: any) {
    if (!items) return;
    const layers = items.getLayers();
    if (layers.length === 0) {
      onChange(null);
      return;
    }

    const features: GeoFeature[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layers.forEach((layer: any) => {
      if (layer.getLatLng) {
        // Marker
        const ll = layer.getLatLng();
        features.push(navPlaceService.createPointFeature(ll.lat, ll.lng));
      } else if (layer.getBounds) {
        // Rectangle/Polygon
        const b = layer.getBounds();
        features.push(navPlaceService.createBoundsFeature({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        }));
      }
    });

    const navPlace: NavPlace = {
      id: '',
      type: 'Feature' as const,
      features,
    };
    onChange(navPlace);
  }

  function clearFeatures() {
    if (!drawnItems) return;
    drawnItems.clearLayers();
    featureCount = 0;
    onChange(null);
  }

  /* ── Draw Mode ── */
  function setDrawMode(mode: DrawMode) {
    drawMode = mode;
    // Update map cursor
    if (leafletMap) {
      const container = leafletMap.getContainer() as HTMLElement;
      container.style.cursor = mode === 'none' ? '' : 'crosshair';
    }
  }

  function toggleDrawMode(mode: DrawMode) {
    setDrawMode(drawMode === mode ? 'none' : mode);
  }

  /* ── Geocoding Search ── */
  function handleSearchInput(value: string) {
    searchQuery = value;

    if (searchTimeout) clearTimeout(searchTimeout);

    if (value.trim().length < 2) {
      searchResults = [];
      showSearchResults = false;
      return;
    }

    searchTimeout = setTimeout(async () => {
      isSearching = true;
      try {
        const results = await navPlaceService.geocode(value.trim());
        searchResults = results;
        showSearchResults = results.length > 0;
      } catch {
        searchResults = [];
        showSearchResults = false;
      } finally {
        isSearching = false;
      }
    }, 300);
  }

  function selectSearchResult(result: GeocodedLocation) {
    if (!leafletMap || !L) return;

    if (result.bounds) {
      leafletMap.fitBounds([
        [result.bounds.south, result.bounds.west],
        [result.bounds.north, result.bounds.east],
      ]);
    } else {
      leafletMap.setView([result.lat, result.lng], 14);
    }

    // Add marker at geocoded location
    if (editable && drawnItems) {
      addMarkerFeature(L, drawnItems, result.lat, result.lng);
    }

    searchQuery = result.name;
    showSearchResults = false;
    searchResults = [];
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showSearchResults = false;
      searchResults = [];
    }
  }

  function handleSearchBlur() {
    // Delay to allow click on result
    setTimeout(() => {
      showSearchResults = false;
    }, 200);
  }
</script>

<div
  class={cn(
    'relative border-2 border-nb-black/20 overflow-hidden',
    fieldMode && 'border-yellow-700/40',
    cx.surface
  )}
  style="height: {height}px"
  role="application"
  aria-label="Geographic location editor"
>
  <!-- Map Container -->
  <div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

  {#if editable}
    <!-- Toolbar Overlay -->
    <div class={cn(
      'absolute top-2 left-2 right-2 z-[1000] flex items-start gap-2'
    )}>
      <!-- Search -->
      <div class="relative flex-1">
        <div class={cn(
          'flex items-center bg-white/95 border-2 border-nb-black/30',
          'backdrop-blur-sm shadow-sm',
          fieldMode && 'border-yellow-700/40 bg-yellow-50/95'
        )}>
          <Icon name="search" class="text-base ml-2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            oninput={(e) => handleSearchInput(e.currentTarget.value)}
            onkeydown={handleSearchKeydown}
            onblur={handleSearchBlur}
            placeholder="Search location..."
            class={cn(
              'flex-1 px-2 py-1.5 text-xs bg-transparent border-none outline-none',
              'font-mono placeholder:opacity-40'
            )}
          />
          {#if isSearching}
            <span class="mr-2 text-xs opacity-50 animate-pulse">...</span>
          {/if}
        </div>

        <!-- Search Results Dropdown -->
        {#if showSearchResults && searchResults.length > 0}
          <div class={cn(
            'absolute top-full left-0 right-0 mt-0.5 bg-white/95 border-2 border-nb-black/20',
            'max-h-48 overflow-y-auto shadow-md backdrop-blur-sm z-[1001]',
            fieldMode && 'bg-yellow-50/95 border-yellow-700/30'
          )}>
            {#each searchResults as result (result.name + result.lat + result.lng)}
              <button
                type="button"
                class={cn(
                  'w-full text-left px-3 py-2 text-xs font-mono',
                  'hover:bg-nb-black/5 transition-colors border-b border-nb-black/10 last:border-b-0',
                  fieldMode && 'hover:bg-yellow-100/50'
                )}
                onclick={() => selectSearchResult(result)}
              >
                <span class="block font-semibold truncate">{result.name}</span>
                <span class="block text-[10px] opacity-50 mt-0.5">
                  {navPlaceService.formatCoordinates(result.lat, result.lng)}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Tool Buttons -->
      <div class={cn(
        'flex gap-1 bg-white/95 border-2 border-nb-black/30 p-0.5',
        'backdrop-blur-sm shadow-sm',
        fieldMode && 'border-yellow-700/40 bg-yellow-50/95'
      )}>
        <Button
          variant="ghost"
          size="bare"
          onclick={() => toggleDrawMode('marker')}
          title="Place marker"
          aria-label="Place marker"
          class={cn(
            'p-1.5 text-xs',
            drawMode === 'marker' && 'bg-nb-blue/20 text-nb-blue'
          )}
        >
          {#snippet icon()}
            <Icon name="place" class="text-sm" />
          {/snippet}
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={() => toggleDrawMode('bounds')}
          title="Capture viewport bounds"
          aria-label="Capture viewport bounds"
          class={cn(
            'p-1.5 text-xs',
            drawMode === 'bounds' && 'bg-nb-blue/20 text-nb-blue'
          )}
        >
          {#snippet icon()}
            <Icon name="crop_free" class="text-sm" />
          {/snippet}
        </Button>

        <div class="w-px bg-nb-black/20 my-0.5"></div>

        <Button
          variant="ghost"
          size="bare"
          onclick={clearFeatures}
          title="Clear all features"
          aria-label="Clear all features"
          class="p-1.5 text-xs hover:text-nb-red"
          disabled={featureCount === 0}
        >
          {#snippet icon()}
            <Icon name="delete_outline" class="text-sm" />
          {/snippet}
        </Button>
      </div>
    </div>

    <!-- Draw Mode Indicator -->
    {#if drawMode !== 'none'}
      <div class={cn(
        'absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000]',
        'bg-nb-black/80 text-white text-xs font-mono px-3 py-1.5',
        'pointer-events-none select-none'
      )}>
        {drawModeLabel}
        <span class="ml-2 opacity-60">(Esc to cancel)</span>
      </div>
    {/if}
  {/if}

  <!-- Status Bar -->
  <div class={cn(
    'absolute bottom-0 left-0 right-0 z-[1000]',
    'bg-white/90 backdrop-blur-sm border-t border-nb-black/10',
    'px-3 py-1 flex items-center justify-between',
    'text-[10px] font-mono opacity-70',
    fieldMode && 'bg-yellow-50/90 border-yellow-700/20'
  )}>
    <span>{statusText}</span>
    {#if editable && drawMode !== 'none'}
      <button
        type="button"
        class="text-nb-red hover:underline cursor-pointer"
        onclick={() => setDrawMode('none')}
      >
        Cancel draw
      </button>
    {/if}
  </div>

  <!-- Loading / Empty State -->
  {#if !leafletMap}
    <div class="absolute inset-0 flex items-center justify-center bg-nb-cream/80 z-[999]">
      <div class="text-center">
        <Icon name="map" class="text-3xl opacity-30" />
        <p class="text-xs font-mono opacity-40 mt-1">Loading map...</p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Leaflet CSS is loaded from CDN; ensure container sizing */
  :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    font-family: inherit;
  }
</style>
