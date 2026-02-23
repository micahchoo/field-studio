/**
 * Design System - Comprehensive Consistency Framework
 * Ensures navigational, positional, hierarchical, experiential, visual, and tactile consistency
 *
 * FRAMEWORK-AGNOSTIC: Pure TypeScript constants, no React/Svelte dependencies.
 * Copied verbatim from src/shared/config/design-tokens.ts
 */

// ============================================================================
// VISUAL CONSISTENCY - Colors, Typography, Elevation
// ============================================================================

export const COLORS = {
  primary: {
    50: '#FFF8E7',
    100: '#E6EDFF',
    200: '#99BBFF',
    300: '#4D88FF',
    400: '#0055FF',
    500: '#0055FF',
    600: '#0044CC',
    700: '#003399',
    800: '#002266',
    900: '#001133',
  },
  semantic: {
    success: '#00CC66',
    warning: '#FF8800',
    error: '#FF3333',
    info: '#0055FF',
    neutral: '#000000',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#FFF8E7',
    tertiary: '#FFF8E7',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  text: {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#666666',
    disabled: '#999999',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#000000',
    focus: '#0055FF',
    error: '#FF3333',
    success: '#00CC66',
  },
  field: {
    background: '#000000',
    foreground: '#FFE500',
    accent: '#FFE500',
    border: '#FFE500',
  },
  resource: {
    Collection: '#8833FF',
    Manifest: '#0055FF',
    Canvas: '#00CC66',
    Range: '#FF8800',
    Annotation: '#FF66B2',
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: '"Space Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
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
  sm: '2px 2px 0 0 #000',
  base: '4px 4px 0 0 #000',
  md: '4px 4px 0 0 #000',
  lg: '6px 6px 0 0 #000',
  xl: '6px 6px 0 0 #000',
  '2xl': '8px 8px 0 0 #000',
} as const;

// ============================================================================
// POSITIONAL CONSISTENCY - Spacing, Layout, Sizing
// ============================================================================

export const SPACING = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const LAYOUT = {
  sidebar: { default: '240px', min: '180px', max: '400px' },
  inspector: { default: '320px', min: '280px', max: '480px' },
  statusBar: { height: '24px' },
  header: { height: '56px' },
  breakpoints: { mobile: '768px', tablet: '1024px', desktop: '1280px', wide: '1536px' },
  contentWidth: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', full: '100%' },
  borderRadius: { none: '0', sm: '0', base: '0', md: '0', lg: '0', xl: '0', '2xl': '0', full: '0' },
} as const;

// ============================================================================
// TACTILE CONSISTENCY - Touch Targets, Interactive Elements
// ============================================================================

export const TOUCH_TARGETS = {
  minimum: { width: '44px', height: '44px' },
  field: { width: '56px', height: '56px' },
  button: {
    sm: { height: '32px', padding: '0 12px' },
    base: { height: '40px', padding: '0 16px' },
    lg: { height: '48px', padding: '0 24px' },
    xl: { height: '56px', padding: '0 32px' },
  },
  iconButton: { sm: '32px', base: '40px', lg: '48px', xl: '56px' },
  input: { height: { sm: '32px', base: '40px', lg: '48px' }, padding: '0 12px' },
} as const;

export const INTERACTION = {
  duration: { fast: '100ms', base: '100ms', slow: '150ms', slower: '200ms' },
  easing: { default: 'linear', in: 'linear', out: 'linear', inOut: 'linear' },
  states: {
    hover: { opacity: 1, scale: 1 },
    active: { opacity: 1, scale: 1 },
    focus: { ring: '3px', ringColor: COLORS.border.focus, ringOffset: '1px' },
  },
} as const;

// ============================================================================
// NAVIGATIONAL CONSISTENCY
// ============================================================================

export const NAVIGATION = {
  modes: [
    { id: 'archive', label: 'Archive', icon: '📦', shortcut: 'Cmd+1' },
    { id: 'collections', label: 'Collections', icon: '🗂️', shortcut: 'Cmd+2' },
    { id: 'metadata', label: 'Metadata', icon: '📊', shortcut: 'Cmd+3' },
    { id: 'boards', label: 'Boards', icon: '🎨', shortcut: 'Cmd+4' },
    { id: 'viewer', label: 'Viewer', icon: '🔍', shortcut: 'Cmd+5' },
    { id: 'search', label: 'Search', icon: '🔎', shortcut: 'Cmd+6' },
  ] as const,
  hierarchy: { back: { icon: '←', label: 'Back', position: 'top-left' }, breadcrumb: { separator: '>', maxVisible: 5 }, tabs: { orientation: 'horizontal', position: 'below-header' } },
  actions: { primary: 'top-right', secondary: 'top-center', tertiary: 'contextual' },
} as const;

// ============================================================================
// HIERARCHICAL CONSISTENCY
// ============================================================================

export const HIERARCHY = {
  iiifTypes: {
    Collection: { level: 0, canContain: ['Collection', 'Manifest'], icon: '📚', color: COLORS.resource.Collection },
    Manifest: { level: 1, canContain: ['Canvas', 'Range'], icon: '📄', color: COLORS.resource.Manifest },
    Canvas: { level: 2, canContain: ['AnnotationPage', 'Annotation'], icon: '🖼️', color: COLORS.resource.Canvas },
    Range: { level: 2, canContain: ['Canvas', 'Range'], icon: '📑', color: COLORS.resource.Range },
    AnnotationPage: { level: 3, canContain: ['Annotation'], icon: '📝', color: COLORS.resource.Annotation },
    Annotation: { level: 4, canContain: [], icon: '🏷️', color: COLORS.resource.Annotation },
  },
  indentation: { perLevel: SPACING[4], maxLevels: 6, indicator: 'border-left' },
  tree: { nodeHeight: '32px', expandIcon: { collapsed: '▸', expanded: '▾' }, connecting: { style: 'dashed', color: COLORS.border.default } },
} as const;

// ============================================================================
// EXPERIENTIAL CONSISTENCY
// ============================================================================

export const FEEDBACK = {
  toast: { duration: { success: 3000, info: 4000, warning: 5000, error: 6000 }, position: 'bottom-right', maxVisible: 3 },
  loading: {
    spinner: { size: { sm: '16px', base: '24px', lg: '32px' }, color: COLORS.primary[500] },
    skeleton: { baseColor: COLORS.background.tertiary, shimmerColor: COLORS.background.secondary, animation: 'pulse 2s infinite' },
    progress: { height: '4px', color: COLORS.primary[500], backgroundColor: COLORS.background.tertiary },
  },
  empty: {
    icon: { size: '48px', color: COLORS.text.tertiary },
    title: { size: TYPOGRAPHY.fontSize.lg, color: COLORS.text.secondary },
    message: { size: TYPOGRAPHY.fontSize.base, color: COLORS.text.tertiary },
    action: { variant: 'primary', size: 'base' },
  },
  status: { indicator: { size: '8px', position: 'top-right', offset: '-2px' }, colors: { online: COLORS.semantic.success, offline: COLORS.semantic.error, syncing: COLORS.semantic.info, warning: COLORS.semantic.warning } },
  validation: {
    success: { icon: '✓', color: COLORS.semantic.success, border: `2px solid ${COLORS.border.success}` },
    warning: { icon: '⚠', color: COLORS.semantic.warning, border: `2px solid ${COLORS.semantic.warning}` },
    error: { icon: '✗', color: COLORS.semantic.error, border: `2px solid ${COLORS.border.error}` },
  },
} as const;

// ============================================================================
// COMPONENT PATTERNS
// ============================================================================

export const PATTERNS = {
  modal: {
    overlay: { background: COLORS.background.overlay, zIndex: 1000 },
    content: { maxWidth: '600px', padding: SPACING[6], borderRadius: LAYOUT.borderRadius.none, shadow: ELEVATION.lg },
    header: { padding: SPACING[6], borderBottom: `4px solid ${COLORS.border.default}` },
    footer: { padding: SPACING[6], borderTop: `4px solid ${COLORS.border.default}`, justifyContent: 'flex-end', gap: SPACING[3] },
  },
  card: {
    padding: SPACING[4],
    borderRadius: LAYOUT.borderRadius.none,
    border: `2px solid ${COLORS.border.default}`,
    shadow: ELEVATION.base,
    hover: { shadow: ELEVATION.lg, transform: 'translate(-2px, -2px)' },
  },
  toolbar: { height: '48px', padding: `0 ${SPACING[4]}`, background: COLORS.background.secondary, borderBottom: `4px solid ${COLORS.border.default}`, gap: SPACING[2] },
  form: {
    label: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.text.primary, marginBottom: SPACING[1.5], textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: TYPOGRAPHY.fontFamily.mono },
    input: { height: TOUCH_TARGETS.input.height.base, padding: TOUCH_TARGETS.input.padding, border: `2px solid ${COLORS.border.default}`, borderRadius: LAYOUT.borderRadius.none, fontSize: TYPOGRAPHY.fontSize.base, fontFamily: TYPOGRAPHY.fontFamily.mono, focus: { border: `2px solid ${COLORS.border.focus}`, ring: 'none' } },
    helpText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.tertiary, marginTop: SPACING[1.5] },
    error: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.semantic.error, marginTop: SPACING[1.5], fontWeight: TYPOGRAPHY.fontWeight.bold },
  },
  shareButton: { icon: '🔗', label: 'SHARE', position: 'top-right', variant: 'secondary', tooltip: 'Generate shareable link' },
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const ACCESSIBILITY = {
  FOCUS: {
    ring: 'ring-2 ring-offset-2',
    lightMode: 'ring-blue-600 ring-offset-white',
    darkMode: 'ring-yellow-400 ring-offset-slate-900',
    fieldMode: 'ring-yellow-400 ring-offset-black',
  },
  focus: { ring: INTERACTION.states.focus.ring, ringColor: INTERACTION.states.focus.ringColor, ringOffset: INTERACTION.states.focus.ringOffset, visible: 'always' },
  contrast: { normalText: 4.5, largeText: 3.0, uiComponents: 3.0 },
  shortcuts: {
    global: { 'Cmd+K': 'Open command palette', 'Cmd+S': 'Save project', 'Cmd+Z': 'Undo', 'Cmd+Shift+Z': 'Redo', 'Cmd+B': 'Toggle sidebar', 'Cmd+I': 'Toggle inspector', '?': 'Show keyboard shortcuts', 'Esc': 'Close modal/cancel' },
    navigation: { 'Cmd+1': 'Archive mode', 'Cmd+2': 'Collections mode', 'Cmd+3': 'Metadata mode', 'Cmd+4': 'Boards mode', 'Cmd+5': 'Viewer mode', 'Cmd+6': 'Search mode' },
  },
  labels: { required: 'required', optional: 'optional', loading: 'Loading...', error: 'Error', success: 'Success', warning: 'Warning' },
} as const;

