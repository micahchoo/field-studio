/**
 * Theme Classes Utility
 *
 * @deprecated Prefer useContextualStyles() or theme-* Tailwind aliases
 * powered by the new ThemeRoot / theme-bus system. This utility is kept
 * for backward compatibility with existing `utils/` consumers.
 *
 * Centralizes fieldMode-based class generation to eliminate repeated ternary patterns.
 * Import and use: const theme = createThemeClasses(settings.fieldMode);
 *
 * @example
 * // Before (repeated 58+ times across codebase):
 * className={`${fieldMode ? 'bg-black text-white' : 'bg-white text-slate-800'}`}
 *
 * // After:
 * className={theme.container}
 */

export interface ThemeClasses {
  // Backgrounds
  container: string;
  surface: string;
  surfaceHover: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Interactive
  buttonPrimary: string;
  buttonSecondary: string;
  inputField: string;

  // Status text colors
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;

  // Status backgrounds
  statusSuccessBg: string;
  statusWarningBg: string;
  statusErrorBg: string;
  statusInfoBg: string;

  // Combined status (border + background)
  statusSuccessFull: string;
  statusWarningFull: string;
  statusErrorFull: string;
  statusInfoFull: string;
}

/**
 * Creates a set of theme classes based on fieldMode
 * @param fieldMode - Whether field/dark mode is enabled
 * @returns Object with pre-computed class strings for all theme patterns
 */
export function createThemeClasses(fieldMode: boolean): ThemeClasses {
  return {
    // Backgrounds
    container: fieldMode ? 'bg-black text-white' : 'bg-white text-slate-800',
    surface: fieldMode ? 'bg-slate-800' : 'bg-white',
    surfaceHover: fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100',

    // Text
    text: fieldMode ? 'text-white' : 'text-slate-800',
    textSecondary: fieldMode ? 'text-slate-400' : 'text-slate-500',
    textMuted: fieldMode ? 'text-slate-500' : 'text-slate-400',
    textAccent: fieldMode ? 'text-yellow-400' : 'text-iiif-blue',

    // Borders
    border: fieldMode ? 'border-slate-800' : 'border-slate-200',
    borderSubtle: fieldMode ? 'border-slate-700' : 'border-slate-200',

    // Interactive
    buttonPrimary: fieldMode
      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
      : 'bg-iiif-blue text-white hover:bg-blue-700',
    buttonSecondary: fieldMode
      ? 'bg-slate-800 text-white hover:bg-slate-700'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    inputField: fieldMode
      ? 'bg-slate-900 text-white border-slate-700 placeholder-slate-500'
      : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400',

    // Status text colors
    statusSuccess: fieldMode ? 'text-green-400' : 'text-green-600',
    statusWarning: fieldMode ? 'text-yellow-400' : 'text-yellow-600',
    statusError: fieldMode ? 'text-red-400' : 'text-red-600',
    statusInfo: fieldMode ? 'text-blue-400' : 'text-blue-600',

    // Status backgrounds
    statusSuccessBg: fieldMode ? 'bg-green-900/30' : 'bg-green-50',
    statusWarningBg: fieldMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
    statusErrorBg: fieldMode ? 'bg-red-900/30' : 'bg-red-50',
    statusInfoBg: fieldMode ? 'bg-blue-900/30' : 'bg-blue-50',

    // Combined status (border + background) for cards/alerts
    statusSuccessFull: fieldMode
      ? 'border-green-700 bg-green-900/20'
      : 'border-green-200 bg-green-50',
    statusWarningFull: fieldMode
      ? 'border-yellow-700 bg-yellow-900/20'
      : 'border-yellow-200 bg-yellow-50',
    statusErrorFull: fieldMode
      ? 'border-red-700 bg-red-900/20'
      : 'border-red-200 bg-red-50',
    statusInfoFull: fieldMode
      ? 'border-blue-700 bg-blue-900/20'
      : 'border-blue-200 bg-blue-50',
  };
}

/**
 * Helper to get status color class based on score/level
 */
export function getStatusColorForScore(
  score: number,
  fieldMode: boolean,
  type: 'text' | 'bg' = 'text'
): string {
  const theme = createThemeClasses(fieldMode);

  if (type === 'bg') {
    if (score >= 80) return theme.statusSuccessBg;
    if (score >= 50) return theme.statusWarningBg;
    return theme.statusErrorBg;
  }

  if (score >= 80) return theme.statusSuccess;
  if (score >= 50) return theme.statusWarning;
  return theme.statusError;
}

/**
 * Helper to get status color class based on severity level
 */
export function getStatusColorForLevel(
  level: 'success' | 'warning' | 'error' | 'info',
  fieldMode: boolean,
  type: 'text' | 'bg' | 'full' = 'text'
): string {
  const theme = createThemeClasses(fieldMode);

  const map = {
    text: {
      success: theme.statusSuccess,
      warning: theme.statusWarning,
      error: theme.statusError,
      info: theme.statusInfo,
    },
    bg: {
      success: theme.statusSuccessBg,
      warning: theme.statusWarningBg,
      error: theme.statusErrorBg,
      info: theme.statusInfoBg,
    },
    full: {
      success: theme.statusSuccessFull,
      warning: theme.statusWarningFull,
      error: theme.statusErrorFull,
      info: theme.statusInfoFull,
    },
  };

  return map[type][level];
}

export default createThemeClasses;
