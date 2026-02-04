/**
 * Board Design Feature Model
 *
 * Domain-specific selectors and helpers for the board-design feature.
 * Manages board state: items, connections, history, and export.
 *
 * @module features/board-design/model
 */

import type { IIIFCanvas, IIIFItem, IIIFManifest } from '@/types';
import { getIIIFValue } from '@/types';
import { canvas, manifest } from '@/src/entities';

// Re-export entity models for convenience
export { manifest, canvas };

// ============================================================================
// Types
// ============================================================================

export type AnchorSide = 'T' | 'R' | 'B' | 'L';

export type ConnectionType =
  | 'associated'
  | 'partOf'
  | 'similarTo'
  | 'references'
  | 'requires'
  | 'sequence';

export interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resourceType: string;
  label: string;
  blobUrl?: string;
  annotation?: string;
  isNote?: boolean;
  isMetadataNode?: boolean;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
  fromAnchor?: AnchorSide;
  toAnchor?: AnchorSide;
  style?: 'straight' | 'elbow' | 'curved';
  color?: string;
}

export interface BoardState {
  items: BoardItem[];
  connections: Connection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================================================
// Board Selectors
// ============================================================================

/**
 * Get all items on the board
 */
export const selectAllItems = (state: BoardState): BoardItem[] => state.items;

/**
 * Get all connections on the board
 */
export const selectAllConnections = (state: BoardState): Connection[] =>
  state.connections;

/**
 * Get item by ID
 */
export const selectItemById = (
  state: BoardState,
  id: string
): BoardItem | undefined => state.items.find((item) => item.id === id);

/**
 * Get connections for a specific item (both incoming and outgoing)
 */
export const selectConnectionsForItem = (
  state: BoardState,
  itemId: string
): Connection[] =>
  state.connections.filter(
    (conn) => conn.fromId === itemId || conn.toId === itemId
  );

/**
 * Check if board is empty
 */
export const selectIsEmpty = (state: BoardState): boolean =>
  state.items.length === 0;

/**
 * Get board bounds (min/max coordinates)
 */
export const selectBoardBounds = (
  state: BoardState
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  if (state.items.length === 0) return null;

  const minX = Math.min(...state.items.map((i) => i.x));
  const minY = Math.min(...state.items.map((i) => i.y));
  const maxX = Math.max(...state.items.map((i) => i.x + i.w));
  const maxY = Math.max(...state.items.map((i) => i.y + i.h));

  return { minX, minY, maxX, maxY };
};

// ============================================================================
// Board Helpers
// ============================================================================

/**
 * Create a new board item from a IIIF resource
 */
export const createBoardItem = (
  resource: IIIFItem,
  position: { x: number; y: number },
  size: { w: number; h: number } = { w: 200, h: 150 }
): BoardItem => ({
  id: `board-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  resourceId: resource.id,
  x: position.x,
  y: position.y,
  w: size.w,
  h: size.h,
  resourceType: resource.type,
  label: getIIIFValue(resource.label) || resource.id,
});

/**
 * Create a connection between two items
 */
export const createConnection = (
  fromId: string,
  toId: string,
  type: ConnectionType = 'associated',
  options: Partial<Omit<Connection, 'id' | 'fromId' | 'toId' | 'type'>> = {}
): Connection => ({
  id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  fromId,
  toId,
  type,
  ...options,
});

/**
 * Calculate default anchor points for a connection
 */
export const calculateAnchorPoints = (
  fromItem: BoardItem,
  toItem: BoardItem
): { from: AnchorSide; to: AnchorSide } => {
  const dx = toItem.x - fromItem.x;
  const dy = toItem.y - fromItem.y;

  // Determine best anchor sides based on relative positions
  if (Math.abs(dx) > Math.abs(dy)) {
    // More horizontal than vertical
    return {
      from: dx > 0 ? 'R' : 'L',
      to: dx > 0 ? 'L' : 'R',
    };
  } else {
    // More vertical than horizontal
    return {
      from: dy > 0 ? 'B' : 'T',
      to: dy > 0 ? 'T' : 'B',
    };
  }
};

/**
 * Get connection label based on type and terminology level
 */
export const getConnectionLabel = (
  type: ConnectionType,
  isAdvanced: boolean
): string => {
  const labels: Record<ConnectionType, { simple: string; advanced: string }> = {
    associated: { simple: 'Related', advanced: 'Associated' },
    partOf: { simple: 'Part of', advanced: 'Part Of' },
    similarTo: { simple: 'Similar', advanced: 'Similar To' },
    references: { simple: 'References', advanced: 'References' },
    requires: { simple: 'Needs', advanced: 'Requires' },
    sequence: { simple: 'Next', advanced: 'Sequence' },
  };

  return labels[type]?.[isAdvanced ? 'advanced' : 'simple'] || type;
};

/**
 * Export board state to IIIF Manifest format
 */
export const exportToManifest = (
  state: BoardState,
  title: string
): Partial<IIIFManifest> => {
  return {
    type: 'Manifest',
    label: { en: [title] },
    items: state.items
      .filter((item) => !item.isNote)
      .map((item) => ({
        type: 'Canvas' as const,
        id: item.resourceId,
        label: { en: [item.label] },
        width: 0,
        height: 0,
        items: [],
      })),
    // Annotations would be added here for connections
  };
};

// ============================================================================
// Initial State
// ============================================================================

export const createInitialBoardState = (): BoardState => ({
  items: [],
  connections: [],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
});
