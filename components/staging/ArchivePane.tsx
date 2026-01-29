
import React, { useState, useCallback, useMemo } from 'react';
import { ArchiveLayout, ArchiveCollection, SourceManifest, SourceManifests } from '../../types';
import { Icon } from '../Icon';
import { CollectionCard } from './CollectionCard';
import { findManifest } from '../../services/stagingService';
import { useTerminology } from '../../hooks/useTerminology';
import { useKeyboardDragDrop } from '../../hooks/useKeyboardDragDrop';
import { FEATURE_FLAGS } from '../../constants';

interface ArchivePaneProps {
  archiveLayout: ArchiveLayout;
  sourceManifests: SourceManifests;
  onAddToCollection: (collectionId: string, manifestIds: string[]) => void;
  onRemoveFromCollection: (collectionId: string, manifestIds: string[]) => void;
  onCreateCollection: (name: string, parentId?: string | null) => void;
  onRenameCollection: (collectionId: string, newName: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onOpenSendToModal: (manifestIds: string[]) => void;
  onFocus: () => void;
  isFocused: boolean;
}

export const ArchivePane: React.FC<ArchivePaneProps> = ({
  archiveLayout,
  sourceManifests,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onOpenSendToModal,
  onFocus,
  isFocused
}) => {
  // Use terminology hook for user-friendly labels
  const { t, formatCount } = useTerminology({ level: 'standard' });

  const [dragOverCollectionId, setDragOverCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [focusedCollectionId, setFocusedCollectionId] = useState<string | null>(null);

  // Phase 5: Keyboard drag and drop for collections (when enabled)
  const enableKeyboardDnd = FEATURE_FLAGS.USE_KEYBOARD_DND;

  // Flatten collections for keyboard navigation
  const flattenCollections = useCallback((collection: ArchiveCollection): ArchiveCollection[] => {
    const result: ArchiveCollection[] = [collection];
    collection.children.forEach(child => {
      result.push(...flattenCollections(child));
    });
    return result;
  }, []);

  const allCollections = useMemo(() => {
    return flattenCollections(archiveLayout.root);
  }, [archiveLayout.root, flattenCollections]);

  const keyboardDnd = useKeyboardDragDrop({
    items: allCollections,
    onReorder: () => {
      // Reordering collections not yet supported
    },
    onMove: (itemId, targetId) => {
      // This would be called when moving a manifest to a collection via keyboard
      onAddToCollection(targetId, [itemId]);
    },
    getItemId: (item) => item.id
  });

  // Get manifests for a collection
  const getManifestsForCollection = useCallback((collection: ArchiveCollection): SourceManifest[] => {
    return collection.manifestRefs
      .map(id => findManifest(sourceManifests, id))
      .filter((m): m is SourceManifest => m !== undefined);
  }, [sourceManifests]);

  // Get unassigned manifests
  const unassignedManifests = useMemo((): SourceManifest[] => {
    return archiveLayout.unassignedManifests
      .map(id => findManifest(sourceManifests, id))
      .filter((m): m is SourceManifest => m !== undefined);
  }, [archiveLayout.unassignedManifests, sourceManifests]);

  // Handle creating new collection
  const handleCreateCollection = useCallback(() => {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName.trim());
      setNewCollectionName('');
      setShowNewCollectionInput(false);
    }
  }, [newCollectionName, onCreateCollection]);

