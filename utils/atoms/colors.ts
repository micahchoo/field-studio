/**
 * Color and theme constants
 * Zero dependencies
 */

/**
 * Status color definitions for light/dark modes
 */
export const STATUS_COLORS = {
  light: {
    success: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      full: 'border-green-200 bg-green-50',
    },
    warning: {
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      full: 'border-yellow-200 bg-yellow-50',
    },
    error: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      full: 'border-red-200 bg-red-50',
    },
    info: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      full: 'border-blue-200 bg-blue-50',
    },
  },
  dark: {
    success: {
      text: 'text-green-400',
      bg: 'bg-green-900/30',
      border: 'border-green-700',
      full: 'border-green-700 bg-green-900/20',
    },
    warning: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-700',
      full: 'border-yellow-700 bg-yellow-900/20',
    },
    error: {
      text: 'text-red-400',
      bg: 'bg-red-900/30',
      border: 'border-red-700',
      full: 'border-red-700 bg-red-900/20',
    },
    info: {
      text: 'text-blue-400',
      bg: 'bg-blue-900/30',
      border: 'border-blue-700',
      full: 'border-blue-700 bg-blue-900/20',
    },
  },
} as const;

/**
 * Background colors
 */
export const BACKGROUNDS = {
  light: {
    container: 'bg-white',
    surface: 'bg-white',
    surfaceHover: 'hover:bg-slate-100',
    input: 'bg-white',
  },
  dark: {
    container: 'bg-black',
    surface: 'bg-slate-800',
    surfaceHover: 'hover:bg-slate-800',
    input: 'bg-slate-900',
  },
} as const;

/**
 * Text colors
 */
export const TEXT_COLORS = {
  light: {
    primary: 'text-slate-800',
    secondary: 'text-slate-500',
    muted: 'text-slate-400',
    accent: 'text-iiif-blue',
    placeholder: 'placeholder-slate-400',
  },
  dark: {
    primary: 'text-white',
    secondary: 'text-slate-400',
    muted: 'text-slate-500',
    accent: 'text-yellow-400',
    placeholder: 'placeholder-slate-500',
  },
} as const;

/**
 * Border colors
 */
export const BORDER_COLORS = {
  light: {
    default: 'border-slate-200',
    subtle: 'border-slate-200',
    input: 'border-slate-300',
  },
  dark: {
    default: 'border-slate-800',
    subtle: 'border-slate-700',
    input: 'border-slate-700',
  },
} as const;

/**
 * Button styles
 */
export const BUTTON_STYLES = {
  light: {
    primary: 'bg-iiif-blue text-white hover:bg-blue-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  },
  dark: {
    primary: 'bg-yellow-400 text-black hover:bg-yellow-300',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700',
  },
} as const;
