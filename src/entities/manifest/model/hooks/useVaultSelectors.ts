/**
 * useVaultSelectors - Memoized Selectors for Efficient Derived State Computation
 *
 * Provides a set of selector hooks that compute derived state from the vault
 * with proper memoization using useMemo. This prevents unnecessary re-renders
 * when the underlying state hasn't changed in ways that affect the derived value.
 *
 * All selectors use the split context pattern:
 * - useVaultState: For read-only access (triggers re-renders on state change)
 * - useVaultDispatch: Not needed for selectors (no actions dispatched)
 *
 * @example
 * const entity = useEntity(entityId);
 * const children = useEntityChildren(entityId);
 * const label = useEntityLabel(entityId);
 */

import { useMemo } from 'react';
import {
  useVaultState,
} from './useIIIFEntity';
import {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFItem,
  IIIFManifest,
  IIIFRange,
  LanguageString,
} from '@/src/shared/types';
import {
  EntityType,
  getAncestors,
  getChildIds,
  getDescendants,
  getEntitiesByType,
  getEntity,
  getEntityType,
  getParentId,
  NormalizedState,
} from '../vault';
import { ValidationIssue } from '../validation/validator';

// ============================================================================
// Types
// ============================================================================

/**
 * Breadcrumb segment for entity path navigation
 */
export interface BreadcrumbSegment {
  id: string;
  label: string;
  type: 'Collection' | 'Manifest' | 'Canvas';
  isCurrent: boolean;
}

/**
 * Union type of all normalized IIIF entities
 */
export type NormalizedEntity =
  | IIIFCollection
  | IIIFManifest
  | IIIFCanvas
  | IIIFRange
  | IIIFAnnotationPage
  | IIIFAnnotation;

/**
 * Tree node structure for hierarchical views
 */
export interface TreeNode {
  id: string;
  entity: NormalizedEntity;
  type: EntityType;
  depth: number;
  children: TreeNode[];
  isLeaf: boolean;
  expanded: boolean;
}

/**
 * Validation summary for the entire vault state
 */
export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  issuesByCategory: Record<string, number>;
  issuesByEntity: Record<string, ValidationIssue[]>;
  isValid: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a display label from an entity
 */
function getEntityLabelText(entity: NormalizedEntity | null): string {
  if (!entity) return 'Untitled';

  if (entity.label) {
    const labelStr = new LanguageString(entity.label);
    const text = labelStr.get();
    if (text) return text;
  }

  // Fallback to ID-based label
  const {id} = entity;
  const lastSlash = id.lastIndexOf('/');
  if (lastSlash > 0) {
    const fragment = id.slice(lastSlash + 1);
    if (fragment) return fragment;
  }

  return 'Untitled';
}

/**
 * Build a tree structure from a root entity
 */
function buildEntityTree(
  state: NormalizedState,
  rootId: string | null,
  expandedIds: Set<string> = new Set(),
  depth = 0,
  maxDepth = 100
): TreeNode[] {
  if (!rootId || depth > maxDepth) return [];

  const entity = getEntity(state, rootId);
  if (!entity) return [];

  const type = getEntityType(state, rootId);
  if (!type) return [];

  const childIds = getChildIds(state, rootId);
  const isExpanded = expandedIds.has(rootId);

  const node: TreeNode = {
    id: rootId,
    entity: entity as NormalizedEntity,
    type,
    depth,
    children: isExpanded
      ? childIds.flatMap(childId =>
          buildEntityTree(state, childId, expandedIds, depth + 1, maxDepth)
        )
      : [],
    isLeaf: childIds.length === 0,
    expanded: isExpanded,
  };

  return [node, ...node.children];
}

/**
 * Build breadcrumb segments from ancestors
 */
function buildBreadcrumbPath(
  state: NormalizedState,
  entityId: string | null
): BreadcrumbSegment[] {
  if (!entityId) return [];

  const entity = getEntity(state, entityId);
  if (!entity) return [];

  const ancestors = getAncestors(state, entityId);
  const path: BreadcrumbSegment[] = [];

  // Add ancestors from root to parent
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestorId = ancestors[i];
    const ancestor = getEntity(state, ancestorId);
    if (!ancestor) continue;

    const validTypes: Array<'Collection' | 'Manifest' | 'Canvas'> = ['Collection', 'Manifest', 'Canvas'];
    if (!validTypes.includes(ancestor.type as any)) continue;

    path.push({
      id: ancestorId,
      label: getEntityLabelText(ancestor as NormalizedEntity),
      type: ancestor.type as 'Collection' | 'Manifest' | 'Canvas',
      isCurrent: false,
    });
  }

  // Add current entity
  const validTypes: Array<'Collection' | 'Manifest' | 'Canvas'> = ['Collection', 'Manifest', 'Canvas'];
  if (validTypes.includes(entity.type as any)) {
    path.push({
      id: entityId,
      label: getEntityLabelText(entity as NormalizedEntity),
      type: entity.type as 'Collection' | 'Manifest' | 'Canvas',
      isCurrent: true,
    });
  }

  return path;
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get an entity by ID with memoization
 *
 * @param entityId - The entity ID to look up
 * @returns The normalized entity or null if not found
 *
 * @example
 * const entity = useEntity('https://example.com/manifest/1');
 */
