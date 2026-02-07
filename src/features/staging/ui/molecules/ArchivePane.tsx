/**
 * ArchivePane Component
 *
 * Right-side pane of the staging workbench showing the archive structure.
 * Displays collections and allows organizing manifests into them.
 */

import React, { useCallback, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { SourceManifest, SourceManifests } from '@/src/shared/types';
import type { ArchiveLayout, ArchiveNode } from '@/src/shared/lib/hooks/useStagingState';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export interface ArchivePaneProps {
  archiveLayout: ArchiveLayout;
  sourceManifests: SourceManifests;
  onAddToCollection: (collectionId: string, manifestIds: string[]) => void;
  onRemoveFromCollection: (collectionId: string, manifestIds: string[]) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (collectionId: string, newName: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onOpenSendToModal: (manifestIds: string[]) => void;
  onFocus: () => void;
  isFocused: boolean;
}

const ArchivePaneHeader: React.FC<{
  onCreateCollection: (name: string) => void;
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
      className="p-3 border-b border-slate-200 bg-slate-50"
      onClick={onFocus}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700">Archive Layout</h3>
        <Button variant="ghost" size="bare"
          onClick={() => setShowNewCollectionInput(!showNewCollectionInput)}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 text-sm"
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
            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
            autoFocus
          />
          <Button variant="ghost" size="bare"
            onClick={handleCreate}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
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
  onOpenSendTo: (manifestIds: string[]) => void;
  onFocus: () => void;
}> = ({ node, sourceManifests, onRemove, onRename, onDelete, onOpenSendTo, onFocus }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const manifestCount = node.manifestIds?.length || 0;

  const handleRename = () => {
    if (newName.trim()) {
      onRename(newName);
      setIsRenaming(false);
    }
  };

  return (
    <div className="border-b border-slate-100" onClick={onFocus}>
      {/* Collection header */}
      <div className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer group">
        <Button variant="ghost" size="bare"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-slate-300 rounded"
        >
          <Icon
            name={isExpanded ? 'expand_more' : 'chevron_right'}
            className="text-base"
          />
        </Button>

        <Icon name="folder" className="text-base text-blue-500" />

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
            className="flex-1 px-1 py-0.5 text-sm border border-slate-300 rounded"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-slate-700">
              {node.name}
            </span>
            <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
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
            className="p-0.5 hover:bg-slate-300 rounded text-slate-600 text-xs"
            title="Rename"
          >
            <Icon name="edit" className="text-sm" />
          </Button>
          <Button variant="ghost" size="bare"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 hover:bg-red-300 rounded text-red-600 text-xs"
            title="Delete"
          >
            <Icon name="delete" className="text-sm" />
          </Button>
        </div>
      </div>

      {/* Manifests in collection */}
      {isExpanded && node.manifestIds && node.manifestIds.length > 0 && (
        <div className="bg-slate-50 border-l border-slate-200 ml-4">
          {node.manifestIds.map((manifestId) => {
            const manifest = sourceManifests.manifests.find(
              (m) => m.id === manifestId
            );
            if (!manifest) return null;

            return (
              <div
                key={manifestId}
                className="flex items-center gap-2 p-2 pl-6 hover:bg-slate-100 text-xs text-slate-700 group"
              >
                <Icon name="description" className="text-sm text-slate-400" />
                <span className="flex-1 truncate">{manifest.name}</span>
                <Button variant="ghost" size="bare"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove([manifestId]);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-300 rounded text-red-600"
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
        <div className="p-3 pl-10 text-xs text-slate-400 italic">
          No manifests. Drag from left pane to add.
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
  onOpenSendToModal,
  onFocus,
  isFocused,
}) => {
  return (
    <div
      className={`h-full flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden ${
        isFocused ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <ArchivePaneHeader
        onCreateCollection={onCreateCollection}
        onFocus={onFocus}
      />

      {/* Collections list */}
      <div className="flex-1 overflow-y-auto">
        {archiveLayout.root.children.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            <Icon name="inbox" className="text-4xl mb-2 block opacity-50" />
            <p>No collections yet</p>
            <p className="text-xs mt-1">Create one using the + button above</p>
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
              onOpenSendTo={onOpenSendToModal}
              onFocus={onFocus}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
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
