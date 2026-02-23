/**
 * JSON Patch — Minimal Implementation for ActionHistory
 * Used for undo/redo patch tracking.
 */

export interface Patch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string | string[];
  value?: unknown;
  from?: string;
}

/**
 * Compute one-directional patches between two objects.
 */
function computePatches(from: unknown, to: unknown): Patch[] {
  const fromObj = from as Record<string, unknown>;
  const toObj = to as Record<string, unknown>;
  const patches: Patch[] = [];
  const allKeys = new Set([...Object.keys(fromObj || {}), ...Object.keys(toObj || {})]);

  for (const key of allKeys) {
    const path = `/${key}`;
    if (!(key in (fromObj || {}))) {
      patches.push({ op: 'add', path, value: (toObj || {})[key] });
    } else if (!(key in (toObj || {}))) {
      patches.push({ op: 'remove', path });
    } else if (JSON.stringify(fromObj[key]) !== JSON.stringify(toObj[key])) {
      patches.push({ op: 'replace', path, value: toObj[key] });
    }
  }

  return patches;
}

/**
 * Calculate the diff between two state objects as JSON patches.
 * Returns forward patches (before→after) and reverse patches (after→before).
 */
export function diffStates(before: unknown, after: unknown): { forward: Patch[]; reverse: Patch[] } {
  if (before === after) return { forward: [], reverse: [] };
  return {
    forward: computePatches(before, after),
    reverse: computePatches(after, before),
  };
}

/**
 * Apply patches to a state object (returns new object).
 */
export function applyPatches<T>(obj: T, patches: Patch[]): T {
  if (!patches || patches.length === 0) return obj;
  const result = { ...(obj as Record<string, unknown>) };

  for (const patch of patches) {
    const pathStr = Array.isArray(patch.path) ? patch.path[0] : patch.path;
    const key = pathStr.replace(/^\//, '').split('/')[0];

    switch (patch.op) {
      case 'add':
      case 'replace':
        result[key] = patch.value;
        break;
      case 'remove':
        delete result[key];
        break;
    }
  }

  return result as T;
}
