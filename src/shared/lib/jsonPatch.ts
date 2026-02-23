/**
 * Minimal JSON Patch diff/apply for undo/redo history.
 *
 * Only diffs the entity stores that actually changed (using reference equality),
 * producing compact forward/reverse patch sets instead of full state snapshots.
 */

import type { NormalizedState } from '@/src/shared/types';

export interface Patch {
  /** Top-level key path, e.g. ['entities','Canvas','id123'] or ['references','id123'] */
  path: string[];
  /** 'add' | 'replace' | 'remove' */
  op: 'add' | 'replace' | 'remove';
  /** New value (undefined for 'remove') */
  value?: unknown;
}

/**
 * Compute minimal patches between two NormalizedState snapshots.
 * Skips stores that are reference-equal (no change).
 * Returns { forward, reverse } patch sets.
 */
export function diffStates(
  before: NormalizedState,
  after: NormalizedState
): { forward: Patch[]; reverse: Patch[] } {
  const forward: Patch[] = [];
  const reverse: Patch[] = [];

  // Diff entity stores
  const entityTypes = Object.keys(after.entities) as Array<keyof NormalizedState['entities']>;
  for (const entityType of entityTypes) {
    const beforeStore = before.entities[entityType];
    const afterStore = after.entities[entityType];
    if (beforeStore === afterStore) continue;

    // Find added/changed entities
    for (const id of Object.keys(afterStore)) {
      if (!(id in beforeStore)) {
        forward.push({ path: ['entities', entityType, id], op: 'add', value: afterStore[id] });
        reverse.push({ path: ['entities', entityType, id], op: 'remove' });
      } else if (beforeStore[id] !== afterStore[id]) {
        forward.push({ path: ['entities', entityType, id], op: 'replace', value: afterStore[id] });
        reverse.push({ path: ['entities', entityType, id], op: 'replace', value: beforeStore[id] });
      }
    }
    // Find removed entities
    for (const id of Object.keys(beforeStore)) {
      if (!(id in afterStore)) {
        forward.push({ path: ['entities', entityType, id], op: 'remove' });
        reverse.push({ path: ['entities', entityType, id], op: 'add', value: beforeStore[id] });
      }
    }
  }

  // Diff simple record stores (references, reverseRefs, collectionMembers, memberOfCollections, typeIndex, extensions, trashedEntities)
  const recordKeys: Array<keyof NormalizedState> = [
    'references', 'reverseRefs', 'collectionMembers',
    'memberOfCollections', 'typeIndex', 'extensions', 'trashedEntities'
  ];

  for (const key of recordKeys) {
    const beforeRec = before[key] as Record<string, unknown>;
    const afterRec = after[key] as Record<string, unknown>;
    if (beforeRec === afterRec) continue;

    for (const id of Object.keys(afterRec)) {
      if (!(id in beforeRec)) {
        forward.push({ path: [key, id], op: 'add', value: afterRec[id] });
        reverse.push({ path: [key, id], op: 'remove' });
      } else if (beforeRec[id] !== afterRec[id]) {
        forward.push({ path: [key, id], op: 'replace', value: afterRec[id] });
        reverse.push({ path: [key, id], op: 'replace', value: beforeRec[id] });
      }
    }
    for (const id of Object.keys(beforeRec)) {
      if (!(id in afterRec)) {
        forward.push({ path: [key, id], op: 'remove' });
        reverse.push({ path: [key, id], op: 'add', value: beforeRec[id] });
      }
    }
  }

  // Diff rootId
  if (before.rootId !== after.rootId) {
    forward.push({ path: ['rootId'], op: 'replace', value: after.rootId });
    reverse.push({ path: ['rootId'], op: 'replace', value: before.rootId });
  }

  return { forward, reverse };
}

/**
 * Apply a set of patches to a NormalizedState, producing a new state.
 * Does NOT mutate the input state.
 */
export function applyPatches(state: NormalizedState, patches: Patch[]): NormalizedState {
  // Shallow-clone top-level so we don't mutate the input
  const result: Record<string, unknown> = { ...state };

  // Track which sub-objects we've already cloned to avoid double-cloning
  const clonedPaths = new Set<string>();

  for (const patch of patches) {
    const { path, op, value } = patch;

    if (path.length === 1 && path[0] === 'rootId') {
      result.rootId = value as string | null;
      continue;
    }

    if (path.length === 2) {
      // e.g. ['references', 'id123']
      const [topKey, subKey] = path;
      if (!clonedPaths.has(topKey)) {
        result[topKey] = { ...(result[topKey] as Record<string, unknown>) };
        clonedPaths.add(topKey);
      }
      const rec = result[topKey] as Record<string, unknown>;
      if (op === 'remove') {
        delete rec[subKey];
      } else {
        rec[subKey] = value;
      }
    } else if (path.length === 3) {
      // e.g. ['entities', 'Canvas', 'id123']
      const [topKey, midKey, subKey] = path;
      if (!clonedPaths.has(topKey)) {
        result[topKey] = { ...(result[topKey] as Record<string, unknown>) };
        clonedPaths.add(topKey);
      }
      const mid = result[topKey] as Record<string, unknown>;
      const midCloneKey = `${topKey}.${midKey}`;
      if (!clonedPaths.has(midCloneKey)) {
        mid[midKey] = { ...(mid[midKey] as Record<string, unknown>) };
        clonedPaths.add(midCloneKey);
      }
      const sub = mid[midKey] as Record<string, unknown>;
      if (op === 'remove') {
        delete sub[subKey];
      } else {
        sub[subKey] = value;
      }
    }
  }

  return result as unknown as NormalizedState;
}
