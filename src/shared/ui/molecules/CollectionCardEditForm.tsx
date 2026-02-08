/**
 * CollectionCardEditForm Molecule
 *
 * Inline editing form for collection card names.
 * Handles edit state, save/cancel logic, and keyboard navigation.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero context hooks - all data via props
 * - Pure presentational component
 * - Callbacks for all actions
 *
 * IDEAL OUTCOME: Smooth inline editing without page reload
 * FAILURE PREVENTED: Lost edits, confusing save/cancel behavior
 *
 * @module shared/ui/molecules/CollectionCardEditForm
 */

import React, { useCallback, useEffect, useState } from 'react';

export interface CollectionCardEditFormProps {
  /** Current name value */
  name: string;
  /** Called when save is triggered (Enter or blur) */
  onSave: (newName: string) => void;
  /** Called when edit is cancelled (Escape) */
  onCancel: () => void;
}

/**
 * CollectionCardEditForm Component
 *
 * Inline text input for editing collection names.
 *
 * @example
 * <CollectionCardEditForm
 *   name="My Collection"
 *   onSave={(newName) => handleRename(newName)}
 *   onCancel={() => setIsEditing(false)}
 * />
 */
export const CollectionCardEditForm: React.FC<CollectionCardEditFormProps> = ({
  name,
  onSave,
  onCancel,
}) => {
  const [editName, setEditName] = useState(name);

  // Reset edit value if name prop changes
  useEffect(() => {
    setEditName(name);
  }, [name]);

  const handleSave = useCallback(() => {
    if (editName.trim() && editName !== name) {
      onSave(editName.trim());
    } else {
      onCancel();
    }
  }, [editName, name, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key ==='Enter') {
        handleSave();
      } else if (e.key ==='Escape') {
        setEditName(name);
        onCancel();
      }
    },
    [handleSave, name, onCancel]
  );

  return (
    <input
      type="text"
      value={editName}
      onChange={(e) => setEditName(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      autoFocus
      className="w-full px-2 py-1 text-sm font-medium border border-nb-blue/40 focus:outline-none focus:ring-2 focus:ring-nb-blue"
      aria-label="Edit collection name"
    />
  );
};

export default CollectionCardEditForm;
