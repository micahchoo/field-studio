
import React, { useState } from 'react';
import { IIIFManifest, IIIFRange, IIIFCanvas } from '../types';
import { Icon } from './Icon';

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
      label: { none: ["New Range"] },
      items: []
    };
    
    const updated = { ...manifest, structures: [...(manifest.structures || []), newRange] };
    onUpdate(updated);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedCanvasId(id);
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnRange = (e: React.DragEvent, rangeId: string) => {
      e.preventDefault();
      if (!draggedCanvasId) return;

      // Deep clone manifest to mutate structures
      const newManifest = JSON.parse(JSON.stringify(manifest));
      
      const findAndAddToRange = (ranges: IIIFRange[]): boolean => {
          for (const range of ranges) {
              if (range.id === rangeId) {
                  // Find the canvas to add
                  const canvasToAdd = manifest.items.find(c => c.id === draggedCanvasId);
                  if (canvasToAdd) {
                      // Add reference
                      range.items.push({ id: canvasToAdd.id, type: "Canvas" } as any);
                  }
                  return true;
              }
              if (range.items) {
                  // recurse if item is range (ranges can contain ranges)
                  // simplifying assumptions: items in range can be Canvas or Range.
                  // We need to filter items that are ranges to recurse.
                  // In IIIF 3, items array mixes Canvases and Ranges.
                  // We'll skip recursion into children for this simple editor or implement complex recursion later.
                  // For now, only top level ranges or one level deep supported visually?
                  // Let's assume recursion is needed.
                  const subRanges = range.items.filter((i: any) => i.type === 'Range') as IIIFRange[];
                  if (findAndAddToRange(subRanges)) return true;
              }
          }
          return false;
      };

      if (newManifest.structures) {
        findAndAddToRange(newManifest.structures);
        onUpdate(newManifest);
      }
      setDraggedCanvasId(null);
  };

  const handleDeleteRange = (rangeId: string) => {
      if(!confirm("Delete this range?")) return;
      const newManifest = JSON.parse(JSON.stringify(manifest));
      if (newManifest.structures) {
          newManifest.structures = newManifest.structures.filter((r: IIIFRange) => r.id !== rangeId);
          onUpdate(newManifest);
      }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Range Tree */}
      <div className="w-1/2 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Structures (Ranges)</h3>
            <button onClick={handleCreateRootRange} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-600 flex items-center gap-1">
                <Icon name="add" className="text-sm"/> New Range
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!manifest.structures || manifest.structures.length === 0 ? (
                <div className="text-center text-slate-400 py-10">
                    <p>No structures defined.</p>
                    <p className="text-xs mt-1">Create a range to build a Table of Contents.</p>
                </div>
            ) : (
                manifest.structures.map((range) => (
                    <RangeNode 
                        key={range.id} 
                        range={range} 
                        onDrop={handleDropOnRange}
                        onDelete={handleDeleteRange}
                    />
                ))
            )}
        </div>
      </div>

      {/* Canvas Source List */}
      <div className="w-1/2 flex flex-col bg-slate-100">
        <div className="p-4 border-b bg-white">
             <h3 className="font-bold text-slate-700">Canvases</h3>
             <p className="text-xs text-slate-500">Drag canvases to ranges to organize them.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 content-start">
            {manifest.items.map(canvas => (
                <div 
                    key={canvas.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, canvas.id)}
                    className="bg-white p-2 rounded border hover:border-iiif-blue cursor-grab active:cursor-grabbing shadow-sm flex items-center gap-2"
                >
                    <Icon name="image" className="text-slate-400"/>
                    <span className="text-xs truncate">{canvas.label?.['none']?.[0]}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const RangeNode: React.FC<{ range: IIIFRange; onDrop: (e: React.DragEvent, id: string) => void; onDelete: (id: string) => void }> = ({ range, onDrop, onDelete }) => {
    const [dragOver, setDragOver] = useState(false);

    return (
        <div 
            className={`border rounded bg-white overflow-hidden ${dragOver ? 'border-iiif-blue ring-2 ring-blue-100' : 'border-slate-300'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { setDragOver(false); onDrop(e, range.id); }}
        >
            <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                    <Icon name="list_alt" className="text-slate-400"/>
                    {range.label?.['none']?.[0] || 'Untitled Range'}
                </div>
                <button onClick={() => onDelete(range.id)} className="text-slate-400 hover:text-red-500">
                    <Icon name="delete" className="text-sm"/>
                </button>
            </div>
            <div className="p-2 space-y-1 min-h-[40px]">
                {range.items.length === 0 && <div className="text-xs text-slate-400 italic text-center py-2">Drop canvases here</div>}
                {range.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 pl-2 border-l-2 border-slate-200">
                        <Icon name={item.type === 'Range' ? 'list_alt' : 'image'} className="text-[10px]"/>
                        <span className="truncate">{item.id.split('/').pop()}</span> 
                    </div>
                ))}
            </div>
        </div>
    );
};
