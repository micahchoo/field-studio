/**
 * Keyboard Shortcuts Constants
 * 
 * Centralized definition of all keyboard shortcuts in the application.
 * Supports context-aware shortcuts and platform-specific key display.
 */

/**
 * Context types for shortcuts
 * - global: Available everywhere
 * - collections: Available in Collections/Structure view
 * - board: Available in Board view
 * - viewer: Available in Viewer mode
 * - metadata: Available in Metadata view
 */
export type ShortcutContext = 'global' | 'collections' | 'board' | 'viewer' | 'metadata';

/**
 * Category types for organizing shortcuts
 */
export type ShortcutCategory = 'navigation' | 'editing' | 'selection' | 'view' | 'actions' | 'media';

/**
 * Interface defining a keyboard shortcut
 */
export interface ShortcutDefinition {
  /** Unique identifier for the shortcut */
  id: string;
  /** Keyboard keys (e.g., ['Cmd', 'K']) */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Context where the shortcut is available */
  context: ShortcutContext;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Icon for visual identification */
  icon?: string;
  /** Optional action handler (can be bound at runtime) */
  action?: () => void;
}

/**
 * All keyboard shortcuts defined in the application
 */
export const SHORTCUTS: ShortcutDefinition[] = [
  // Navigation - Global
  { id: 'open-palette', keys: ['Cmd', 'K'], description: 'Open Command Palette', context: 'global', category: 'navigation', icon: 'search' },
  { id: 'go-collections', keys: ['Cmd', '1'], description: 'Go to Archive View', context: 'global', category: 'navigation', icon: 'inventory_2' },
  { id: 'go-structure', keys: ['Cmd', '2'], description: 'Go to Collections', context: 'global', category: 'navigation', icon: 'folder_special' },
  { id: 'go-metadata', keys: ['Cmd', '3'], description: 'Go to Metadata', context: 'global', category: 'navigation', icon: 'table_chart' },
  { id: 'go-search', keys: ['Cmd', '4'], description: 'Go to Search', context: 'global', category: 'navigation', icon: 'search' },
  { id: 'go-viewer', keys: ['Cmd', '5'], description: 'Go to Viewer', context: 'global', category: 'navigation', icon: 'visibility' },
  { id: 'show-shortcuts', keys: ['Cmd', '?'], description: 'Show Keyboard Shortcuts', context: 'global', category: 'navigation', icon: 'keyboard' },
  
  // Editing - Global
  { id: 'undo', keys: ['Cmd', 'Z'], description: 'Undo', context: 'global', category: 'editing', icon: 'undo' },
  { id: 'redo', keys: ['Cmd', 'Shift', 'Z'], description: 'Redo', context: 'global', category: 'editing', icon: 'redo' },
  { id: 'save', keys: ['Cmd', 'S'], description: 'Save Project', context: 'global', category: 'editing', icon: 'save' },
  { id: 'delete', keys: ['Delete'], description: 'Delete Selected', context: 'global', category: 'editing', icon: 'delete' },
  { id: 'duplicate', keys: ['Cmd', 'D'], description: 'Duplicate Selected', context: 'global', category: 'editing', icon: 'content_copy' },
  { id: 'copy', keys: ['Cmd', 'C'], description: 'Copy', context: 'global', category: 'editing', icon: 'content_copy' },
  { id: 'paste', keys: ['Cmd', 'V'], description: 'Paste', context: 'global', category: 'editing', icon: 'content_paste' },
  { id: 'cut', keys: ['Cmd', 'X'], description: 'Cut', context: 'global', category: 'editing', icon: 'content_cut' },
  
  // Selection - Global
  { id: 'select-all', keys: ['Cmd', 'A'], description: 'Select All', context: 'global', category: 'selection', icon: 'select_all' },
  { id: 'clear-selection', keys: ['Escape'], description: 'Clear Selection', context: 'global', category: 'selection', icon: 'deselect' },
  { id: 'select-next', keys: ['ArrowDown'], description: 'Select Next Item', context: 'global', category: 'selection', icon: 'arrow_downward' },
  { id: 'select-prev', keys: ['ArrowUp'], description: 'Select Previous Item', context: 'global', category: 'selection', icon: 'arrow_upward' },
  { id: 'multi-select', keys: ['Cmd', 'Click'], description: 'Multi-Select (with click)', context: 'global', category: 'selection', icon: 'check_box' },
  { id: 'range-select', keys: ['Shift', 'Click'], description: 'Range Select (with click)', context: 'global', category: 'selection', icon: 'linear_scale' },
  
  // View - Global
  { id: 'toggle-sidebar', keys: ['Cmd', 'B'], description: 'Toggle Sidebar', context: 'global', category: 'view', icon: 'side_navigation' },
  { id: 'toggle-inspector', keys: ['Cmd', 'I'], description: 'Toggle Inspector', context: 'global', category: 'view', icon: 'info' },
  { id: 'toggle-settings', keys: ['Cmd', ','], description: 'Open Settings', context: 'global', category: 'view', icon: 'settings' },
  { id: 'toggle-field-mode', keys: ['Cmd', 'Shift', 'F'], description: 'Toggle Field Mode', context: 'global', category: 'view', icon: 'contrast' },
  { id: 'toggle-fullscreen', keys: ['F11'], description: 'Toggle Fullscreen', context: 'global', category: 'view', icon: 'fullscreen' },
  
  // Actions - Global
  { id: 'export', keys: ['Cmd', 'E'], description: 'Export Archive', context: 'global', category: 'actions', icon: 'download' },
  { id: 'import', keys: ['Cmd', 'Shift', 'I'], description: 'Import External IIIF', context: 'global', category: 'actions', icon: 'cloud_download' },
  { id: 'quality-control', keys: ['Cmd', 'Q'], description: 'Quality Control Dashboard', context: 'global', category: 'actions', icon: 'fact_check' },
  { id: 'batch-edit', keys: ['Cmd', 'Shift', 'B'], description: 'Batch Edit Selected', context: 'global', category: 'actions', icon: 'batch_prediction' },
  { id: 'find', keys: ['Cmd', 'F'], description: 'Find in Archive', context: 'global', category: 'actions', icon: 'search' },
  
  // Collections/Structure Context
  { id: 'expand-all', keys: ['Alt', 'ArrowRight'], description: 'Expand All', context: 'collections', category: 'view', icon: 'unfold_more' },
  { id: 'collapse-all', keys: ['Alt', 'ArrowLeft'], description: 'Collapse All', context: 'collections', category: 'view', icon: 'unfold_less' },
  { id: 'new-collection', keys: ['Cmd', 'Shift', 'N'], description: 'New Collection', context: 'collections', category: 'editing', icon: 'create_new_folder' },
  { id: 'new-manifest', keys: ['Cmd', 'N'], description: 'New Manifest', context: 'collections', category: 'editing', icon: 'note_add' },
  { id: 'reorder-up', keys: ['Alt', 'ArrowUp'], description: 'Move Item Up', context: 'collections', category: 'editing', icon: 'move_up' },
  { id: 'reorder-down', keys: ['Alt', 'ArrowDown'], description: 'Move Item Down', context: 'collections', category: 'editing', icon: 'move_down' },
  
  // Viewer Context
  { id: 'zoom-in', keys: ['Plus'], description: 'Zoom In', context: 'viewer', category: 'view', icon: 'zoom_in' },
  { id: 'zoom-out', keys: ['Minus'], description: 'Zoom Out', context: 'viewer', category: 'view', icon: 'zoom_out' },
  { id: 'zoom-reset', keys: ['0'], description: 'Reset Zoom', context: 'viewer', category: 'view', icon: 'zoom_out_map' },
  { id: 'pan-left', keys: ['ArrowLeft'], description: 'Pan Left', context: 'viewer', category: 'view', icon: 'west' },
  { id: 'pan-right', keys: ['ArrowRight'], description: 'Pan Right', context: 'viewer', category: 'view', icon: 'east' },
  { id: 'pan-up', keys: ['ArrowUp'], description: 'Pan Up', context: 'viewer', category: 'view', icon: 'north' },
  { id: 'pan-down', keys: ['ArrowDown'], description: 'Pan Down', context: 'viewer', category: 'view', icon: 'south' },
  { id: 'next-canvas', keys: ['PageDown'], description: 'Next Canvas', context: 'viewer', category: 'navigation', icon: 'skip_next' },
  { id: 'prev-canvas', keys: ['PageUp'], description: 'Previous Canvas', context: 'viewer', category: 'navigation', icon: 'skip_previous' },
  { id: 'rotate-clockwise', keys: ['R'], description: 'Rotate Clockwise', context: 'viewer', category: 'view', icon: 'rotate_right' },
  { id: 'rotate-counter', keys: ['Shift', 'R'], description: 'Rotate Counter-Clockwise', context: 'viewer', category: 'view', icon: 'rotate_left' },
  { id: 'flip-horizontal', keys: ['H'], description: 'Flip Horizontal', context: 'viewer', category: 'view', icon: 'flip' },
  { id: 'flip-vertical', keys: ['V'], description: 'Flip Vertical', context: 'viewer', category: 'view', icon: 'flip' },
  
  // Media Controls - Viewer
  { id: 'play-pause', keys: ['Space'], description: 'Play/Pause Media', context: 'viewer', category: 'media', icon: 'play_arrow' },
  { id: 'mute', keys: ['M'], description: 'Mute/Unmute', context: 'viewer', category: 'media', icon: 'volume_off' },
  { id: 'seek-forward', keys: ['ArrowRight'], description: 'Seek Forward', context: 'viewer', category: 'media', icon: 'forward_10' },
  { id: 'seek-backward', keys: ['ArrowLeft'], description: 'Seek Backward', context: 'viewer', category: 'media', icon: 'replay_10' },
  
  // Board Context
  { id: 'board-zoom-in', keys: ['Cmd', 'Plus'], description: 'Board Zoom In', context: 'board', category: 'view', icon: 'zoom_in' },
  { id: 'board-zoom-out', keys: ['Cmd', 'Minus'], description: 'Board Zoom Out', context: 'board', category: 'view', icon: 'zoom_out' },
  { id: 'board-fit', keys: ['Cmd', '0'], description: 'Fit to View', context: 'board', category: 'view', icon: 'fit_screen' },
  { id: 'board-select', keys: ['V'], description: 'Select Tool', context: 'board', category: 'actions', icon: 'mouse' },
  { id: 'board-pan', keys: ['Space'], description: 'Pan Tool (hold)', context: 'board', category: 'actions', icon: 'pan_tool' },
  
  // Metadata Context
  { id: 'metadata-add', keys: ['Cmd', 'Shift', 'M'], description: 'Add Metadata Field', context: 'metadata', category: 'editing', icon: 'add_circle' },
  { id: 'metadata-remove', keys: ['Cmd', 'Delete'], description: 'Remove Metadata Field', context: 'metadata', category: 'editing', icon: 'remove_circle' },
  { id: 'metadata-next', keys: ['Tab'], description: 'Next Field', context: 'metadata', category: 'navigation', icon: 'arrow_forward' },
  { id: 'metadata-prev', keys: ['Shift', 'Tab'], description: 'Previous Field', context: 'metadata', category: 'navigation', icon: 'arrow_back' },
];

