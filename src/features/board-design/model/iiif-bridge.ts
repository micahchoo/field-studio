/**
 * IIIF Bridge Layer
 *
 * Converts between the BoardState UI model and IIIF Manifest structures.
 * A board maps to a IIIF Manifest with a single large "surface" Canvas.
 * Board items are painting annotations targeting regions of the surface.
 * Connections are linking annotations. Notes are commenting annotations.
 *
 * Canvas-as-content pattern: each board item is a painting annotation
 * whose body references another canvas via source.
 *
 * @module features/board-design/model/iiif-bridge
 */

import type {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFManifest,
} from '@/src/shared/types';
import type {
  AnchorSide,
  BoardItem,
  BoardGroup,
  BoardState,
  Connection,
  ConnectionType,
} from './index';

// ============================================================================
// Constants
// ============================================================================

/** Virtual board surface dimensions */
const BOARD_SURFACE_WIDTH = 10000;
const BOARD_SURFACE_HEIGHT = 10000;

/** ID suffixes for board IIIF entities */
const SURFACE_SUFFIX = '/surface';
const PAINTING_PAGE_SUFFIX = '/items/painting';
const SUPPLEMENTING_PAGE_SUFFIX = '/annotations/supplementing';

// ============================================================================
// BoardState → IIIF Manifest
// ============================================================================

/**
 * Convert a BoardState to a full IIIF Manifest.
 * Replaces the previous exportToManifest() with proper IIIF structure.
 */
export function boardStateToManifest(
  state: BoardState,
  boardId: string,
  title: string,
  options?: {
    behavior?: string[];
    viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  }
): IIIFManifest {
  const surfaceId = `${boardId}${SURFACE_SUFFIX}`;
  const paintingPageId = `${surfaceId}${PAINTING_PAGE_SUFFIX}`;
  const supplementingPageId = `${surfaceId}${SUPPLEMENTING_PAGE_SUFFIX}`;

  // Build painting annotations (board items)
  const paintingAnnotations: IIIFAnnotation[] = state.items
    .filter(item => !item.isNote)
    .map(item => boardItemToAnnotation(item, surfaceId));

  // Build note annotations (commenting motivation)
  const noteAnnotations: IIIFAnnotation[] = state.items
    .filter(item => item.isNote)
    .map(item => noteItemToAnnotation(item, surfaceId));

  // Build connection annotations (linking motivation)
  const connectionAnnotations: IIIFAnnotation[] = state.connections.map(
    conn => connectionToAnnotation(conn, state.items)
  );

  // Painting annotation page (board items)
  const paintingPage: IIIFAnnotationPage = {
    id: paintingPageId,
    type: 'AnnotationPage',
    items: paintingAnnotations,
  };

  // Supplementing annotation page (connections + notes)
  const supplementingItems = [...connectionAnnotations, ...noteAnnotations];
  const supplementingPage: IIIFAnnotationPage = {
    id: supplementingPageId,
    type: 'AnnotationPage',
    items: supplementingItems,
  };

  // Board surface canvas
  const surfaceCanvas: IIIFCanvas = {
    id: surfaceId,
    type: 'Canvas',
    label: { en: [`${title} — Board Surface`] },
    width: BOARD_SURFACE_WIDTH,
    height: BOARD_SURFACE_HEIGHT,
    items: [paintingPage],
  };

  // Only add supplementing page if it has items
  if (supplementingItems.length > 0) {
    (surfaceCanvas as IIIFCanvas & { annotations?: IIIFAnnotationPage[] }).annotations = [supplementingPage];
  }

  // Build manifest
  const manifest: IIIFManifest = {
    id: boardId,
    type: 'Manifest',
    label: { en: [title] },
    items: [surfaceCanvas],
  };

  // Add behavior
  const behavior = options?.behavior || ['individuals'];
  (manifest as IIIFManifest & { behavior?: string[] }).behavior = behavior;

  // Add viewingDirection if specified
  if (options?.viewingDirection) {
    manifest.viewingDirection = options.viewingDirection;
  }

  // Store viewport in service block for round-tripping
  (manifest as IIIFManifest & { service?: unknown[] }).service = [{
    id: `${boardId}/viewport`,
    type: 'BoardViewport',
    x: state.viewport.x,
    y: state.viewport.y,
    zoom: state.viewport.zoom,
  }];

  // Serialize groups as Ranges in structures[]
  if (state.groups && state.groups.length > 0) {
    (manifest as IIIFManifest & { structures?: unknown[] }).structures = state.groups.map(group => ({
      id: `${boardId}/range/${group.id}`,
      type: 'Range' as const,
      label: { en: [group.label] },
      items: group.itemIds
        .map(itemId => state.items.find(i => i.id === itemId))
        .filter(Boolean)
        .map(item => ({
          id: item!.resourceId,
          type: 'Canvas' as const,
        })),
      ...(group.color && { service: [{ id: `${boardId}/range/${group.id}/meta`, type: 'GroupMetadata', color: group.color }] }),
    }));
  }

  return manifest;
}

// ============================================================================
// IIIF Manifest → BoardState
// ============================================================================

