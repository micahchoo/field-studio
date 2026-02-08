/**
 * Design System - Comprehensive Consistency Framework
 * Ensures navigational, positional, hierarchical, experiential, visual, and tactile consistency
 */

// ============================================================================
// VISUAL CONSISTENCY - Colors, Typography, Elevation
// ============================================================================

export const COLORS = {
  // Neobrutalist Primary Palette
  primary: {
    50: '#FFF8E7',  // cream
    100: '#E6EDFF',
    200: '#99BBFF',
    300: '#4D88FF',
    400: '#0055FF',
    500: '#0055FF', // nb-blue (main brand)
    600: '#0044CC',
    700: '#003399',
    800: '#002266',
    900: '#001133',
  },

  // Semantic Colors (bright neobrutalist)
  semantic: {
    success: '#00CC66', // nb-green
    warning: '#FF8800', // nb-orange
    error: '#FF3333',   // nb-red
    info: '#0055FF',    // nb-blue
    neutral: '#000000',
  },

  // Background Hierarchy
  background: {
    primary: '#FFFFFF',
    secondary: '#FFF8E7', // cream
    tertiary: '#FFF8E7',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Text Hierarchy
  text: {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#666666',
    disabled: '#999999',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    default: '#000000',
    focus: '#0055FF',
    error: '#FF3333',
    success: '#00CC66',
  },

  // Field Mode (High Contrast)
  field: {
    background: '#000000',
    foreground: '#FFE500',
    accent: '#FFE500',
    border: '#FFE500',
  },

  // IIIF Resource Type Colors (bright neobrutalist)
  resource: {
    Collection: '#8833FF', // nb-purple
    Manifest: '#0055FF',   // nb-blue
    Canvas: '#00CC66',     // nb-green
    Range: '#FF8800',      // nb-orange
    Annotation: '#FF66B2', // nb-pink
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: '"Space Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

export const ELEVATION = {
  none: 'none',
  sm: '2px 2px 0 0 #000',   // brutal-sm
  base: '4px 4px 0 0 #000', // brutal
  md: '4px 4px 0 0 #000',   // brutal
  lg: '6px 6px 0 0 #000',   // brutal-lg
  xl: '6px 6px 0 0 #000',   // brutal-lg
  '2xl': '8px 8px 0 0 #000',
} as const;

// ============================================================================
// POSITIONAL CONSISTENCY - Spacing, Layout, Sizing
// ============================================================================

export const SPACING = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;

export const LAYOUT = {
  // Standard 3-panel layout dimensions
  sidebar: {
    default: '240px',
    min: '180px',
    max: '400px',
  },
  inspector: {
    default: '320px',
    min: '280px',
    max: '480px',
  },
  statusBar: {
    height: '24px',
  },
  header: {
    height: '56px',
  },

  // Breakpoints
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px',
    wide: '1536px',
  },

  // Content widths
  contentWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  },

  // Border radius - all zero for neobrutalist
  borderRadius: {
    none: '0',
    sm: '0',
    base: '0',
    md: '0',
    lg: '0',
    xl: '0',
    '2xl': '0',
    full: '0',
  },
} as const;

// ============================================================================
// TACTILE CONSISTENCY - Touch Targets, Interactive Elements
// ============================================================================

export const TOUCH_TARGETS = {
  // Minimum touch target sizes
  minimum: {
    width: '44px',
    height: '44px',
  },

  // Field mode (larger for gloves)
  field: {
    width: '56px',
    height: '56px',
  },

  // Button sizes
  button: {
    sm: { height: '32px', padding: '0 12px' },
    base: { height: '40px', padding: '0 16px' },
    lg: { height: '48px', padding: '0 24px' },
    xl: { height: '56px', padding: '0 32px' }, // Field mode
  },

  // Icon button sizes
  iconButton: {
    sm: '32px',
    base: '40px',
    lg: '48px',
    xl: '56px', // Field mode
  },

  // Input field sizes
  input: {
    height: {
      sm: '32px',
      base: '40px',
      lg: '48px',
    },
    padding: '0 12px',
  },
} as const;

export const INTERACTION = {
  // Animation timing - fast and linear for neobrutalist
  duration: {
    fast: '100ms',
    base: '100ms',
    slow: '150ms',
    slower: '200ms',
  },

  // Easing - linear for neobrutalist (no smooth curves)
  easing: {
    default: 'linear',
    in: 'linear',
    out: 'linear',
    inOut: 'linear',
  },

  // Hover/focus states - translate-based press feedback
  states: {
    hover: {
      opacity: 1,
      scale: 1,
    },
    active: {
      opacity: 1,
      scale: 1,
    },
    focus: {
      ring: '3px',
      ringColor: COLORS.border.focus,
      ringOffset: '1px',
    },
  },
} as const;

// ============================================================================
// NAVIGATIONAL CONSISTENCY - Routes, Breadcrumbs, Navigation Patterns
// ============================================================================

export const NAVIGATION = {
  // App modes with consistent ordering
  modes: [
    { id: 'archive', label: 'Archive', icon: '📦', shortcut: 'Cmd+1' },
    { id: 'collections', label: 'Collections', icon: '🗂️', shortcut: 'Cmd+2' },
    { id: 'metadata', label: 'Metadata', icon: '📊', shortcut: 'Cmd+3' },
    { id: 'boards', label: 'Boards', icon: '🎨', shortcut: 'Cmd+4' },
    { id: 'viewer', label: 'Viewer', icon: '🔍', shortcut: 'Cmd+5' },
    { id: 'search', label: 'Search', icon: '🔎', shortcut: 'Cmd+6' },
  ] as const,

  // Navigation hierarchy patterns
  hierarchy: {
    back: { icon: '←', label: 'Back', position: 'top-left' },
    breadcrumb: { separator: '>', maxVisible: 5 },
    tabs: { orientation: 'horizontal', position: 'below-header' },
  },

  // Consistent action placement
  actions: {
    primary: 'top-right',    // Save, Export, Share
    secondary: 'top-center', // View toggles, filters
    tertiary: 'contextual',  // Row actions, inline edits
  },
} as const;

// ============================================================================
// HIERARCHICAL CONSISTENCY - IIIF Resource Hierarchy, Visual Nesting
// ============================================================================

export const HIERARCHY = {
  // IIIF type hierarchy (for validation and UI display)
  iiifTypes: {
    Collection: {
      level: 0,
      canContain: ['Collection', 'Manifest'],
      icon: '📚',
      color: COLORS.resource.Collection,
    },
    Manifest: {
      level: 1,
      canContain: ['Canvas', 'Range'],
      icon: '📄',
      color: COLORS.resource.Manifest,
    },
    Canvas: {
      level: 2,
      canContain: ['AnnotationPage', 'Annotation'],
      icon: '🖼️',
      color: COLORS.resource.Canvas,
    },
    Range: {
      level: 2,
      canContain: ['Canvas', 'Range'],
      icon: '📑',
      color: COLORS.resource.Range,
    },
    AnnotationPage: {
      level: 3,
      canContain: ['Annotation'],
      icon: '📝',
      color: COLORS.resource.Annotation,
    },
    Annotation: {
      level: 4,
      canContain: [],
      icon: '🏷️',
      color: COLORS.resource.Annotation,
    },
  },

  // Visual nesting indicators
  indentation: {
    perLevel: SPACING[4], // 16px per hierarchy level
    maxLevels: 6,
    indicator: 'border-left', // Visual connection line
  },

  // Tree view styling
  tree: {
    nodeHeight: '32px',
    expandIcon: {
      collapsed: '▸',
      expanded: '▾',
    },
    connecting: {
      style: 'dashed',
      color: COLORS.border.default,
    },
  },
} as const;

// ============================================================================
// EXPERIENTIAL CONSISTENCY - Feedback, States, Messaging
// ============================================================================

export const FEEDBACK = {
  // Toast notification timing
  toast: {
    duration: {
      success: 3000,
      info: 4000,
      warning: 5000,
      error: 6000,
    },
    position: 'bottom-right',
    maxVisible: 3,
  },

  // Loading states
  loading: {
    spinner: {
      size: { sm: '16px', base: '24px', lg: '32px' },
      color: COLORS.primary[500],
    },
    skeleton: {
      baseColor: COLORS.background.tertiary,
      shimmerColor: COLORS.background.secondary,
      animation: 'pulse 2s infinite',
    },
    progress: {
      height: '4px',
      color: COLORS.primary[500],
      backgroundColor: COLORS.background.tertiary,
    },
  },

  // Empty states
  empty: {
    icon: { size: '48px', color: COLORS.text.tertiary },
    title: { size: TYPOGRAPHY.fontSize.lg, color: COLORS.text.secondary },
    message: { size: TYPOGRAPHY.fontSize.base, color: COLORS.text.tertiary },
    action: { variant: 'primary', size: 'base' },
  },

  // Status indicators
  status: {
    indicator: {
      size: '8px',
      position: 'top-right',
      offset: '-2px',
    },
    colors: {
      online: COLORS.semantic.success,
      offline: COLORS.semantic.error,
      syncing: COLORS.semantic.info,
      warning: COLORS.semantic.warning,
    },
  },

  // Validation feedback
  validation: {
    success: {
      icon: '✓',
      color: COLORS.semantic.success,
      border: `2px solid ${COLORS.border.success}`,
    },
    warning: {
      icon: '⚠',
      color: COLORS.semantic.warning,
      border: `2px solid ${COLORS.semantic.warning}`,
    },
    error: {
      icon: '✗',
      color: COLORS.semantic.error,
      border: `2px solid ${COLORS.border.error}`,
    },
  },
} as const;

// ============================================================================
// COMPONENT PATTERNS - Consistent Component Configurations
// ============================================================================

export const PATTERNS = {
  // Modal dialog - neobrutalist thick borders
  modal: {
    overlay: {
      background: COLORS.background.overlay,
      zIndex: 1000,
    },
    content: {
      maxWidth: '600px',
      padding: SPACING[6],
      borderRadius: LAYOUT.borderRadius.none,
      shadow: ELEVATION.lg,
    },
    header: {
      padding: SPACING[6],
      borderBottom: `4px solid ${COLORS.border.default}`,
    },
    footer: {
      padding: SPACING[6],
      borderTop: `4px solid ${COLORS.border.default}`,
      justifyContent: 'flex-end',
      gap: SPACING[3],
    },
  },

  // Card component - neobrutalist offset shadow
  card: {
    padding: SPACING[4],
    borderRadius: LAYOUT.borderRadius.none,
    border: `2px solid ${COLORS.border.default}`,
    shadow: ELEVATION.base,
    hover: {
      shadow: ELEVATION.lg,
      transform: 'translate(-2px, -2px)',
    },
  },

  // Toolbar - chunky bordered
  toolbar: {
    height: '48px',
    padding: `0 ${SPACING[4]}`,
    background: COLORS.background.secondary,
    borderBottom: `4px solid ${COLORS.border.default}`,
    gap: SPACING[2],
  },

  // Form elements - neobrutalist thick borders, monospace values
  form: {
    label: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: COLORS.text.primary,
      marginBottom: SPACING[1.5],
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      fontFamily: TYPOGRAPHY.fontFamily.mono,
    },
    input: {
      height: TOUCH_TARGETS.input.height.base,
      padding: TOUCH_TARGETS.input.padding,
      border: `2px solid ${COLORS.border.default}`,
      borderRadius: LAYOUT.borderRadius.none,
      fontSize: TYPOGRAPHY.fontSize.base,
      fontFamily: TYPOGRAPHY.fontFamily.mono,
      focus: {
        border: `2px solid ${COLORS.border.focus}`,
        ring: 'none',
      },
    },
    helpText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: COLORS.text.tertiary,
      marginTop: SPACING[1.5],
    },
    error: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: COLORS.semantic.error,
      marginTop: SPACING[1.5],
      fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
  },

  // Share button (for Content State API)
  shareButton: {
    icon: '🔗',
    label: 'SHARE',
    position: 'top-right',
    variant: 'secondary',
    tooltip: 'Generate shareable link',
  },
} as const;

