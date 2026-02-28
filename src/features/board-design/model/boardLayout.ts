/**
 * boardLayout.ts — Pure layout algorithms for board item positioning
 * ==================================================================
 * Extracted from BoardView organism. Contains alignment and auto-arrange
 * logic that operates on board items without any UI concerns.
 */

import type { BoardItem } from '../stores/boardVault.svelte';
import * as GeoRect from '@/src/shared/lib/geometry/rect';

export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export interface MoveCommand {
  id: string;
  x: number;
  y: number;
}

/**
 * Compute new positions for a set of items after alignment.
 * Returns an array of move commands (id + new x/y).
 */
export function computeAlignment(items: BoardItem[], type: AlignType): MoveCommand[] {
  if (items.length < 2) return [];

  switch (type) {
    case 'left': {
      const minX = Math.min(...items.map(i => i.x));
      return items.map(i => ({ id: i.id, x: minX, y: i.y }));
    }
    case 'right': {
      const maxRight = Math.max(...items.map(i => GeoRect.right(i)));
      return items.map(i => ({ id: i.id, x: maxRight - i.width, y: i.y }));
    }
    case 'center-h': {
      const avgX = items.reduce((sum, i) => sum + GeoRect.center(i).x, 0) / items.length;
      return items.map(i => ({ id: i.id, x: avgX - i.width / 2, y: i.y }));
    }
    case 'top': {
      const minY = Math.min(...items.map(i => i.y));
      return items.map(i => ({ id: i.id, x: i.x, y: minY }));
    }
    case 'bottom': {
      const maxBottom = Math.max(...items.map(i => GeoRect.bottom(i)));
      return items.map(i => ({ id: i.id, x: i.x, y: maxBottom - i.height }));
    }
    case 'center-v': {
      const avgY = items.reduce((sum, i) => sum + GeoRect.center(i).y, 0) / items.length;
      return items.map(i => ({ id: i.id, x: i.x, y: avgY - i.height / 2 }));
    }
    default:
      return [];
  }
}

/**
 * Compute new positions for items in an automatic arrangement pattern.
 * Returns an array of move commands (id + new x/y).
 */
export function computeAutoArrange(items: BoardItem[], arrangement: string): MoveCommand[] {
  if (items.length === 0) return [];
  const spacing = 20;

  switch (arrangement) {
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(items.length));
      return items.map((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return { id: item.id, x: col * (item.width + spacing), y: row * (item.height + spacing) };
      });
    }
    case 'strip': {
      let x = 0;
      return items.map(item => {
        const cmd = { id: item.id, x, y: 0 };
        x += item.width + spacing;
        return cmd;
      });
    }
    case 'book': {
      const cols = 2;
      return items.map((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return { id: item.id, x: col * (item.width + spacing * 4), y: row * (item.height + spacing) };
      });
    }
    case 'circle': {
      const radius = Math.max(200, items.length * 40);
      const cx = radius + 100;
      const cy = radius + 100;
      return items.map((item, i) => {
        const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
        const center = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        return {
          id: item.id,
          x: center.x - item.width / 2,
          y: center.y - item.height / 2,
        };
      });
    }
    case 'timeline': {
      return items.map((item, i) => ({
        id: item.id,
        x: i * (item.width + spacing),
        y: 100,
      }));
    }
    default:
      return [];
  }
}
