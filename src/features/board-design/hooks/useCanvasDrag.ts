/**
 * useCanvasDrag Hook
 *
 * Manages canvas dragging, coordinate transformation, and mouse interactions
 * for BoardCanvas organism.
 *
 * @module features/board-design/hooks/useCanvasDrag
 */

import { useCallback, useRef, useState } from 'react';

export interface UseCanvasDragOptions {
  /** Viewport state (pan/zoom) */
  viewport: { x: number; y: number; zoom: number };
  /** Callback when item is selected */
  onSelectItem: (id: string | null) => void;
  /** Callback when item is moved */
  onMoveItem: (id: string, position: { x: number; y: number }) => void;
  /** Callback when connection is selected */
  onSelectConnection?: (id: string) => void;
}

export interface UseCanvasDragReturn {
  /** Canvas element ref */
  canvasRef: React.RefObject<HTMLDivElement>;
  /** Combine refs function */
  setRefs: (el: HTMLDivElement | null) => void;
  /** Whether an item is being dragged */
  isDragging: boolean;
  /** ID of item being dragged */
  draggingItemId: string | null;
  /** Selected connection ID */
  selectedConnectionId: string | null;
  /** Convert screen coordinates to canvas coordinates */
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  /** Handle canvas click (deselect) */
  handleCanvasClick: (e: React.MouseEvent) => void;
  /** Handle mouse move (dragging) */
  handleMouseMove: (e: React.MouseEvent) => void;
  /** Handle mouse up (end drag) */
  handleMouseUp: () => void;
  /** Handle drag start from node */
  handleDragStart: (id: string, offset: { x: number; y: number }) => void;
  /** Handle connection selection */
  handleSelectConnection: (id: string) => void;
}

/**
 * Hook for canvas drag interactions
 */
export function useCanvasDrag({
  viewport,
  onSelectItem,
  onMoveItem,
  onSelectConnection,
}: UseCanvasDragOptions): UseCanvasDragReturn {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Combine refs
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    canvasRef.current = el;
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        onSelectItem(null);
        setSelectedConnectionId(null);
      }
    },
    [onSelectItem]
  );

  // Handle mouse move (dragging)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !draggingItemId) return;

      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      onMoveItem(draggingItemId, {
        x: canvasPos.x - dragOffset.x,
        y: canvasPos.y - dragOffset.y,
      });
    },
    [isDragging, draggingItemId, dragOffset, screenToCanvas, onMoveItem]
  );

  // Handle mouse up (end drag)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggingItemId(null);
  }, []);

  // Handle drag start from node
  const handleDragStart = useCallback((id: string, offset: { x: number; y: number }) => {
    setDraggingItemId(id);
    setIsDragging(true);
    setDragOffset(offset);
  }, []);

  // Handle connection selection
  const handleSelectConnection = useCallback(
    (id: string) => {
      setSelectedConnectionId(id);
      onSelectConnection?.(id);
    },
    [onSelectConnection]
  );

  return {
    canvasRef,
    setRefs,
    isDragging,
    draggingItemId,
    selectedConnectionId,
    screenToCanvas,
    handleCanvasClick,
    handleMouseMove,
    handleMouseUp,
    handleDragStart,
    handleSelectConnection,
  };
}