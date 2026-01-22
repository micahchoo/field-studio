
import React, { useState, useRef, useEffect } from 'react';
import { IIIFManifest, IIIFCanvas, IIIFAnnotation, IIIFItem, ConnectionType, IIIFAnnotationPage } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';

interface BoardViewProps {
  root: IIIFItem | null;
}

interface BoardItem {
  id: string; // Internal Board ID (uuid)
  resourceId: string; // The ID of the Archive item (Manifest/Canvas)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  resourceType: string;
  label: string;
  blobUrl?: string; // For images
}

interface Connection {
  id: string;
  fromId: string; // BoardItem ID
  toId: string; // BoardItem ID
  type: ConnectionType;
  label?: string;
}

export const BoardView: React.FC<BoardViewProps> = ({ root }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Interaction State
  const [tool, setTool] = useState<'select' | 'connect'>('select');
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [connectingStart, setConnectingStart] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to find item in root recursively
  const findItemInArchive = (node: IIIFItem, id: string): IIIFItem | null => {
    if (node.id === id) return node;
    if (node.items) {
        for (const child of node.items) {
            const found = findItemInArchive(child, id);
            if (found) return found;
        }
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('application/iiif-item-id');
      if (!itemId || !root) return;

      const item = findItemInArchive(root, itemId);
      if (item) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          // Calculate drop position relative to canvas origin
          const dropX = (e.clientX - rect.left - pan.x) / scale;
          const dropY = (e.clientY - rect.top - pan.y) / scale;

          const newItem: BoardItem = {
              id: crypto.randomUUID(),
              resourceId: item.id,
              resourceType: item.type,
              label: item.label?.['none']?.[0] || 'Untitled',
              x: dropX - 100, // Center roughly
              y: dropY - 100,
              w: 200,
              h: item.type === 'Canvas' ? 250 : 100,
              rotation: 0,
              blobUrl: item._blobUrl
          };

          setItems(prev => [...prev, newItem]);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const s = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.min(Math.max(0.1, prev * s), 5));
    } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleMouseDownItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'select') {
        setDraggingItem(id);
    } else if (tool === 'connect') {
        setConnectingStart(id);
    }
  };

  const handleMouseUpItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'connect' && connectingStart && connectingStart !== id) {
        // Create connection
        setConnections(prev => [...prev, {
            id: crypto.randomUUID(),
            fromId: connectingStart,
            toId: id,
            type: 'relatesTo'
        }]);
        setConnectingStart(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Track mouse for connection line preview
    if (containerRef.current) {
         const rect = containerRef.current.getBoundingClientRect();
         setMousePos({
             x: (e.clientX - rect.left - pan.x) / scale,
             y: (e.clientY - rect.top - pan.y) / scale
         });
    }

    if (draggingItem && tool === 'select') {
        setItems(prev => prev.map(item => {
            if (item.id === draggingItem) {
                return { ...item, x: item.x + e.movementX / scale, y: item.y + e.movementY / scale };
            }
            return item;
        }));
    } else if (panning) {
        setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    }
  };

  const handleDelete = (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
  };

  const getItemCenter = (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return { x: 0, y: 0 };
      return { x: item.x + item.w / 2, y: item.y + item.h / 2 };
  };

  const serializeBoard = () => {
      // Convert Board State to IIIF Manifest
      // 1. Create a large Canvas (The Board)
      const boardCanvasId = `https://archive.local/iiif/board/${crypto.randomUUID()}`;
      const boardW = 5000;
      const boardH = 5000;

      // 2. Annotations for Items (Painting/Supplementing the Board)
      const itemAnnos: IIIFAnnotation[] = items.map((item, idx) => ({
          id: `${boardCanvasId}/anno/${item.id}`,
          type: "Annotation",
          motivation: "painting",
          target: `${boardCanvasId}#xywh=${Math.round(item.x)},${Math.round(item.y)},${Math.round(item.w)},${Math.round(item.h)}`,
          body: {
              id: item.resourceId, // Linking to the archive item
              type: "SpecificResource", 
              source: item.resourceId,
              label: { none: [item.label] }
          } as any
      }));

      // 3. Annotations for Connections (Linking)
      const connAnnos: IIIFAnnotation[] = connections.map((conn, idx) => ({
          id: `${boardCanvasId}/conn/${conn.id}`,
          type: "Annotation",
          motivation: "linking",
          body: {
              type: "TextualBody",
              value: conn.type,
              format: "text/plain"
          },
          target: [
              `${boardCanvasId}/anno/${conn.fromId}`,
              `${boardCanvasId}/anno/${conn.toId}`
          ]
      }));

      const manifest: IIIFManifest = {
          "@context": "http://iiif.io/api/presentation/3/context.json",
          id: `https://archive.local/iiif/manifest/board-${Date.now()}`,
          type: "Manifest",
          label: { none: ["Research Board Export"] },
          items: [
              {
                  id: boardCanvasId,
                  type: "Canvas",
                  width: boardW,
                  height: boardH,
                  items: [
                      {
                          id: `${boardCanvasId}/page/items`,
                          type: "AnnotationPage",
                          items: itemAnnos
                      }
                  ],
                  annotations: [
                       {
                          id: `${boardCanvasId}/page/connections`,
                          type: "AnnotationPage",
                          items: connAnnos
                      }
                  ]
              }
          ]
      };

      console.log("Serialized Board Manifest:", manifest);
      showToast("Board Serialized to Console (IIIF Manifest)", "success");
      // In a real app, this would trigger a download or save to storage
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-12 bg-white border-b flex items-center justify-between px-4 z-10 shadow-sm">
        <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Icon name="dashboard" className="text-amber-500"/> 
                Research Board
            </h2>
            <div className="flex bg-slate-100 rounded p-0.5">
                <button 
                    onClick={() => setTool('select')}
                    className={`px-3 py-1 flex items-center gap-1 text-xs font-bold rounded ${tool === 'select' ? 'bg-white shadow text-iiif-blue' : 'text-slate-500'}`}
                >
                    <Icon name="near_me" className="text-xs"/> Select
                </button>
                <button 
                    onClick={() => setTool('connect')}
                    className={`px-3 py-1 flex items-center gap-1 text-xs font-bold rounded ${tool === 'connect' ? 'bg-white shadow text-iiif-blue' : 'text-slate-500'}`}
                >
                    <Icon name="timeline" className="text-xs"/> Connect
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-sm">
            <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setScale(s => s - 0.1)}><Icon name="remove"/></button>
            <span>{Math.round(scale * 100)}%</span>
            <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setScale(s => s + 0.1)}><Icon name="add"/></button>
            <div className="w-px h-4 bg-slate-300 mx-2"></div>
            <button onClick={serializeBoard} className="px-3 py-1 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700">
                Save as Manifest
            </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 bg-slate-100 relative overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onWheel={handleWheel}
        onMouseDown={() => setPanning(true)}
        onMouseUp={() => { setPanning(false); setDraggingItem(null); setConnectingStart(null); }}
        onMouseLeave={() => { setPanning(false); setDraggingItem(null); setConnectingStart(null); }}
        onMouseMove={handleMouseMove}
        style={{ 
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: panning ? 'grabbing' : (tool === 'connect' ? 'crosshair' : 'default')
        }}
      >
        <div 
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                width: '100%', height: '100%',
                position: 'absolute',
                pointerEvents: panning ? 'none' : 'auto'
            }}
        >
            {/* SVG Layer for Connections */}
            <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                </defs>
                {connections.map(conn => {
                    const start = getItemCenter(conn.fromId);
                    const end = getItemCenter(conn.toId);
                    return (
                        <g key={conn.id}>
                            <line 
                                x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                                stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)"
                            />
                            <text 
                                x={(start.x + end.x)/2} y={(start.y + end.y)/2} 
                                className="text-[10px] fill-slate-500 font-bold bg-white"
                                textAnchor="middle" dy="-5"
                            >
                                {conn.type}
                            </text>
                        </g>
                    );
                })}
                {/* Preview Line */}
                {tool === 'connect' && connectingStart && (
                    <line 
                        x1={getItemCenter(connectingStart).x} 
                        y1={getItemCenter(connectingStart).y}
                        x2={mousePos.x} 
                        y2={mousePos.y}
                        stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5"
                    />
                )}
            </svg>

            {items.map(item => (
                <div
                    key={item.id}
                    className={`absolute bg-white shadow-lg border flex flex-col group ${connectingStart === item.id ? 'ring-2 ring-iiif-blue' : 'hover:ring-1 ring-slate-300'}`}
                    style={{
                        left: item.x, top: item.y, width: item.w, height: item.h,
                        transform: `rotate(${item.rotation}deg)`,
                        borderColor: tool === 'connect' ? '#3b82f6' : '#e2e8f0',
                        cursor: tool === 'select' ? 'move' : 'pointer'
                    }}
                    onMouseDown={(e) => handleMouseDownItem(e, item.id)}
                    onMouseUp={(e) => handleMouseUpItem(e, item.id)}
                >
                    <div className="flex-1 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                        {item.blobUrl ? (
                            <img src={item.blobUrl} className="w-full h-full object-contain pointer-events-none" />
                        ) : (
                            <Icon name={item.resourceType === 'Manifest' ? 'menu_book' : 'folder'} className="text-slate-300 text-4xl"/>
                        )}
                        
                        {/* Context Action */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                className="bg-white/80 p-0.5 rounded-full shadow hover:bg-red-50 text-red-500"
                            >
                                <Icon name="close" className="text-xs"/>
                            </button>
                        </div>
                    </div>
                    <div className="h-7 bg-white border-t p-1.5 text-[10px] font-bold text-slate-700 truncate flex items-center gap-1">
                         <Icon name={item.resourceType === 'Manifest' ? 'menu_book' : 'image'} className="text-[10px] text-slate-400"/>
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-2 rounded shadow text-xs text-slate-500 pointer-events-none">
        {tool === 'select' ? 'Drag items to move • Drop from Archive to add' : 'Click two items to connect'}
      </div>
    </div>
  );
};
