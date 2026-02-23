/**
 * ImageFilterPanel Molecule
 *
 * Slide-out panel with brightness, contrast, invert, and grayscale
 * controls for degraded archival document enhancement.
 *
 * @module features/viewer/ui/molecules/ImageFilterPanel
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { FilterState } from '../../model/useImageFilters';

export interface ImageFilterPanelProps {
  filters: FilterState;
  isActive: boolean;
  onBrightnessChange: (v: number) => void;
  onContrastChange: (v: number) => void;
  onToggleInvert: () => void;
  onToggleGrayscale: () => void;
  onReset: () => void;
  onClose: () => void;
  fieldMode?: boolean;
}

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  fieldMode?: boolean;
}> = ({ label, value, min, max, onChange, fieldMode }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className={`text-xs ${fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/60'}`}>{label}</span>
      <span className={`text-xs tabular-nums font-mono ${fieldMode ? 'text-nb-yellow' : 'text-nb-black/80'}`}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={`w-full h-1.5 rounded-none appearance-none cursor-pointer ${
        fieldMode ? 'accent-nb-yellow bg-nb-yellow/20' : 'accent-nb-blue bg-nb-black/10'
      }`}
    />
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  icon: string;
  active: boolean;
  onToggle: () => void;
  fieldMode?: boolean;
}> = ({ label, icon, active, onToggle, fieldMode }) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-2 px-3 py-2 text-xs transition-nb w-full ${
      active
        ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
        : fieldMode ? 'text-nb-yellow/60 hover:bg-nb-yellow/10' : 'text-nb-black/60 hover:bg-nb-black/5'
    }`}
  >
    <Icon name={icon} className="text-sm" />
    <span>{label}</span>
    {active && <Icon name="check" className="ml-auto text-sm" />}
  </button>
);

export const ImageFilterPanel: React.FC<ImageFilterPanelProps> = ({
  filters,
  isActive,
  onBrightnessChange,
  onContrastChange,
  onToggleInvert,
  onToggleGrayscale,
  onReset,
  onClose,
  fieldMode = false,
}) => {
  return (
    <div className={`absolute top-3 right-3 z-20 w-56 shadow-brutal backdrop-blur-sm border ${
      fieldMode
        ? 'bg-nb-black/95 border-nb-yellow/30'
        : 'bg-nb-white border-nb-black/20'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
      }`}>
        <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
          fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
        }`}>
          <Icon name="tune" className="text-sm" />
          Image Filters
        </span>
        <div className="flex items-center gap-1">
          {isActive && (
            <Button variant="ghost" size="bare" onClick={onReset} title="Reset filters">
              <span className={`text-[10px] ${fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40'}`}>Reset</span>
            </Button>
          )}
          <Button variant="ghost" size="bare" onClick={onClose} aria-label="Close">
            <Icon name="close" className={`text-sm ${fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'}`} />
          </Button>
        </div>
      </div>

      {/* Sliders */}
      <div className="p-3 space-y-4">
        <SliderRow
          label="Brightness"
          value={filters.brightness}
          min={-100}
          max={100}
          onChange={onBrightnessChange}
          fieldMode={fieldMode}
        />
        <SliderRow
          label="Contrast"
          value={filters.contrast}
          min={-100}
          max={100}
          onChange={onContrastChange}
          fieldMode={fieldMode}
        />
      </div>

      {/* Toggles */}
      <div className={`border-t ${fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'}`}>
        <ToggleRow
          label="Invert Colors"
          icon="invert_colors"
          active={filters.invert}
          onToggle={onToggleInvert}
          fieldMode={fieldMode}
        />
        <ToggleRow
          label="Grayscale"
          icon="filter_b_and_w"
          active={filters.grayscale}
          onToggle={onToggleGrayscale}
          fieldMode={fieldMode}
        />
      </div>
    </div>
  );
};

export default ImageFilterPanel;
