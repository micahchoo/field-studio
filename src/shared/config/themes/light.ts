import type { ThemeTokens } from './types';

/**
 * Light theme — current cream/black neobrutalist values.
 * COPIED VERBATIM from React: src/shared/config/themes/light.ts
 */
export const lightTheme: ThemeTokens = {
  surfacePrimary: '#FFFFFF',
  surfaceSecondary: '#FFF8E7',
  surfaceElevated: '#FFFFFF',
  surfaceOverlay: 'rgba(0, 0, 0, 0.7)',

  textPrimary: '#000000',
  textSecondary: '#000000',
  textMuted: '#4D4D4D',
  textInverse: '#FFFFFF',

  accentPrimary: '#0055FF',
  accentHover: '#0044CC',
  accentSubtle: 'rgba(0, 85, 255, 0.08)',

  borderDefault: '#000000',
  borderSubtle: 'rgba(0, 0, 0, 0.2)',
  borderFocus: '#0055FF',

  shadowColor: '#000000',
  shadowSm: '2px 2px 0 0 #000',
  shadowBase: '4px 4px 0 0 #000',
  shadowLg: '6px 6px 0 0 #000',
  shadowActive: '1px 1px 0 0 #000',

  successColor: '#00CC66',
  warningColor: '#FF8800',
  errorColor: '#FF3333',
  infoColor: '#0055FF',

  selectionBg: '#0055FF',
  selectionText: '#FFFFFF',

  scrollbarTrack: '#FFF8E7',
  scrollbarThumb: '#CCCCCC',
  scrollbarThumbHover: '#999999',

  resourceCollection: '#8833FF',
  resourceManifest: '#0055FF',
  resourceCanvas: '#00CC66',
  resourceRange: '#FF8800',
  resourceAnnotation: '#FF66B2',

  inputBg: '#FFFFFF',
  inputBorder: '#000000',
  inputPlaceholder: 'rgba(0, 0, 0, 0.4)',

  fontFamilyMono: "'JetBrains Mono', 'Roboto Mono', monospace",
  fontSizeXs: '0.75rem',
  fontSizeSm: '0.875rem',
  fontSizeMd: '1rem',
  fontSizeLg: '1.25rem',
  fontWeightBold: '700',

  spacingXs: '4px',
  spacingSm: '8px',
  spacingMd: '16px',
  spacingLg: '24px',
  spacingXl: '32px',

  borderWidthThin: '1px',
  borderWidthThick: '2px',
};
