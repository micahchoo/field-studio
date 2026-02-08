/**
 * Theme Token Contract
 *
 * Flat interface whose property names map 1:1 to CSS custom properties:
 *   `textPrimary` -> `--theme-text-primary`
 *
 * All values are CSS color strings (hex, rgb, rgba, color-mix, etc.).
 */

export type ThemeName = 'light' | 'dark' | 'field' | 'custom';

export interface ThemeTokens {
  // ── Surfaces ──────────────────────────────────────────────────────
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  surfaceOverlay: string;

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // ── Accent ────────────────────────────────────────────────────────
  accentPrimary: string;
  accentHover: string;
  accentSubtle: string;

  // ── Borders ───────────────────────────────────────────────────────
  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;

  // ── Shadows (full box-shadow values) ──────────────────────────────
  shadowColor: string;
  shadowSm: string;
  shadowBase: string;
  shadowLg: string;
  shadowActive: string;

  // ── Semantic ──────────────────────────────────────────────────────
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;

  // ── Selection ─────────────────────────────────────────────────────
  selectionBg: string;
  selectionText: string;

  // ── Scrollbar ─────────────────────────────────────────────────────
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  // ── IIIF Resource Type Colors ─────────────────────────────────────
  resourceCollection: string;
  resourceManifest: string;
  resourceCanvas: string;
  resourceRange: string;
  resourceAnnotation: string;

  // ── Forms & Inputs ──────────────────────────────────────────
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;

  // ── Typography ──────────────────────────────────────────────
  fontFamilyMono: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontWeightBold: string;

  // ── Spacing ─────────────────────────────────────────────────
  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;

  // ── Border Widths ───────────────────────────────────────────
  borderWidthThin: string;
  borderWidthThick: string;
}

/**
 * Convert a ThemeTokens property name to a CSS custom property name.
 * e.g. `textPrimary` -> `--theme-text-primary`
 */
export function tokenToCssVar(key: string): string {
  return `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}