export function useEntity(entityId: string | null): NormalizedEntity | null {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return null;
    return getEntity(state, entityId) as NormalizedEntity | null;
  }, [state, entityId]);
}

/**
 * Get the display label for an entity
 *
 * @param entityId - The entity ID to look up
 * @returns The display label string
 *
 * @example
 * const label = useEntityLabel('https://example.com/manifest/1');
 * // Returns: "My Manifest Title" or "Untitled" if no label
 */
export function useEntityLabel(entityId: string | null): string {
  const entity = useEntity(entityId);

  return useMemo(() => {
    return getEntityLabelText(entity);
  }, [entity]);
}

/**
 * Get the child IDs of an entity
 *
 * @param entityId - The parent entity ID
 * @returns Array of child entity IDs
 *
 * @example
 * const canvasIds = useEntityChildren('https://example.com/manifest/1');
 */
export function useEntityChildren(entityId: string | null): string[] {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return [];
    return getChildIds(state, entityId);
  }, [state, entityId]);
}

/**
 * Get the ancestor IDs of an entity (path to root)
 *
 * @param entityId - The entity ID to trace
 * @returns Array of ancestor IDs from parent to root
 *
 * @example
 * const ancestors = useEntityAncestors('https://example.com/canvas/1');
 * // Returns: ['manifest-id', 'collection-id']
 */
export function useEntityAncestors(entityId: string | null): string[] {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return [];
    return getAncestors(state, entityId);
  }, [state, entityId]);
}

/**
 * Get the entity tree starting from a root ID
 *
 * @param rootId - The root entity ID to start from
 * @returns Array of tree nodes in display order
 *
 * @example
 * const tree = useEntityTree('https://example.com/collection/1');
 */
export function useEntityTree(rootId: string | null): TreeNode[] {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!rootId) return [];
    return buildEntityTree(state, rootId);
  }, [state, rootId]);
}

/**
 * Get all entities of a specific type
 *
 * @param type - The entity type to filter by
 * @returns Array of entities of the specified type
 *
 * @example
 * const allManifests = useEntitiesByType('Manifest');
 * const allCanvases = useEntitiesByType('Canvas');
 */
export function useEntitiesByType(type: EntityType): NormalizedEntity[] {
  const { state } = useVaultState();

  return useMemo(() => {
    return getEntitiesByType<NormalizedEntity>(state, type);
  }, [state, type]);
}

/**
 * Get a validation summary for the entire vault state
 *
 * @returns Validation summary with counts and categorized issues
 *
 * @example
 * const summary = useValidationSummary();
 * if (!summary.isValid) {
 *   console.log(`${summary.errorCount} errors found`);
 * }
 */
