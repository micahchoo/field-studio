
import React, { useState } from 'react';
import { ArchiveCollection, SourceManifest } from '../../types';
import { Icon } from '../Icon';

interface CollectionCardProps {
  collection: ArchiveCollection;
  manifests: SourceManifest[];
  isRoot?: boolean;
  isDragOver: boolean;
  onDrop: (manifestIds: string[]) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onRemoveManifest: (manifestId: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddSubCollection: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  manifests,
  isRoot = false,
  isDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onRemoveManifest,
  onRename,
  onDelete,
  onAddSubCollection
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [showMenu, setShowMenu] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/iiif-manifest-ids');
    if (data) {
      try {
        const ids = JSON.parse(data) as string[];
        onDrop(ids);
      } catch {
        // Single ID fallback
        const singleId = e.dataTransfer.getData('text/plain');
        if (singleId) onDrop([singleId]);
      }
    }
    onDragLeave();
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== collection.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(collection.name);
      setIsEditing(false);
    }
  };

  const manifestCount = collection.manifestRefs.length;
  const childCount = collection.children.length;

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 rounded-xl p-4 transition-all
        ${isDragOver
          ? 'border-blue-400 bg-blue-900/20 shadow-lg scale-[1.02]'
          : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:shadow-sm'
        }
        ${isRoot ? 'border-amber-500/50 bg-amber-900/20' : ''}
      `}
    >
      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-900/80 rounded-xl z-10">
          <div className="text-center">
            <Icon name="add_circle" className="text-4xl text-blue-400 mb-2" />
            <div className="text-sm font-bold text-blue-300">Drop to add</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isRoot ? 'bg-amber-600' : 'bg-amber-700/50'}
        `}>
          <Icon name={isRoot ? 'folder_special' : 'folder'} className="text-xl text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-2 py-1 text-sm font-medium border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-600 text-white"
            />
          ) : (
            <div
              className="font-medium text-slate-800 truncate cursor-pointer hover:text-blue-600"
              onClick={() => !isRoot && setIsEditing(true)}
              title={isRoot ? collection.name : 'Click to rename'}
            >
              {collection.name}
              {isRoot && <span className="ml-2 text-[10px] text-amber-400 font-bold">(ROOT)</span>}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{manifestCount} {manifestCount === 1 ? 'manifest' : 'manifests'}</span>
            {childCount > 0 && (
              <>
                <span className="text-slate-500">|</span>
                <span>{childCount} sub-{childCount === 1 ? 'collection' : 'collections'}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"
          >
            <Icon name="more_vert" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                <button
                  onClick={() => { onAddSubCollection(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                >
                  <Icon name="create_new_folder" className="text-slate-400" />
                  Add Sub-Collection
                </button>
                {!isRoot && (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                    >
                      <Icon name="edit" className="text-slate-400" />
                      Rename
                    </button>
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/30 text-red-400 flex items-center gap-2"
                    >
                      <Icon name="delete" className="text-red-400" />
                      Delete Collection
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manifest badges */}
      {manifests.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t border-slate-600">
          {manifests.slice(0, 5).map((manifest) => (
            <div
              key={manifest.id}
              className="group flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-sm"
            >
              <Icon name="menu_book" className="text-emerald-400 text-sm" />
              <span className="flex-1 truncate text-slate-300" title={manifest.name}>
                {manifest.name}
              </span>
              <span className="text-[10px] text-slate-500">
                {manifest.files.length} files
              </span>
              <button
                onClick={() => onRemoveManifest(manifest.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-opacity"
                title="Remove from collection"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ))}
          {manifests.length > 5 && (
            <div className="text-[11px] text-slate-500 text-center py-1">
              +{manifests.length - 5} more manifests
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {manifests.length === 0 && !isDragOver && (
        <div className="mt-3 pt-3 border-t border-dashed border-slate-600 text-center py-4">
          <Icon name="drag_indicator" className="text-2xl text-slate-500 mb-1" />
          <div className="text-[11px] text-slate-400">
            Drag manifests here
          </div>
        </div>
      )}
    </div>
  );
};