// ============================================================================
// ACCESSIBILITY - WCAG 2.1 AA Compliance Constants
// ============================================================================

export const ACCESSIBILITY = {
  // Focus management - WCAG 2.1 AA compliant focus indicators
  FOCUS: {
    ring: 'ring-2 ring-offset-2',
    lightMode: 'ring-blue-600 ring-offset-white',     // 4.5:1 contrast
    darkMode: 'ring-yellow-400 ring-offset-slate-900', // 4.2:1 contrast
    fieldMode: 'ring-yellow-400 ring-offset-black'
  },

  // Legacy focus config (deprecated, use FOCUS above)
  focus: {
    ring: INTERACTION.states.focus.ring,
    ringColor: INTERACTION.states.focus.ringColor,
    ringOffset: INTERACTION.states.focus.ringOffset,
    visible: 'always', // Always show focus indicators
  },

  // Contrast ratios (WCAG AA)
  contrast: {
    normalText: 4.5,   // 4.5:1 for normal text
    largeText: 3.0,    // 3:1 for large text (18px+)
    uiComponents: 3.0, // 3:1 for UI components
  },

  // Keyboard shortcuts
  shortcuts: {
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
  },

  // ARIA labels
  labels: {
    required: 'required',
    optional: 'optional',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
  },
} as const;

