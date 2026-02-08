/**
 * Board Design Feature Model
 *
 * Domain-specific selectors and helpers for the board-design feature.
 * Manages board state: items, connections, history, and export.
 *
 * @module features/board-design/model
 */

import { getIIIFValue, type IIIFItem, type IIIFManifest } from '@/src/shared/types';
import { canvas, manifest } from '@/src/entities';
import { resolveHierarchicalThumb } from '@/utils/imageSourceResolver';

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

export interface BoardGroup {
  id: string;
  label: string;
  itemIds: string[];
  color?: string;
}

export interface BoardState {
  items: BoardItem[];
  connections: Connection[];
  groups: BoardGroup[];
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
  id: `board-item-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`,
  resourceId: resource.id,
  x: position.x,
  y: position.y,
  w: size.w,
  h: size.h,
  resourceType: resource.type,
  label: getIIIFValue(resource.label) || resource.id,
  blobUrl: resolveHierarchicalThumb(resource, 200) || undefined,
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
  id: `conn-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`,
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
 * Auto-arrange layout types
 */
export type LayoutArrangement = 'grid' | 'continuous' | 'paged' | 'circle' | 'timeline';

/**
 * Auto-arrange board items in a specific layout pattern.
 * Respects viewingDirection for layout direction.
 */
export const autoArrangeItems = (
  items: BoardItem[],
  arrangement: LayoutArrangement,
  canvasSize: { width: number; height: number },
  viewingDirection: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' = 'left-to-right',
): BoardItem[] => {
  if (items.length === 0) return items;

  const spacing = 20;
  const itemW = 200;
  const itemH = 150;
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;

  const isRTL = viewingDirection === 'right-to-left';
  const isVertical = viewingDirection === 'top-to-bottom' || viewingDirection === 'bottom-to-top';
  const isReverse = viewingDirection === 'right-to-left' || viewingDirection === 'bottom-to-top';

  const ordered = isReverse ? [...items].reverse() : [...items];

  switch (arrangement) {
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(items.length));
      const totalW = cols * (itemW + spacing) - spacing;
      const startX = centerX - totalW / 2;
      const startY = 80;
      return ordered.map((item, i) => {
        const col = isRTL ? (cols - 1 - (i % cols)) : (i % cols);
        const row = Math.floor(i / cols);
        return {
          ...item,
          x: startX + col * (itemW + spacing),
          y: startY + row * (itemH + spacing),
          w: itemW,
          h: itemH,
        };
      });
    }

    case 'continuous': {
      // Single column/row strip
      const startPos = 60;
      return ordered.map((item, i) => ({
        ...item,
        x: isVertical ? centerX - itemW / 2 : startPos + i * (itemW + spacing / 2),
        y: isVertical ? startPos + i * (itemH + spacing / 2) : centerY - itemH / 2,
        w: itemW,
        h: itemH,
      }));
    }

    case 'paged': {
      // 2-up rows (book spread)
      const pairW = itemW * 2 + 10;
      const startX = centerX - pairW / 2;
      const startY = 80;
      return ordered.map((item, i) => {
        const pairIndex = Math.floor(i / 2);
        const isRight = i % 2 === 1;
        return {
          ...item,
          x: isRTL
            ? (isRight ? startX : startX + itemW + 10)
            : (isRight ? startX + itemW + 10 : startX),
          y: startY + pairIndex * (itemH + spacing * 2),
          w: itemW,
          h: itemH,
        };
      });
    }

    case 'circle': {
      const radius = Math.max(150, items.length * 30);
      return ordered.map((item, i) => {
        const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        return {
          ...item,
          x: centerX + Math.cos(angle) * radius - itemW / 2,
          y: centerY + Math.sin(angle) * radius - itemH / 2,
          w: itemW,
          h: itemH,
        };
      });
    }

    case 'timeline': {
      // Horizontal timeline with staggered heights
      const startX = 60;
      return ordered.map((item, i) => ({
        ...item,
        x: startX + i * (itemW + spacing),
        y: centerY + (i % 2 === 0 ? -20 : 20) - itemH / 2,
        w: itemW,
        h: itemH,
      }));
    }

    default:
      return items;
  }
};

/**
 * Snap a position to a grid
 */
export const snapToGrid = (
  pos: { x: number; y: number },
  gridSize: number = 20,
): { x: number; y: number } => ({
  x: Math.round(pos.x / gridSize) * gridSize,
  y: Math.round(pos.y / gridSize) * gridSize,
});

/**
 * Export board state to IIIF Manifest format
 * Supports navDate (timeline), navPlace (map), behaviors, viewingDirection,
 * structures (Ranges), and linking annotations.
 */
