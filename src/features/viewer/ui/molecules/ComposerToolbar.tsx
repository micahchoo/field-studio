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
import { Icon } from '@/components/Icon';

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
  cx,
}) => {
  return (
    <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-2xl">
      {/* Left: Title & Dimensions */}
      <div className="flex items-center gap-6">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Icon name="auto_awesome_motion" className="text-indigo-400" />
          Synthesis Workspace
        </h2>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Dimensions
          </span>
          <input
            type="number"
            aria-label="Canvas Width"
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"
          />
          <span className="text-white/20">×</span>
          <input
            type="number"
            aria-label="Canvas Height"
            value={height}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"
          />
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div
          className="flex bg-white/5 border border-white/10 rounded p-1"
          role="group"
          aria-label="Background Mode"
        >
          {BG_MODES.map((m) => (
            <button
              key={m}
              onClick={() => onBgModeChange(m)}
              aria-pressed={bgMode === m}
              className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                bgMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={onAddText}
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"
        >
          <Icon name="title" className="text-xs" /> Add Text
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Undo/Redo */}
        <div
          className="flex bg-white/5 border border-white/10 rounded p-1"
          role="group"
          aria-label="Undo/Redo"
        >
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            className={`p-1 ${
              canUndo ? 'text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'
            }`}
          >
            <Icon name="undo" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
            className={`p-1 ${
              canRedo ? 'text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'
            }`}
          >
            <Icon name="redo" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex bg-white/5 border border-white/10 rounded p-1">
          <button
            onClick={onZoomOut}
            aria-label="Zoom Out"
            className="p-1 text-white/40 hover:text-white"
          >
            <Icon name="remove" />
          </button>
          <span
            className="px-3 py-1 text-[10px] font-bold text-white/60 min-w-[60px] text-center"
            aria-live="polite"
          >
            {zoomPercent}%
          </span>
          <button
            onClick={onZoomIn}
            aria-label="Zoom In"
            className="p-1 text-white/40 hover:text-white"
          >
            <Icon name="add" />
          </button>
        </div>

        {/* Cancel/Save */}
        <button
          onClick={onCancel}
          aria-label="Cancel and close workspace"
          className="px-4 py-2 text-white/40 hover:text-white font-bold text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          aria-label="Apply composition to canvas"
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-indigo-500 shadow-xl transition-all"
        >
          Apply Composition
        </button>
      </div>
    </div>
  );
};
