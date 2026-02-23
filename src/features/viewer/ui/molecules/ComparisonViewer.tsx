/**
 * ComparisonViewer Molecule
 *
 * Renders side-by-side, overlay, or curtain comparison of two canvases.
 * Each mode uses different layout strategies for the secondary OSD viewer.
 *
 * @module features/viewer/ui/molecules/ComparisonViewer
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { ComparisonMode, UseComparisonReturn } from '../../model/useComparison';
import type { IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';
import { resolveImageSource } from '@/src/entities/canvas/model/imageSourceResolver';

declare const OpenSeadragon: any;

export interface ComparisonViewerProps {
  comparison: UseComparisonReturn;
  primaryCanvas: IIIFCanvas;
  secondCanvas: IIIFCanvas | null;
  primaryViewerRef: React.MutableRefObject<any>;
  cx: ContextualClassNames;
  fieldMode?: boolean;
}

/** Mode selector buttons */
const ModeSelector: React.FC<{
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  fieldMode: boolean;
  cx: ContextualClassNames;
}> = ({ mode, onModeChange, fieldMode, cx }) => (
  <div className="flex items-center gap-1">
    <IconButton
      icon="view_column"
      ariaLabel="Side by side"
      title="Side by side"
      onClick={() => onModeChange('side-by-side')}
      variant={mode === 'side-by-side' ? 'primary' : 'ghost'}
      size="sm"
      cx={cx}
      fieldMode={fieldMode}
    />
    <IconButton
      icon="layers"
      ariaLabel="Overlay"
      title="Overlay with opacity"
      onClick={() => onModeChange('overlay')}
      variant={mode === 'overlay' ? 'primary' : 'ghost'}
      size="sm"
      cx={cx}
      fieldMode={fieldMode}
    />
    <IconButton
      icon="vertical_split"
      ariaLabel="Curtain"
      title="Curtain reveal"
      onClick={() => onModeChange('curtain')}
      variant={mode === 'curtain' ? 'primary' : 'ghost'}
      size="sm"
      cx={cx}
      fieldMode={fieldMode}
    />
  </div>
);

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  comparison,
  primaryCanvas,
  secondCanvas,
  primaryViewerRef,
  cx,
  fieldMode = false,
}) => {
  const {
    mode,
    overlayOpacity,
    curtainPosition,
    syncViewports,
    setMode,
    stopComparison,
    setOverlayOpacity,
    setCurtainPosition,
    toggleSyncViewports,
    secondViewerRef,
    secondContainerRef,
    setupViewportSync,
  } = comparison;

  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
  const curtainContainerRef = useRef<HTMLDivElement>(null);

  // Initialize second OSD viewer when second canvas is available
  useEffect(() => {
    if (!secondCanvas || mode === 'off' || !secondContainerRef.current) return;

    // Wait a frame for the container to be in the DOM with proper dimensions
    const timer = setTimeout(() => {
      if (!secondContainerRef.current) return;
      const rect = secondContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Destroy existing
      if (secondViewerRef.current) {
        try {
          secondViewerRef.current.removeAllHandlers();
          secondViewerRef.current.destroy();
        } catch {
          // Ignore
        }
        secondViewerRef.current = null;
      }

      // Resolve image URL for second canvas
      const resolved = resolveImageSource(secondCanvas);
      const tileSource = resolved?.serviceId
        ? `${resolved.serviceId}/info.json`
        : { type: 'image', url: resolved?.url || '' };

      try {
        secondViewerRef.current = OpenSeadragon({
          element: secondContainerRef.current,
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
        if (syncViewports && primaryViewerRef.current) {
          secondViewerRef.current.addOnceHandler('open', () => {
            setupViewportSync(primaryViewerRef.current);
          });
        }
      } catch {
        // Ignore initialization errors
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (secondViewerRef.current) {
        try {
          secondViewerRef.current.removeAllHandlers();
          secondViewerRef.current.destroy();
        } catch {
          // Ignore
        }
        secondViewerRef.current = null;
      }
    };
  }, [secondCanvas?.id, mode]);

  // Handle curtain drag
  const handleCurtainDrag = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!curtainContainerRef.current) return;
    const rect = curtainContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setCurtainPosition((x / rect.width) * 100);
  }, [setCurtainPosition]);

  useEffect(() => {
    if (!isDraggingCurtain) return;

    const handleMove = (e: MouseEvent) => handleCurtainDrag(e);
    const handleUp = () => setIsDraggingCurtain(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingCurtain, handleCurtainDrag]);

  if (mode === 'off' || !secondCanvas) return null;

  const primaryLabel = getIIIFValue(primaryCanvas.label);
  const secondLabel = getIIIFValue(secondCanvas.label);
  const accentColor = fieldMode ? 'text-nb-yellow' : 'text-nb-blue';

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      {/* Comparison toolbar */}
      <div className={`h-10 flex items-center justify-between px-3 border-b shrink-0 ${
        fieldMode ? 'bg-nb-black/95 border-nb-yellow/20' : 'bg-nb-white border-nb-black/10'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold ${accentColor}`}>
            <Icon name="compare" className="text-sm mr-1" />
            Compare
          </span>
          <ModeSelector mode={mode} onModeChange={setMode} fieldMode={fieldMode} cx={cx} />
        </div>

        <div className="flex items-center gap-2">
          {/* Overlay opacity slider */}
          {mode === 'overlay' && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}>Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(overlayOpacity * 100)}
                onChange={(e) => setOverlayOpacity(parseInt(e.target.value) / 100)}
                className="w-20 h-1 accent-current"
              />
              <span className={`text-[10px] font-mono w-7 ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}>
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}

          {/* Sync toggle */}
          <Button
            variant={syncViewports ? 'primary' : 'ghost'}
            size="sm"
            onClick={toggleSyncViewports}
          >
            <Icon name="sync" className="text-xs mr-0.5" />
            <span className="text-[10px]">Sync</span>
          </Button>

          {/* Close comparison */}
          <Button variant="ghost" size="sm" onClick={stopComparison}>
            <Icon name="close" className="text-sm" />
          </Button>
        </div>
      </div>

      {/* Canvas labels */}
      <div className={`flex items-center justify-between px-3 py-1 text-[10px] font-mono ${
        fieldMode ? 'bg-nb-black/80 text-nb-yellow/50' : 'bg-nb-black/5 text-nb-black/40'
      }`}>
        <span>A: {primaryLabel}</span>
        <span>B: {secondLabel}</span>
      </div>

      {/* Comparison content */}
      <div className="flex-1 relative min-h-0">
        {mode === 'side-by-side' && (
          <div className="flex h-full">
            {/* Primary viewer takes left half - rendered by parent */}
            <div className="flex-1 relative border-r border-dashed border-nb-black/20" />
            {/* Secondary viewer */}
            <div className="flex-1 relative">
              <div ref={secondContainerRef} className="absolute inset-0" />
            </div>
          </div>
        )}

        {mode === 'overlay' && (
          <div className="relative h-full">
            {/* Primary viewer is below - rendered by parent */}
            <div className="absolute inset-0" />
            {/* Secondary viewer overlaid */}
            <div
              className="absolute inset-0"
              style={{ opacity: overlayOpacity, pointerEvents: overlayOpacity > 0.1 ? 'auto' : 'none' }}
            >
              <div ref={secondContainerRef} className="absolute inset-0" />
            </div>
          </div>
        )}

        {mode === 'curtain' && (
          <div ref={curtainContainerRef} className="relative h-full overflow-hidden">
            {/* Primary viewer is below - rendered by parent */}
            <div className="absolute inset-0" />
            {/* Secondary viewer with clip */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${curtainPosition}%)` }}
            >
              <div ref={secondContainerRef} className="absolute inset-0" />
            </div>
            {/* Curtain handle */}
            <div
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-10"
              style={{ left: `${curtainPosition}%`, transform: 'translateX(-50%)' }}
              onMouseDown={() => setIsDraggingCurtain(true)}
            >
              <div className={`absolute inset-0 ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue'}`} />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-6 h-10 rounded flex items-center justify-center shadow-md ${
                  fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-blue text-white'
                }`}
              >
                <Icon name="drag_indicator" className="text-sm" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonViewer;
