<!--
  LocationPickerModal -- Modal for picking GPS coordinates on a map.
  React source: src/features/metadata-edit/ui/molecules/LocationPickerModal.tsx (121 lines)
  Architecture: Molecule (composes ModalDialog + Button, Leaflet side-effects in $effect)
-->
<script module lang="ts">
  // Leaflet is loaded globally via CDN
  declare const L: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const TILE_LAYER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';

  interface Props {
    isOpen: boolean;
    initialValue: string;
    onSave: (val: string) => void;
    onClose: () => void;
  }

  let {
    isOpen = $bindable(),
    initialValue,
    onSave,
    onClose,
  }: Props = $props();

  let coords = $state<{ lat: number; lng: number } | null>(null);
  let mapEl: HTMLDivElement | undefined = $state();

  // Minimal cx for ModalDialog (LocationPickerModal has no fieldMode prop)
  const modalCx: ContextualClassNames = {
    surface: 'bg-nb-white border-2 border-nb-black',
    text: 'text-nb-black',
    accent: 'text-nb-green',
  };

  /* eslint-disable @field-studio/lifecycle-restrictions -- Leaflet map init (external library, arch guide §7.A) */
  $effect(() => {
    if (!isOpen) return;

    // Parse initial value for lat/lng
    const match = initialValue.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
    let initLat = 20;
    let initLng = 0;
    let zoom = 2;

    if (match) {
      initLat = parseFloat(match[1]);
      initLng = parseFloat(match[2]);
      zoom = 10;
      coords = { lat: initLat, lng: initLng };
    }

    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map(mapEl).setView([initLat, initLng], zoom);
    L.tileLayer(TILE_LAYER, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

    if (!match) map.locate({ setView: true, maxZoom: 10 });

    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      marker.setLatLng(e.latlng);
      coords = e.latlng;
    });

    marker.on('dragend', () => {
      coords = marker.getLatLng();
    });

    return () => {
      map.remove();
    };
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */

  function handleConfirm() {
    if (coords) {
      onSave(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    }
  }
</script>

<ModalDialog
  bind:open={isOpen}
  title="Pick Location"
  size="lg"
  onClose={onClose}
  cx={modalCx}
>
  {#snippet children()}
    <div class="relative bg-nb-cream" style="height: 400px">
      <div bind:this={mapEl} class="absolute inset-0"></div>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-between items-center">
      <div class={cn(
        'text-xs font-mono bg-nb-cream px-3 py-1.5 border',
        'border-nb-black/20'
      )}>
        {coords
          ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
          : 'Click map to select'}
      </div>
      <Button
        onclick={handleConfirm}
        variant="success"
        size="sm"
        disabled={!coords}
      >
        {#snippet children()}Confirm Location{/snippet}
      </Button>
    </div>
  {/snippet}
</ModalDialog>
