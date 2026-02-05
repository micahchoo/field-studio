/**
 * LocationPickerModal Molecule
 *
 * Modal for picking GPS coordinates on a map.
 * Uses shared ModalDialog with map interaction content.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Manages map state and coordinate selection
 * - Encapsulates Leaflet side effects
 * - Props-only API (initialValue, onSave, onClose)
 * - Uses shared ModalDialog and primitives
 *
 * @module features/metadata-edit/ui/molecules/LocationPickerModal
 */

import React, { useEffect, useRef, useState } from 'react';
import { ModalDialog } from '@/src/shared/ui/molecules';
import { Button } from '@/ui/primitives/Button';
import { DEFAULT_MAP_CONFIG } from '@/constants';

declare const L: any;

export interface LocationPickerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial coordinate string (e.g., "12.345, -67.890") */
  initialValue: string;
  /** Called with selected coordinate string */
  onSave: (val: string) => void;
  /** Called when modal should close */
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  initialValue,
  onSave,
  onClose,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Parse initial value
    const match = initialValue.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
    let initLat = 20,
      initLng = 0,
      zoom = 2;

    if (match) {
      initLat = parseFloat(match[1]);
      initLng = parseFloat(match[2]);
      zoom = 10;
      setCoords({ lat: initLat, lng: initLng });
    }

    if (mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapRef.current).setView([initLat, initLng], zoom);
      L.tileLayer(DEFAULT_MAP_CONFIG.tileLayer, {
        attribution: DEFAULT_MAP_CONFIG.attribution,
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

      if (!match) map.locate({ setView: true, maxZoom: 10 });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        setCoords(e.latlng);
      });

      marker.on('dragend', (_e: any) => {
        // eslint-disable-next-line @field-studio/useeffect-restrictions
        setCoords(marker.getLatLng());
      });

      return () => map.remove();
    }
  }, [isOpen, initialValue]);

  const footer = (
    <div className="flex justify-between items-center">
      <div className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded border">
        {coords
          ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
          : 'Click map to select'}
      </div>
      <Button
        onClick={() => coords && onSave(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)}
        variant="primary"
        size="sm"
        disabled={!coords}
        className="bg-green-600 hover:bg-green-700"
      >
        Confirm Location
      </Button>
    </div>
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pick Location"
      icon="location_on"
      iconColor="bg-green-100 text-green-600"
      size="md"
      height="500px"
      zIndex={2000}
      footer={footer}
    >
      <div className="relative bg-slate-100 h-full">
        <div ref={mapRef} className="absolute inset-0" />
      </div>
    </ModalDialog>
  );
};

export default LocationPickerModal;