export function useValidationSummary(): ValidationSummary {
  const { state } = useVaultState();

  return useMemo(() => {
    const issuesByEntity: Record<string, ValidationIssue[]> = {};
    const issuesByCategory: Record<string, number> = {
      Identity: 0,
      Structure: 0,
      Metadata: 0,
      Content: 0,
    };

    let errorCount = 0;
    let warningCount = 0;

    // Collect all entities for validation
    const allEntities: Array<{ id: string; entity: NormalizedEntity; type: EntityType }> = [];

    (Object.keys(state.entities) as EntityType[]).forEach((entityType) => {
      const store = state.entities[entityType];
      Object.entries(store).forEach(([id, entity]) => {
        allEntities.push({ id, entity: entity as NormalizedEntity, type: entityType });
      });
    });

    // Perform basic validation checks
    allEntities.forEach(({ id, entity, type }) => {
      const issues: ValidationIssue[] = [];

      // Check for required fields
      if (!entity.id) {
        issues.push({
          id: `missing-id-${crypto.randomUUID().slice(0, 9)}`,
          itemId: id,
          itemLabel: 'Unknown',
          level: 'error',
          category: 'Identity',
          message: 'Entity is missing required ID',
          fixable: false,
        });
      }

      if (!entity.type) {
        issues.push({
          id: `missing-type-${crypto.randomUUID().slice(0, 9)}`,
          itemId: id,
          itemLabel: getEntityLabelText(entity),
          level: 'error',
          category: 'Identity',
          message: 'Entity is missing required type',
          fixable: false,
        });
      }

      // Check for valid HTTP URI ID
      if (entity.id && !entity.id.startsWith('http')) {
        issues.push({
          id: `invalid-id-${crypto.randomUUID().slice(0, 9)}`,
          itemId: id,
          itemLabel: getEntityLabelText(entity),
          level: 'warning',
          category: 'Identity',
          message: 'ID should be a valid HTTP(S) URI',
          fixable: true,
        });
      }

      // Type-specific validations
      if (type === 'Canvas') {
        const canvas = entity as IIIFCanvas;
        if (!canvas.width || !canvas.height) {
          issues.push({
            id: `missing-dims-${crypto.randomUUID().slice(0, 9)}`,
            itemId: id,
            itemLabel: getEntityLabelText(entity),
            level: 'error',
            category: 'Content',
            message: 'Canvas is missing required width/height',
            fixable: true,
          });
        }
      }

      if (type === 'Manifest') {
        const manifest = entity as IIIFManifest;
        const childIds = getChildIds(state, id);
        const canvasCount = childIds.filter(
          (childId) => getEntityType(state, childId) === 'Canvas'
        ).length;

        if (canvasCount === 0) {
          issues.push({
            id: `no-canvases-${crypto.randomUUID().slice(0, 9)}`,
            itemId: id,
            itemLabel: getEntityLabelText(entity),
            level: 'error',
            category: 'Structure',
            message: 'Manifest must have at least one Canvas',
            fixable: false,
          });
        }
      }

      // Check for label
      if (!entity.label || Object.keys(entity.label).length === 0) {
        issues.push({
          id: `missing-label-${crypto.randomUUID().slice(0, 9)}`,
          itemId: id,
          itemLabel: getEntityLabelText(entity),
          level: 'warning',
          category: 'Metadata',
          message: 'Entity should have a label for accessibility',
          fixable: true,
        });
      }

      // Aggregate issues
      if (issues.length > 0) {
        issuesByEntity[id] = issues;
        issues.forEach((issue) => {
          if (issue.level === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
          issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
        });
      }
    });

    return {
      totalIssues: errorCount + warningCount,
      errorCount,
      warningCount,
      issuesByCategory,
      issuesByEntity,
      isValid: errorCount === 0,
    };
  }, [state]);
}

/**
 * Get full entity objects for a list of selected IDs
 *
 * @param selectedIds - Array of entity IDs to retrieve
 * @returns Array of normalized entities (nulls filtered out)
 *
 * @example
 * const selectedEntities = useSelectedEntities(['id1', 'id2', 'id3']);
 */
export function useSelectedEntities(selectedIds: string[]): NormalizedEntity[] {
  const { state } = useVaultState();

  return useMemo(() => {
    return selectedIds
      .map((id) => getEntity(state, id))
      .filter((entity): entity is NormalizedEntity => entity !== null);
  }, [state, selectedIds]);
}

/**
 * Get the breadcrumb path from root to the specified entity
 *
 * @param entityId - The target entity ID
 * @returns Array of breadcrumb segments from root to target
 *
 * @example
 * const path = useEntityPath('https://example.com/canvas/1');
 * // Returns: [{ id: 'root', label: 'Root', type: 'Collection', isCurrent: false }, ...]
 */
export function useEntityPath(entityId: string | null): BreadcrumbSegment[] {
  const { state } = useVaultState();

  return useMemo(() => {
    return buildBreadcrumbPath(state, entityId);
  }, [state, entityId]);
}

// ============================================================================
// Additional Utility Selectors
// ============================================================================

/**
 * Get descendant IDs of an entity (recursive children)
 *
 * @param entityId - The parent entity ID
 * @returns Array of all descendant IDs
 *
 * @example
 * const allDescendants = useEntityDescendants('https://example.com/manifest/1');
 */
export function useEntityDescendants(entityId: string | null): string[] {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return [];
    return getDescendants(state, entityId);
  }, [state, entityId]);
}

/**
 * Check if an entity exists in the vault
 *
 * @param entityId - The entity ID to check
 * @returns True if the entity exists
 *
 * @example
 * const exists = useEntityExists('https://example.com/manifest/1');
 */
export function useEntityExists(entityId: string | null): boolean {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return false;
    return getEntityType(state, entityId) !== null;
  }, [state, entityId]);
}

/**
 * Get the parent ID of an entity
 *
 * @param entityId - The child entity ID
 * @returns The parent ID or null if no parent
 *
 * @example
 * const parentId = useEntityParent('https://example.com/canvas/1');
 */
export function useEntityParent(entityId: string | null): string | null {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return null;
    return getParentId(state, entityId);
  }, [state, entityId]);
}

/**
 * Get the entity type of an ID
 *
 * @param entityId - The entity ID to check
 * @returns The entity type or null if not found
 *
 * @example
 * const type = useEntityType('https://example.com/manifest/1');
 * // Returns: 'Manifest'
 */
export function useEntityType(entityId: string | null): EntityType | null {
  const { state } = useVaultState();

  return useMemo(() => {
    if (!entityId) return null;
    return getEntityType(state, entityId);
  }, [state, entityId]);
}
