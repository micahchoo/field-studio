/**
 * Theme and styling molecules
 * Depends on: atoms/colors
 */

import {
  STATUS_COLORS,
  BACKGROUNDS,
  TEXT_COLORS,
  BORDER_COLORS,
  BUTTON_STYLES,
} from '../atoms/colors';

/**
 * Complete theme class set
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

  // Status text
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;

  // Status backgrounds
  statusSuccessBg: string;
  statusWarningBg: string;
  statusErrorBg: string;
  statusInfoBg: string;

  // Combined status
  statusSuccessFull: string;
  statusWarningFull: string;
  statusErrorFull: string;
  statusInfoFull: string;
}

/**
 * Create theme classes based on field mode
 */
export function createThemeClasses(fieldMode: boolean): ThemeClasses {
  const mode = fieldMode ? 'dark' : 'light';

  return {
    // Backgrounds
    container: `${BACKGROUNDS[mode].container} ${TEXT_COLORS[mode].primary}`,
    surface: BACKGROUNDS[mode].surface,
    surfaceHover: BACKGROUNDS[mode].surfaceHover,

    // Text
    text: TEXT_COLORS[mode].primary,
    textSecondary: TEXT_COLORS[mode].secondary,
    textMuted: TEXT_COLORS[mode].muted,
    textAccent: TEXT_COLORS[mode].accent,

    // Borders
    border: BORDER_COLORS[mode].default,
    borderSubtle: BORDER_COLORS[mode].subtle,

    // Interactive
    buttonPrimary: BUTTON_STYLES[mode].primary,
    buttonSecondary: BUTTON_STYLES[mode].secondary,
    inputField: `${BACKGROUNDS[mode].input} ${TEXT_COLORS[mode].primary} ${BORDER_COLORS[mode].input} ${TEXT_COLORS[mode].placeholder}`,

    // Status text
    statusSuccess: STATUS_COLORS[mode].success.text,
    statusWarning: STATUS_COLORS[mode].warning.text,
    statusError: STATUS_COLORS[mode].error.text,
    statusInfo: STATUS_COLORS[mode].info.text,

    // Status backgrounds
    statusSuccessBg: STATUS_COLORS[mode].success.bg,
    statusWarningBg: STATUS_COLORS[mode].warning.bg,
    statusErrorBg: STATUS_COLORS[mode].error.bg,
    statusInfoBg: STATUS_COLORS[mode].info.bg,

    // Combined status
    statusSuccessFull: STATUS_COLORS[mode].success.full,
    statusWarningFull: STATUS_COLORS[mode].warning.full,
    statusErrorFull: STATUS_COLORS[mode].error.full,
    statusInfoFull: STATUS_COLORS[mode].info.full,
  };
}

/**
 * Get status color class based on score
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
 * Get status color class based on level
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
