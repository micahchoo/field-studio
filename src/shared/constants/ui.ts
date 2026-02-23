// Pure TypeScript — no Svelte-specific conversion

/**
 * UI Constants
 *
 * User interface, layout, and design system constants.
 */

// ============================================================================
// Responsive Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export const BP = {
  xs: 'xs:',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:'
} as const;

export function isMinBreakpoint(breakpoint: keyof typeof BREAKPOINTS | number): boolean {
  if (typeof window === 'undefined') return false;
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return window.innerWidth >= width;
}

export function isMaxBreakpoint(breakpoint: keyof typeof BREAKPOINTS | number): boolean {
  if (typeof window === 'undefined') return false;
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return window.innerWidth < width;
}

// ============================================================================
// Spacing & Layout
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
  filmstrip: {
    default: '288px',
  },
  statusBar: {
    height: '28px',
  },
  header: {
    height: '64px',
    compactHeight: '56px',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
} as const;

// ============================================================================
// Touch Targets & Interaction
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
  input: {
    height: { sm: '32px', base: '40px', lg: '48px' },
    padding: '0 12px',
  },
} as const;

export const INTERACTION = {
  duration: { fast: '150ms', base: '200ms', slow: '300ms', slower: '500ms' },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// Reduced Motion Preferences
// ============================================================================

export const REDUCED_MOTION = {
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  getDuration: (normalDuration: number): number => {
    if (typeof window === 'undefined') return normalDuration;
    return REDUCED_MOTION.prefersReducedMotion() ? 0 : normalDuration;
  },

  DURATIONS: { fast: 150, normal: 300, slow: 500, stagger: 50 },

  TRANSITIONS: {
    default: 'transition-all motion-reduce:transition-none',
    colors: 'transition-colors motion-reduce:transition-none',
    transform: 'transition-transform motion-reduce:transition-none',
    opacity: 'transition-opacity motion-reduce:transition-none'
  },

  EASING: {
    default: 'ease-out',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

// ============================================================================
// Empty States
// ============================================================================

export const EMPTY_STATES = {
  NO_ITEMS: {
    icon: 'inbox',
    title: 'No Items',
    message: 'This area is empty. Add items to get started.',
    actionLabel: 'Add Item'
  },
  NO_RESULTS: {
    icon: 'search_off',
    title: 'No Results',
    message: 'No items match your search. Try different terms or filters.',
    actionLabel: 'Clear Filters'
  },
  NO_SELECTION: {
    icon: 'touch_app',
    title: 'Nothing Selected',
    message: 'Select an item from the list to view details and edit.',
    actionLabel: undefined
  },
  ERROR: {
    icon: 'error_outline',
    title: 'Something Went Wrong',
    message: 'We encountered an error. Please try again or contact support.',
    actionLabel: 'Retry'
  },
  LOADING: {
    icon: 'hourglass_empty',
    title: 'Loading...',
    message: 'Please wait while we load your data.',
    actionLabel: undefined
  },
  NO_DATA: {
    icon: 'cloud_upload',
    title: 'No Data Yet',
    message: 'Import files or create new items to populate this view.',
    actionLabel: 'Import'
  },
  EMPTY_CANVAS: {
    icon: 'crop_free',
    title: 'Empty Canvas',
    message: 'Drag items here or use the toolbar to add content.',
    actionLabel: 'Add Content'
  }
} as const;

// ============================================================================
// Loading States
// ============================================================================

export const LOADING_STATES = {
  SKELETON: {
    pulseClass: 'animate-pulse motion-reduce:animate-none',
    bgClass: 'bg-slate-200 dark:bg-slate-700',
    roundedClass: 'rounded-md'
  },
  SPINNER: {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  },
  DEBOUNCE_MS: 200,
  TIMEOUT_MS: 30000
} as const;
