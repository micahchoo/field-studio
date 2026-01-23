
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IIIFManifest, IIIFItem, ConnectionType } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';

interface BoardItem {
  id: string; resourceId: string; x: number; y: number; w: number; h: number;
  resourceType: string; label: string; blobUrl?: string; annotation?: string;
}

interface Connection {
  id: string; fromId: string; toId: string; type: ConnectionType; label?: string;
}

export const BoardView: React.FC<{ root: IIIFItem | null }> = ({ root }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tool, setTool] = useState<'select' | 'connect'>('select');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectingStart, setConnectingStart] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('application/iiif-item-id');
      if (!itemId || !root) return;
      const coords = getCanvasCoords(e as any);
      
      // Attempt to find metadata for dropped item
      const findItem = (node: IIIFItem): IIIFItem | null => {
          if (node.id === itemId) return node;
          if (node.items) for (const c of node.items) { const f = findItem(c); if (f) return f; }
          return null;
      };
      const resource = findItem(root);
      const label = resource?.label?.['none']?.[0] || 'New Item';
      const blob = (resource as any)._blobUrl || (resource as any).thumbnail?.[0]?.id;

      setItems(prev => [...prev, { 
          id: crypto.randomUUID(), 
          resourceId: itemId, 
          resourceType: resource?.type || 'Resource', 
          label, 
          blobUrl: blob,
          x: coords.x - 100, 
          y: coords.y - 75, 
          w: 200, 
          h: 150 
      }]);
      showToast("Resource pinned to research board", "success");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setMousePos(coords);
    if (draggingId && tool === 'select') {
        setItems(prev => prev.map(it => it.id === draggingId ? { ...it, x: it.x + e.movementX, y: it.y + e.movementY } : it));
    }
  };

  const handleItemDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveId(id);
      setSelectedConnectionId(null);
      if (tool === 'select') {
          setDraggingId(id);
      } else {
          setConnectingStart(id);
      }
  };

  const handleItemUp = (id: string) => {
    if (tool === 'connect' && connectingStart && connectingStart !== id) {
        const exists = connections.some(c => (c.fromId === connectingStart && c.toId === id) || (c.fromId === id && c.toId === connectingStart));
        if (!exists) {
            setConnections(prev => [...prev, { id: crypto.randomUUID(), fromId: connectingStart, toId: id, type: 'relatesTo' }]);
            showToast("Archive connection synthesized", "success");
        }
    }
    setDraggingId(null);
    setConnectingStart(null);
  };

  const getCenter = (id: string) => {
      const it = items.find(i => i.id === id);
      return it ? { x: it.x + it.w / 2, y: it.y + it.h / 2 } : { x: 0, y: 0 };
  };

  const deleteItem = (id: string) => {
      setItems(prev => prev.filter(it => it.id !== id));
      setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
      if (activeId === id) setActiveId(null);
  };

  const activeItem = items.find(i => i.id === activeId);
  const activeConn = connections.find(c => c.id === selectedConnectionId);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative font-sans">
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
              <Icon name="dashboard" className="text-amber-500 text-2xl" />
              <div>
                  <h1 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-none">Boards</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spatial Synthesis</p>
              </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onClick={() => setTool('select')} className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${tool === 'select' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon name="near_me" className="text-sm"/> Select
            </button>
            <button onClick={() => setTool('connect')} className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${tool === 'connect' ? 'bg-white shadow-md text-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon name="mediation" className="text-sm"/> Synthesize
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span>{items.length} Nodes</span>
            <span>{connections.length} Links</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div 
            ref={containerRef} 
            className={`flex-1 relative overflow-hidden bg-slate-100 cursor-crosshair`} 
            onDrop={handleDrop} 
            onDragOver={e => e.preventDefault()} 
            onMouseMove={handleMouseMove} 
            onMouseUp={() => { setDraggingId(null); setConnectingStart(null); }}
            onClick={() => { setActiveId(null); setSelectedConnectionId(null); }}
            style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
        >
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {connections.map(c => {
                        const start = getCenter(c.fromId), end = getCenter(c.toId);
                        const isSelected = selectedConnectionId === c.id;
                        return (
                            <g key={c.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id); setActiveId(null); }}>
                                <line 
                                    x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                                    stroke={isSelected ? "#005596" : "#3b82f6"} 
                                    strokeWidth={isSelected ? "5" : "2.5"} 
                                    strokeDasharray={isSelected ? "none" : "6,4"} 
                                    markerEnd="url(#arrowhead)" 
                                    className={isSelected ? "" : "animate-dash"}
                                />
                                {c.label && (
                                    <text 
                                        x={(start.x + end.x)/2} 
                                        y={(start.y + end.y)/2 - 10} 
                                        textAnchor="middle" 
                                        className="text-[10px] font-black uppercase fill-slate-700 bg-white"
                                        style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: '3px' }}
                                    >
                                        {c.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {connectingStart && (
                        <line 
                            x1={getCenter(connectingStart).x} y1={getCenter(connectingStart).y} 
                            x2={mousePos.x} y2={mousePos.y} 
                            stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" 
                        />
                    )}
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                        </marker>
                    </defs>
                </svg>

                {items.map(it => (
                    <div 
                        key={it.id} 
                        onMouseDown={(e) => handleItemDown(e, it.id)}
                        onMouseUp={() => handleItemUp(it.id)}
                        className={`absolute bg-white shadow-2xl rounded-2xl overflow-hidden group select-none transition-shadow ${activeId === it.id ? 'ring-4 ring-iiif-blue/20 border-iiif-blue' : 'border-slate-200'} border-2 z-20`} 
                        style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                    >
                        <div className="h-full flex flex-col relative">
                            <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                {it.blobUrl ? (
                                    <img src={it.blobUrl} className="w-full h-full object-contain pointer-events-none" alt="Pin" />
                                ) : (
                                    <Icon name="description" className="text-5xl text-slate-700 opacity-50"/>
                                )}
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                                    {it.resourceType}
                                </div>
                                {it.annotation && (
                                    <div className="absolute top-2 right-2 text-yellow-400 drop-shadow-md animate-pulse">
                                        <Icon name="chat_bubble" className="text-sm"/>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-white border-t border-slate-100">
                                <div className="text-[10px] font-black text-slate-800 truncate uppercase tracking-tighter">{it.label}</div>
                                <div className="text-[8px] font-mono text-slate-400 truncate mt-0.5">{it.resourceId.split('/').pop()}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteItem(it.id); }}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 hover:bg-red-600 z-30"
                            >
                                <Icon name="close" className="text-sm"/>
                            </button>
                        </div>
                    </div>
                ))}
        </div>

        {/* Synthesis Inspector Panel */}
        {(activeItem || activeConn) && (
            <div className="w-80 bg-white border-l shadow-xl z-30 p-6 flex flex-col gap-6 animate-in slide-in-from-right-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Synthesis DNA</h3>
                    <button onClick={() => { setActiveId(null); setSelectedConnectionId(null); }}><Icon name="close" className="text-slate-300 text-sm"/></button>
                </div>
                
                {activeItem ? (
                    <>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Item Annotation</label>
                            <textarea 
                                value={activeItem.annotation || ''} 
                                onChange={(e) => setItems(items.map(it => it.id === activeId ? {...it, annotation: e.target.value} : it))}
                                placeholder="Add scholarly notes for this node..."
                                className="w-full text-xs p-3 rounded-lg border focus:ring-2 focus:ring-iiif-blue outline-none min-h-[100px] leading-relaxed"
                            />
                        </div>
                        <div className="text-[10px] text-slate-400 italic">This note acts as a 'linking' back-reference in the semantic archive.</div>
                    </>
                ) : activeConn && (
                    <>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <label className="block text-[10px] font-black text-blue-700 uppercase mb-2">Relationship Nature</label>
                            <input 
                                value={activeConn.label || ''}
                                onChange={(e) => setConnections(connections.map(c => c.id === selectedConnectionId ? {...c, label: e.target.value} : c))}
                                placeholder="e.g. transcribes, depicts, precedes"
                                className="w-full text-xs font-bold p-3 rounded-lg border-2 border-blue-100 focus:border-iiif-blue outline-none uppercase tracking-widest"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Connected IDs</h4>
                             <div className="space-y-2 opacity-50">
                                <code className="block text-[8px] truncate">{items.find(i => i.id === activeConn.fromId)?.resourceId}</code>
                                <Icon name="sync_alt" className="text-xs rotate-90 block mx-auto"/>
                                <code className="block text-[8px] truncate">{items.find(i => i.id === activeConn.toId)?.resourceId}</code>
                             </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
          @keyframes dash {
              to { stroke-dashoffset: -100; }
          }
          .animate-dash {
              animation: dash 5s linear infinite;
          }
      `}} />
    </div>
  );
};
