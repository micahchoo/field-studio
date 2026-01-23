
import React, { useState } from 'react';
import { IIIFManifest, IIIFRange, IIIFCanvas, IIIFSpecificResource, IIIFRangeReference } from '../types';
import { Icon } from './Icon';
import { RESOURCE_TYPE_CONFIG } from '../constants';

interface RangeEditorProps {
  manifest: IIIFManifest;
  onUpdate: (updatedManifest: IIIFManifest) => void;
}

export const RangeEditor: React.FC<RangeEditorProps> = ({ manifest, onUpdate }) => {
  const [draggedCanvasId, setDraggedCanvasId] = useState<string | null>(null);

  const handleCreateRootRange = () => {
    const newRange: IIIFRange = {
      id: `${manifest.id}/range/${crypto.randomUUID()}`,
      type: "Range",
      label: { none: ["New Section"] },
      items: []
    };
    onUpdate({ ...manifest, structures: [...(manifest.structures || []), newRange] });
  };

  const handleDropOnRange = (e: React.DragEvent, rangeId: string) => {
      e.preventDefault();
      if (!draggedCanvasId) return;

      const newManifest = JSON.parse(JSON.stringify(manifest));
      const canvas = manifest.items.find(c => c.id === draggedCanvasId);
      if (!canvas) return;

      const findAndAdd = (ranges: IIIFRange[]): boolean => {
          for (const range of ranges) {
              if (range.id === rangeId) {
                  range.items.push({ id: canvas.id, type: "Canvas" });
                  return true;
              }
              if (range.items) {
                  const subRanges = range.items.filter((i: any) => i.type === 'Range') as IIIFRange[];
                  if (findAndAdd(subRanges)) return true;
              }
          }
          return false;
      };

      if (newManifest.structures) {
        findAndAdd(newManifest.structures);
        onUpdate(newManifest);
      }
      setDraggedCanvasId(null);
  };

  const handleSetRegion = (rangeId: string, itemId: string) => {
      const xywh = prompt("Enter region (x,y,w,h):", "0,0,500,500");
      if (!xywh) return;

      const newManifest = JSON.parse(JSON.stringify(manifest));
      const updateRegion = (ranges: IIIFRange[]) => {
          ranges.forEach(r => {
              r.items = r.items.map((it: any) => {
                  if (it.id === itemId && it.type === 'Canvas') {
                      return {
                          type: "SpecificResource",
                          source: it.id,
                          selector: { type: "FragmentSelector", value: `xywh=${xywh}` }
                      };
                  }
                  return it;
              });
              const subRanges = r.items.filter((i: any) => i.type === 'Range') as IIIFRange[];
              updateRegion(subRanges);
          });
      };
      updateRegion(newManifest.structures || []);
      onUpdate(newManifest);
  };

  return (
    <div className="flex h-full bg-slate-50">
      <div className="w-1/2 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Table of Contents</h3>
            <button onClick={handleCreateRootRange} className="text-xs bg-iiif-blue text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                <Icon name="add" className="text-sm"/> Add Section
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!manifest.structures || manifest.structures.length === 0 ? (
                <div className="text-center text-slate-400 py-10 italic text-xs">Build a hierarchy by adding sections.</div>
            ) : (
                manifest.structures.map((range) => (
                    <RangeNode 
                        key={range.id} 
                        range={range} 
                        onDrop={handleDropOnRange}
                        onSetRegion={handleSetRegion}
                        onDelete={(id) => onUpdate({...manifest, structures: manifest.structures!.filter(r => r.id !== id)})}
                    />
                ))
            )}
        </div>
      </div>

      <div className="w-1/2 flex flex-col bg-slate-100">
        <div className="p-4 border-b bg-white">
             <h3 className="font-bold text-slate-700">Available Canvases</h3>
             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Drag to sections on left</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 content-start">
            {manifest.items.map(canvas => (
                <div 
                    key={canvas.id} draggable onDragStart={(e) => { setDraggedCanvasId(canvas.id); e.dataTransfer.setData('text/plain', canvas.id); }}
                    className="bg-white p-2 rounded border hover:border-iiif-blue cursor-grab shadow-sm flex items-center gap-2 group"
                >
                    <Icon name="image" className="text-slate-300 group-hover:text-blue-400"/>
                    <span className="text-[10px] font-bold truncate">{canvas.label?.['none']?.[0]}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const RangeNode: React.FC<{ range: IIIFRange; onDrop: any; onSetRegion: any; onDelete: any }> = ({ range, onDrop, onSetRegion, onDelete }) => {
    const [dragOver, setDragOver] = useState(false);
    const rangeConfig = RESOURCE_TYPE_CONFIG['Range'];
    const canvasConfig = RESOURCE_TYPE_CONFIG['Canvas'];

    return (
        <div 
            className={`border rounded-xl bg-white shadow-sm overflow-hidden transition-all ${dragOver ? 'border-iiif-blue ring-4 ring-blue-50' : 'border-slate-200'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { setDragOver(false); onDrop(e, range.id); }}
        >
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className={`flex items-center gap-2 font-bold text-xs ${rangeConfig.colorClass} uppercase tracking-wider`}>
                    <Icon name={rangeConfig.icon} />
                    {range.label?.['none']?.[0]}
                </div>
                <button onClick={() => onDelete(range.id)} className="text-slate-300 hover:text-red-500"><Icon name="close" className="text-sm"/></button>
            </div>
            <div className="p-2 space-y-1 min-h-[50px]">
                {range.items.length === 0 && <div className="text-[10px] text-slate-300 text-center py-4">Drag canvases here</div>}
                {range.items.map((it: any, idx: number) => {
                    const isSpecific = it.type === 'SpecificResource';
                    const canvasId = isSpecific ? it.source : it.id;
                    const region = isSpecific ? it.selector.value : 'Full Canvas';
                    const itemType = it.type === 'Range' ? 'Range' : 'Canvas';
                    const itemConfig = itemType === 'Range' ? rangeConfig : canvasConfig;
                    
                    return (
                        <div key={idx} className={`flex flex-col gap-1 p-2 ${itemType === 'Range' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'} rounded border relative group/item`}>
                            <div className={`flex items-center gap-2 text-[10px] font-bold ${itemConfig.colorClass}`}>
                                <Icon name={itemConfig.icon} className="text-[10px] opacity-70"/>
                                <span className="truncate text-slate-600">{canvasId.split('/').pop()}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isSpecific ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {region}
                                </span>
                                {itemType === 'Canvas' && (
                                    <button 
                                        onClick={() => onSetRegion(range.id, canvasId)}
                                        className="text-[9px] font-bold text-iiif-blue opacity-0 group-item-hover:opacity-100 uppercase"
                                    >
                                        Define Region
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
