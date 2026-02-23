// Pure TypeScript — no Svelte-specific conversion

/**
 * Accessibility Constants
 *
 * WCAG 2.1 AA compliance, ARIA patterns, and keyboard navigation.
 */

// ============================================================================
// ARIA Labels
// ============================================================================

export const ARIA_LABELS = {
  // Navigation
  close: 'Close',
  goBack: 'Go back',
  goForward: 'Go forward',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',

  // Actions
  save: 'Save changes',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create new',
  duplicate: 'Duplicate',
  move: 'Move',

  // Selection
  select: 'Select',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
  clearSelection: 'Clear selection',

  // Search & Filter
  search: 'Search',
  clearSearch: 'Clear search',
  filter: 'Filter results',
  clearFilters: 'Clear all filters',

  // View controls
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
  fullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',

  // Navigation
  previous: 'Previous',
  next: 'Next',
  first: 'First',
  last: 'Last',

  // Misc
  expand: 'Expand',
  collapse: 'Collapse',
  moreOptions: 'More options',
  loading: 'Loading',
  help: 'Help'
} as const;

// ============================================================================
// ARIA Live Regions
// ============================================================================

export const ARIA_LIVE = {
  assertive: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
  polite: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  status: { role: 'status', 'aria-live': 'polite' },
  alert: { role: 'alert', 'aria-live': 'assertive' }
} as const;

// ============================================================================
// Keyboard Navigation
// ============================================================================

export const KEYBOARD = {
  KEYS: {
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    SPACE: ' ',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    DELETE: 'Delete',
    BACKSPACE: 'Backspace'
  },

  FOCUS: {
    visibleClass: 'focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
    withinClass: 'focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2',
    focusableSelector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    focusDelay: 50
  },

  SHORTCUTS: {
    global: {
      'Cmd+K': 'Open command palette',
      'Cmd+S': 'Save project',
      'Cmd+Z': 'Undo',
      'Cmd+Shift+Z': 'Redo',
      'Cmd+B': 'Toggle sidebar',
      'Cmd+I': 'Toggle inspector',
      '?': 'Show keyboard shortcuts',
      'Esc': 'Close modal/cancel',
    },
    navigation: {
      'Cmd+1': 'Archive mode',
      'Cmd+2': 'Collections mode',
      'Cmd+3': 'Metadata mode',
      'Cmd+4': 'Boards mode',
      'Cmd+5': 'Viewer mode',
      'Cmd+6': 'Search mode',
    },
  } as const
} as const;

// ============================================================================
// Focus Trap Configuration
// ============================================================================

export const FOCUS_TRAP = {
  focusableSelector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  focusDelay: 50
} as const;
