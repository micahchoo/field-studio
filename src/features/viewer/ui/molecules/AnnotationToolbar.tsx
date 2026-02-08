/**
 * AnnotationToolbar Molecule
 *
 * Toolbar for the annotation tool with mode selection and controls.
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import type { DrawingMode } from '../../model/annotation';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface AnnotationToolbarProps {
  currentMode: DrawingMode;
  existingCount: number;
  showExisting: boolean;
  onModeChange: (mode: DrawingMode) => void;
  onToggleExisting: () => void;
  onClose: () => void;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

const MODES: { mode: DrawingMode; icon: string; label: string }[] = [
  { mode: 'polygon', icon: 'pentagon', label: 'Polygon' },
  { mode: 'rectangle', icon: 'crop_square', label: 'Rectangle' },
  { mode: 'freehand', icon: 'gesture', label: 'Freehand' },
  { mode: 'select', icon: 'pan_tool', label: 'Pan' },
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  currentMode,
  existingCount,
  showExisting,
  onModeChange,
  onToggleExisting,
  onClose,
}) => {
  return (
    <div className="h-12 bg-nb-black border-b border-white/10 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-white font-bold flex items-center gap-2 text-sm">
          <Icon name="pentagon" className="text-nb-green" />
          Annotation Tool
        </h2>

        <div className="flex bg-nb-white/5 border border-white/10 p-0.5">
          {MODES.map((m) => (
            <Button
              key={m.mode}
              onClick={() => onModeChange(m.mode)}
              variant={currentMode === m.mode ? 'primary' : 'ghost'}
              size="sm"
              icon={<Icon name={m.icon} className="text-xs" />}
              className="text-[10px] font-bold uppercase"
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onToggleExisting}
          variant={showExisting ? 'primary' : 'ghost'}
          size="sm"
          className="text-[10px] font-bold uppercase"
        >
          {existingCount} Existing
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="font-bold text-sm"
        >
          Done
        </Button>
      </div>
    </div>
  );
};