// ============================================================================
// IIIF CONSTANTS - Behavior Values, Viewing Directions
// ============================================================================

export const IIIF = {
  // Complete behavior values (spec §3.4)
  behavior: {
    layout: ['unordered', 'individuals', 'continuous', 'paged'],
    temporal: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat'],
    canvas: ['facing-pages', 'non-paged'],
    collection: ['multi-part', 'together'],
    range: ['sequence', 'thumbnail-nav', 'no-nav'],
    misc: ['hidden'],
  } as const,

  // Viewing directions (spec §3.5)
  viewingDirection: [
    'left-to-right',
    'right-to-left',
    'top-to-bottom',
    'bottom-to-top',
  ] as const,

  // Motivation types
  motivation: [
    'painting',
    'supplementing',
    'commenting',
    'tagging',
    'linking',
    'identifying',
    'describing',
    'highlighting',
    'bookmarking',
    'contentState',
  ] as const,

  // TimeMode for AV content (spec §9.5)
  timeMode: ['trim', 'scale', 'loop'] as const,

  // Image API required properties
  imageService: {
    context: 'http://iiif.io/api/image/3/context.json',
    protocol: 'http://iiif.io/api/image',
    type: 'ImageService3',
    profile: 'level2',
  } as const,

  // Presentation API context
  presentationContext: 'http://iiif.io/api/presentation/3/context.json',
} as const;

