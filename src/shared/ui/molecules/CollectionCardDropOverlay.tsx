/**
 * CollectionCardDropOverlay Molecule
 *
 * Visual feedback overlays for drag-drop operations on collection cards.
 * Shows"Drop to add" or"Cannot drop" states.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero context hooks - all data via props
 * - Pure presentational component
 * - No business logic
 *
 * IDEAL OUTCOME: Clear visual feedback during drag-drop operations
 * FAILURE PREVENTED: Confusing drop interactions without visual cues
 *
 * @module shared/ui/molecules/CollectionCardDropOverlay
 */

import React from 'react';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface CollectionCardDropOverlayProps {
  /** Whether drag is currently over this card */
  isDragOver: boolean;
  /** Whether the drop is valid/can be accepted */
  canDrop: boolean;
  /** Contextual styles */
  cx?: Partial<ContextualClassNames>;
}

/**
 * CollectionCardDropOverlay Component
 *
 * Renders drop zone visual feedback for collection cards.
 *
 * @example
 * <CollectionCardDropOverlay isDragOver={true} canDrop={true} />
 */
export const CollectionCardDropOverlay: React.FC<CollectionCardDropOverlayProps> = ({
  isDragOver,
  canDrop,
  cx,
}) => {
  if (!isDragOver) return null;

  if (canDrop) {
    // Use cx.accent for themed drop highlight; fall back to blue
    const accentText = cx?.accent ?? 'text-nb-blue';
    const accentBg = cx?.accent ? cx.accent.replace('text-', 'bg-') + '/20' : 'bg-nb-blue/20';
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${accentBg} z-10 pointer-events-none`}>
        <div className="text-center">
          <Icon name="add_circle" className={`text-4xl ${accentText} mb-2`} />
          <div className={`text-sm font-bold ${accentText}`}>Drop to add</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${cx?.dangerHover ?? 'bg-nb-red/20'} z-10 pointer-events-none`}>
      <div className="text-center">
        <Icon name="block" className={`text-4xl ${cx?.danger ?? 'text-nb-red'} mb-2`} />
        <div className={`text-sm font-bold ${cx?.danger ?? 'text-nb-red'}`}>Cannot drop here</div>
      </div>
    </div>
  );
};

export default CollectionCardDropOverlay;
