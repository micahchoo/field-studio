import type { ThemeTokens } from './types';

/**
 * Field theme — high-contrast yellow/black for outdoor use.
 * COPIED VERBATIM from React: src/shared/config/themes/field.ts
 */
export const fieldTheme: ThemeTokens = {
  surfacePrimary: '#000000',
  surfaceSecondary: '#1A1A00',
  surfaceElevated: '#000000',
  surfaceOverlay: 'rgba(0, 0, 0, 0.9)',

  textPrimary: '#FFE500',
  textSecondary: '#FFE500',
  textMuted: '#E6C200',
  textInverse: '#000000',

  accentPrimary: '#FFE500',
  accentHover: 'rgba(255, 229, 0, 0.8)',
  accentSubtle: 'rgba(255, 229, 0, 0.1)',

  borderDefault: '#FFE500',
  borderSubtle: 'rgba(255, 229, 0, 0.3)',
  borderFocus: '#FFE500',

  shadowColor: '#FFE500',
  shadowSm: '2px 2px 0 0 #FFE500',
  shadowBase: '4px 4px 0 0 #FFE500',
  shadowLg: '6px 6px 0 0 #FFE500',
  shadowActive: '1px 1px 0 0 #FFE500',

  successColor: '#00CC66',
  warningColor: '#FF8800',
  errorColor: '#FF3333',
  infoColor: '#FFE500',

  selectionBg: '#FFE500',
  selectionText: '#000000',

  scrollbarTrack: '#000000',
  scrollbarThumb: '#FFE500',
  scrollbarThumbHover: 'rgba(255, 229, 0, 0.8)',

  resourceCollection: '#8833FF',
  resourceManifest: '#FFE500',
  resourceCanvas: '#00CC66',
  resourceRange: '#FF8800',
  resourceAnnotation: '#FF66B2',

  inputBg: '#000000',
  inputBorder: '#FFE500',
  inputPlaceholder: 'rgba(255, 229, 0, 0.5)',

  fontFamilyMono: "'JetBrains Mono', monospace",
  fontSizeXs: '0.8rem',
  fontSizeSm: '1rem',
  fontSizeMd: '1.25rem',
  fontSizeLg: '1.5rem',
  fontWeightBold: '900',

  spacingXs: '6px',
  spacingSm: '12px',
  spacingMd: '20px',
  spacingLg: '28px',
  spacingXl: '40px',

  borderWidthThin: '2px',
  borderWidthThick: '4px',
};
