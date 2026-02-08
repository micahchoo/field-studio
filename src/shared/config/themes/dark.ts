import type { ThemeTokens } from './types';

/**
 * Dark theme — deep grey surfaces, white borders, blue accent.
 * Neobrutalist aesthetic preserved (offset shadows, bold borders)
 * with inverted luminance.
 */
export const darkTheme: ThemeTokens = {
  // Surfaces
  surfacePrimary: '#1A1A1A',
  surfaceSecondary: '#111111',
  surfaceElevated: '#2A2A2A',
  surfaceOverlay: 'rgba(0, 0, 0, 0.85)',

  // Text
  textPrimary: '#F0F0F0',
  textSecondary: '#CCCCCC',
  textMuted: '#888888',
  textInverse: '#000000',

  // Accent
  accentPrimary: '#4D88FF',       // brighter blue for dark bg
  accentHover: '#6699FF',
  accentSubtle: 'rgba(77, 136, 255, 0.12)',

  // Borders
  borderDefault: '#F0F0F0',
  borderSubtle: '#333333',
  borderFocus: '#4D88FF',

  // Shadows
  shadowColor: '#F0F0F0',
  shadowSm: '2px 2px 0 0 rgba(240, 240, 240, 0.4)',
  shadowBase: '4px 4px 0 0 rgba(240, 240, 240, 0.3)',
  shadowLg: '6px 6px 0 0 rgba(240, 240, 240, 0.3)',
  shadowActive: '1px 1px 0 0 rgba(240, 240, 240, 0.4)',

  // Semantic
  successColor: '#33DD88',
  warningColor: '#FFAA33',
  errorColor: '#FF5555',
  infoColor: '#4D88FF',

  // Selection
  selectionBg: '#4D88FF',
  selectionText: '#FFFFFF',

  // Scrollbar
  scrollbarTrack: '#111111',
  scrollbarThumb: '#555555',
  scrollbarThumbHover: '#777777',

  // IIIF Resources
  resourceCollection: '#AA66FF',
  resourceManifest: '#4D88FF',
  resourceCanvas: '#33DD88',
  resourceRange: '#FFAA33',
  resourceAnnotation: '#FF88CC',

  // Forms
  inputBg: '#000000',
  inputBorder: '#444444',
  inputPlaceholder: '#666666',

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
