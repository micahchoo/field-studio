
import React, { useMemo, useState } from 'react';
import { ArchiveCollection, SourceManifest } from '../../types';
import { Icon } from '../Icon';

interface SendToCollectionModalProps {
  manifests: SourceManifest[];
  collections: ArchiveCollection[];
  onSend: (collectionId: string) => void;
  onCreateAndSend: (collectionName: string) => void;
  onClose: () => void;
}

export const SendToCollectionModal: React.FC<SendToCollectionModalProps> = ({
  manifests,
  collections,
  onSend,
  onCreateAndSend,
  onClose
}) => {
  const [filterText, setFilterText] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);

  // Filter collections
  const filteredCollections = useMemo(() => {
    if (!filterText.trim()) return collections;
    const lower = filterText.toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(lower));
  }, [collections, filterText]);

  // Flatten collection hierarchy with indentation level
  const flatCollections = useMemo(() => {
    const result: { collection: ArchiveCollection; level: number }[] = [];

    const flatten = (collection: ArchiveCollection, level: number) => {
      result.push({ collection, level });
      collection.children.forEach(child => flatten(child, level + 1));
    };

    filteredCollections.forEach(c => flatten(c, 0));
    return result;
  }, [filteredCollections]);

  const handleCreateAndSend = () => {
    if (newCollectionName.trim()) {
      onCreateAndSend(newCollectionName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icon name="drive_file_move" className="text-amber-500" />
              Send to Collection
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {manifests.length} manifest{manifests.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Selected manifests preview */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            {manifests.slice(0, 3).map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600"
              >
                <Icon name="menu_book" className="text-emerald-500 text-xs" />
                <span className="truncate max-w-[120px]">{m.name}</span>
              </span>
            ))}
            {manifests.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-slate-200 rounded text-[11px] text-slate-600">
                +{manifests.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:bg-white"
            />
            <Icon name="search" className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
          </div>
        </div>

        {/* Collection list */}
        <div className="flex-1 overflow-y-auto p-2">
          {flatCollections.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Icon name="folder_off" className="text-3xl mb-2" />
              <p className="text-sm">
                {filterText ? 'No collections match your search' : 'No collections available'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {flatCollections.map(({ collection, level }) => (
                <button
                  key={collection.id}
                  onClick={() => onSend(collection.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-colors text-left"
                  style={{ paddingLeft: 12 + level * 20 }}
                >
                  <div className={`
                    w-8 h-8 rounded flex items-center justify-center flex-shrink-0
                    ${level === 0 ? 'bg-amber-200' : 'bg-amber-100'}
                  `}>
                    <Icon
                      name={level === 0 ? 'folder_special' : 'folder'}
                      className="text-amber-600 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {collection.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {collection.manifestRefs.length} manifests |{' '}
                      {collection.children.length} sub-collections
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create new collection */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          {showNewInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAndSend()}
                placeholder="New collection name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-400"
              />
              <button
                onClick={handleCreateAndSend}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create & Send
              </button>
              <button
                onClick={() => {
                  setShowNewInput(false);
                  setNewCollectionName('');
                }}
                className="px-2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="close" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="add" />
              Create New Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