/**
 * Convert a IIIF Manifest back to a BoardState.
 * Reads the board surface canvas and extracts items, connections, and notes.
 */
export function manifestToBoardState(manifest: IIIFManifest): BoardState {
  const items: BoardItem[] = [];
  const connections: Connection[] = [];
  let viewport = { x: 0, y: 0, zoom: 1 };

  // Extract viewport from service block
  const services = (manifest as IIIFManifest & { service?: Array<{ type: string; x?: number; y?: number; zoom?: number }> }).service;
  if (services) {
    const viewportService = services.find(s => s.type === 'BoardViewport');
    if (viewportService) {
      viewport = {
        x: viewportService.x || 0,
        y: viewportService.y || 0,
        zoom: viewportService.zoom || 1,
      };
    }
  }

  // Get the board surface canvas (first canvas in manifest)
  const surfaceCanvas = manifest.items?.[0];
  if (!surfaceCanvas) {
    return { items: [], connections: [], groups: [], viewport };
  }

  // Extract painting annotations → BoardItems
  for (const page of surfaceCanvas.items || []) {
    for (const annotation of page.items || []) {
      const item = annotationToBoardItem(annotation);
      if (item) items.push(item);
    }
  }

  // Extract supplementing annotations → Connections + Notes
  const annotationPages = (surfaceCanvas as IIIFCanvas & { annotations?: IIIFAnnotationPage[] }).annotations || [];
  for (const page of annotationPages) {
    for (const annotation of page.items || []) {
      const motivation = getMotivation(annotation);
      if (motivation === 'linking') {
        // Pass already-parsed items so resource IDs can be resolved to internal IDs
        const conn = annotationToConnection(annotation, items);
        if (conn) connections.push(conn);
      } else if (motivation === 'commenting') {
        const noteItem = annotationToNoteItem(annotation);
        if (noteItem) items.push(noteItem);
      }
    }
  }

  // Extract groups from structures (Ranges)
  const groups: BoardGroup[] = [];
  const structures = (manifest as IIIFManifest & { structures?: Array<{ id: string; type: string; label?: Record<string, string[]>; items?: Array<{ id: string; type: string }>; service?: Array<{ type: string; color?: string }> }> }).structures;
  if (structures) {
    for (const structure of structures) {
      if (structure.type === 'Range') {
        const rangeLabel = structure.label?.en?.[0] || 'Group';
        const rangeItemIds = (structure.items || [])
          .map(ref => items.find(i => i.resourceId === ref.id)?.id)
          .filter((id): id is string => !!id);
        const colorMeta = structure.service?.find(s => s.type === 'GroupMetadata');
        groups.push({
          id: structure.id.split('/range/').pop() || structure.id,
          label: rangeLabel,
          itemIds: rangeItemIds,
          ...(colorMeta?.color && { color: colorMeta.color }),
        });
      }
    }
  }

  return { items, connections, groups, viewport };
}

// ============================================================================
// Individual Converters: BoardItem ↔ Annotation
// ============================================================================

/**
 * Convert a BoardItem to a painting Annotation with xywh fragment selector
 */
function boardItemToAnnotation(item: BoardItem, surfaceCanvasId: string): IIIFAnnotation {
  const xywh = `${Math.round(item.x)},${Math.round(item.y)},${Math.round(item.w)},${Math.round(item.h)}`;

  return {
    id: item.id,
    type: 'Annotation',
    motivation: 'painting',
    body: {
      type: 'SpecificResource',
      source: item.resourceId,
      label: item.label ? { en: [item.label] } : undefined,
    } as unknown as IIIFAnnotation['body'],
    target: `${surfaceCanvasId}#xywh=${xywh}`,
  };
}

/**
 * Convert a note BoardItem to a commenting Annotation
 */
function noteItemToAnnotation(item: BoardItem, surfaceCanvasId: string): IIIFAnnotation {
  const xywh = `${Math.round(item.x)},${Math.round(item.y)},${Math.round(item.w)},${Math.round(item.h)}`;

  return {
    id: item.id,
    type: 'Annotation',
    motivation: 'commenting',
    body: {
      type: 'TextualBody',
      value: item.annotation || item.label || '',
      format: 'text/plain',
    } as IIIFAnnotation['body'],
    target: `${surfaceCanvasId}#xywh=${xywh}`,
  };
}

/**
 * Parse a painting Annotation back into a BoardItem
 */
function annotationToBoardItem(annotation: IIIFAnnotation): BoardItem | null {
  const target = typeof annotation.target === 'string' ? annotation.target : '';
  const xywh = parseXYWH(target);
  if (!xywh) return null;

  const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
  const source = (body as { source?: string })?.source || '';
  const bodyLabel = (body as { label?: Record<string, string[]> })?.label;
  const label = bodyLabel?.en?.[0] || source;

  return {
    id: annotation.id,
    resourceId: source,
    x: xywh.x,
    y: xywh.y,
    w: xywh.w,
    h: xywh.h,
    resourceType: 'Canvas',
    label,
  };
}

/**
 * Parse a commenting Annotation back into a note BoardItem
 */
