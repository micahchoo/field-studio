/**
 * JSON Patch — 3-Level Entity Diffing for ActionHistory
 *
 * Uses reference equality (`!==`) at every level, which works because
 * `$state.raw` preserves object identity for unchanged entities.
 *
 * Patch path depth:
 *   1-segment: `/rootId`             — top-level scalar/object
 *   2-segment: `/entities/Canvas`    — entire type bucket add/remove
 *   3-segment: `/entities/Canvas/c1` — individual entity change
 */

export interface Patch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string | string[];
  value?: unknown;
  from?: string;
}

/**
 * Diff individual entities within a type bucket (Level 3).
 * Uses `!==` on entity references — structurally equal but different objects
 * are intentionally treated as changed.
 */
function diffEntityBucket(
  fromBucket: Record<string, unknown>,
  toBucket: Record<string, unknown>,
  bucketPath: string,
): Patch[] {
  const patches: Patch[] = [];
  const allKeys = new Set([...Object.keys(fromBucket), ...Object.keys(toBucket)]);

  for (const entityId of allKeys) {
    const path = `${bucketPath}/${entityId}`;
    const fromEntity = fromBucket[entityId];
    const toEntity = toBucket[entityId];

    if (fromEntity === undefined) {
      patches.push({ op: 'add', path, value: toEntity });
    } else if (toEntity === undefined) {
      patches.push({ op: 'remove', path });
    } else if (fromEntity !== toEntity) {
      patches.push({ op: 'replace', path, value: toEntity });
    }
  }

  return patches;
}

/**
 * Diff the `entities` object at type-bucket level (Level 2) then
 * delegate to `diffEntityBucket` for individual entities (Level 3).
 */
function diffEntities(
  fromEntities: Record<string, Record<string, unknown>>,
  toEntities: Record<string, Record<string, unknown>>,
): Patch[] {
  if (fromEntities === toEntities) return [];

  const patches: Patch[] = [];
  const allTypes = new Set([...Object.keys(fromEntities), ...Object.keys(toEntities)]);

  for (const typeName of allTypes) {
    const path = `/entities/${typeName}`;
    const fromBucket = fromEntities[typeName];
    const toBucket = toEntities[typeName];

    if (fromBucket === undefined) {
      patches.push({ op: 'add', path, value: toBucket });
    } else if (toBucket === undefined) {
      patches.push({ op: 'remove', path });
    } else if (fromBucket !== toBucket) {
      patches.push(...diffEntityBucket(fromBucket, toBucket, path));
    }
  }

  return patches;
}

/**
 * Compute one-directional patches between two state objects.
 *
 * For the `entities` key, recurses into type buckets and individual entities
 * using reference equality at each level. For all other keys, uses `!==` only.
 */
function computePatches(from: unknown, to: unknown): Patch[] {
  const fromObj = from as Record<string, unknown>;
  const toObj = to as Record<string, unknown>;
  const patches: Patch[] = [];
  const allKeys = new Set([...Object.keys(fromObj || {}), ...Object.keys(toObj || {})]);

  for (const key of allKeys) {
    const fromVal = (fromObj || {})[key];
    const toVal = (toObj || {})[key];

    if (fromVal === undefined && !(key in (fromObj || {}))) {
      patches.push({ op: 'add', path: `/${key}`, value: toVal });
    } else if (toVal === undefined && !(key in (toObj || {}))) {
      patches.push({ op: 'remove', path: `/${key}` });
    } else if (key === 'entities') {
      patches.push(
        ...diffEntities(
          fromVal as Record<string, Record<string, unknown>>,
          toVal as Record<string, Record<string, unknown>>,
        ),
      );
    } else if (fromVal !== toVal) {
      patches.push({ op: 'replace', path: `/${key}`, value: toVal });
    }
  }

  return patches;
}

/**
 * Calculate the diff between two state objects as JSON patches.
 * Returns forward patches (before->after) and reverse patches (after->before).
 */
export function diffStates(before: unknown, after: unknown): { forward: Patch[]; reverse: Patch[] } {
  if (before === after) return { forward: [], reverse: [] };
  return {
    forward: computePatches(before, after),
    reverse: computePatches(after, before),
  };
}

/**
 * Parse a patch path string into segments.
 * `/entities/Canvas/c1` -> ['entities', 'Canvas', 'c1']
 */
function parsePath(patch: Patch): string[] {
  const pathStr = Array.isArray(patch.path) ? patch.path[0] : patch.path;
  return pathStr.replace(/^\//, '').split('/');
}

/**
 * Apply patches to a state object (returns new object).
 *
 * Handles 1-segment, 2-segment, and 3-segment paths with structural sharing.
 * Only clones objects that are actually modified, and tracks already-cloned
 * objects to avoid redundant copies when multiple patches touch the same bucket.
 */
export function applyPatches<T>(obj: T, patches: Patch[]): T {
  if (!patches || patches.length === 0) return obj;

  // Shallow-clone the root
  const result = { ...(obj as Record<string, unknown>) };

  // Track cloned intermediate objects to avoid double-cloning
  const clonedEntities = new Map<string, Record<string, unknown>>();
  let entitiesCloned = false;

  for (const patch of patches) {
    const segments = parsePath(patch);

    if (segments.length === 1) {
      // 1-segment: /rootId, /references, etc.
      const [key] = segments;
      if (patch.op === 'remove') {
        delete result[key];
      } else {
        result[key] = patch.value;
      }
    } else if (segments.length === 2) {
      // 2-segment: /entities/Canvas (entire bucket)
      const [parent, child] = segments;
      if (!entitiesCloned) {
        result[parent] = { ...(result[parent] as Record<string, unknown>) };
        entitiesCloned = true;
      }
      const parentObj = result[parent] as Record<string, unknown>;
      if (patch.op === 'remove') {
        delete parentObj[child];
      } else {
        parentObj[child] = patch.value;
      }
    } else if (segments.length === 3) {
      // 3-segment: /entities/Canvas/c1 (individual entity)
      const [parent, bucket, entityId] = segments;

      // Clone entities object once
      if (!entitiesCloned) {
        result[parent] = { ...(result[parent] as Record<string, unknown>) };
        entitiesCloned = true;
      }
      const parentObj = result[parent] as Record<string, unknown>;

      // Clone bucket once (may be shared across patches)
      if (!clonedEntities.has(bucket)) {
        const bucketClone = { ...(parentObj[bucket] as Record<string, unknown>) };
        parentObj[bucket] = bucketClone;
        clonedEntities.set(bucket, bucketClone);
      }
      const bucketObj = clonedEntities.get(bucket)!;

      if (patch.op === 'remove') {
        delete bucketObj[entityId];
      } else {
        bucketObj[entityId] = patch.value;
      }
    }
  }

  return result as T;
}