/**
 * Category display configuration
 */
export const CATEGORY_CONFIG: Record<ShortcutCategory, { label: string; icon: string; order: number }> = {
  navigation: { label: 'Navigation', icon: 'navigation', order: 1 },
  editing: { label: 'Editing', icon: 'edit', order: 2 },
  selection: { label: 'Selection', icon: 'check_box', order: 3 },
  view: { label: 'View', icon: 'visibility', order: 4 },
  actions: { label: 'Actions', icon: 'bolt', order: 5 },
  media: { label: 'Media Controls', icon: 'play_circle', order: 6 },
};

/**
 * Context display configuration
 */
export const CONTEXT_CONFIG: Record<ShortcutContext, { label: string; description: string }> = {
  global: { label: 'Global', description: 'Available in all contexts' },
  collections: { label: 'Collections', description: 'Structure and organization view' },
  board: { label: 'Board', description: 'Visual canvas and layout view' },
  viewer: { label: 'Viewer', description: 'Image and media viewer' },
  metadata: { label: 'Metadata', description: 'Metadata editing view' },
};

/**
 * Check if the current platform is macOS
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Format shortcut keys for display
 * Converts key names to platform-appropriate symbols
 * 
 * @example
 * formatShortcut(['Cmd', 'K']) // Returns '⌘K' on Mac, 'Ctrl+K' on Windows
 * formatShortcut(['Cmd', 'Shift', 'Z']) // Returns '⌘⇧Z' on Mac, 'Ctrl+Shift+Z' on Windows
 */
