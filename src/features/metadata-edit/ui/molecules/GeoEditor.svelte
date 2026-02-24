<!--
  GeoEditor -- Full map editor with Leaflet for IIIF navPlace properties.
  Architecture: Molecule (composes GeoEditorToolbar + GeoEditorStatusBar atoms)
-->
<script module lang="ts">
  // Re-export types for consumers that import from this module
  export type { NavPlace, GeoFeature, GeocodedLocation, LatLng, DrawMode } from '../../lib/navPlaceService';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type { GeoFeature, LatLng, GeocodedLocation } from '../../lib/navPlaceService';
  import type { DrawMode, NavPlace } from '../../lib/navPlaceService';
  import {
    navPlaceService, TILE_URL, TILE_ATTRIBUTION,
    DEFAULT_CENTER, DEFAULT_ZOOM,
  } from '../../lib/navPlaceService';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import GeoEditorToolbar from '../atoms/GeoEditorToolbar.svelte';
  import GeoEditorStatusBar from '../atoms/GeoEditorStatusBar.svelte';

  interface Props {
    item: IIIFItem;
    onChange: (navPlace: NavPlace | null) => void;
    height?: number;
    editable?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    item, onChange,
    height = 300, editable = true,
    cx = {}, fieldMode = false,
  }: Props = $props();

  /* Local State */
  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let leafletMap: any = $state(null);
  let drawnItems: any = $state(null);
  let L: any = $state(null);
  let searchQuery = $state('');
  let searchResults = $state<GeocodedLocation[]>([]);
  let isSearching = $state(false);
  let showSearchResults = $state(false);
  let currentCenter = $state<LatLng>(DEFAULT_CENTER);
  let drawMode = $state<DrawMode>('none');
  let featureCount = $state(0);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  /* Derived */
  let statusText = $derived(
    `${featureCount} feature${featureCount !== 1 ? 's' : ''} | ${navPlaceService.formatCoordinates(currentCenter.lat, currentCenter.lng)}`
  );
  let drawModeLabel = $derived(
    drawMode === 'marker' ? 'Click map to place marker'
    : drawMode === 'bounds' ? 'Click to capture current viewport as bounds'
    : ''
  );

  /* Leaflet Init Effect */
  /* eslint-disable @field-studio/lifecycle-restrictions -- Leaflet map init (external library, arch guide §7.A) */
  $effect(() => {
    if (!mapContainer) return;
    const initMap = async () => {
      const leaflet = (await import('leaflet')).default;
      L = leaflet;
      const map = leaflet.map(mapContainer, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: DEFAULT_ZOOM, zoomControl: true,
      });
      leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      const items = leaflet.featureGroup().addTo(map);
      drawnItems = items;
      leafletMap = map;
      loadNavPlace(leaflet, map, items);
      map.on('moveend', () => {
        const c = map.getCenter();
        currentCenter = { lat: c.lat, lng: c.lng };
      });
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        if (!editable) return;
        if (drawMode === 'marker') { addMarkerFeature(leaflet, items, e.latlng.lat, e.latlng.lng); setDrawMode('none'); }
        else if (drawMode === 'bounds') { addBoundsFeature(leaflet, map, items); setDrawMode('none'); }
      });
      currentCenter = { lat: map.getCenter().lat, lng: map.getCenter().lng };
    };
    initMap();
    return () => {
      if (leafletMap) { leafletMap.remove(); leafletMap = null; }
      drawnItems = null; L = null;
    };
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */

  function loadNavPlace(leaflet: any, map: any, items: any) {
    const np = navPlaceService.getNavPlace(item);
    if (!np) return;
    try {
      const geoJSON = navPlaceService.toGeoJSON(np);
      if (!geoJSON) return;
      const geoLayer = leaflet.geoJSON(geoJSON, {
        pointToLayer: (_f: GeoFeature, ll: LatLng) => leaflet.marker([ll.lat, ll.lng]),
      });
      geoLayer.eachLayer((layer: { addTo: (g: unknown) => void }) => { layer.addTo(items); });
      updateFeatureCount(items);
      const bounds = items.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    } catch { /* Silently handle invalid GeoJSON */ }
  }

  function addMarkerFeature(leaflet: any, items: any, lat: number, lng: number) {
    leaflet.marker([lat, lng]).addTo(items);
    updateFeatureCount(items); emitChange(items);
  }

  function addBoundsFeature(leaflet: any, map: any, items: any) {
    leaflet.rectangle(map.getBounds(), { color: '#0055FF', weight: 2, fillOpacity: 0.1 }).addTo(items);
    updateFeatureCount(items); emitChange(items);
  }

  function updateFeatureCount(items: any) { featureCount = items ? items.getLayers().length : 0; }

  function emitChange(items: any) {
    if (!items) return;
    const layers = items.getLayers();
    if (layers.length === 0) { onChange(null); return; }
    const features: GeoFeature[] = [];
    layers.forEach((layer: any) => {
      if (layer.getLatLng) {
        const ll = layer.getLatLng();
        features.push(navPlaceService.createPointFeature(ll.lat, ll.lng));
      } else if (layer.getBounds) {
        const b = layer.getBounds();
        features.push(navPlaceService.createBoundsFeature({
          north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(),
        }));
      }
    });
    onChange({ id: '', type: 'Feature' as const, features });
  }

  function clearFeatures() {
    if (!drawnItems) return;
    drawnItems.clearLayers(); featureCount = 0; onChange(null);
  }

  function setDrawMode(mode: DrawMode) {
    drawMode = mode;
    if (leafletMap) (leafletMap.getContainer() as HTMLElement).style.cursor = mode === 'none' ? '' : 'crosshair';
  }

  function toggleDrawMode(mode: DrawMode) { setDrawMode(drawMode === mode ? 'none' : mode); }

  function handleSearchInput(value: string) {
    searchQuery = value;
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.trim().length < 2) { searchResults = []; showSearchResults = false; return; }
    searchTimeout = setTimeout(async () => {
      isSearching = true;
      try {
        const results = await navPlaceService.geocode(value.trim());
        searchResults = results; showSearchResults = results.length > 0;
      } catch { searchResults = []; showSearchResults = false; }
      finally { isSearching = false; }
    }, 300);
  }

  function selectSearchResult(result: GeocodedLocation) {
    if (!leafletMap || !L) return;
    if (result.bounds) {
      leafletMap.fitBounds([[result.bounds.south, result.bounds.west], [result.bounds.north, result.bounds.east]]);
    } else { leafletMap.setView([result.lat, result.lng], 14); }
    if (editable && drawnItems) addMarkerFeature(L, drawnItems, result.lat, result.lng);
    searchQuery = result.name; showSearchResults = false; searchResults = [];
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { showSearchResults = false; searchResults = []; }
  }

  function handleSearchBlur() { setTimeout(() => { showSearchResults = false; }, 200); }