// ============================================================================
// IIIF CONSTANTS
// ============================================================================

export const IIIF = {
  behavior: { layout: ['unordered', 'individuals', 'continuous', 'paged'], temporal: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat'], canvas: ['facing-pages', 'non-paged'], collection: ['multi-part', 'together'], range: ['sequence', 'thumbnail-nav', 'no-nav'], misc: ['hidden'] } as const,
  viewingDirection: ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'] as const,
  motivation: ['painting', 'supplementing', 'commenting', 'tagging', 'linking', 'identifying', 'describing', 'highlighting', 'bookmarking', 'contentState'] as const,
  timeMode: ['trim', 'scale', 'loop'] as const,
  imageService: { context: 'http://iiif.io/api/image/3/context.json', protocol: 'http://iiif.io/api/image', type: 'ImageService3', profile: 'level2' } as const,
  presentationContext: 'http://iiif.io/api/presentation/3/context.json',
} as const;

// ============================================================================
// EXPORT UTILITY FUNCTIONS
// ============================================================================

export const designSystem = {
  getColor: (path: string, fallback = COLORS.text.primary): string => {
    const keys = path.split('.');
    let value: unknown = COLORS;
    for (const key of keys) {
      value = (value as Record<string, unknown>)?.[key];
      if (value === undefined) return fallback;
    }
    return value as string;
  },
  getSpacing: (...values: Array<keyof typeof SPACING>): string => {
    return values.map(v => SPACING[v]).join(' ');
  },
  transition: (property: string, duration: keyof typeof INTERACTION.duration = 'base'): string => {
    return `${property} ${INTERACTION.duration[duration]} ${INTERACTION.easing.default}`;
  },
  isFieldMode: (settings: { fieldMode: boolean }) => settings.fieldMode,
  getTouchTarget: (fieldMode: boolean, size: 'sm' | 'base' | 'lg' = 'base') => {
    if (fieldMode) return TOUCH_TARGETS.field;
    return { width: TOUCH_TARGETS.iconButton[size], height: TOUCH_TARGETS.iconButton[size] };
  },
  getResourceStyle: (type: keyof typeof HIERARCHY.iiifTypes) => {
    const config = HIERARCHY.iiifTypes[type];
    return { color: config.color, icon: config.icon, level: config.level };
  },
} as const;