function annotationToNoteItem(annotation: IIIFAnnotation): BoardItem | null {
  const target = typeof annotation.target === 'string' ? annotation.target : '';
  const xywh = parseXYWH(target);
  if (!xywh) return null;

  const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
  const value = (body as { value?: string })?.value || '';

  return {
    id: annotation.id,
    resourceId: annotation.id,
    x: xywh.x,
    y: xywh.y,
    w: xywh.w,
    h: xywh.h,
    resourceType: 'Text',
    label: value.substring(0, 50),
    annotation: value,
    isNote: true,
  };
}

// ============================================================================
// Individual Converters: Connection ↔ Annotation
// ============================================================================

/** Map connection types to IIIF annotation label strings */
const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  associated: 'associated',
  partOf: 'partOf',
  similarTo: 'similarTo',
  references: 'references',
  requires: 'requires',
  sequence: 'sequence',
};

/** Reverse map from label to ConnectionType */
const LABEL_TO_CONNECTION_TYPE: Record<string, ConnectionType> = Object.fromEntries(
  Object.entries(CONNECTION_TYPE_LABELS).map(([k, v]) => [v, k as ConnectionType])
) as Record<string, ConnectionType>;

/**
 * Convert a Connection to a linking Annotation.
 * Resolves internal board item IDs to IIIF resource IDs.
 * Serializes anchor/style/color metadata in a service block.
 */
function connectionToAnnotation(conn: Connection, items: BoardItem[]): IIIFAnnotation {
  const resolveToResource = (boardItemId: string) =>
    items.find(i => i.id === boardItemId)?.resourceId || boardItemId;

  const annotation: IIIFAnnotation = {
    id: conn.id,
    type: 'Annotation',
    motivation: 'linking',
    body: {
      type: 'SpecificResource',
      source: resolveToResource(conn.toId),
      label: { en: [CONNECTION_TYPE_LABELS[conn.type] || conn.type] },
    } as unknown as IIIFAnnotation['body'],
    target: resolveToResource(conn.fromId),
  };

  // Serialize anchor, style, and color metadata in a service block
  const hasMetadata = conn.fromAnchor || conn.toAnchor || conn.style || conn.color;
  if (hasMetadata) {
    (annotation as IIIFAnnotation & { service?: unknown[] }).service = [{
      id: `${conn.id}/connection-meta`,
      type: 'ConnectionMetadata',
      ...(conn.fromAnchor && { fromAnchor: conn.fromAnchor }),
      ...(conn.toAnchor && { toAnchor: conn.toAnchor }),
      ...(conn.style && { style: conn.style }),
      ...(conn.color && { color: conn.color }),
    }];
  }

  return annotation;
}

/**
 * Parse a linking Annotation back into a Connection.
 * Reverse-lookups IIIF resource IDs to internal board item IDs.
 * Reads anchor/style/color from service block.
 */
function annotationToConnection(annotation: IIIFAnnotation, items: BoardItem[]): Connection | null {
  const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
  const toResourceId = (body as { source?: string })?.source;
  const bodyLabel = (body as { label?: Record<string, string[]> })?.label;
  const typeLabel = bodyLabel?.en?.[0] || 'associated';
  const fromResourceId = typeof annotation.target === 'string' ? annotation.target : '';

  if (!toResourceId || !fromResourceId) return null;

  // Reverse-lookup: find board item by resourceId to recover internal ID
  const resolveToInternal = (resourceId: string) =>
    items.find(i => i.resourceId === resourceId)?.id || resourceId;

  // Read anchor/style/color from service block
  const services = (annotation as IIIFAnnotation & { service?: Array<{ type: string; fromAnchor?: AnchorSide; toAnchor?: AnchorSide; style?: string; color?: string }> }).service;
  const meta = services?.find(s => s.type === 'ConnectionMetadata');

  return {
    id: annotation.id,
    fromId: resolveToInternal(fromResourceId),
    toId: resolveToInternal(toResourceId),
    type: LABEL_TO_CONNECTION_TYPE[typeLabel] || 'associated',
    label: typeLabel,
    ...(meta?.fromAnchor && { fromAnchor: meta.fromAnchor }),
    ...(meta?.toAnchor && { toAnchor: meta.toAnchor }),
    ...(meta?.style && { style: meta.style as Connection['style'] }),
    ...(meta?.color && { color: meta.color }),
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Parse #xywh=x,y,w,h from a target URI */
function parseXYWH(target: string): { x: number; y: number; w: number; h: number } | null {
  const match = target.match(/#xywh=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    w: parseFloat(match[3]),
    h: parseFloat(match[4]),
  };
}

/** Get the primary motivation string from an annotation */
function getMotivation(annotation: IIIFAnnotation): string {
  const m = annotation.motivation;
  if (Array.isArray(m)) return m[0] || '';
  return m || '';
}

/**
 * Generate a unique board ID
 */
export function generateBoardId(): string {
  return `board-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
}

/**
 * Check if a manifest is a board manifest (has BoardViewport service)
 */
export function isBoardManifest(manifest: IIIFManifest): boolean {
  const services = (manifest as IIIFManifest & { service?: Array<{ type: string }> }).service;
  return !!services?.some(s => s.type === 'BoardViewport');
}
