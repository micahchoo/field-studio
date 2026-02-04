/**
 * CanvasComposerPanel Organism
 *
 * Full canvas composer as a panel/organism.
 * Composes molecules: ComposerToolbar, ComposerSidebar, ComposerCanvas
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx via props from template
 * - Composes feature-specific molecules
 * - Domain logic delegated to useComposer hook
 */

import React, { useCallback } from 'react';
import type { IIIFCanvas, IIIFItem } from '@/types';
import { useComposer } from '../../model';
import {
  ComposerCanvas,
  ComposerSidebar,
  ComposerToolbar,
} from '../molecules';

export interface CanvasComposerPanelProps {
  /** Canvas to compose */
  canvas: IIIFCanvas;
  /** Root for library */
  root?: IIIFItem | null;
  /** Callback when canvas is updated */
  onUpdate: (canvas: IIIFCanvas) => void;
  /** Callback when panel closes */
  onClose: () => void;
  /** Contextual styles */
  cx: {
    text: string;
    textMuted: string;
    active: string;
    surface: string;
  };
}

/**
 * CanvasComposerPanel Organism
 */
export const CanvasComposerPanel: React.FC<CanvasComposerPanelProps> = ({
  canvas,
  root,
  onUpdate,
  onClose,
  cx,
}) => {
  const {
    dimensions,
    activeId,
    bgMode,
    sidebarTab,
    layers,
    canUndo,
    canRedo,
    viewport,
    scale,
    containerRef,
    setDimensions,
    setActiveId,
    setBgMode,
    setSidebarTab,
    undo,
    redo,
    addResourceLayer,
    addTextLayer,
    moveLayer,
    removeLayer,
    toggleLayerLock,
    updateLayerOpacity,
    alignActive,
    handleSave,
    startResize,
    endResize,
    updateResize,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  } = useComposer(canvas, onUpdate) as any;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (activeId) {
        updateResize(e.clientX, e.clientY);
      }
    },
    [activeId, updateResize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('application/iiif-item-id');
      if (itemId && root) {
        const item = root.items?.find((i: any) => i.id === itemId);
        if (item) addResourceLayer(item);
      }
    },
    [root, addResourceLayer]
  );

  const handleLayerPropertyChange = useCallback(
    (id: string, prop: string, value: number) => {
      // Update layer property
      // This would need to be added to useComposer
    },
    []
  );

  const handleTextChange = useCallback(
    (id: string, text: string) => {
      // Update text layer
      // This would need to be added to useComposer
    },
    []
  );

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col">
      <ComposerToolbar
        width={dimensions.w}
        height={dimensions.h}
        bgMode={bgMode}
        zoomPercent={viewport.scalePercent}
        canUndo={canUndo}
        canRedo={canRedo}
        onWidthChange={(w) => setDimensions({ ...dimensions, w })}
        onHeightChange={(h) => setDimensions({ ...dimensions, h })}
        onBgModeChange={setBgMode}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onUndo={undo}
        onRedo={redo}
        onAddText={addTextLayer}
        onSave={() => {
          handleSave();
          onClose();
        }}
        onCancel={onClose}
        cx={cx}
      />

      <div className="flex-1 flex overflow-hidden">
        <ComposerSidebar
          activeTab={sidebarTab}
          layers={layers}
          activeLayerId={activeId}
          root={root}
          onTabChange={setSidebarTab}
          onLayerSelect={setActiveId}
          onLayerRemove={removeLayer}
          onLayerLockToggle={toggleLayerLock}
          onLayerMove={moveLayer}
          onLayerOpacityChange={updateLayerOpacity}
          onLayerPropertyChange={handleLayerPropertyChange}
          onLayerAlign={alignActive}
          onLibraryItemSelect={addResourceLayer}
          cx={cx}
        />

        <ComposerCanvas
          width={dimensions.w}
          height={dimensions.h}
          scale={scale}
          bgMode={bgMode}
          layers={layers}
          activeLayerId={activeId}
          isResizing={false}
          containerRef={containerRef}
          onLayerSelect={setActiveId}
          onResizeStart={startResize}
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={(e) => {
            endResize();
            onMouseUp(e);
          }}
          onMouseLeave={onMouseLeave}
          onWheel={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              viewport.zoomAtPoint(e.deltaY, { x: e.clientX, y: e.clientY }, rect);
            }
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onTextChange={handleTextChange}
        />
      </div>

      {/* Footer */}
      <div className="h-8 bg-slate-950 border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-white/30 uppercase font-black tracking-widest">
        <div className="flex gap-4">
          <span>Archive Synthesis Engine</span>
          <span>{layers.length} Active Parts</span>
        </div>
        <div className="flex gap-4">
          <span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Scroll</kbd> Zoom
          </span>
          <span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">+/-</kbd> Zoom
          </span>
          <span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Shift+Drag</kbd>{' '}
            Pan
          </span>
          <span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Cmd+Z</kbd> Undo
          </span>
        </div>
      </div>
    </div>
  );
};
