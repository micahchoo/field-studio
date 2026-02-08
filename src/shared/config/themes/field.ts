import type { ThemeTokens } from './types';

/**
 * Field theme — high-contrast yellow/black for outdoor use.
 * Extracted from [data-field-mode="true"] CSS + useContextualStyles field branch.
 */
export const fieldTheme: ThemeTokens = {
  // Surfaces
  surfacePrimary: '#000000',
  surfaceSecondary: '#1A1A00',
  surfaceElevated: '#000000',
  surfaceOverlay: 'rgba(0, 0, 0, 0.9)',

  // Text
  textPrimary: '#FFE500',
  textSecondary: '#FFE500',
  textMuted: '#E6C200',
  textInverse: '#000000',

  // Accent
  accentPrimary: '#FFE500',
  accentHover: 'rgba(255, 229, 0, 0.8)',
  accentSubtle: 'rgba(255, 229, 0, 0.1)',

  // Borders
  borderDefault: '#FFE500',
  borderSubtle: 'rgba(255, 229, 0, 0.3)',
  borderFocus: '#FFE500',

  // Shadows
  shadowColor: '#FFE500',
  shadowSm: '2px 2px 0 0 #FFE500',
  shadowBase: '4px 4px 0 0 #FFE500',
  shadowLg: '6px 6px 0 0 #FFE500',
  shadowActive: '1px 1px 0 0 #FFE500',

  // Semantic
  successColor: '#00CC66',
  warningColor: '#FF8800',
  errorColor: '#FF3333',
  infoColor: '#FFE500',

  // Selection
  selectionBg: '#FFE500',
  selectionText: '#000000',

  // Scrollbar
  scrollbarTrack: '#000000',
  scrollbarThumb: '#FFE500',
  scrollbarThumbHover: 'rgba(255, 229, 0, 0.8)',

  // IIIF Resources
  resourceCollection: '#8833FF',
  resourceManifest: '#FFE500',
  resourceCanvas: '#00CC66',
  resourceRange: '#FF8800',
  resourceAnnotation: '#FF66B2',

  // Forms
  inputBg: '#000000',
  inputBorder: '#FFE500',
  inputPlaceholder: 'rgba(255, 229, 0, 0.5)',

  // Typography (larger for outdoor visibility)
  fontFamilyMono: "'JetBrains Mono', monospace",
  fontSizeXs: '0.8rem',
  fontSizeSm: '1rem',
  fontSizeMd: '1.25rem',
  fontSizeLg: '1.5rem',
  fontWeightBold: '900',

  // Spacing (wider for touch targets)
  spacingXs: '6px',
  spacingSm: '12px',
  spacingMd: '20px',
  spacingLg: '28px',
  spacingXl: '40px',

  // Border Widths (thicker for visibility)
  borderWidthThin: '2px',
  borderWidthThick: '4px',
};