export const exportToManifest = (
  state: BoardState,
  title: string,
  options?: {
    includeNavDate?: boolean;
    includeNavPlace?: boolean;
    templateType?: 'narrative' | 'comparison' | 'timeline' | 'map' | string;
    behavior?: string[];
    viewingDirection?: string;
    highlightedItemId?: string;
    groups?: Array<{ label: string; itemIds: string[] }>;
  }
): Partial<IIIFManifest> => {
  const resultManifest: Partial<IIIFManifest> = {
    type: 'Manifest',
    label: { en: [title] },
    items: state.items
      .filter((item) => !item.isNote)
      .map((item, index) => {
        const resultCanvas: any = {
          type: 'Canvas' as const,
          id: item.resourceId,
          label: { en: [item.label] },
          width: item.w || 1000,
          height: item.h || 800,
          items: [],
        };

        // Add navDate for timeline templates
        if (options?.includeNavDate || options?.templateType === 'timeline') {
          const baseYear = new Date().getFullYear() - state.items.length + index;
          resultCanvas.navDate = `${baseYear}-01-01T00:00:00Z`;
        }

        // Add navPlace for map templates
        if (options?.includeNavPlace || options?.templateType === 'map') {
          const normalizedX = (item.x / 1000) * 180 - 90;
          const normalizedY = (item.y / 1000) * 360 - 180;
          resultCanvas.navPlace = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [normalizedY, normalizedX],
            },
            properties: {
              name: item.label,
            },
          };
        }

        return resultCanvas;
      }),
  };

  // Add behavior from template or explicit option
  if (options?.behavior && options.behavior.length > 0) {
    (resultManifest as any).behavior = options.behavior;
  } else if (options?.templateType) {
    const behaviorMap: Record<string, string[]> = {
      'continuous': ['continuous'],
      'scroll-layout': ['continuous'],
      'paged': ['paged'],
      'book-spread': ['paged'],
      'narrative': ['individuals'],
      'storyboard': ['individuals'],
    };
    const defaultBehavior = behaviorMap[options.templateType];
    if (defaultBehavior) {
      (resultManifest as any).behavior = defaultBehavior;
    }
  }

  // Add viewingDirection
  if (options?.viewingDirection) {
    (resultManifest as any).viewingDirection = options.viewingDirection;
  }

  // Add start property if a highlighted item exists
  if (options?.highlightedItemId) {
    const startItem = state.items.find(i => i.id === options.highlightedItemId);
    if (startItem) {
      (resultManifest as any).start = {
        id: startItem.resourceId,
        type: 'Canvas',
      };
    }
  }

  // Add structures (Ranges) from grouped items
  if (options?.groups && options.groups.length > 0) {
    (resultManifest as any).structures = options.groups.map((group, gi) => ({
      id: `urn:field-studio:range:${crypto.randomUUID().slice(0, 8)}-${gi}`,
      type: 'Range',
      label: { en: [group.label] },
      items: group.itemIds
        .map(id => state.items.find(i => i.id === id))
        .filter(Boolean)
        .map(item => ({ id: item!.resourceId, type: 'Canvas' })),
    }));
  }

  // Helper: resolve internal board item ID to IIIF resource ID
  const resolveToResource = (boardItemId: string) =>
    state.items.find(i => i.id === boardItemId)?.resourceId || boardItemId;

  // Add linking annotations for connections (using resource IDs, not internal IDs)
  if (state.connections.length > 0) {
    const annotations = state.connections.map((conn) => {
      const annotation: Record<string, unknown> = {
        type: 'Annotation' as const,
        id: conn.id,
        motivation: connectionTypeToMotivation(conn.type),
        body: {
          type: 'SpecificResource',
          source: resolveToResource(conn.toId),
        },
        target: resolveToResource(conn.fromId),
        label: conn.label ? { en: [conn.label] } : undefined,
      };

      // Serialize anchor/style/color metadata
      const hasMetadata = conn.fromAnchor || conn.toAnchor || conn.style || conn.color;
      if (hasMetadata) {
        annotation.service = [{
          id: `${conn.id}/connection-meta`,
          type: 'ConnectionMetadata',
          ...(conn.fromAnchor && { fromAnchor: conn.fromAnchor }),
          ...(conn.toAnchor && { toAnchor: conn.toAnchor }),
          ...(conn.style && { style: conn.style }),
          ...(conn.color && { color: conn.color }),
        }];
      }

      return annotation;
    });

    (resultManifest as any).annotations = [
      {
        type: 'AnnotationPage',
        id: `${title}-annotations`,
        items: annotations,
      },
    ];
  }

  return resultManifest;
};

/**
 * Map connection types to IIIF annotation motivations
 */
const connectionTypeToMotivation = (type: ConnectionType): string => {
  const motivationMap: Record<ConnectionType, string> = {
    associated: 'linking',
    partOf: 'linking',
    similarTo: 'comparing',
    references: 'linking',
    requires: 'linking',
    sequence: 'linking',
  };
  return motivationMap[type] || 'linking';
};

// ============================================================================
// Initial State
// ============================================================================

export const createInitialBoardState = (): BoardState => ({
  items: [],
  connections: [],
  groups: [],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
});