// ============================================================================
// CONTEXTUAL TOKENS - Semantic UI Contexts & Microcopy
// ============================================================================

export const CONTEXTUAL_TOKENS = {
  // Semantic contexts for UI states
  contexts: {
    editing: {
      border: COLORS.semantic.info,
      background: COLORS.primary[50],
      icon: '✏️',
      microcopy: 'Editing mode — changes are pending'
    },
    validating: {
      border: COLORS.semantic.warning,
      background: `${COLORS.semantic.warning}20`, // 20% opacity
      icon: '⚡',
      microcopy: 'Validating…'
    },
    archived: {
      opacity: 0.6,
      filter: 'grayscale(0.8)',
      icon: '📦',
      microcopy: 'Archived — read‑only'
    },
    fieldMode: {
      contrast: COLORS.field.foreground,
      touchTarget: TOUCH_TARGETS.field,
      icon: '🌄',
      microcopy: 'Field mode — high contrast, large touch targets'
    },
    selected: {
      border: COLORS.primary[500],
      background: COLORS.primary[50],
      icon: '⭐',
      microcopy: 'Selected'
    },
    error: {
      border: COLORS.semantic.error,
      background: `${COLORS.semantic.error}10`,
      icon: '🚨',
      microcopy: 'Error — needs attention'
    },
    success: {
      border: COLORS.semantic.success,
      background: `${COLORS.semantic.success}10`,
      icon: '✅',
      microcopy: 'Success — all good'
    }
  },

  // Microcopy templates (will be merged with i18n system)
  microcopy: {
    emptyState: (resourceType: string) => `No ${resourceType} selected. Click + to add.`,
    validationHint: (issue: { suggestion: string }) => `Fix: ${issue.suggestion}`,
    progress: (current: number, total: number) => `Processing ${current} of ${total}…`,
    saveStatus: (status: 'saved' | 'saving' | 'error') => {
      const map = {
        saved: 'All changes saved',
        saving: 'Saving…',
        error: 'Failed to save'
      };
      return map[status];
    },
    resourceType: (type: keyof typeof HIERARCHY.iiifTypes) => {
      const config = HIERARCHY.iiifTypes[type];
      const descriptions: Record<string, string> = {
        Collection: 'a group of manifests or sub-collections',
        Manifest: 'a single item with one or more canvases',
        Canvas: 'a single page or surface',
        Range: 'a logical section spanning canvases',
        AnnotationPage: 'a set of annotations on a canvas',
        Annotation: 'a single annotation target',
      };
      return `${config.icon} ${type} — ${descriptions[type] || 'IIIF resource'}`;
    }
  },

  // Helper functions for contextual styling
  getContextStyle(contextKey: keyof typeof CONTEXTUAL_TOKENS['contexts']) {
    return this.contexts[contextKey];
  },
  getMicrocopy(key: keyof typeof CONTEXTUAL_TOKENS['microcopy'], ...args: any[]) {
    const fn = this.microcopy[key];
    return typeof fn === 'function' ? fn(...args) : fn;
  }
} as const;

