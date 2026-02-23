/**
 * Viewing Behavior -- Pure computation (Category 1)
 *
 * Replaces useViewingBehavior React hook.
 * Architecture doc S4 Cat 1: plain function, no framework imports.
 *
 * Resolves effective viewing behaviors from manifest + canvas behaviors
 * using IIIF 3.0 inheritance rules. The specification defines behaviors
 * at multiple levels (Collection, Manifest, Canvas, Range, Annotation)
 * with canvas-level overriding manifest-level for certain properties.
 *
 * @see https://iiif.io/api/presentation/3.0/#behavior
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewingLayout = 'individuals' | 'continuous' | 'paged';

export interface ViewingBehavior {
  /** Resolved layout mode from behaviors */
  layout: ViewingLayout;
  /** Whether to auto-advance to next canvas when media ends */
  autoAdvance: boolean;
  /** Whether to repeat from beginning after last canvas */
  repeat: boolean;
  /** Canvas IDs with 'facing-pages' behavior */
  facingPages: Set<string>;
  /** Canvas IDs with 'non-paged' behavior */
  nonPaged: Set<string>;
  /** Whether items are unordered (no implied sequence) */
  unordered: boolean;
}

/** Minimal canvas shape needed for behavior resolution */
export interface BehaviorCanvas {
  id: string;
  behavior?: string[];
}

// ---------------------------------------------------------------------------
// Constants: IIIF 3.0 behavior value sets
// ---------------------------------------------------------------------------

/** Layout behaviors (mutually exclusive within a resource) */
const LAYOUT_BEHAVIORS = new Set<string>([
  'individuals',
  'continuous',
  'paged',
]);

/** Temporal behaviors for auto-advancing */
const TEMPORAL_BEHAVIORS = new Set<string>([
  'auto-advance',
  'no-auto-advance',
]);

/** Repeat behaviors */
const REPEAT_BEHAVIORS = new Set<string>([
  'repeat',
  'no-repeat',
]);

/** Ordering behaviors */
const ORDERING_BEHAVIORS = new Set<string>([
  'unordered',
  'sequence',
]);

