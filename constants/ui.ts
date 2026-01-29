/**
 * UI Constants
 * 
 * User interface, layout, and design system constants.
 */

// ============================================================================
// Responsive Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  /** Mobile portrait */
  xs: 320,
  /** Mobile landscape */
  sm: 640,
  /** Tablet portrait */
  md: 768,
  /** Tablet landscape / Small desktop */
  lg: 1024,
  /** Desktop */
  xl: 1280,
  /** Large desktop */
  '2xl': 1536
} as const;

/**
 * Tailwind-compatible breakpoint strings for use in className
 */
export const BP = {
  xs: 'xs:',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:'
} as const;

/**
 * Check if viewport matches a breakpoint
 */
export function isMinBreakpoint(breakpoint: keyof typeof BREAKPOINTS | number): boolean {
  if (typeof window === 'undefined') return false;
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return window.innerWidth >= width;
}

/**
 * Check if viewport is below a breakpoint
 */
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

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
} as const;

// ============================================================================
// Touch Targets & Interaction
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
  // Animation timing
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing functions
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
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Get animation duration based on user preference
   */
  getDuration: (normalDuration: number): number => {
    if (typeof window === 'undefined') return normalDuration;
    return REDUCED_MOTION.prefersReducedMotion() ? 0 : normalDuration;
  },

  /**
   * Animation durations used throughout the app
   */
  DURATIONS: {
    fast: 150,
    normal: 300,
    slow: 500,
    stagger: 50
  },

  /**
   * CSS classes for transitions respecting motion preferences
   */
  TRANSITIONS: {
    default: 'transition-all motion-reduce:transition-none',
    colors: 'transition-colors motion-reduce:transition-none',
    transform: 'transition-transform motion-reduce:transition-none',
    opacity: 'transition-opacity motion-reduce:transition-none'
  },

  /**
   * Easing curves for consistent animations
   */
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