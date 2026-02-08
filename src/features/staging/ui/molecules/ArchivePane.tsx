/**
 * ArchivePane Component
 *
 * Right-side pane of the staging workbench showing the archive structure.
 * Displays collections and allows organizing manifests into them.
 */

import React, { useCallback, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { SourceManifests } from '@/src/shared/types';
import type { ArchiveLayout, ArchiveNode } from '@/src/shared/lib/hooks/useStagingState';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { contentStateService } from '@/src/shared/services/contentState';

export interface ArchivePaneProps {
  archiveLayout: ArchiveLayout;
  sourceManifests: SourceManifests;
  onAddToCollection: (collectionId: string, manifestIds: string[]) => void;
  onRemoveFromCollection: (collectionId: string, manifestIds: string[]) => void;
  onCreateCollection: (name: string) => string;
  onRenameCollection: (collectionId: string, newName: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onFocus: () => void;
  isFocused: boolean;
  onContextMenu?: (e: React.MouseEvent, collectionId: string) => void;
}

const ArchivePaneHeader: React.FC<{
  onCreateCollection: (name: string) => string;
  onFocus: () => void;
}> = ({ onCreateCollection, onFocus }) => {
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateCollection(newName);
      setNewName('');
      setShowNewCollectionInput(false);
    }
  };

  return (
    <div
      className="p-3 border-b border-nb-black/20 bg-nb-cream/40"
      onClick={onFocus}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-nb-black/80">Archive Layout</h3>
        <Button variant="ghost" size="bare"
          onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
          className="p-1 hover:bg-nb-cream text-nb-black/60 text-sm"
          title="Create new collection"
        >
          <Icon name="add" className="text-base" />
        </Button>
      </div>

      {showNewCollectionInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowNewCollectionInput(false);
            }}
            placeholder="Collection name..."
            className="flex-1 px-2 py-1 text-sm border border-nb-black/20 rounded"
            autoFocus
          />
          <Button variant="ghost" size="bare"
            onClick={handleCreate}
            className="px-2 py-1 text-sm bg-nb-blue text-white hover:bg-nb-blue"
          >
            Create
          </Button>
        </div>
      )}
    </div>
  );
};

