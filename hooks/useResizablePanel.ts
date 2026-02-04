/**
 * useResizablePanel - Hook for creating resizable panel functionality
 *
 * Provides consistent resizing behavior across Sidebar, Inspector, and split panes.
 * Supports:
 * - Mouse drag resizing
 * - Touch drag resizing
 * - Keyboard resizing (arrow keys when focused)
 * - Double-click to reset to default
 * - Persistence to localStorage
 * - Min/max constraints
 * - Collapse threshold
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ResizablePanelConfig {
  /** Unique key for localStorage persistence */
  id: string;
  /** Default width/height in pixels */
  defaultSize: number;
  /** Minimum size in pixels */
  minSize: number;
  /** Maximum size in pixels */
  maxSize: number;
  /** Direction of resize: 'horizontal' for width, 'vertical' for height */
  direction: 'horizontal' | 'vertical';
  /** Which side the resize handle is on */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Size below which panel collapses (optional) */
  collapseThreshold?: number;
  /** Whether to persist size to localStorage */
  persist?: boolean;
  /** Callback when panel is collapsed */
  onCollapse?: () => void;
  /** Callback when panel is expanded */
  onExpand?: () => void;
}

export interface ResizablePanelState {
  /** Current size in pixels */
  size: number;
  /** Whether panel is collapsed */
  isCollapsed: boolean;
  /** Whether resize is in progress */
  isResizing: boolean;
}

export interface ResizablePanelActions {
  /** Start resizing (call on mousedown/touchstart) */
  startResize: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Reset to default size */
  resetSize: () => void;
  /** Toggle collapsed state */
  toggleCollapse: () => void;
  /** Set size programmatically */
  setSize: (size: number) => void;
  /** Expand panel if collapsed */
  expand: () => void;
  /** Collapse panel */
  collapse: () => void;
}

export interface UseResizablePanelReturn extends ResizablePanelState, ResizablePanelActions {
  /** Props to spread on the resize handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-orientation': 'horizontal' | 'vertical';
    style: React.CSSProperties;
    className: string;
  };
  /** CSS variable style for the panel container */
  panelStyle: React.CSSProperties;
}

const STORAGE_PREFIX = 'panel-size-';
const KEYBOARD_STEP = 10; // pixels per arrow key press
const KEYBOARD_STEP_LARGE = 50; // pixels per shift+arrow key press

