/**
 * Vault Selectors — Pure computation (Category 1)
 *
 * Replaces useVaultSelectors React hook.
 * Architecture doc §4 Cat 1: plain functions.
 *
 * Pure selector functions that derive data from NormalizedState.
 * In Svelte, these are used with $derived() in components:
 *
 *   import { vault } from '@/src/shared/stores/vault.svelte';
 *   import { getEntity, buildEntityTree } from '@/src/entities/manifest/model/vaultSelectors';
 *
 *   const entity = $derived(getEntity(vault.state, selectedId));
 *   const tree = $derived(buildEntityTree(vault.state, vault.rootId!));
 */

import type { NormalizedState, EntityType, IIIFItem } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface BreadcrumbSegment {
  id: string;
  type: string;
  label: string;
}

export interface TreeNode {
  id: string;
  type: string;
  label: string;
  children: TreeNode[];
  depth: number;
  isExpanded?: boolean;
}

export interface ValidationSummary {
  errors: number;
  warnings: number;
  info: number;
  byCategory: Record<string, number>;
}

// ──────────────────────────────────────────────
// Entity selectors — single entity lookups
// ──────────────────────────────────────────────

/**
 * Get an entity by ID from the normalized state.
 * Returns null if the entity does not exist.
 *
 * Pseudocode:
 *   Look up type from typeIndex
 *   If no type, return null
 *   Look up entity from entities[type][id]
 */
export function getEntity(state: NormalizedState, id: string): IIIFItem | null {
  if (!state || !id) return null;

  const type = state.typeIndex[id];
  if (!type) return null;

  const bucket = state.entities[type] as Record<string, IIIFItem> | undefined;
  if (!bucket) return null;

  return bucket[id] ?? null;
}

/**
 * Get the display label for an entity by ID.
 * Falls back to the entity ID if no label is found.
 */
export function getEntityLabel(state: NormalizedState, id: string): string {
  const entity = getEntity(state, id);
  if (!entity) return id;
  return getEntityLabelText(entity);
}

/**
 * Get child IDs of an entity from the references index.
 * Returns an empty array if the entity has no children.
 */
export function getEntityChildren(state: NormalizedState, id: string): string[] {
  if (!state || !id) return [];
  return state.references[id] || [];
}

/**
 * Get the parent ID of an entity from the reverse references index.
 * Returns null if the entity has no parent (i.e., it is the root).
 */
export function getEntityParent(state: NormalizedState, id: string): string | null {
  if (!state || !id) return null;
  return state.reverseRefs[id] ?? null;
}

/**
 * Get the entity type string from the type index.
 * Returns null if the entity does not exist.
 */
export function getEntityType(state: NormalizedState, id: string): EntityType | null {
  if (!state || !id) return null;
  return state.typeIndex[id] ?? null;
}

/**
 * Check whether an entity exists in the vault.
 */
export function entityExists(state: NormalizedState, id: string): boolean {
  if (!state || !id) return false;
  return id in state.typeIndex;
}

// ──────────────────────────────────────────────
// Hierarchical views — ancestors, descendants, paths
// ──────────────────────────────────────────────

/**
 * Get the ancestor chain from root down to (but not including) the given entity.
 * Ordered from root first to immediate parent last.
 *
 * Pseudocode:
 *   Walk up reverseRefs from id to root, collecting each ancestor
 *   Reverse the result so root is first
 *   Guard against cycles with a visited set
 */
export function getEntityAncestors(state: NormalizedState, id: string): BreadcrumbSegment[] {
  if (!state || !id) return [];

  const ancestors: BreadcrumbSegment[] = [];
  const visited = new Set<string>();
  let currentId = state.reverseRefs[id] ?? null;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const entity = getEntity(state, currentId);
    if (entity) {
      ancestors.push({
        id: currentId,
        type: state.typeIndex[currentId] || entity.type,
        label: getEntityLabelText(entity),
      });
    }
    currentId = state.reverseRefs[currentId] ?? null;
  }

  // Reverse so root comes first
  ancestors.reverse();
  return ancestors;
}

/**
 * Get all descendant IDs of an entity (depth-first traversal).
 * Does not include the entity itself.
 *
 * Pseudocode:
 *   BFS/DFS through references starting from id
 *   Collect all visited IDs (excluding root)
 *   Guard against cycles with a visited set
 */
export function getEntityDescendants(state: NormalizedState, id: string): string[] {
  if (!state || !id) return [];

  const descendants: string[] = [];
  const visited = new Set<string>();
  const stack = [...(state.references[id] || [])];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    descendants.push(currentId);

    // Push children onto the stack
    const children = state.references[currentId];
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }

  return descendants;
}

/**
 * Get the full path from root to the given entity (inclusive).
 * Returns breadcrumb segments from root to the entity itself.
 */
export function getEntityPath(state: NormalizedState, id: string): BreadcrumbSegment[] {
  const ancestors = getEntityAncestors(state, id);
  const entity = getEntity(state, id);

  if (entity) {
    ancestors.push({
      id,
      type: state.typeIndex[id] || entity.type,
      label: getEntityLabelText(entity),
    });
  }

  return ancestors;
}

