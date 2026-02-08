/**
 * AnnotationForm Molecule
 *
 * Form for entering annotation text and motivation.
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface AnnotationFormProps {
  text: string;
  motivation: 'commenting' | 'tagging' | 'describing';
  pointCount: number;
  canSave: boolean;
  onTextChange: (text: string) => void;
  onMotivationChange: (mot: 'commenting' | 'tagging' | 'describing') => void;
  onSave: () => void;
  onUndo: () => void;
  onClear: () => void;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

const MOTIVATIONS: { value: 'commenting' | 'tagging' | 'describing'; label: string }[] = [
  { value: 'commenting', label: 'Comment' },
  { value: 'tagging', label: 'Tag' },
  { value: 'describing', label: 'Describe' },
];

export const AnnotationForm: React.FC<AnnotationFormProps> = ({
  text,
  motivation,
  pointCount,
  canSave,
  onTextChange,
  onMotivationChange,
  onSave,
  onUndo,
  onClear,
}) => {
  return (
    <div className="w-inspector bg-nb-black border-l border-white/10 p-4 flex flex-col">
      <h3 className="text-white font-bold text-sm mb-4">Annotation Details</h3>

      {/* Motivation */}
      <div className="mb-4">
        <label className="text-[10px] font-black text-white/40 uppercase block mb-2">
          Type
        </label>
        <div className="flex gap-2">
          {MOTIVATIONS.map((m) => (
            <Button
              key={m.value}
              onClick={() => onMotivationChange(m.value)}
              variant={motivation === m.value ? 'primary' : 'ghost'}
              size="sm"
              className="flex-1 text-[10px]"
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text */}
      <div className="mb-4 flex-1">
        <label className="text-[10px] font-black text-white/40 uppercase block mb-2">
          Text
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter annotation text..."
          className="w-full h-32 bg-nb-black/40 text-white text-sm border border-white/10 p-3 outline-none resize-none"
        />
      </div>

      {/* Stats */}
      <div className="text-[10px] text-white/40 mb-4">
        {pointCount} points selected
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={onSave}
          disabled={!canSave}
          variant="success"
          size="lg"
          fullWidth
          className="font-black uppercase tracking-widest text-xs"
        >
          Save Annotation
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={onUndo}
            variant="ghost"
            size="sm"
            fullWidth
            className="text-[10px] font-bold uppercase"
          >
            Undo Point
          </Button>
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            fullWidth
            className="text-[10px] font-bold uppercase hover:text-nb-red"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