const CollectionNode: React.FC<{
  node: ArchiveNode;
  sourceManifests: SourceManifests;
  onRemove: (manifestIds: string[]) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddToCollection?: (manifestIds: string[]) => void;
  onFocus: () => void;
  onContextMenu?: (e: React.MouseEvent, collectionId: string) => void;
}> = ({ node, sourceManifests, onRemove, onRename, onDelete, onAddToCollection, onFocus, onContextMenu }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const manifestCount = node.manifestIds?.length || 0;

  const handleRename = () => {
    if (newName.trim()) {
      onRename(newName);
      setIsRenaming(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const currentTarget = e.currentTarget as HTMLElement;
    if (currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Try application/iiif-manifest-ids first (internal drag)
    const raw = e.dataTransfer.getData('application/iiif-manifest-ids');
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[];
        if (ids.length > 0) { onAddToCollection?.(ids); return; }
      } catch { /* ignore malformed data */ }
    }

    // Fallback: try IIIF Content State (external drag interop)
    try {
      const contentState = contentStateService.handleDrop(e.dataTransfer);
      if (contentState?.manifestId) {
        onAddToCollection?.([contentState.manifestId]);
      }
    } catch { /* ignore */ }
  }, [onAddToCollection]);

  return (
    <div
      className={`border-b ${isDragOver ? 'border-dashed border-nb-blue bg-nb-blue/5' : 'border-nb-black/10'}`}
      onClick={onFocus}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Collection header */}
      <div
        className="flex items-center gap-2 p-2 hover:bg-nb-cream cursor-pointer group"
        onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, node.id); }}
      >
        <Button variant="ghost" size="bare"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-nb-cream rounded"
        >
          <Icon
            name={isExpanded ? 'expand_more' : 'chevron_right'}
            className="text-base"
          />
        </Button>

        <Icon name="folder" className="text-base text-nb-blue" />

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="flex-1 px-1 py-0.5 text-sm border border-nb-black/20 rounded"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-nb-black/80">
              {node.name}
            </span>
            <span className="text-xs text-nb-black/50 px-2 py-0.5 bg-nb-cream rounded">
              {manifestCount}
            </span>
          </>
        )}

        {/* Actions */}
        <div className="hidden group-hover:flex gap-1">
          <Button variant="ghost" size="bare"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            className="p-0.5 hover:bg-nb-cream text-nb-black/60 text-xs"
            title="Rename"
          >
            <Icon name="edit" className="text-sm" />
          </Button>
          <Button variant="ghost" size="bare"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 hover:bg-nb-red/40 text-nb-red text-xs"
            title="Delete"
          >
            <Icon name="delete" className="text-sm" />
          </Button>
        </div>
      </div>

      {/* Manifests in collection */}
      {isExpanded && node.manifestIds && node.manifestIds.length > 0 && (
        <div className="bg-nb-white border-l border-nb-black/20 ml-4">
          {node.manifestIds.map((manifestId) => {
            const manifest = sourceManifests.manifests.find(
              (m) => m.id === manifestId
            );
            if (!manifest) return null;

            return (
              <div
                key={manifestId}
                className="flex items-center gap-2 p-2 pl-6 hover:bg-nb-cream text-xs text-nb-black/80 group"
              >
                <Icon name="description" className="text-sm text-nb-black/40" />
                <span className="flex-1 truncate">{manifest.name}</span>
                <Button variant="ghost" size="bare"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove([manifestId]);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-nb-red/40 text-nb-red"
                  title="Remove from collection"
                >
                  <Icon name="close" className="text-sm" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && (!node.manifestIds || node.manifestIds.length === 0) && (
        <div className={`p-3 pl-10 text-xs italic ${isDragOver ? 'text-nb-blue font-medium' : 'text-nb-black/40'}`}>
          {isDragOver ? 'Drop here to add' : 'No manifests. Drag from left pane to add.'}
        </div>
      )}
    </div>
  );
};

export const ArchivePane: React.FC<ArchivePaneProps> = ({
  archiveLayout,
  sourceManifests,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onFocus,
  isFocused,
  onContextMenu,
}) => {
  const [isNewCollectionDragOver, setIsNewCollectionDragOver] = useState(false);

  const handleNewCollectionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsNewCollectionDragOver(true);
  }, []);

  const handleNewCollectionDragLeave = useCallback((e: React.DragEvent) => {
    const currentTarget = e.currentTarget as HTMLElement;
    if (currentTarget.contains(e.relatedTarget as Node)) return;
    setIsNewCollectionDragOver(false);
  }, []);

  const handleNewCollectionDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsNewCollectionDragOver(false);
    const raw = e.dataTransfer.getData('application/iiif-manifest-ids');
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (ids.length > 0) {
        const newId = onCreateCollection(`New Collection`);
        onAddToCollection(newId, ids);
      }
    } catch { /* ignore malformed data */ }
  }, [onCreateCollection, onAddToCollection]);

  return (
    <div
      className={`h-full flex flex-col bg-nb-cream/30 border border-nb-black/20 overflow-hidden ${
        isFocused ? 'ring-2 ring-nb-blue' : ''
      }`}
    >
      <ArchivePaneHeader
        onCreateCollection={onCreateCollection}
        onFocus={onFocus}
      />

      {/* Collections list */}
      <div className="flex-1 overflow-y-auto">
        {archiveLayout.root.children.length === 0 ? (
          <div className="p-6 text-center text-sm text-nb-black/50">
            <Icon name="inbox" className="text-4xl mb-2 block opacity-50" />
            <p>No collections yet</p>
            <p className="text-xs mt-1">Create one using the + button above, or drag items here</p>
          </div>
        ) : (
          archiveLayout.root.children.map((collection) => (
            <CollectionNode
              key={collection.id}
              node={collection}
              sourceManifests={sourceManifests}
              onRemove={(ids) => onRemoveFromCollection(collection.id, ids)}
              onRename={(newName) => onRenameCollection(collection.id, newName)}
              onDelete={() => onDeleteCollection(collection.id)}
              onAddToCollection={(ids) => onAddToCollection(collection.id, ids)}
              onFocus={onFocus}
              onContextMenu={onContextMenu}
            />
          ))
        )}

        {/* Drop zone for creating new collection */}
        <div
          className={`m-2 p-4 border-2 border-dashed text-center text-xs transition-nb ${
            isNewCollectionDragOver
              ? 'border-nb-blue bg-nb-blue/10 text-nb-blue font-medium'
              : 'border-nb-black/15 text-nb-black/30'
          }`}
          onDragOver={handleNewCollectionDragOver}
          onDragLeave={handleNewCollectionDragLeave}
          onDrop={handleNewCollectionDrop}
        >
          <Icon name="add" className={`text-lg mb-1 block ${isNewCollectionDragOver ? 'text-nb-blue' : 'text-nb-black/20'}`} />
          {isNewCollectionDragOver ? 'Drop to create new collection' : 'Drop here for new collection'}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-nb-black/20 bg-nb-cream/40 text-xs text-nb-black/50">
        <div className="flex justify-between">
          <span>
            {archiveLayout.root.children.length} collection
            {archiveLayout.root.children.length !== 1 ? 's' : ''}
          </span>
          <span>
            {sourceManifests.manifests.length} manifest
            {sourceManifests.manifests.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArchivePane;
