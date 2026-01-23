
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { IIIFCanvas, IIIFAnnotation, IIIFAnnotationPage } from '../types';

interface Point {
  x: number;
  y: number;
}

interface PolygonAnnotationToolProps {
  canvas: IIIFCanvas;
  imageUrl: string;
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  onClose: () => void;
  existingAnnotations?: IIIFAnnotation[];
}

type DrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

/**
 * Generate SVG path from points
 */
function pointsToSvgPath(points: Point[], closed: boolean = true): string {
  if (points.length < 2) return '';

  const pathParts = points.map((p, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  });

  if (closed && points.length >= 3) {
    pathParts.push('Z');
  }

  return pathParts.join(' ');
}

/**
 * Generate SVG selector value
 */
function createSvgSelector(points: Point[], canvasWidth: number, canvasHeight: number): string {
  const path = pointsToSvgPath(points, true);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><path d="${path}"/></svg>`;
}

/**
 * Parse SVG selector to extract points
 */
function parseSvgSelector(svgValue: string): Point[] {
  const points: Point[] = [];

  // Extract path d attribute
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  if (!pathMatch) return points;

  const pathData = pathMatch[1];

  // Parse path commands - simplified for M/L/Z paths
  const commands = pathData.match(/[MLZ][\d.,\s-]*/gi);
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

/**
 * Calculate bounding box of points
 */
function getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
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
  const canvasRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<DrawingMode>('polygon');
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [annotationText, setAnnotationText] = useState('');
  const [motivation, setMotivation] = useState<'commenting' | 'tagging' | 'describing'>('commenting');
  const [showExisting, setShowExisting] = useState(true);

  // For freehand drawing
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);

  const getCanvasCoords = useCallback((e: React.MouseEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }, [scale]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'select') return;

    const point = getCanvasCoords(e);

    if (mode === 'polygon') {
      // Check if clicking near first point to close polygon
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        if (distance < 20 / scale) {
          // Close polygon - don't add new point
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
        // Complete rectangle
        const start = points[0];
        const rectPoints = [
          start,
          { x: point.x, y: start.y },
          point,
          { x: start.x, y: point.y }
        ];
        setPoints(rectPoints);
        setIsDrawing(false);
      }
    }
  }, [mode, points, scale, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'freehand' && isDrawing) {
      const point = getCanvasCoords(e);
      setFreehandPoints(prev => [...prev, point]);
    }
  }, [mode, isDrawing, getCanvasCoords]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'freehand') {
      const point = getCanvasCoords(e);
      setFreehandPoints([point]);
      setIsDrawing(true);
    }
  }, [mode, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'freehand' && isDrawing) {
      // Simplify freehand path
      const simplified = simplifyPath(freehandPoints, 5);
      setPoints(simplified);
      setFreehandPoints([]);
      setIsDrawing(false);
    }
  }, [mode, isDrawing, freehandPoints]);

  /**
   * Douglas-Peucker path simplification
   */
  const simplifyPath = (pathPoints: Point[], tolerance: number): Point[] => {
    if (pathPoints.length <= 2) return pathPoints;

    // Find point with max distance from line between first and last
    const first = pathPoints[0];
    const last = pathPoints[pathPoints.length - 1];

    let maxDist = 0;
    let maxIndex = 0;

    for (let i = 1; i < pathPoints.length - 1; i++) {
      const dist = perpendicularDistance(pathPoints[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      const left = simplifyPath(pathPoints.slice(0, maxIndex + 1), tolerance);
      const right = simplifyPath(pathPoints.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }

    return [first, last];
  };

  const perpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);

    if (mag === 0) {
      return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
    }

    const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
    const closestX = lineStart.x + u * dx;
    const closestY = lineStart.y + u * dy;

    return Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2));
  };

  const handleUndo = () => {
    if (points.length > 0) {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPoints([]);
    setFreehandPoints([]);
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (points.length < 3) {
      showToast('Please draw a polygon with at least 3 points', 'error');
      return;
    }

    if (!annotationText.trim()) {
      showToast('Please enter annotation text', 'error');
      return;
    }

    const svgSelector = createSvgSelector(points, canvas.width, canvas.height);

    const annotation: IIIFAnnotation = {
      id: `${canvas.id}/annotation/${Date.now()}`,
      type: 'Annotation',
      motivation: motivation,
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
          value: svgSelector
        }
      }
    };

    onCreateAnnotation(annotation);
    showToast('Polygon annotation created', 'success');

    // Reset for next annotation
    handleClear();
    setAnnotationText('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          handleClear();
        } else {
          onClose();
        }
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Enter' && points.length >= 3) {
        setIsDrawing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, points.length, onClose]);

  // Extract existing SVG annotations for display
  const existingSvgAnnotations = existingAnnotations.filter(anno => {
    const selector = (anno.target as any)?.selector;
    return selector?.type === 'SvgSelector';
  });

  return (
    <div className="fixed inset-0 z-[600] bg-slate-950 flex flex-col animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Polygon Annotation Tool">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Icon name="pentagon" className="text-green-400"/> Polygon Annotation
          </h2>

          {/* Drawing Mode */}
          <div className="flex bg-white/5 border border-white/10 rounded p-1" role="radiogroup" aria-label="Drawing Mode">
            {[
              { mode: 'polygon' as const, icon: 'pentagon', label: 'Polygon' },
              { mode: 'rectangle' as const, icon: 'crop_square', label: 'Rectangle' },
              { mode: 'freehand' as const, icon: 'gesture', label: 'Freehand' },
              { mode: 'select' as const, icon: 'pan_tool', label: 'Select' }
            ].map(m => (
              <button
                key={m.mode}
                onClick={() => { setMode(m.mode); handleClear(); }}
                aria-pressed={mode === m.mode}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded flex items-center gap-1 transition-colors ${
                  mode === m.mode ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-white'
                }`}
                title={m.label}
              >
                <Icon name={m.icon} className="text-sm"/> {m.label}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex bg-white/5 border border-white/10 rounded p-1">
            <button onClick={() => setScale(s => Math.max(0.1, s * 0.8))} aria-label="Zoom Out" className="p-1 text-white/40 hover:text-white">
              <Icon name="remove"/>
            </button>
            <span className="px-3 py-1 text-[10px] font-bold text-white/60 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale(s => Math.min(2, s * 1.2))} aria-label="Zoom In" className="p-1 text-white/40 hover:text-white">
              <Icon name="add"/>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExisting(!showExisting)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase ${showExisting ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40'}`}
          >
            {existingSvgAnnotations.length} Existing
          </button>
          <button onClick={onClose} className="px-4 py-2 text-white/40 hover:text-white font-bold text-sm">
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div
          className="flex-1 relative overflow-auto flex items-center justify-center p-10 bg-slate-900"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className="relative cursor-crosshair shadow-2xl"
            style={{ width: canvas.width * scale, height: canvas.height * scale }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
          >
            {/* Canvas Image */}
            <img
              src={imageUrl}
              alt="Canvas"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Existing Annotations Overlay */}
            {showExisting && existingSvgAnnotations.map((anno, idx) => {
              const selector = (anno.target as any)?.selector;
              const existingPoints = parseSvgSelector(selector?.value || '');
              if (existingPoints.length < 3) return null;

              return (
                <svg
                  key={anno.id}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                >
                  <path
                    d={pointsToSvgPath(existingPoints, true)}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="rgba(59, 130, 246, 0.8)"
                    strokeWidth={2 / scale}
                  />
                </svg>
              );
            })}

            {/* Current Drawing SVG Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${canvas.width} ${canvas.height}`}
            >
              {/* Freehand drawing in progress */}
              {mode === 'freehand' && freehandPoints.length > 1 && (
                <path
                  d={pointsToSvgPath(freehandPoints, false)}
                  fill="none"
                  stroke="rgba(34, 197, 94, 0.8)"
                  strokeWidth={2 / scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Completed polygon */}
              {points.length >= 3 && (
                <path
                  d={pointsToSvgPath(points, !isDrawing)}
                  fill={isDrawing ? 'none' : 'rgba(34, 197, 94, 0.2)'}
                  stroke="rgba(34, 197, 94, 1)"
                  strokeWidth={2 / scale}
                  strokeDasharray={isDrawing ? '5,5' : 'none'}
                />
              )}

              {/* Points */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={6 / scale}
                    fill={i === 0 && isDrawing ? 'rgba(34, 197, 94, 1)' : 'white'}
                    stroke="rgba(34, 197, 94, 1)"
                    strokeWidth={2 / scale}
                  />
                  {i === 0 && points.length >= 3 && isDrawing && (
                    <text
                      x={p.x + 10 / scale}
                      y={p.y - 10 / scale}
                      fill="white"
                      fontSize={12 / scale}
                      className="font-bold"
                    >
                      Click to close
                    </text>
                  )}
                </g>
              ))}

              {/* Lines between points */}
              {points.length >= 2 && (
                <polyline
                  points={points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="rgba(34, 197, 94, 1)"
                  strokeWidth={2 / scale}
                />
              )}
            </svg>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Annotation Details</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Motivation */}
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Motivation</label>
              <select
                value={motivation}
                onChange={e => setMotivation(e.target.value as any)}
                className="w-full bg-white/5 text-white text-xs border border-white/10 rounded-lg p-2.5 outline-none"
              >
                <option value="commenting">Commenting</option>
                <option value="tagging">Tagging</option>
                <option value="describing">Describing</option>
              </select>
            </div>

            {/* Annotation Text */}
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Annotation Text</label>
              <textarea
                value={annotationText}
                onChange={e => setAnnotationText(e.target.value)}
                placeholder="Enter your annotation..."
                rows={4}
                className="w-full bg-white/5 text-white text-xs border border-white/10 rounded-lg p-3 outline-none resize-none focus:border-green-500"
              />
            </div>

            {/* Points Info */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-white/40 uppercase">Shape</span>
                <span className="text-xs font-mono text-green-400">{points.length} points</span>
              </div>

              {points.length >= 3 && (
                <div className="text-[9px] text-white/30 space-y-1">
                  <div className="flex justify-between">
                    <span>Bounding Box:</span>
                    <span className="font-mono">
                      {Math.round(getBoundingBox(points).width)} × {Math.round(getBoundingBox(points).height)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={points.length === 0}
                className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/60 text-[10px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <Icon name="undo" className="text-sm"/> Undo
              </button>
              <button
                onClick={handleClear}
                disabled={points.length === 0}
                className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/60 text-[10px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <Icon name="clear" className="text-sm"/> Clear
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSave}
              disabled={points.length < 3 || !annotationText.trim()}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-black uppercase tracking-widest text-xs transition-all shadow-xl"
            >
              <Icon name="save" className="inline mr-2"/> Create Annotation
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 bg-slate-950 border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-white/30 uppercase font-black tracking-widest">
        <div className="flex gap-4">
          <span>SVG Selector Mode</span>
          <span>{mode === 'polygon' ? 'Click to add points, click first point to close' : mode === 'rectangle' ? 'Click and drag to draw rectangle' : mode === 'freehand' ? 'Click and drag to draw freehand' : 'Select existing annotations'}</span>
        </div>
        <div className="flex gap-4">
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Esc</kbd> Cancel</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Cmd+Z</kbd> Undo</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Enter</kbd> Close shape</span>
        </div>
      </div>
    </div>
  );
};
