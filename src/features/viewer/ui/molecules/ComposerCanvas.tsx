/**
 * ComposerCanvas Molecule
 *
 * Canvas area for the composer with layers and interaction handling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Renders layer content
 * - Handles mouse events
 * - No domain logic
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { getIIIFValue } from '@/src/shared/types';
import type { PlacedResource } from '@/src/shared/lib/hooks/useLayerHistory';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type BackgroundMode = 'grid' | 'dark' | 'light';

export interface ComposerCanvasProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Current scale factor */
  scale: number;
  /** Background mode */
  bgMode: BackgroundMode;
  /** List of layers */
  layers: PlacedResource[];
  /** Currently active layer ID */
  activeLayerId: string | null;
  /** Whether currently resizing */
  isResizing: boolean;
  /** Container ref for mouse events */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Callback when layer is selected */
  onLayerSelect: (id: string) => void;
  /** Callback when resize starts */
  onResizeStart: (handle: string, e: React.MouseEvent, layer: PlacedResource) => void;
  /** Mouse event handlers */
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  /** Callback when text changes */
  onTextChange: (id: string, text: string) => void;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * ComposerCanvas Molecule
 */
export const ComposerCanvas: React.FC<ComposerCanvasProps> = ({
  width,
  height,
  scale,
  bgMode,
  layers,
  activeLayerId,
  isResizing: _isResizing,
  containerRef,
  onLayerSelect,
  onResizeStart,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
  onDrop,
  onDragOver,
  onTextChange,
}) => {
  const getBgClass = () => {
    switch (bgMode) {
      case 'light':
        return 'bg-nb-cream';
      case 'dark':
        return 'bg-nb-black';
      case 'grid':
      default:
        return 'bg-nb-black';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-auto flex items-center justify-center p-20 custom-scrollbar shadow-inner ${getBgClass()}`}
      onDragOver={onDragOver}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      onDrop={onDrop}
    >
      <div
        className="relative shadow-[0_0_100px_rgba(79,70,229,0.2)] bg-nb-black border border-white/5"
        style={{
          width: width * scale,
          height: height * scale,
          backgroundImage:
            bgMode === 'grid'
              ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)'
              : 'none',
          backgroundSize: '20px 20px',
        }}
        aria-label="Canvas Area"
      >
        {/* Empty State */}
        {layers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none border-2 border-dashed border-white/10 m-4 ">
            <Icon name="layers" className="text-6xl mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-widest">
              Composition Canvas
            </h3>
            <p className="text-sm mt-2">
              Drag and drop items here to create layers
            </p>
          </div>
        )}

        {/* Layers */}
        {layers.map((layer, idx) => (
          <div
            key={layer.id}
            onClick={() => onLayerSelect(layer.id)}
            className={`absolute group select-none transition-nb ${
              activeLayerId === layer.id
                ? 'ring-2 ring-nb-blue z-50 shadow-brutal-lg'
                : 'z-10'
            }`}
            style={{
              left: layer.x * scale,
              top: layer.y * scale,
              width: layer.w * scale,
              height: layer.h * scale,
              opacity: layer.opacity,
              zIndex: layers.length - idx,
            }}
          >
            {/* Layer Content */}
            {layer.resource.type === 'Text' || layer.resource._text ? (
              <textarea
                value={layer.resource._text}
                onChange={(e) => onTextChange(layer.id, e.target.value)}
                className="w-full h-full bg-transparent text-white p-2 resize-none outline-none border-2 border-dashed border-white/20"
                style={{ fontSize: `${24 * scale}px` }}
              />
            ) : layer.resource.type === 'Video' ? (
              <video
                src={layer.resource._blobUrl || layer.resource.id}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : layer.resource.type === 'Sound' ? (
              <div className="w-full h-full bg-nb-black flex flex-col items-center justify-center border border-nb-black/60">
                <Icon name="audiotrack" className="text-4xl text-white/50" />
                <span className="text-[10px] text-white/50 mt-2">
                  Audio Layer
                </span>
              </div>
            ) : layer.resource._blobUrl ? (
              <img
                src={layer.resource._blobUrl}
                className="w-full h-full object-fill pointer-events-none"
                alt={getIIIFValue(layer.resource.label, 'none') || 'Layer Image'}
              />
            ) : (
              <div className="w-full h-full bg-nb-blue/10 flex items-center justify-center text-nb-blue border border-nb-blue/20">
                <Icon name="image" className="text-4xl" />
              </div>
            )}

            {/* Active Layer UI */}
            {activeLayerId === layer.id && (
              <>
                {/* Label */}
                <div className="absolute -top-6 left-0 bg-nb-blue text-white text-[10px] px-2 py-0.5 font-bold shadow-brutal flex items-center gap-1">
                  <Icon
                    name={layer.locked ? 'lock' : 'auto_fix_high'}
                    className="text-[10px]"
                  />
                  Synthesis Layer
                </div>

                {/* Selection Border */}
                <div className="absolute inset-0 border-2 border-nb-blue/50 pointer-events-none" />

                {/* Resize Handles */}
                {!layer.locked && (
                  <>
                    {['nw', 'ne', 'sw', 'se'].map((h) => (
                      <div
                        key={h}
                        className="absolute w-3 h-3 bg-nb-white border border-nb-blue z-50"
                        style={{
                          cursor: `${h}-resize`,
                          top: h.includes('n') ? -6 : 'auto',
                          bottom: h.includes('s') ? -6 : 'auto',
                          left: h.includes('w') ? -6 : 'auto',
                          right: h.includes('e') ? -6 : 'auto',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onResizeStart(h, e, layer);
                        }}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* Lock Indicator */}
            {layer.locked && (
              <div className="absolute top-2 right-2 text-white/50">
                <Icon name="lock" className="text-sm" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
