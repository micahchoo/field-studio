/**
 * CollectionCard Molecule
 *
 * Card component for displaying IIIF collections with drag-drop support.
 * Used in staging and archive features.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero context hooks - all data via props
 * - No domain imports - purely presentational
 * - Composes: CollectionCardHeader, CollectionCardDropOverlay
 * - Supports drag-drop target states
 *
 * IDEAL OUTCOME: Consistent collection representation across features
 * FAILURE PREVENTED: Inconsistent cards, broken drop interactions
 *
 * @module shared/ui/molecules/CollectionCard
 */

import React, { useCallback, useState } from 'react';
import { CollectionCardHeader } from './CollectionCardHeader';
import { CollectionCardDropOverlay } from './CollectionCardDropOverlay';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface CollectionCardProps {
  /** Collection identifier */
  id: string;
  /** Collection name/label */
  name: string;
  /** Number of manifests in collection */
  manifestCount: number;
  /** Number of sub-collections */
  subCollectionCount?: number;
  /** Whether this is the root collection */
  isRoot?: boolean;
  /** Whether item is a drag target */
  isDragOver?: boolean;
  /** Whether item can accept drops */
  canDrop?: boolean;
  /** Whether user is editing the name */
  isEditing?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Called when name is edited */
  onRename?: (newName: string) => void;
  /** Called when collection is deleted */
  onDelete?: () => void;
  /** Called when sub-collection is added */
  onAddSubCollection?: () => void;
  /** Called when drop occurs */
  onDrop?: (e: React.DragEvent) => void;
  /** Called when drag enters */
  onDragEnter?: () => void;
  /** Called when drag leaves */
  onDragLeave?: () => void;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Children for custom content (e.g., manifest list) */
  children?: React.ReactNode;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * CollectionCard Molecule
 *
 * Displays a collection with icon, name, counts, and drop zone.
 * Supports inline editing and drag-drop interactions.
 *
 * @example
 * <CollectionCard
 *   id="coll-1"
 *   name="My Collection"
 *   manifestCount={5}
 *   isDragOver={activeDropTarget ==='coll-1'}
 *   onDrop={handleDrop}
 *   onRename={handleRename}
 * />
 */
export const CollectionCard: React.FC<CollectionCardProps> = React.memo(({
  id,
  name,
  manifestCount,
  subCollectionCount = 0,
  isRoot = false,
  isDragOver = false,
  canDrop = true,
  isEditing: controlledIsEditing,
  className ='',
  onRename,
  onDelete,
  onAddSubCollection,
  onDrop,
  onDragEnter,
  onDragLeave,
  onClick,
  children,
  cx,
  fieldMode: _fieldMode,
}) => {
  // Internal editing state (for uncontrolled mode)
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const isEditing = controlledIsEditing ?? isEditingInternal;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect ='copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop?.(e);
    },
    [onDrop]
  );

  const handleEditStart = useCallback(() => {
    if (!isRoot && onRename) {
      setIsEditingInternal(true);
    }
  }, [isRoot, onRename]);

  const handleEditCancel = useCallback(() => {
    setIsEditingInternal(false);
  }, []);

  const handleRename = useCallback(
    (newName: string) => {
      onRename?.(newName);
      setIsEditingInternal(false);
    },
    [onRename]
  );

  return (
    <div
      data-collection-id={id}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      className={`
        relative border-2  p-4 transition-nb 
        ${isDragOver && canDrop
          ?'border-nb-blue bg-nb-blue/10 shadow-brutal scale-[1.02]'
          : isDragOver && !canDrop
          ?'border-nb-red/40 bg-nb-red/10'
          : isRoot
          ?'border-nb-orange bg-nb-orange/10'
          :`${cx?.surface ??'bg-nb-white border-nb-black/20'} hover:shadow-brutal-sm`
        }
        ${className}
`}
    >
      {/* Drop indicator overlay */}
      <CollectionCardDropOverlay isDragOver={isDragOver} canDrop={canDrop} />

      {/* Header with icon, name, counts, and menu */}
      <CollectionCardHeader
        name={name}
        manifestCount={manifestCount}
        subCollectionCount={subCollectionCount}
        isRoot={isRoot}
        isEditing={isEditing}
        onRename={onRename ? handleRename : undefined}
        onEditCancel={handleEditCancel}
        onEditStart={handleEditStart}
        onDelete={onDelete}
        onAddSubCollection={onAddSubCollection}
        cx={cx}
      />

      {/* Custom content (e.g., manifest list) */}
      {children}
    </div>
  );
});

CollectionCard.displayName = 'CollectionCard';

export default CollectionCard;
