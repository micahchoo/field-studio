/**
 * AnnotationLayerPanel Molecule
 *
 * Panel composing LayerToggle atoms for toggling annotation layer visibility.
 * Shows all non-painting annotation pages with toggle controls.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes LayerToggle atoms
 * - Props-driven, no domain logic
 * - Controlled visibility state
 *
 * @module features/viewer/ui/molecules/AnnotationLayerPanel
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { LayerToggle } from '../atoms/LayerToggle';
import type { AnnotationLayer } from '../../model';

export interface AnnotationLayerPanelProps {
  /** Annotation layers */
  layers: AnnotationLayer[];
  /** Toggle a single layer */
  onToggleLayer: (id: string) => void;
  /** Show/hide all layers */
  onSetAllVisible: (visible: boolean) => void;
  /** Callback to create a new layer */
  onCreateLayer?: () => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether the panel is visible */
  visible?: boolean;
  /** Close callback */
  onClose?: () => void;
}

export const AnnotationLayerPanel: React.FC<AnnotationLayerPanelProps> = ({
  layers,
  onToggleLayer,
  onSetAllVisible,
  onCreateLayer,
  fieldMode = false,
  visible = true,
  onClose,
}) => {
  if (!visible) return null;

  const allVisible = layers.every(l => l.visible);
  const noneVisible = layers.every(l => !l.visible);

  return (
    <div className={`absolute top-3 left-3 z-20 w-64 shadow-brutal backdrop-blur-sm border ${
      fieldMode
        ? 'bg-nb-black/95 border-nb-black/80'
        : 'bg-nb-white border-nb-black/20'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
      }`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
        }`}>
          <Icon name="layers" className="text-sm mr-1 align-text-bottom" />
          Layers
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onSetAllVisible(!allVisible)}
            title={allVisible ? 'Hide all' : 'Show all'}
            aria-label={allVisible ? 'Hide all layers' : 'Show all layers'}
          >
            <span className={`text-[10px] ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>
              {allVisible ? 'Hide All' : 'Show All'}
            </span>
          </Button>
          {onCreateLayer && (
            <Button
              variant="ghost"
              size="bare"
              onClick={onCreateLayer}
              icon={<Icon name="add" className="text-sm" />}
              title="Create layer"
              aria-label="Create annotation layer"
            />
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="bare"
              onClick={onClose}
              icon={<Icon name="close" className="text-sm" />}
              title="Close"
              aria-label="Close layers panel"
            />
          )}
        </div>
      </div>

      {/* Layer list */}
      <div className="py-1 max-h-60 overflow-y-auto">
        {layers.length === 0 ? (
          <div className={`text-center py-4 text-xs ${
            fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'
          }`}>
            No annotation layers
          </div>
        ) : (
          layers.map(layer => (
            <LayerToggle
              key={layer.id}
              id={layer.id}
              label={layer.label}
              count={layer.annotationCount}
              color={layer.color}
              visible={layer.visible}
              hidden={layer.hidden}
              onToggle={onToggleLayer}
              fieldMode={fieldMode}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotationLayerPanel;