export function formatShortcut(keys: string[]): string {
  const mac = isMac();
  
  const keyMap: Record<string, string> = {
    Cmd: mac ? '⌘' : 'Ctrl',
    Command: mac ? '⌘' : 'Ctrl',
    Ctrl: mac ? '⌃' : 'Ctrl',
    Control: mac ? '⌃' : 'Ctrl',
    Alt: mac ? '⌥' : 'Alt',
    Option: mac ? '⌥' : 'Alt',
    Shift: mac ? '⇧' : 'Shift',
    Enter: '↵',
    Return: '↵',
    Escape: 'Esc',
    Delete: 'Del',
    Backspace: '⌫',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Home: 'Home',
    End: 'End',
    Tab: '⇥',
    Space: 'Space',
    Plus: '+',
    Minus: '-',
    Click: 'Click',
  };

  const formatted = keys.map(key => keyMap[key] || key);
  return formatted.join(mac ? '' : '+');
}

/**
 * Get all shortcuts for a specific context
 * Includes global shortcuts plus context-specific ones
 */
export function getShortcutsByContext(context: ShortcutContext): ShortcutDefinition[] {
  if (context === 'global') {
    return SHORTCUTS.filter(s => s.context === 'global');
  }
  return SHORTCUTS.filter(s => s.context === 'global' || s.context === context);
}

