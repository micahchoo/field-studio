import React, { useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';

interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resourceType: string;
  label: string;
  blobUrl?: string;
  blobUrls?: string[];
  annotation?: string;
  isNote?: boolean;
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
  provider?: IIIFItem['provider'];
  behavior?: IIIFItem['behavior'];
}

interface ItemDetailModalProps {
  item: BoardItem;
  onClose: () => void;
  fieldMode?: boolean;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  fieldMode = false,
}) => {
  const [showMetadata, setShowMetadata] = useState(true);
  const [imageScale, setImageScale] = useState(1);

  const bgClass = fieldMode ? 'bg-slate-900' : 'bg-white';
  const textClass = fieldMode ? 'text-white' : 'text-slate-800';
  const labelClass = fieldMode ? 'text-slate-400' : 'text-slate-500';
  const borderClass = fieldMode ? 'border-slate-700' : 'border-slate-200';

  const imageUrl = item.blobUrls?.[0] || item.blobUrl;

  const handleZoomIn = () => setImageScale(s => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setImageScale(s => Math.max(s - 0.25, 0.25));
  const handleResetZoom = () => setImageScale(1);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-[90vw] h-[90vh] max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex ${bgClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Image Area */}
        <div className={`flex-1 relative ${item.isNote ? 'bg-yellow-50' : 'bg-slate-900'} overflow-hidden`}>
          {item.isNote ? (
            <div className="h-full flex items-center justify-center p-12">
              <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Icon name="sticky_note_2" className="text-3xl text-yellow-500" />
                  <h2 className="text-2xl font-bold text-slate-800">{item.label}</h2>
                </div>
                <p className="text-lg text-slate-700 whitespace-pre-wrap leading-relaxed font-handwriting">
                  {item.annotation || 'Empty note'}
                </p>
              </div>
            </div>
          ) : imageUrl ? (
            <>
              <div
                className="absolute inset-0 flex items-center justify-center overflow-auto"
                style={{ cursor: imageScale > 1 ? 'move' : 'default' }}
              >
                <img
                  src={imageUrl}
                  alt={item.label}
                  className="max-w-none transition-transform duration-200"
                  style={{ transform: `scale(${imageScale})` }}
                  draggable={false}
                />
              </div>

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 rounded-xl p-1 backdrop-blur-sm">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <Icon name="remove" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-3 py-2 text-white text-xs font-bold min-w-[60px] hover:bg-white/10 rounded-lg transition-colors"
                >
                  {Math.round(imageScale * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <Icon name="add" />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="image_not_supported" className="text-6xl text-slate-600 mb-4" />
                <p className="text-slate-500">No image available</p>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
          >
            <Icon name="close" />
          </button>

          {/* Toggle metadata panel */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`absolute top-4 left-4 p-2 rounded-lg backdrop-blur-sm transition-colors ${showMetadata ? 'bg-white/20 text-white' : 'bg-black/60 hover:bg-black/80 text-white'}`}
            title={showMetadata ? 'Hide metadata' : 'Show metadata'}
          >
            <Icon name={showMetadata ? 'chevron_right' : 'info'} />
          </button>
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <div className={`w-96 border-l ${borderClass} flex flex-col animate-in slide-in-from-right`}>
            {/* Header */}
            <div className={`p-6 border-b ${borderClass}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.resourceType === 'Canvas'
                    ? 'bg-green-100 text-green-600'
                    : item.resourceType === 'Manifest'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon name="image" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${labelClass}`}>
                  {item.resourceType}
                </span>
              </div>
              <h2 className={`text-xl font-bold ${textClass}`}>{item.label}</h2>
              {item.summary && (
                <p className={`mt-2 text-sm ${labelClass}`}>
                  {getIIIFValue(item.summary)}
                </p>
              )}
            </div>

            {/* Scrollable content */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${bgClass}`}>
              {/* IIIF Properties */}
              <div className="p-6 space-y-6">
                {/* Resource ID */}
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-1 block`}>
                    Resource ID
                  </label>
                  <code className={`text-xs break-all block p-2 rounded-lg ${fieldMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {item.resourceId}
                  </code>
                </div>

                {/* Rights */}
                {item.rights && (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-1 block`}>
                      Rights
                    </label>
                    <a
                      href={item.rights}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-iiif-blue hover:underline flex items-center gap-1"
                    >
                      {item.rights.includes('creativecommons') ? 'Creative Commons' :
                       item.rights.includes('rightsstatements') ? 'Rights Statement' : item.rights}
                      <Icon name="open_in_new" className="text-xs" />
                    </a>
                  </div>
                )}

                {/* Required Statement */}
                {item.requiredStatement && (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-1 block`}>
                      {getIIIFValue(item.requiredStatement.label) || 'Attribution'}
                    </label>
                    <p className={`text-sm ${textClass}`}>
                      {getIIIFValue(item.requiredStatement.value)}
                    </p>
                  </div>
                )}

                {/* Behaviors */}
                {item.behavior && item.behavior.length > 0 && (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-2 block`}>
                      Behaviors
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {item.behavior.map((b, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full ${fieldMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Metadata */}
                {item.metadata && item.metadata.length > 0 && (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-3 block`}>
                      Metadata ({item.metadata.length})
                    </label>
                    <div className="space-y-3">
                      {item.metadata.map((m, i) => (
                        <div key={i} className={`p-3 rounded-lg ${fieldMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <div className={`text-[10px] font-bold uppercase ${labelClass} mb-1`}>
                            {getIIIFValue(m.label)}
                          </div>
                          <div className={`text-sm ${textClass}`}>
                            {getIIIFValue(m.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provider */}
                {item.provider && item.provider.length > 0 && (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-2 block`}>
                      Provider
                    </label>
                    {item.provider.map((p, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${fieldMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        {p.logo?.[0]?.id && (
                          <img src={p.logo[0].id} alt="" className="w-8 h-8 object-contain" />
                        )}
                        <span className={`text-sm font-medium ${textClass}`}>
                          {getIIIFValue(p.label)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Position on Board */}
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-1 block`}>
                    Board Position
                  </label>
                  <div className={`grid grid-cols-2 gap-2 text-xs ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`p-2 rounded ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <span className="font-bold">X:</span> {Math.round(item.x)}
                    </div>
                    <div className={`p-2 rounded ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <span className="font-bold">Y:</span> {Math.round(item.y)}
                    </div>
                    <div className={`p-2 rounded ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <span className="font-bold">W:</span> {Math.round(item.w)}
                    </div>
                    <div className={`p-2 rounded ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <span className="font-bold">H:</span> {Math.round(item.h)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailModal;
