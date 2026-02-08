/**
 * ComposerToolbar Molecule
 *
 * Toolbar for the canvas composer with dimensions, bg mode, zoom, undo/redo.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes atoms (Button, Input)
 * - No domain logic, only UI state
 * - Props-driven, no hooks
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';

export type BackgroundMode = 'grid' | 'dark' | 'light';

export interface ComposerToolbarProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Current background mode */
  bgMode: BackgroundMode;
  /** Current zoom percentage */
  zoomPercent: number;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Callback when width changes */
  onWidthChange: (w: number) => void;
  /** Callback when height changes */
  onHeightChange: (h: number) => void;
  /** Callback when bg mode changes */
  onBgModeChange: (mode: BackgroundMode) => void;
  /** Callback when zoom in clicked */
  onZoomIn: () => void;
  /** Callback when zoom out clicked */
  onZoomOut: () => void;
  /** Callback when undo clicked */
  onUndo: () => void;
  /** Callback when redo clicked */
  onRedo: () => void;
  /** Callback when add text clicked */
  onAddText: () => void;
  /** Callback when save clicked */
  onSave: () => void;
  /** Callback when cancel clicked */
  onCancel: () => void;
  /** Contextual styles - currently unused but reserved for future fieldMode support */
  cx?: {
    text: string;
    textMuted: string;
    active: string;
    surface: string;
  };
  fieldMode?: boolean;
}

const BG_MODES: BackgroundMode[] = ['grid', 'dark', 'light'];

/**
 * ComposerToolbar Molecule
 *
 * @example
 * <ComposerToolbar
 *   width={1920}
 *   height={1080}
 *   bgMode="grid"
 *   zoomPercent={100}
 *   canUndo={true}
 *   canRedo={false}
 *   onWidthChange={setWidth}
 *   onHeightChange={setHeight}
 *   onBgModeChange={setBgMode}
 *   onZoomIn={zoomIn}
 *   onZoomOut={zoomOut}
 *   onUndo={undo}
 *   onRedo={redo}
 *   onAddText={addTextLayer}
 *   onSave={handleSave}
 *   onCancel={onClose}
 *   cx={cx}
 * />
 */
export const ComposerToolbar: React.FC<ComposerToolbarProps> = ({
  width,
  height,
  bgMode,
  zoomPercent,
  canUndo,
  canRedo,
  onWidthChange,
  onHeightChange,
  onBgModeChange,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onAddText,
  onSave,
  onCancel,
  cx: _cx,
}) => {
  return (
    <div className="h-14 bg-nb-black border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-brutal-lg">
      {/* Left: Title & Dimensions */}
      <div className="flex items-center gap-6">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Icon name="auto_awesome_motion" className="text-nb-blue" />
          Synthesis Workspace
        </h2>
        <div className="h-6 w-px bg-nb-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Dimensions
          </span>
          <input
            type="number"
            aria-label="Canvas Width"
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            className="w-16 bg-nb-white/5 text-white text-[10px] border border-white/10 px-1 outline-none"
          />
          <span className="text-white/20">×</span>
          <input
            type="number"
            aria-label="Canvas Height"
            value={height}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            className="w-16 bg-nb-white/5 text-white text-[10px] border border-white/10 px-1 outline-none"
          />
        </div>
        <div className="h-6 w-px bg-nb-white/10" />
        <div
          className="flex bg-nb-white/5 border border-white/10 p-1"
          role="group"
          aria-label="Background Mode"
        >
          {BG_MODES.map((m) => (
            <Button
              key={m}
              onClick={() => onBgModeChange(m)}
              variant={bgMode === m ? 'primary' : 'ghost'}
              size="sm"
              className="text-[9px] font-black uppercase"
            >
              {m}
            </Button>
          ))}
        </div>
        <Button
          onClick={onAddText}
          variant="secondary"
          size="sm"
          icon={<Icon name="title" className="text-xs" />}
          className="text-[10px] font-black uppercase"
        >
          Add Text
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Undo/Redo */}
        <div
          className="flex bg-nb-white/5 border border-white/10 p-1"
          role="group"
          aria-label="Undo/Redo"
        >
          <Button
            onClick={onUndo}
            disabled={!canUndo}
            variant="ghost"
            size="sm"
            icon={<Icon name="undo" />}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            className="p-1"
          />
          <Button
            onClick={onRedo}
            disabled={!canRedo}
            variant="ghost"
            size="sm"
            icon={<Icon name="redo" />}
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
            className="p-1"
          />
        </div>

        {/* Zoom */}
        <div className="flex bg-nb-white/5 border border-white/10 p-1">
          <Button
            onClick={onZoomOut}
            variant="ghost"
            size="sm"
            icon={<Icon name="remove" />}
            aria-label="Zoom Out"
            className="p-1"
          />
          <span
            className="px-3 py-1 text-[10px] font-bold text-white/60 min-w-[60px] text-center"
            aria-live="polite"
          >
            {zoomPercent}%
          </span>
          <Button
            onClick={onZoomIn}
            variant="ghost"
            size="sm"
            icon={<Icon name="add" />}
            aria-label="Zoom In"
            className="p-1"
          />
        </div>

        {/* Cancel/Save */}
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          aria-label="Cancel and close workspace"
          className="font-bold text-sm"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="primary"
          size="sm"
          aria-label="Apply composition to canvas"
          className="font-black uppercase tracking-widest text-xs"
        >
          Apply Composition
        </Button>
      </div>
    </div>
  );
};
