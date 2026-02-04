import React, { useState } from 'react';
import { Icon } from './Icon';
import { getIIIFValue, IIIFItem } from '../types';

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
  rights?: IIIFItem['rights'];
}

interface ItemPreviewPanelProps {
  item: BoardItem | null;
  onExpand: (item: BoardItem) => void;
  fieldMode?: boolean;
}

export const ItemPreviewPanel: React.FC<ItemPreviewPanelProps> = ({
  item,
  onExpand,
  fieldMode = false,
}) => {
  if (!item) return null;

  const bgClass = fieldMode ? 'bg-slate-900/95' : 'bg-white/95';
  const borderClass = fieldMode ? 'border-slate-700' : 'border-slate-200';
  const textClass = fieldMode ? 'text-white' : 'text-slate-800';
  const labelClass = fieldMode ? 'text-slate-400' : 'text-slate-500';

  const imageUrl = item.blobUrls?.[0] || item.blobUrl;

  return (
    <div
      className={`absolute bottom-4 left-4 w-72 rounded-2xl shadow-2xl border backdrop-blur-md z-30 overflow-hidden transition-all animate-in slide-in-from-bottom-4 ${bgClass} ${borderClass}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            item.isNote
              ? 'bg-yellow-100 text-yellow-600'
              : item.resourceType === 'Canvas'
                ? 'bg-green-100 text-green-600'
                : item.resourceType === 'Manifest'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-600'
          }`}>
            <Icon name={item.isNote ? 'sticky_note_2' : 'image'} className="text-xs" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${labelClass}`}>
            {item.isNote ? 'Note' : item.resourceType}
          </span>
        </div>
        <button
          onClick={() => onExpand(item)}
          className={`p-1.5 rounded-lg transition-colors ${fieldMode ? 'hover:bg-slate-800 text-slate-400 hover:text-yellow-400' : 'hover:bg-slate-100 text-slate-400 hover:text-iiif-blue'}`}
          title="Expand to full view"
        >
          <Icon name="open_in_full" className="text-sm" />
        </button>
      </div>

      {/* Preview Content */}
      <div className="p-4">
        {item.isNote ? (
          <div className="bg-yellow-50 rounded-xl p-4 min-h-[100px]">
            <p className="text-sm text-slate-700 whitespace-pre-wrap font-handwriting">
              {item.annotation || 'Empty note'}
            </p>
          </div>
        ) : imageUrl ? (
          <div
            className="aspect-video bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-iiif-blue transition-all"
            onClick={() => onExpand(item)}
          >
            <img
              src={imageUrl}
              alt={item.label}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center">
            <Icon name="image_not_supported" className={`text-4xl ${labelClass}`} />
          </div>
        )}

        {/* Label */}
        <h3 className={`mt-3 font-bold text-sm truncate ${textClass}`}>
          {item.label}
        </h3>

        {/* Summary */}
        {item.summary && (
          <p className={`mt-1 text-xs line-clamp-2 ${labelClass}`}>
            {getIIIFValue(item.summary)}
          </p>
        )}

        {/* Quick metadata */}
        {item.metadata && item.metadata.length > 0 && (
          <div className={`mt-3 pt-3 border-t ${borderClass}`}>
            <div className="flex flex-wrap gap-1">
              {item.metadata.slice(0, 3).map((m, i) => (
                <span
                  key={i}
                  className={`text-[9px] px-2 py-0.5 rounded-full ${fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                >
                  {getIIIFValue(m.label)}
                </span>
              ))}
              {item.metadata.length > 3 && (
                <span className={`text-[9px] px-2 py-0.5 ${labelClass}`}>
                  +{item.metadata.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with expand hint */}
      <div className={`px-4 py-2 border-t ${borderClass} ${fieldMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
        <button
          onClick={() => onExpand(item)}
          className={`w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${fieldMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-iiif-blue hover:text-blue-700'}`}
        >
          <Icon name="visibility" className="text-sm" />
          View Full Details
        </button>
      </div>
    </div>
  );
};

export default ItemPreviewPanel;