/** Canvas-level-only behaviors (not inherited from manifest) */
const CANVAS_ONLY_BEHAVIORS = new Set<string>([
  'facing-pages',
  'non-paged',
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Pseudocode:
// Given a behavior string array, find the first entry that is a
// valid layout behavior. Return null if none found.
function extractLayout(behaviors: string[]): ViewingLayout | null {
  for (const b of behaviors) {
    if (LAYOUT_BEHAVIORS.has(b)) {
      return b as ViewingLayout;
    }
  }
  return null;
}

// Pseudocode:
// For boolean-pair behaviors (auto-advance / no-auto-advance),
// return true if the positive value is present and the negative
// value is absent. The negative value wins if both are present
// (spec says last-one-wins but in practice clients treat the
// negative as an explicit override).
function resolveBooleanPair(
  behaviors: string[],
  positive: string,
  negative: string,
): boolean {
  const hasPositive = behaviors.includes(positive);
  const hasNegative = behaviors.includes(negative);
  // Negative explicitly overrides positive
  if (hasNegative) return false;
  return hasPositive;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the effective viewing behavior from manifest and canvas behaviors.
 *
 * The IIIF 3.0 spec defines behavior inheritance:
 *   - Layout behaviors on a manifest apply to all contained canvases
 *     unless overridden at the canvas level.
 *   - Temporal behaviors (auto-advance, repeat) are manifest-level only.
 *   - Canvas-specific behaviors (facing-pages, non-paged) build sets
 *     keyed by canvas ID.
 *
 * @param manifestBehaviors - behavior array from manifest.behavior
 * @param canvasBehaviors   - behavior array from the currently active canvas
 *                            (for per-canvas layout override)
 * @param allCanvases       - all canvases in the manifest (for building
 *                            facingPages and nonPaged sets)
 */
export function resolveViewingBehavior(
  manifestBehaviors?: string[],
  canvasBehaviors?: string[],
  allCanvases?: BehaviorCanvas[],
): ViewingBehavior {
  const mBehaviors = manifestBehaviors ?? [];
  const cBehaviors = canvasBehaviors ?? [];
  const canvases = allCanvases ?? [];

  // ------------------------------------------------------------------
  // 1. Resolve layout
  //    Canvas-level layout overrides manifest-level when present.
  //    Fallback: 'individuals' (IIIF default).
  // ------------------------------------------------------------------
  const canvasLayout = extractLayout(cBehaviors);
  const manifestLayout = extractLayout(mBehaviors);
  const layout: ViewingLayout = canvasLayout ?? manifestLayout ?? 'individuals';

  // ------------------------------------------------------------------
  // 2. Resolve temporal behaviors (manifest-level only per spec)
  // ------------------------------------------------------------------
  const autoAdvance = resolveBooleanPair(mBehaviors, 'auto-advance', 'no-auto-advance');
  const repeat = resolveBooleanPair(mBehaviors, 'repeat', 'no-repeat');

  // ------------------------------------------------------------------
  // 3. Resolve ordering
  // ------------------------------------------------------------------
  const unordered = mBehaviors.includes('unordered');

  // ------------------------------------------------------------------
  // 4. Build canvas-specific behavior sets
  //    Iterate all canvases and collect those with facing-pages
  //    or non-paged behaviors.
  // ------------------------------------------------------------------
  const facingPages = new Set<string>();
  const nonPaged = new Set<string>();

  for (const canvas of canvases) {
    const cb = canvas.behavior ?? [];
    if (cb.includes('facing-pages')) {
      facingPages.add(canvas.id);
    }
    if (cb.includes('non-paged')) {
      nonPaged.add(canvas.id);
    }
  }

  return {
    layout,
    autoAdvance,
    repeat,
    facingPages,
    nonPaged,
    unordered,
  };
}

/**
 * Get the effective layout for a specific canvas.
 *
 * If the canvas has its own layout behavior, that wins.
 * Otherwise the manifest-level layout from the resolved behavior is used.
 *
 * @param canvasId          - ID of the canvas to query
 * @param canvasBehaviors   - behavior array of that canvas (if available)
 * @param manifestBehavior  - pre-resolved manifest behavior
 */
export function getCanvasLayout(
  canvasId: string,
  manifestBehavior: ViewingBehavior,
  canvasBehaviors?: string[],
): ViewingLayout {
  // Pseudocode:
  // 1. If canvasBehaviors has a layout value, return it
  // 2. If the canvas is in nonPaged set and manifest is 'paged',
  //    treat it as 'individuals' (non-paged items in a paged manifest
  //    are displayed individually, not as part of a page pair)
  // 3. Otherwise return the manifest layout

  if (canvasBehaviors) {
    const canvasLayout = extractLayout(canvasBehaviors);
    if (canvasLayout) return canvasLayout;
  }

  // Non-paged canvases in a paged manifest are displayed individually
  if (
    manifestBehavior.layout === 'paged' &&
    manifestBehavior.nonPaged.has(canvasId)
  ) {
    return 'individuals';
  }

  return manifestBehavior.layout;
}

/**
 * Determine whether a canvas should be displayed as a facing page
 * (i.e. alongside its partner in a paged layout).
 *
 * @param canvasId  - ID of the canvas to check
 * @param behavior  - resolved ViewingBehavior
 */
export function isFacingPage(
  canvasId: string,
  behavior: ViewingBehavior,
): boolean {
  return behavior.facingPages.has(canvasId);
}

/**
 * Determine whether a canvas is non-paged (should be shown alone
 * even in a paged manifest).
 *
 * @param canvasId  - ID of the canvas to check
 * @param behavior  - resolved ViewingBehavior
 */
export function isNonPaged(
  canvasId: string,
  behavior: ViewingBehavior,
): boolean {
  return behavior.nonPaged.has(canvasId);
}

/**
 * Build page spreads for a paged manifest.
 *
 * Groups canvases into pairs for recto/verso display. Respects:
 *   - facing-pages: canvas is a spread partner
 *   - non-paged: canvas is shown alone (breaks the pairing)
 *
 * Returns an array of arrays: single-element for solo pages,
 * two-element for facing page pairs.
 *
 * @param canvases - ordered canvas list
 * @param behavior - resolved ViewingBehavior
 */
export function buildPageSpreads(
  canvases: BehaviorCanvas[],
  behavior: ViewingBehavior,
): BehaviorCanvas[][] {
  // Pseudocode:
  // 1. If layout is not 'paged', return each canvas as a solo spread
  // 2. Walk canvases: if non-paged, emit solo; if facing-pages or
  //    normal even-index, pair with next canvas
  // 3. First canvas is typically the cover (solo)

  if (behavior.layout !== 'paged') {
    return canvases.map(c => [c]);
  }

  const spreads: BehaviorCanvas[][] = [];
  let i = 0;

  // First canvas is typically a cover (recto only) -- display solo
  if (canvases.length > 0) {
    spreads.push([canvases[0]]);
    i = 1;
  }

  while (i < canvases.length) {
    const canvas = canvases[i];

    // Non-paged canvases break the spread and are shown alone
    if (behavior.nonPaged.has(canvas.id)) {
      spreads.push([canvas]);
      i++;
      continue;
    }

    // Try to pair with next canvas (if it exists and is not non-paged)
    const next = canvases[i + 1];
    if (next && !behavior.nonPaged.has(next.id)) {
      spreads.push([canvas, next]);
      i += 2;
    } else {
      spreads.push([canvas]);
      i++;
    }
  }

  return spreads;
}

/**
 * Check if a set of behaviors contains any recognized IIIF 3.0 behavior.
 * Useful for validation / warning about unknown behavior values.
 */
export function categorizeUnknownBehaviors(behaviors: string[]): {
  known: string[];
  unknown: string[];
} {
  const allKnown = new Set<string>([
    ...LAYOUT_BEHAVIORS,
    ...TEMPORAL_BEHAVIORS,
    ...REPEAT_BEHAVIORS,
    ...ORDERING_BEHAVIORS,
    ...CANVAS_ONLY_BEHAVIORS,
    // Additional IIIF 3.0 behaviors not used for layout resolution
    'hidden',
    'thumbnail-nav',
    'no-nav',
    'together',
    'sequence',
    'multi-part',
  ]);

  const known: string[] = [];
  const unknown: string[] = [];

  for (const b of behaviors) {
    if (allKnown.has(b)) {
      known.push(b);
    } else {
      unknown.push(b);
    }
  }

  return { known, unknown };
}
