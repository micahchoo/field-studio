/**
 * shortcutHelpers.ts
 *
 * Pure utility functions extracted from KeyboardShortcutsOverlay.svelte.
 * Handles HTML escaping, platform-aware key formatting, and category lookups.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShortcutContext =
  | 'global'
  | 'archive'
  | 'viewer'
  | 'board'
  | 'metadata'
  | 'search';

export type ShortcutCategory =
  | 'navigation'
  | 'editing'
  | 'selection'
  | 'view'
  | 'file'
  | 'tools';

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  description?: string;
  context: ShortcutContext;
  category: ShortcutCategory;
  icon?: string;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters to prevent XSS in generated markup.
 * Handles &, <, >, and " (double quote).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a keyboard key string for display, applying Mac-specific symbol
 * replacements when running on macOS.
 *
 * Mac replacements:
 *   Ctrl      -> Command  (U+2318)
 *   Alt       -> Option   (U+2325)
 *   Shift     -> Shift    (U+21E7)
 *   Enter     -> Return   (U+21A9)
 *   Backspace -> Delete   (U+232B)
 *
 * Non-Mac: returns the key string unchanged.
 */
export function formatKey(key: string, isMac: boolean): string {
  if (isMac) {
    return key
      .replace(/Ctrl/gi, '\u2318')
      .replace(/Alt/gi, '\u2325')
      .replace(/Shift/gi, '\u21E7')
      .replace(/Enter/gi, '\u21A9')
      .replace(/Backspace/gi, '\u232B');
  }
  return key;
}

/**
 * Look up the human-readable label for a category id.
 * Falls back to the raw `catId` string when no match is found.
 */
export function getCategoryLabel(
  catId: string,
  categories: { id: string; label: string }[],
): string {
  return categories.find((c) => c.id === catId)?.label ?? catId;
}