// ============================================================================
// EXPORT UTILITY FUNCTIONS
// ============================================================================

export const designSystem = {
  // Get color with fallback
  getColor: (path: string, fallback = COLORS.text.primary): string => {
    const keys = path.split('.');
    let value: any = COLORS;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return fallback;
    }
    return value;
  },

  // Get spacing value
  getSpacing: (...values: Array<keyof typeof SPACING>): string => {
    return values.map(v => SPACING[v]).join(' ');
  },

  // Build CSS transition
  transition: (property: string, duration: keyof typeof INTERACTION.duration = 'base'): string => {
    return `${property} ${INTERACTION.duration[duration]} ${INTERACTION.easing.default}`;
  },

  // Check if field mode
  isFieldMode: (settings: { fieldMode: boolean }) => settings.fieldMode,

  // Get touch target size
  getTouchTarget: (fieldMode: boolean, size: 'sm' | 'base' | 'lg' = 'base') => {
    if (fieldMode) return TOUCH_TARGETS.field;
    return { width: TOUCH_TARGETS.iconButton[size], height: TOUCH_TARGETS.iconButton[size] };
  },

  // Get IIIF resource styling
  getResourceStyle: (type: keyof typeof HIERARCHY.iiifTypes) => {
    const config = HIERARCHY.iiifTypes[type];
    return {
      color: config.color,
      icon: config.icon,
      level: config.level,
    };
  },
} as const;