</script>

<div
  class={cn('relative border-2 border-nb-black/20 overflow-hidden', fieldMode && 'border-yellow-700/40', cx.surface)}
  style="height: {height}px"
  role="application"
  aria-label="Geographic location editor"
>
  <div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

  {#if editable}
    <GeoEditorToolbar
      {searchQuery} {isSearching} {showSearchResults} {searchResults} {drawMode} {featureCount}
      onSearchInput={handleSearchInput} onSearchKeydown={handleSearchKeydown} onSearchBlur={handleSearchBlur}
      onSelectResult={selectSearchResult} onToggleDrawMode={toggleDrawMode} onClearFeatures={clearFeatures}
      formatCoordinates={navPlaceService.formatCoordinates} {fieldMode}
    />
    {#if drawMode !== 'none'}
      <div class={cn(
        'absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000]',
        'bg-nb-black/80 text-white text-xs font-mono px-3 py-1.5 pointer-events-none select-none'
      )}>
        {drawModeLabel} <span class="ml-2 opacity-60">(Esc to cancel)</span>
      </div>
    {/if}
  {/if}

  <GeoEditorStatusBar {statusText} {drawMode} {editable} onCancelDraw={() => setDrawMode('none')} {fieldMode} />

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
  :global(.leaflet-container) { width: 100%; height: 100%; font-family: inherit; }
</style>
