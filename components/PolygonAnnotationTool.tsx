
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import type { Point } from '../constants/viewport';

interface PolygonAnnotationToolProps {
  canvas: IIIFCanvas;
  imageUrl: string;
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  onClose: () => void;
  existingAnnotations?: IIIFAnnotation[];
}

type DrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

function pointsToSvgPath(points: Point[], closed: boolean = true): string {
  if (points.length < 2) return '';
  const pathParts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  if (closed && points.length >= 3) pathParts.push('Z');
  return pathParts.join(' ');
}

function createSvgSelector(points: Point[], canvasWidth: number, canvasHeight: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><path d="${pointsToSvgPath(points, true)}"/></svg>`;
}

function parseSvgSelector(svgValue: string): Point[] {
  const points: Point[] = [];
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  if (!pathMatch) return points;
  const commands = pathMatch[1].match(/[MLZ][\d.,\s-]*/gi);
  if (!commands) return points;
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    if (type === 'Z') continue;
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      points.push({ x: coords[0], y: coords[1] });
    }
  }
  return points;
}

function getBoundingBox(points: Point[]) {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

export const PolygonAnnotationTool: React.FC<PolygonAnnotationToolProps> = ({
  canvas,
  imageUrl,
  onCreateAnnotation,
  onClose,
  existingAnnotations = []
}) => {
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [mode, setMode] = useState<DrawingMode>('polygon');
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [motivation, setMotivation] = useState<'commenting' | 'tagging' | 'describing'>('commenting');
  const [showExisting, setShowExisting] = useState(true);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Calculate fit-to-screen scale
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const padding = 48;
    const scaleX = (containerRect.width - padding) / canvas.width;
    const scaleY = (containerRect.height - padding) / canvas.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    
    setScale(fitScale);
    setOffset({
      x: (containerRect.width - canvas.width * fitScale) / 2,
      y: (containerRect.height - canvas.height * fitScale) / 2
    });
  }, [canvas.width, canvas.height]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    return {
      x: (mouseX - offset.x) / scale,
      y: (mouseY - offset.y) / scale
    };
  }, [scale, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasCoords(e);
    setCursorPoint(point);
    
    if (mode === 'freehand' && isDrawing) {
      setFreehandPoints(prev => [...prev, point]);
    }
  }, [mode, isDrawing, getCanvasCoords]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || mode === 'select') return;
    
    const point = getCanvasCoords(e);

    if (mode === 'polygon') {
      // Check if clicking near first point to close
      if (points.length >= 3) {
        const first = points[0];
        const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
        if (dist < 15) {
          setIsDrawing(false);
          return;
        }
      }
      setPoints(prev => [...prev, point]);
      setIsDrawing(true);
    } else if (mode === 'rectangle') {
      if (points.length === 0) {
        setPoints([point]);
        setIsDrawing(true);
      } else if (points.length === 1) {
        const start = points[0];
        setPoints([start, { x: point.x, y: start.y }, point, { x: start.x, y: point.y }]);
        setIsDrawing(false);
      }
    }
  }, [mode, points, getCanvasCoords]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'freehand' && e.button === 0) {
      const point = getCanvasCoords(e);
      setFreehandPoints([point]);
      setIsDrawing(true);
    }
  }, [mode, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'freehand' && isDrawing) {
      // Simplify freehand path
      if (freehandPoints.length > 2) {
        const simplified = simplifyPath(freehandPoints, 3);
        setPoints(simplified);
      }
      setFreehandPoints([]);
      setIsDrawing(false);
    }
  }, [mode, isDrawing, freehandPoints]);

  // Simple path simplification
  const simplifyPath = (pts: Point[], tolerance: number): Point[] => {
    if (pts.length <= 2) return pts;
    const result: Point[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = result[result.length - 1];
      const dist = Math.sqrt(Math.pow(pts[i].x - prev.x, 2) + Math.pow(pts[i].y - prev.y, 2));
      if (dist > tolerance) result.push(pts[i]);
    }
    result.push(pts[pts.length - 1]);
    return result;
  };

  const handleUndo = () => {
    setPoints(prev => {
      const newPoints = prev.slice(0, -1);
      if (newPoints.length < 2) setIsDrawing(false);
      return newPoints;
    });
  };

  const handleClear = () => {
    setPoints([]);
    setFreehandPoints([]);
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (points.length < 3) {
      showToast('Need at least 3 points', 'error');
      return;
    }
    if (!annotationText.trim()) {
      showToast('Please enter annotation text', 'error');
      return;
    }

    const annotation: IIIFAnnotation = {
      id: `${canvas.id}/annotation/${Date.now()}`,
      type: 'Annotation',
      motivation,
      body: {
        type: 'TextualBody',
        value: annotationText.trim(),
        format: 'text/plain'
      },
      target: {
        type: 'SpecificResource',
        source: canvas.id,
        selector: {
          type: 'SvgSelector',
          value: createSvgSelector(points, canvas.width, canvas.height)
        }
      }
    };

    onCreateAnnotation(annotation);
    showToast('Annotation created', 'success');
    handleClear();
    setAnnotationText('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) handleClear();
        else onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Enter' && points.length >= 3) {
        setIsDrawing(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawing, points.length, onClose]);

  const existingSvgAnnotations = existingAnnotations.filter(anno => {
    const selector = (anno.target as any)?.selector;
    return selector?.type === 'SvgSelector';
  });

  // Check if near first point for closing polygon
  const canClose = points.length >= 3 && cursorPoint && (() => {
    const first = points[0];
    const dist = Math.sqrt(Math.pow((cursorPoint?.x || 0) - first.x, 2) + Math.pow((cursorPoint?.y || 0) - first.y, 2));
    return dist < 15;
  })();

  return (
    <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="h-12 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold flex items-center gap-2 text-sm">
            <Icon name="pentagon" className="text-green-400"/> 
            Annotation Tool
          </h2>

          <div className="flex bg-white/5 border border-white/10 rounded p-0.5">
            {[
              { mode: 'polygon' as const, icon: 'pentagon', label: 'Polygon' },
              { mode: 'rectangle' as const, icon: 'crop_square', label: 'Rectangle' },
              { mode: 'freehand' as const, icon: 'gesture', label: 'Freehand' },
              { mode: 'select' as const, icon: 'pan_tool', label: 'Pan' }
            ].map(m => (
              <button
                key={m.mode}
                onClick={() => { setMode(m.mode); handleClear(); }}
                className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center gap-1 ${
                  mode === m.mode ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                <Icon name={m.icon} className="text-xs"/> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExisting(!showExisting)}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${showExisting ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40'}`}
          >
            {existingSvgAnnotations.length} Existing
          </button>
          <button onClick={onClose} className="px-3 py-1 text-white/40 hover:text-white font-bold text-sm hover:bg-white/10 rounded">
            Done
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-slate-950 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image and SVG Overlay */}
          <div
            className="absolute"
            style={{
              left: offset.x,
              top: offset.y,
              width: canvas.width * scale,
              height: canvas.height * scale,
            }}
          >
            {/* Base Image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Canvas"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />

            {/* SVG Drawing Layer - Same coordinate system as image */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${canvas.width} ${canvas.height}`}
              preserveAspectRatio="none"
            >
              {/* Existing Annotations */}
              {showExisting && existingSvgAnnotations.map((anno) => {
                const selector = (anno.target as any)?.selector;
                const existingPoints = parseSvgSelector(selector?.value || '');
                if (existingPoints.length < 3) return null;

                return (
                  <path
                    key={anno.id}
                    d={pointsToSvgPath(existingPoints, true)}
                    fill="rgba(59, 130, 246, 0.15)"
                    stroke="rgba(59, 130, 246, 0.8)"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Freehand Preview */}
              {mode === 'freehand' && freehandPoints.length > 1 && (
                <path
                  d={pointsToSvgPath(freehandPoints, false)}
                  fill="none"
                  stroke="rgba(34, 197, 94, 0.8)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Current Drawing */}
              {points.length >= 2 && (
                <>
                  <polyline
                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="rgba(34, 197, 94, 1)"
                    strokeWidth={2}
                    strokeDasharray={isDrawing ? '5,5' : 'none'}
                  />
                  {points.length >= 3 && (
                    <path
                      d={pointsToSvgPath(points, !isDrawing)}
                      fill={isDrawing ? 'none' : 'rgba(34, 197, 94, 0.2)'}
                      stroke="rgba(34, 197, 94, 1)"
                      strokeWidth={2}
                      strokeDasharray={isDrawing ? '5,5' : 'none'}
                    />
                  )}
                </>
              )}

              {/* Point Markers */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={6}
                    fill={i === 0 ? 'rgba(34, 197, 94, 1)' : 'white'}
                    stroke="rgba(34, 197, 94, 1)"
                    strokeWidth={2}
                  />
                </g>
              ))}

              {/* Close indicator */}
              {canClose && points[0] && (
                <>
                  <circle
                    cx={points[0].x}
                    cy={points[0].y}
                    r={15}
                    fill="none"
                    stroke="rgba(34, 197, 94, 0.8)"
                    strokeWidth={2}
                    strokeDasharray="3,3"
                  />
                  <text
                    x={points[0].x + 20}
                    y={points[0].y - 20}
                    fill="white"
                    fontSize={14}
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    Click to close
                  </text>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-slate-900 border-l border-white/10 flex flex-col">
          <div className="p-3 border-b border-white/5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Annotation Details</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5">Motivation</label>
              <select
                value={motivation}
                onChange={e => setMotivation(e.target.value as any)}
                className="w-full bg-white/5 text-white text-xs border border-white/10 rounded-lg p-2 outline-none"
              >
                <option value="commenting">Commenting</option>
                <option value="tagging">Tagging</option>
                <option value="describing">Describing</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5">Annotation Text</label>
              <textarea
                value={annotationText}
                onChange={e => setAnnotationText(e.target.value)}
                placeholder="Enter your annotation..."
                rows={4}
                className="w-full bg-white/5 text-white text-xs border border-white/10 rounded-lg p-2.5 outline-none resize-none"
              />
            </div>

            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-white/40 uppercase">Shape</span>
                <span className="text-xs font-mono text-green-400">{points.length} points</span>
              </div>
              {points.length >= 3 && (
                <div className="text-[9px] text-white/30">
                  Bounding Box: {Math.round(getBoundingBox(points).width)} × {Math.round(getBoundingBox(points).height)}
                </div>
              )}
            </div>

            <div className="text-[10px] text-white/30 space-y-1">
              {mode === 'polygon' && (
                <>
                  <p>• Click to add points</p>
                  <p>• Click first point or press Enter to close</p>
                  <p>• Need at least 3 points to save</p>
                </>
              )}
              {mode === 'rectangle' && (
                <>
                  <p>• Click two corners to draw</p>
                  <p>• {points.length === 0 ? 'Click to start' : 'Click opposite corner'}</p>
                </>
              )}
              {mode === 'freehand' && (
                <>
                  <p>• Click and drag to draw</p>
                  <p>• Release to finish</p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={points.length === 0}
                className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/60 text-[10px] font-bold uppercase py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <Icon name="undo" className="text-xs"/> Undo
              </button>
              <button
                onClick={handleClear}
                disabled={points.length === 0}
                className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/60 text-[10px] font-bold uppercase py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <Icon name="clear" className="text-xs"/> Clear
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleSave}
              disabled={points.length < 3 || !annotationText.trim()}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-all"
            >
              <Icon name="save" className="inline mr-1.5 text-xs"/> Create Annotation
            </button>
          </div>
        </div>
      </div>

      <div className="h-7 bg-slate-950 border-t border-white/5 flex items-center justify-between px-4 text-[9px] text-white/30 uppercase font-bold tracking-wider">
        <span>
          {mode === 'polygon' ? 'Click to add points, click first point to close' : 
           mode === 'rectangle' ? 'Click two corners to draw rectangle' : 
           mode === 'freehand' ? 'Click and drag to draw freehand' : 
           'Pan mode - drag to move'}
        </span>
        <div className="flex gap-3">
          <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[8px]">Esc</kbd> Cancel</span>
          <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[8px]">Cmd+Z</kbd> Undo</span>
          <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[8px]">Enter</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};