  // Handle drag over unassigned section
  const handleUnassignedDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // No-op for unassigned section - items are already unassigned
    setDragOverCollectionId(null);
  }, []);

  // Render collection recursively
  const renderCollection = useCallback((collection: ArchiveCollection, isRoot: boolean = false, level: number = 0) => {
    const manifests = getManifestsForCollection(collection);
    const isFocused = focusedCollectionId === collection.id;
    const isSelected = enableKeyboardDnd && keyboardDnd.state.selectedId === collection.id;
    const isDropTarget = enableKeyboardDnd && keyboardDnd.state.dropTargetId === collection.id;

    return (
      <div
        key={collection.id}
        className="space-y-3"
        role="treeitem"
        aria-level={level + 1}
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={enableKeyboardDnd ? (e) => keyboardDnd.handlers.onKeyDown(e, collection) : undefined}
        onFocus={() => {
          setFocusedCollectionId(collection.id);
          if (enableKeyboardDnd) {
            keyboardDnd.handlers.onFocus(collection);
          }
        }}
      >
        <CollectionCard
          collection={collection}
          manifests={manifests}
          isRoot={isRoot}
          isDragOver={dragOverCollectionId === collection.id || isDropTarget}
          onDrop={(ids) => onAddToCollection(collection.id, ids)}
          onDragEnter={() => setDragOverCollectionId(collection.id)}
          onDragLeave={() => setDragOverCollectionId(null)}
          onRemoveManifest={(id) => onRemoveFromCollection(collection.id, [id])}
          onRename={(name) => onRenameCollection(collection.id, name)}
          onDelete={() => onDeleteCollection(collection.id)}
          onAddSubCollection={() => {
            const name = prompt('New sub-collection name:');
            if (name) onCreateCollection(name, collection.id);
          }}
        />

        {/* Render children */}
        {collection.children.length > 0 && (
          <div className="ml-6 pl-4 border-l-2 border-slate-200 space-y-3">
            {collection.children.map(child => renderCollection(child, false, level + 1))}
          </div>
        )}
      </div>
    );
  }, [
    getManifestsForCollection,
    dragOverCollectionId,
    onAddToCollection,
    onRemoveFromCollection,
    onRenameCollection,
    onDeleteCollection,
    onCreateCollection,
    focusedCollectionId,
    enableKeyboardDnd,
    keyboardDnd
  ]);

  // Stats
  const stats = useMemo(() => {
    const countCollections = (collection: ArchiveCollection): number => {
      return 1 + collection.children.reduce((sum, child) => sum + countCollections(child), 0);
    };
    const countAssignedManifests = (collection: ArchiveCollection): number => {
      return collection.manifestRefs.length +
        collection.children.reduce((sum, child) => sum + countAssignedManifests(child), 0);
    };

    return {
      totalCollections: countCollections(archiveLayout.root),
      assignedManifests: countAssignedManifests(archiveLayout.root),
      unassignedCount: archiveLayout.unassignedManifests.length
    };
  }, [archiveLayout]);

  return (
    <div
      className={`
        flex flex-col h-full transition-colors
        ${isFocused ? 'border-amber-200 bg-amber-50/30' : 'bg-slate-50'}
      `}
      onClick={onFocus}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icon name="account_tree" className="text-amber-500" />
              Your Archive
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Organize {t('Manifest').toLowerCase()}s into {t('Collection').toLowerCase()}s
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-800">{stats.totalCollections}</div>
            <div className="text-[10px] text-slate-400">{t('Collection').toLowerCase()}s</div>
          </div>
        </div>

        {/* New collection input */}
        {showNewCollectionInput ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              placeholder={`${t('Collection')} name...`}
              autoFocus
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-400"
            />
            <button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewCollectionInput(false);
                setNewCollectionName('');
              }}
              className="px-3 py-2 text-slate-500 hover:text-slate-700"
            >
              <Icon name="close" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCollectionInput(true)}
            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="create_new_folder" />
            New {t('Collection')}
          </button>
        )}
      </div>

      {/* Collection tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Root collection and children */}
        {renderCollection(archiveLayout.root, true)}

        {/* Unassigned section */}
        {unassignedManifests.length > 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleUnassignedDrop}
            className="mt-6 pt-4 border-t border-slate-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon name="inbox" className="text-slate-400" />
              <h4 className="font-medium text-slate-600">
                Unassigned {t('Manifest')}s
              </h4>
              <span className="ml-auto text-[11px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                {unassignedManifests.length}
              </span>
            </div>

            <div className="space-y-2">
              {unassignedManifests.map((manifest) => (
                <div
                  key={manifest.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/iiif-manifest-ids', JSON.stringify([manifest.id]));
                  }}
                  className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <Icon name="drag_indicator" className="text-slate-300 group-hover:text-slate-500" />
                  <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center flex-shrink-0">
                    <Icon name="menu_book" className="text-emerald-600 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">
                      {manifest.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {manifest.files.length} files
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenSendToModal([manifest.id])}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-medium hover:bg-amber-200 transition-opacity"
                  >
                    Add to {t('Collection')}...
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no collections */}
        {archiveLayout.root.children.length === 0 && unassignedManifests.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="create_new_folder" className="text-3xl text-amber-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              No {t('Collection').toLowerCase()}s yet
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Create your first {t('Collection').toLowerCase()} to organize your files
            </p>
            <div className="bg-slate-50 rounded-lg p-3 text-left">
              <p className="text-[11px] font-medium text-slate-600 mb-2">How to organize:</p>
              <ul className="text-[11px] text-slate-500 space-y-1">
                <li className="flex items-start gap-1.5">
                  <Icon name="drag_indicator" className="text-xs text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Drag files from the left to add them</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Icon name="create_new_folder" className="text-xs text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Create {t('Collection').toLowerCase()}s to group related files</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Icon name="account_tree" className="text-xs text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Nest {t('Collection').toLowerCase()}s for hierarchy</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer with validation indicators */}
      <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between text-[10px]">
          {stats.unassignedCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-600">
              <Icon name="warning" className="text-sm" />
              {stats.unassignedCount} {t('Manifest').toLowerCase()}{stats.unassignedCount !== 1 ? 's' : ''} not in any {t('Collection').toLowerCase()}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-600">
              <Icon name="check_circle" className="text-sm" />
              All {t('Manifest').toLowerCase()}s assigned
            </div>
          )}
          <span className="text-slate-400">
            {stats.assignedManifests} in {t('Collection').toLowerCase()}s
          </span>
        </div>
      </div>
    </div>
  );
};
