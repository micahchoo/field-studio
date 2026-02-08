import type { ThemeTokens } from './types';

/**
 * Light theme — current cream/black neobrutalist values.
 * Extracted from useContextualStyles light branch + index.css :root.
 */
export const lightTheme: ThemeTokens = {
  // Surfaces
  surfacePrimary: '#FFFFFF',
  surfaceSecondary: '#FFF8E7',    // nb-cream
  surfaceElevated: '#FFFFFF',
  surfaceOverlay: 'rgba(0, 0, 0, 0.7)',

  // Text
  textPrimary: '#000000',
  textSecondary: '#000000',
  textMuted: '#4D4D4D',
  textInverse: '#FFFFFF',

  // Accent
  accentPrimary: '#0055FF',       // nb-blue
  accentHover: '#0044CC',
  accentSubtle: 'rgba(0, 85, 255, 0.08)',

  // Borders
  borderDefault: '#000000',
  borderSubtle: 'rgba(0, 0, 0, 0.2)',
  borderFocus: '#0055FF',

  // Shadows
  shadowColor: '#000000',
  shadowSm: '2px 2px 0 0 #000',
  shadowBase: '4px 4px 0 0 #000',
  shadowLg: '6px 6px 0 0 #000',
  shadowActive: '1px 1px 0 0 #000',

  // Semantic
  successColor: '#00CC66',
  warningColor: '#FF8800',
  errorColor: '#FF3333',
  infoColor: '#0055FF',

  // Selection
  selectionBg: '#0055FF',
  selectionText: '#FFFFFF',

  // Scrollbar
  scrollbarTrack: '#FFF8E7',
  scrollbarThumb: '#CCCCCC',
  scrollbarThumbHover: '#999999',

  // IIIF Resources
  resourceCollection: '#8833FF',
  resourceManifest: '#0055FF',
  resourceCanvas: '#00CC66',
  resourceRange: '#FF8800',
  resourceAnnotation: '#FF66B2',

  // Forms
  inputBg: '#FFFFFF',
  inputBorder: '#000000',
  inputPlaceholder: 'rgba(0, 0, 0, 0.4)',

  // Typography
  fontFamilyMono: "'JetBrains Mono', 'Roboto Mono', monospace",
  fontSizeXs: '0.75rem',
  fontSizeSm: '0.875rem',
  fontSizeMd: '1rem',
  fontSizeLg: '1.25rem',
  fontWeightBold: '700',

  // Spacing
  spacingXs: '4px',
  spacingSm: '8px',
  spacingMd: '16px',
  spacingLg: '24px',
  spacingXl: '32px',

  // Border Widths
  borderWidthThin: '1px',
  borderWidthThick: '2px',
};