// ──────────────────────────────────────────────
// Tree building — recursive tree structure for tree views
// ──────────────────────────────────────────────

/**
 * Build a recursive TreeNode structure rooted at the given entity.
 * Optionally limit depth to prevent excessive recursion on deep trees.
 *
 * Pseudocode:
 *   Create TreeNode for rootId
 *   Recursively build children from references[rootId]
 *   Stop at maxDepth if specified
 *   Guard against cycles with a visited set
 */
export function buildEntityTree(
  state: NormalizedState,
  rootId: string,
  maxDepth: number = Infinity
): TreeNode {
  const visited = new Set<string>();
  return buildTreeRecursive(state, rootId, 0, maxDepth, visited);
}

function buildTreeRecursive(
  state: NormalizedState,
  id: string,
  depth: number,
  maxDepth: number,
  visited: Set<string>
): TreeNode {
  // Guard against cycles
  visited.add(id);

  const entity = getEntity(state, id);
  const label = entity ? getEntityLabelText(entity) : id;
  const type = state.typeIndex[id] || 'unknown';

  const node: TreeNode = {
    id,
    type,
    label,
    children: [],
    depth,
  };

  // Stop recursion if we've hit the depth limit
  if (depth >= maxDepth) return node;

  // Build children
  const childIds = state.references[id] || [];
  for (const childId of childIds) {
    if (visited.has(childId)) continue; // cycle guard
    node.children.push(buildTreeRecursive(state, childId, depth + 1, maxDepth, visited));
  }

  return node;
}

// ──────────────────────────────────────────────
// Type filtering — get entities by type
// ──────────────────────────────────────────────

/**
 * Get all entities of a given type as { id, label } pairs.
 *
 * Pseudocode:
 *   Access the entities bucket for the given type
 *   Map each entity to { id, label }
 *   Sort by label alphabetically
 */
export function getEntitiesByType(
  state: NormalizedState,
  type: string
): Array<{ id: string; label: string }> {
  if (!state) return [];

  const bucket = state.entities[type as EntityType] as Record<string, IIIFItem> | undefined;
  if (!bucket) return [];

  const results: Array<{ id: string; label: string }> = [];
  for (const id of Object.keys(bucket)) {
    const entity = bucket[id];
    if (entity) {
      results.push({
        id,
        label: getEntityLabelText(entity),
      });
    }
  }

  // Sort alphabetically by label
  results.sort((a, b) => a.label.localeCompare(b.label));
  return results;
}

// ──────────────────────────────────────────────
// Multi-entity lookup
// ──────────────────────────────────────────────

/**
 * Look up multiple entities by their IDs.
 * Returns only found entities (filters out nulls).
 */
export function getSelectedEntities(state: NormalizedState, ids: string[]): IIIFItem[] {
  if (!state || !ids || ids.length === 0) return [];

  const results: IIIFItem[] = [];
  for (const id of ids) {
    const entity = getEntity(state, id);
    if (entity) results.push(entity);
  }
  return results;
}

// ──────────────────────────────────────────────
// Validation summary
// ──────────────────────────────────────────────

/**
 * Compute a summary of validation issues.
 * The input is a map of entityId -> issue[] from the validation store.
 *
 * Pseudocode:
 *   Iterate all issues across all entities
 *   Count by severity (error, warning, info)
 *   Count by category (first word of title or a default)
 */
export function getValidationSummary(
  issues: Record<string, Array<{ id: string; severity: string; title: string; description: string }>>
): ValidationSummary {
  const summary: ValidationSummary = {
    errors: 0,
    warnings: 0,
    info: 0,
    byCategory: {},
  };

  if (!issues) return summary;

  for (const entityId of Object.keys(issues)) {
    const entityIssues = issues[entityId];
    if (!entityIssues) continue;

    for (const issue of entityIssues) {
      // Count by severity
      switch (issue.severity) {
        case 'error':
          summary.errors++;
          break;
        case 'warning':
          summary.warnings++;
          break;
        case 'info':
          summary.info++;
          break;
        default:
          summary.info++;
      }

      // Count by category (derive from title's first word, or use "other")
      const category = extractCategory(issue.title);
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    }
  }

  return summary;
}

/**
 * Extract a category name from a validation issue title.
 * Uses the first meaningful word, lowercased.
 */
function extractCategory(title: string): string {
  if (!title) return 'other';
  // Common prefixes like "Missing", "Invalid", "Required" become the category
  const firstWord = title.trim().split(/\s+/)[0]?.toLowerCase();
  return firstWord || 'other';
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Extract a plain-text label from an entity's label field.
 * Handles the IIIF label format: Record<string, string[]>.
 * Falls back to entity ID or type if no label exists.
 */
export function getEntityLabelText(entity: IIIFItem): string {
  if (!entity) return '';

  // If label is a language map (IIIF standard)
  if (entity.label && typeof entity.label === 'object') {
    return getIIIFValue(entity.label);
  }

  // Fallback: use the entity ID, stripping any URL prefix for readability
  const id = entity.id || '';
  const lastSegment = id.split('/').pop() || id;
  return lastSegment;
}