/**
 * Get shortcuts filtered by category
 */
export function getShortcutsByCategory(
  shortcuts: ShortcutDefinition[],
  category: ShortcutCategory
): ShortcutDefinition[] {
  return shortcuts.filter(s => s.category === category);
}

/**
 * Search shortcuts by query string
 * Matches against description, keys, and id
 */
export function searchShortcuts(query: string): ShortcutDefinition[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return SHORTCUTS;

  return SHORTCUTS.filter(shortcut => {
    // Search in description
    if (shortcut.description.toLowerCase().includes(normalizedQuery)) return true;
    // Search in id
    if (shortcut.id.toLowerCase().includes(normalizedQuery)) return true;
    // Search in keys
    if (shortcut.keys.some(k => k.toLowerCase().includes(normalizedQuery))) return true;
    // Search in category
    if (shortcut.category.toLowerCase().includes(normalizedQuery)) return true;
    return false;
  });
}

/**
 * Group shortcuts by category for display
 */
export function groupShortcutsByCategory(
  shortcuts: ShortcutDefinition[]
): Record<ShortcutCategory, ShortcutDefinition[]> {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<ShortcutCategory, ShortcutDefinition[]>);
}

/**
 * Get all available contexts (for filtering)
 */
export function getAvailableContexts(): ShortcutContext[] {
  return ['global', 'collections', 'board', 'viewer', 'metadata'];
}

/**
 * Get category label
 */
export function getCategoryLabel(category: ShortcutCategory): string {
  return CATEGORY_CONFIG[category]?.label || category;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: ShortcutCategory): string {
  return CATEGORY_CONFIG[category]?.icon || 'keyboard';
}

/**
 * Get context label
 */
export function getContextLabel(context: ShortcutContext): string {
  return CONTEXT_CONFIG[context]?.label || context;
}

/**
 * Compare shortcuts for sorting (by category order, then description)
 */
export function compareShortcuts(a: ShortcutDefinition, b: ShortcutDefinition): number {
  const orderA = CATEGORY_CONFIG[a.category]?.order || 99;
  const orderB = CATEGORY_CONFIG[b.category]?.order || 99;
  
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  
  return a.description.localeCompare(b.description);
}

/**
 * Get a compact cheat sheet format for printing
 */
export function getCheatSheetData(context: ShortcutContext = 'global'): {
  context: string;
  generatedAt: string;
  categories: Array<{
    name: string;
    shortcuts: Array<{ keys: string; description: string }>;
  }>;
} {
  const shortcuts = getShortcutsByContext(context);
  const grouped = groupShortcutsByCategory(shortcuts);
  
  // Sort categories by order
  const sortedCategories = (Object.keys(grouped) as ShortcutCategory[])
    .sort((a, b) => (CATEGORY_CONFIG[a]?.order || 99) - (CATEGORY_CONFIG[b]?.order || 99));
  
  return {
    context: getContextLabel(context),
    generatedAt: new Date().toLocaleDateString(),
    categories: sortedCategories.map(cat => ({
      name: getCategoryLabel(cat),
      shortcuts: grouped[cat]
        .sort((a, b) => a.description.localeCompare(b.description))
        .map(s => ({
          keys: formatShortcut(s.keys),
          description: s.description,
        })),
    })),
  };
}

export default SHORTCUTS;
