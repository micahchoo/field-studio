/**
 * useComparison Hook
 *
 * Manages comparison mode state for side-by-side, overlay, and curtain
 * comparison of two IIIF canvases in the viewer.
 *
 * @module features/viewer/model/useComparison
 */

import { useCallback, useRef, useState } from 'react';

declare const OpenSeadragon: any;

export type ComparisonMode = 'off' | 'side-by-side' | 'overlay' | 'curtain';

export interface ComparisonState {
  mode: ComparisonMode;
  secondCanvasId: string | null;
  /** Overlay opacity for the second image (0-1) */
  overlayOpacity: number;
  /** Curtain position as percentage (0-100) */
  curtainPosition: number;
  /** Whether zoom/pan is synced between viewers */
  syncViewports: boolean;
}

export interface UseComparisonReturn extends ComparisonState {
  /** Enter comparison mode with a specific canvas */
  startComparison: (secondCanvasId: string, mode?: ComparisonMode) => void;
  /** Exit comparison mode */
  stopComparison: () => void;
  /** Change comparison mode */
  setMode: (mode: ComparisonMode) => void;
  /** Set the second canvas for comparison */
  setSecondCanvas: (canvasId: string) => void;
  /** Set overlay opacity */
  setOverlayOpacity: (opacity: number) => void;
  /** Set curtain position */
  setCurtainPosition: (position: number) => void;
  /** Toggle viewport sync */
  toggleSyncViewports: () => void;
  /** Ref for second OSD viewer */
  secondViewerRef: React.MutableRefObject<any>;
  /** Ref for second OSD container */
  secondContainerRef: React.RefObject<HTMLDivElement>;
  /** Setup viewport sync between two viewers */
  setupViewportSync: (primaryViewer: any) => () => void;
}

export function useComparison(): UseComparisonReturn {
  const [mode, setModeState] = useState<ComparisonMode>('off');
  const [secondCanvasId, setSecondCanvasId] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [curtainPosition, setCurtainPosition] = useState(50);
  const [syncViewports, setSyncViewports] = useState(true);
  const secondViewerRef = useRef<any>(null);
  const secondContainerRef = useRef<HTMLDivElement>(null);
  const syncCleanupRef = useRef<(() => void) | null>(null);

  const startComparison = useCallback((canvasId: string, initialMode: ComparisonMode = 'side-by-side') => {
    setSecondCanvasId(canvasId);
    setModeState(initialMode);
  }, []);

  const stopComparison = useCallback(() => {
    // Cleanup second viewer
    if (secondViewerRef.current) {
      try {
        secondViewerRef.current.removeAllHandlers();
        secondViewerRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
      secondViewerRef.current = null;
    }
    // Cleanup sync
    if (syncCleanupRef.current) {
      syncCleanupRef.current();
      syncCleanupRef.current = null;
    }
    setModeState('off');
    setSecondCanvasId(null);
  }, []);

  const setMode = useCallback((newMode: ComparisonMode) => {
    if (newMode === 'off') {
      stopComparison();
    } else {
      setModeState(newMode);
    }
  }, [stopComparison]);

  const setSecondCanvas = useCallback((canvasId: string) => {
    setSecondCanvasId(canvasId);
  }, []);

  const toggleSyncViewports = useCallback(() => {
    setSyncViewports(prev => !prev);
  }, []);

  // Setup viewport sync between primary and secondary viewers
  const setupViewportSync = useCallback((primaryViewer: any) => {
    // Cleanup previous sync
    if (syncCleanupRef.current) {
      syncCleanupRef.current();
    }

    if (!primaryViewer || !secondViewerRef.current || !syncViewports) {
      return () => {};
    }

    const secondary = secondViewerRef.current;
    let isSyncing = false;

    const syncFromPrimary = () => {
      if (isSyncing || !secondary?.viewport || !primaryViewer?.viewport) return;
      isSyncing = true;
      try {
        const zoom = primaryViewer.viewport.getZoom();
        const center = primaryViewer.viewport.getCenter();
        secondary.viewport.zoomTo(zoom, undefined, true);
        secondary.viewport.panTo(center, true);
      } catch {
        // Ignore sync errors
      }
      isSyncing = false;
    };

    const syncFromSecondary = () => {
      if (isSyncing || !primaryViewer?.viewport || !secondary?.viewport) return;
      isSyncing = true;
      try {
        const zoom = secondary.viewport.getZoom();
        const center = secondary.viewport.getCenter();
        primaryViewer.viewport.zoomTo(zoom, undefined, true);
        primaryViewer.viewport.panTo(center, true);
      } catch {
        // Ignore sync errors
      }
      isSyncing = false;
    };

    primaryViewer.addHandler('zoom', syncFromPrimary);
    primaryViewer.addHandler('pan', syncFromPrimary);
    secondary.addHandler('zoom', syncFromSecondary);
    secondary.addHandler('pan', syncFromSecondary);

    const cleanup = () => {
      try {
        primaryViewer.removeHandler('zoom', syncFromPrimary);
        primaryViewer.removeHandler('pan', syncFromPrimary);
        secondary.removeHandler('zoom', syncFromSecondary);
        secondary.removeHandler('pan', syncFromSecondary);
      } catch {
        // Ignore cleanup errors
      }
    };

    syncCleanupRef.current = cleanup;
    return cleanup;
  }, [syncViewports]);

  return {
    mode,
    secondCanvasId,
    overlayOpacity,
    curtainPosition,
    syncViewports,
    startComparison,
    stopComparison,
    setMode,
    setSecondCanvas,
    setOverlayOpacity,
    setCurtainPosition,
    toggleSyncViewports,
    secondViewerRef,
    secondContainerRef,
    setupViewportSync,
  };
}