export function useResizablePanel(config: ResizablePanelConfig): UseResizablePanelReturn {
  const {
    id,
    defaultSize,
    minSize,
    maxSize,
    direction,
    side,
    collapseThreshold = 0,
    persist = true,
    onCollapse,
    onExpand,
  } = config;

  // Load initial size from localStorage or use default
  const getInitialSize = (): number => {
    if (persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
          return parsed;
        }
      }
    }
    return defaultSize;
  };

  const [size, setSizeState] = useState<number>(getInitialSize);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const startPosRef = useRef<number>(0);
  const startSizeRef = useRef<number>(0);
  const wasCollapsedRef = useRef<boolean>(false);

  // Persist size to localStorage
  useEffect(() => {
    if (persist && !isCollapsed) {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, size.toString());
    }
  }, [id, size, persist, isCollapsed]);

  // Clamp size to constraints
  const clampSize = useCallback((newSize: number): number => {
    return Math.max(minSize, Math.min(maxSize, newSize));
  }, [minSize, maxSize]);

  // Set size with clamping
  const setSize = useCallback((newSize: number) => {
    const clamped = clampSize(newSize);

    // Check for collapse threshold
    if (collapseThreshold > 0 && clamped < collapseThreshold) {
      setIsCollapsed(true);
      onCollapse?.();
    } else if (isCollapsed && clamped >= collapseThreshold) {
      setIsCollapsed(false);
      onExpand?.();
    }

    setSizeState(clamped);
  }, [clampSize, collapseThreshold, isCollapsed, onCollapse, onExpand]);

  // Reset to default size
  const resetSize = useCallback(() => {
    setSize(defaultSize);
    setIsCollapsed(false);
    onExpand?.();
  }, [defaultSize, setSize, onExpand]);

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      onExpand?.();
    } else {
      setIsCollapsed(true);
      onCollapse?.();
    }
  }, [isCollapsed, onCollapse, onExpand]);

  // Expand panel
  const expand = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      onExpand?.();
    }
  }, [isCollapsed, onExpand]);

  // Collapse panel
  const collapse = useCallback(() => {
    if (!isCollapsed) {
      setIsCollapsed(true);
      onCollapse?.();
    }
  }, [isCollapsed, onCollapse]);

  // Get position from event (mouse or touch)
  const getEventPosition = useCallback((e: MouseEvent | TouchEvent): number => {
    if ('touches' in e) {
      return direction === 'horizontal' ? e.touches[0].clientX : e.touches[0].clientY;
    }
    return direction === 'horizontal' ? e.clientX : e.clientY;
  }, [direction]);

  // Handle resize move
  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const currentPos = getEventPosition(e);
    const delta = currentPos - startPosRef.current;

    // Adjust delta based on side
    const adjustedDelta = (side === 'right' || side === 'bottom') ? -delta : delta;
    const newSize = startSizeRef.current + adjustedDelta;

    setSize(newSize);
  }, [getEventPosition, setSize, side]);

  // Handle resize end
  const handleEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleEnd);
  }, [handleMove]);

  // Start resize
  const startResize = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    // If collapsed, expand first
    if (isCollapsed) {
      setIsCollapsed(false);
      onExpand?.();
      return;
    }

    setIsResizing(true);
    startPosRef.current = 'touches' in e
      ? (direction === 'horizontal' ? e.touches[0].clientX : e.touches[0].clientY)
      : (direction === 'horizontal' ? e.clientX : e.clientY);
    startSizeRef.current = size;

    // Set cursor for entire document during resize
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  }, [isCollapsed, size, direction, handleMove, handleEnd, onExpand]);

  // Keyboard resize
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;

    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSize(size - (side === 'right' ? -step : step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSize(size + (side === 'right' ? -step : step));
      }
    } else {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSize(size - (side === 'bottom' ? -step : step));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSize(size + (side === 'bottom' ? -step : step));
      }
    }

    // Home/End for min/max
    if (e.key === 'Home') {
      e.preventDefault();
      setSize(minSize);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSize(maxSize);
    }
  }, [direction, side, size, setSize, minSize, maxSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [handleMove, handleEnd]);

  // Handle props for the resize handle element
  const handleProps = {
    onMouseDown: startResize as (e: React.MouseEvent) => void,
    onTouchStart: startResize as (e: React.TouchEvent) => void,
    onDoubleClick: resetSize,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
    role: 'separator',
    'aria-label': `Resize ${id} panel`,
    'aria-valuenow': size,
    'aria-valuemin': minSize,
    'aria-valuemax': maxSize,
    'aria-orientation': direction === 'horizontal' ? 'vertical' as const : 'horizontal' as const,
    style: {
      cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
      touchAction: 'none',
    } as React.CSSProperties,
    className: `resize-handle resize-handle-${direction} resize-handle-${side} ${isResizing ? 'resizing' : ''}`,
  };

  // Panel style with CSS variable
  const panelStyle: React.CSSProperties = {
    [direction === 'horizontal' ? 'width' : 'height']: isCollapsed ? 0 : size,
    flexShrink: 0,
    overflow: 'hidden',
    transition: isResizing ? 'none' : 'width 200ms ease, height 200ms ease',
  };

  return {
    size,
    isCollapsed,
    isResizing,
    startResize,
    resetSize,
    toggleCollapse,
    setSize,
    expand,
    collapse,
    handleProps,
    panelStyle,
  };
}

export default useResizablePanel;
