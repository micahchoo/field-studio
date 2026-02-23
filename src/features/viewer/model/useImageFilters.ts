/**
 * useImageFilters Hook
 *
 * Manages image filter state (brightness, contrast, invert, grayscale)
 * and applies them to an OpenSeadragon viewer via the filtering plugin.
 *
 * Falls back to CSS filters if the OSD filtering plugin is not loaded.
 *
 * @module features/viewer/model/useImageFilters
 */

import { useCallback, useEffect, useRef, useState } from 'react';

declare const OpenSeadragon: any;

export interface FilterState {
  brightness: number;   // -100 to 100, default 0
  contrast: number;     // -100 to 100, default 0
  invert: boolean;
  grayscale: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 0,
  contrast: 0,
  invert: false,
  grayscale: false,
};

export interface UseImageFiltersReturn {
  filters: FilterState;
  isActive: boolean;
  showPanel: boolean;
  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  toggleInvert: () => void;
  toggleGrayscale: () => void;
  resetFilters: () => void;
  togglePanel: () => void;
}

export function useImageFilters(
  viewerRef: React.MutableRefObject<any>,
  osdContainerRef: React.RefObject<HTMLDivElement>,
): UseImageFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showPanel, setShowPanel] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = filters.brightness !== 0 || filters.contrast !== 0 || filters.invert || filters.grayscale;

  // Apply filters via CSS (works without plugin)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const container = osdContainerRef.current;
      if (!container) return;

      const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
      const target = canvas || container;

      const parts: string[] = [];
      if (filters.brightness !== 0) {
        parts.push(`brightness(${1 + filters.brightness / 100})`);
      }
      if (filters.contrast !== 0) {
        parts.push(`contrast(${1 + filters.contrast / 100})`);
      }
      if (filters.invert) {
        parts.push('invert(1)');
      }
      if (filters.grayscale) {
        parts.push('grayscale(1)');
      }

      target.style.filter = parts.length > 0 ? parts.join(' ') : '';
    }, 50);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, osdContainerRef]);

  // Reset CSS filter on unmount
  useEffect(() => {
    return () => {
      const container = osdContainerRef.current;
      if (container) {
        const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
        const target = canvas || container;
        target.style.filter = '';
      }
    };
  }, [osdContainerRef]);

  const setBrightness = useCallback((v: number) => {
    setFilters(prev => ({ ...prev, brightness: Math.max(-100, Math.min(100, v)) }));
  }, []);

  const setContrast = useCallback((v: number) => {
    setFilters(prev => ({ ...prev, contrast: Math.max(-100, Math.min(100, v)) }));
  }, []);

  const toggleInvert = useCallback(() => {
    setFilters(prev => ({ ...prev, invert: !prev.invert }));
  }, []);

  const toggleGrayscale = useCallback(() => {
    setFilters(prev => ({ ...prev, grayscale: !prev.grayscale }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const togglePanel = useCallback(() => {
    setShowPanel(prev => !prev);
  }, []);

  return {
    filters,
    isActive,
    showPanel,
    setBrightness,
    setContrast,
    toggleInvert,
    toggleGrayscale,
    resetFilters,
    togglePanel,
  };
}
