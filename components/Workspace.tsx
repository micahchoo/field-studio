import React, { useState } from 'react';
import { getIIIFValue, IIIFCanvas, IIIFItem, IIIFManifest, isCanvas, isManifest } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface WorkspaceProps {
  resource: IIIFItem | null;
  onSelectCanvas: (canvas: IIIFCanvas) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ resource, onSelectCanvas }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  if (!resource) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-400">
        <div className="text-center">
          <Icon name="archive" className="text-6xl mb-4 text-slate-300" />
          <p className="text-lg font-medium">Select a resource to view</p>
        </div>
      </div>
    );
  }

  const resourceIsManifest = isManifest(resource);
  const items = resourceIsManifest ? (resource as IIIFManifest).items : (resource as any).items || [];

  return (
    <div className="flex-1 flex flex-col bg-slate-200">
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${resourceIsManifest ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {resource.type}
            </span>
            <span className="font-bold">{getIIIFValue(resource.label, 'none') || 'Untitled'}</span>
        </div>
        <div className="flex gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-iiif-blue' : 'text-slate-400'}`}><Icon name="grid_view"/></button>
            <button onClick={() => setViewMode('map')} className={`p-1.5 rounded ${viewMode === 'map' ? 'bg-slate-100 text-iiif-blue' : 'text-slate-400'}`}><Icon name="map"/></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {items.map((item: any) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => isCanvas(item) && onSelectCanvas(item)}
                    >
                        <div className="aspect-[3/4] bg-slate-100 mb-2 rounded flex items-center justify-center overflow-hidden relative">
                            {item._blobUrl ? (
                                <img src={item._blobUrl} className="w-full h-full object-contain" />
                            ) : (
                                <Icon name={isManifest(item) ? 'menu_book' : 'image'} className="text-4xl text-slate-300"/>
                            )}
                            {isCanvas(item) && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold">
                                    View
                                </div>
                            )}
                        </div>
                        <div className="text-xs font-medium text-slate-700 truncate">{getIIIFValue(item.label, 'none') || getIIIFValue(item.label, 'en') || 'Item'}</div>
                    </div>
                ))}
            </div>
        )}
        {viewMode === 'map' && (
            <div className="h-full flex items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="text-center">
                    <Icon name="public" className="text-6xl mb-2"/>
                    <p>Map visualization requires geospatial metadata</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};