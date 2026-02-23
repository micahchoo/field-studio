/**
 * usePresentationMode Hook
 *
 * Manages presentation/slideshow mode for the board.
 *
 * @module features/board-design/hooks/usePresentationMode
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardItem, BoardState } from '../model';

export interface UsePresentationModeReturn {
  isActive: boolean;
  currentIndex: number;
  currentItem: BoardItem | null;
  totalSlides: number;
  isAutoAdvancing: boolean;
  enter: (startItemId?: string) => void;
  exit: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleAutoAdvance: () => void;
}

/**
 * Compute slide ordering: follow sequence connections via BFS,
 * then append unreachable items.
 */
function computeSlideOrder(state: BoardState): BoardItem[] {
  const items = state.items.filter(i => !i.isNote);
  if (items.length === 0) return [];

  // Build adjacency from sequence connections
  const seqConns = state.connections.filter(c => c.type === 'sequence');
  const outgoing = new Map<string, string>();
  const incoming = new Set<string>();

  for (const conn of seqConns) {
    outgoing.set(conn.fromId, conn.toId);
    incoming.add(conn.toId);
  }

  // Find start node: has outgoing but no incoming sequence connection
  let startId = items[0]?.id;
  for (const item of items) {
    if (outgoing.has(item.id) && !incoming.has(item.id)) {
      startId = item.id;
      break;
    }
  }

  // BFS through sequence chain
  const ordered: BoardItem[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = startId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = items.find(i => i.id === currentId);
    if (item) ordered.push(item);
    currentId = outgoing.get(currentId);
  }

  // Append unreachable items
  for (const item of items) {
    if (!visited.has(item.id)) ordered.push(item);
  }

  return ordered;
}

export function usePresentationMode(boardState: BoardState): UsePresentationModeReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = isActive ? computeSlideOrder(boardState) : [];
  const totalSlides = slides.length;
  const currentItem = slides[currentIndex] || null;

  const enter = useCallback((startItemId?: string) => {
    setIsActive(true);
    const order = computeSlideOrder(boardState);
    const idx = startItemId ? order.findIndex(i => i.id === startItemId) : 0;
    setCurrentIndex(Math.max(0, idx));
    setIsAutoAdvancing(false);
    // Request fullscreen
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [boardState]);

  const exit = useCallback(() => {
    setIsActive(false);
    setCurrentIndex(0);
    setIsAutoAdvancing(false);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const next = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const prev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalSlides - 1)));
  }, [totalSlides]);

  const toggleAutoAdvance = useCallback(() => {
    setIsAutoAdvancing(v => !v);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (isAutoAdvancing && isActive) {
      autoAdvanceRef.current = setInterval(() => {
        setCurrentIndex(i => {
          if (i >= totalSlides - 1) return 0; // loop
          return i + 1;
        });
      }, 5000);
    } else {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    }
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [isAutoAdvancing, isActive, totalSlides]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight': next(); break;
        case 'ArrowLeft': prev(); break;
        case ' ': e.preventDefault(); toggleAutoAdvance(); break;
        case 'Escape': exit(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, next, prev, toggleAutoAdvance, exit]);

  return { isActive, currentIndex, currentItem, totalSlides, isAutoAdvancing, enter, exit, next, prev, goTo, toggleAutoAdvance };
}
