/**
 * Contextual Styles — Framework-agnostic type + static class maps
 *
 * Extracted from useContextualStyles.ts. The React hook is replaced by:
 * - A Svelte store (in shared/stores/) that provides reactive cx
 * - Or direct prop-passing of cx from parent templates
 *
 * Atoms receive cx: ContextualClassNames as a prop — they never resolve
 * the theme themselves. This keeps atoms zero-state, zero-logic.
 */

export interface ContextualClassNames {
  /** Card / panel surface (background + border) */
  surface: string;
  /** Primary text */
  text: string;
  /** Accent / primary-action text colour */
  accent: string;

  // Optional tokens (components may pass partial cx objects)
  textMuted?: string;
  border?: string;
  input?: string;
  label?: string;
  divider?: string;
  active?: string;
  inactive?: string;
  warningBg?: string;
  headerBg?: string;
  danger?: string;
  dangerHover?: string;
  subtleBg?: string;
  subtleText?: string;
  kbd?: string;
  iconButton?: string;
  accentBadge?: string;
  searchInput?: string;
  thumbnailBg?: string;
  headingSize?: string;
  pageBg?: string;
  svgStroke?: string;
  svgFill?: string;
  canvasBg?: string;
  gridBg?: string;
  gridLine?: string;
  buttonSurface?: string;
  placeholderBg?: string;
  placeholderIcon?: string;
  separator?: string;
  focusRing?: string;
  svgAccent?: string;
  viewTitle?: string;
  sectionHeading?: string;
  bodyText?: string;
  captionText?: string;
  microLabel?: string;
  selected?: string;
  selectedText?: string;
}

/**
 * Static class sets for light theme (exact class names for Tailwind JIT).
 * These MUST use complete class name literals.
 */
export const LIGHT_CLASSES: ContextualClassNames = {
  surface:   'bg-nb-white border-2 border-nb-black',
  text:      'text-nb-black',
  textMuted: 'text-nb-black/50',
  border:    'border-nb-black',
  input:     'bg-nb-white text-nb-black border-2 border-nb-black font-mono focus:shadow-brutal-sm',
  label:     'text-nb-black/70 nb-label',
  divider:   'border-nb-black/20',
  active:    'text-nb-white bg-nb-black border-nb-black font-bold',
  inactive:  'text-nb-black/50 hover:text-nb-black',
  accent:    'text-nb-blue',
  warningBg: 'bg-nb-orange/10 border-2 border-nb-orange',
  headerBg:  'bg-nb-cream border-b-4 border-nb-black',
  danger:       'text-nb-red',
  dangerHover:  'hover:bg-nb-red/10',
  subtleBg:     'bg-nb-cream',
  subtleText:   'text-nb-black',
  kbd:          'text-nb-black bg-nb-cream border-2 border-nb-black font-mono',
  iconButton:   'text-nb-black hover:bg-nb-black hover:text-nb-white transition-nb nb-press',
  accentBadge:  'bg-nb-black text-nb-white font-bold border-2 border-nb-black',
  searchInput:  'bg-nb-cream border-2 border-nb-black text-nb-black font-mono focus:shadow-brutal-sm placeholder:text-nb-black/40',
  thumbnailBg:  'bg-nb-cream border-2 border-nb-black',
  headingSize:  'text-nb-lg',
  pageBg:       'bg-nb-cream',
  svgStroke:    '#000000',
  svgFill:      '#000000',
  canvasBg:     'bg-nb-cream',
  gridBg:       'bg-nb-black/5',
  gridLine:     '#000000',
  buttonSurface: 'bg-nb-white text-nb-black border-2 border-nb-black hover:bg-nb-black hover:text-nb-white font-bold shadow-brutal-sm nb-press',
  placeholderBg: 'bg-nb-cream border-2 border-dashed border-nb-black',
  placeholderIcon: 'text-nb-black/40',
  separator:     'bg-nb-black',
  focusRing:     'ring-nb-blue ring-offset-nb-white',
  svgAccent:     '#0055FF',
  viewTitle:     'text-nb-lg font-bold',
  sectionHeading: 'text-nb-xs font-bold uppercase tracking-wider font-mono text-nb-black/70',
  bodyText:      'text-nb-sm font-normal',
  captionText:   'text-nb-xs font-medium text-nb-black/60',
  microLabel:    'text-nb-caption font-bold uppercase tracking-wider font-mono',
  selected:      'bg-nb-orange/15 border-l-4 border-l-nb-orange',
  selectedText:  'text-nb-black font-bold',
};

/**
 * Static class sets for field theme (high contrast black/yellow).
 */
export const FIELD_CLASSES: ContextualClassNames = {
  surface:   'bg-nb-black border-2 border-nb-yellow',
  text:      'text-nb-yellow',
  textMuted: 'text-nb-yellow/60',
  border:    'border-nb-yellow',
  input:     'bg-nb-black text-nb-yellow border-2 border-nb-yellow font-mono focus:shadow-brutal-field-sm',
  label:     'text-nb-yellow/80 nb-label',
  divider:   'border-nb-yellow/30',
  active:    'text-nb-black bg-nb-yellow border-nb-yellow font-bold',
  inactive:  'text-nb-yellow/60 hover:text-nb-yellow',
  accent:    'text-nb-yellow',
  warningBg: 'bg-nb-orange/20 border-2 border-nb-orange',
  headerBg:  'bg-nb-black border-b-4 border-nb-yellow',
  danger:       'text-nb-red',
  dangerHover:  'hover:bg-nb-red/20',
  subtleBg:     'bg-nb-yellow/10',
  subtleText:   'text-nb-yellow',
  kbd:          'text-nb-yellow bg-nb-yellow/20 border-2 border-nb-yellow font-mono',
  iconButton:   'text-nb-yellow hover:bg-nb-yellow hover:text-nb-black transition-nb nb-press',
  accentBadge:  'bg-nb-yellow text-nb-black font-bold border-2 border-nb-yellow',
  searchInput:  'bg-nb-black border-2 border-nb-yellow text-nb-yellow font-mono focus:shadow-brutal-field-sm placeholder:text-nb-yellow/40',
  thumbnailBg:  'bg-nb-black border-2 border-nb-yellow',
  headingSize:  'text-nb-xl',
  pageBg:       'bg-nb-black',
  svgStroke:    '#FFE500',
  svgFill:      '#FFE500',
  canvasBg:     'bg-nb-black',
  gridBg:       'bg-nb-yellow/10',
  gridLine:     '#FFE500',
  buttonSurface: 'bg-nb-yellow text-nb-black border-2 border-nb-yellow hover:bg-nb-yellow/80 font-bold shadow-brutal-field-sm nb-press',
  placeholderBg: 'bg-nb-yellow/10 border-2 border-dashed border-nb-yellow',
  placeholderIcon: 'text-nb-yellow/60',
  separator:     'bg-nb-yellow',
  focusRing:     'ring-nb-yellow ring-offset-nb-black',
  svgAccent:     '#FFE500',
  viewTitle:     'text-nb-lg font-bold text-nb-yellow',
  sectionHeading: 'text-nb-xs font-bold uppercase tracking-wider font-mono text-nb-yellow/80',
  bodyText:      'text-nb-sm font-normal text-nb-yellow',
  captionText:   'text-nb-xs font-medium text-nb-yellow/60',
  microLabel:    'text-nb-caption font-bold uppercase tracking-wider font-mono text-nb-yellow/60',
  selected:      'bg-nb-yellow/20 border-l-4 border-l-nb-yellow',
  selectedText:  'text-nb-yellow font-bold',
};

/**
 * Theme-var-driven class set for dark/custom themes.
 * Uses CSS custom properties set by ThemeRoot.
 */
export const THEME_CLASSES: ContextualClassNames = {
  surface:   'bg-theme-surface nb-border-theme',
  text:      'text-theme-text',
  textMuted: 'text-theme-text-muted',
  border:    'border-theme-border',
  input:     'bg-theme-surface text-theme-text border-2 border-theme-border font-mono focus:shadow-theme-sm',
  label:     'text-theme-text-muted nb-label',
  divider:   'border-theme-border-subtle',
  active:    'text-theme-text-inverse bg-theme-accent border-theme-accent font-bold',
  inactive:  'text-theme-text-muted hover:text-theme-text',
  accent:    'text-theme-accent',
  warningBg: 'bg-theme-warning/15 border-2 border-theme-warning',
  headerBg:  'bg-theme-surface-alt border-b-4 border-theme-border',
  danger:       'text-theme-error',
  dangerHover:  'hover:bg-theme-error/15',
  subtleBg:     'bg-theme-accent-subtle',
  subtleText:   'text-theme-text',
  kbd:          'text-theme-text bg-theme-surface-alt border-2 border-theme-border font-mono',
  iconButton:   'text-theme-text hover:bg-theme-accent hover:text-theme-text-inverse transition-nb nb-active-theme',
  accentBadge:  'bg-theme-accent text-theme-text-inverse font-bold border-2 border-theme-border',
  searchInput:  'bg-theme-surface-alt border-2 border-theme-border text-theme-text font-mono focus:shadow-theme-sm placeholder:text-theme-text-muted',
  thumbnailBg:  'bg-theme-surface-alt border-2 border-theme-border',
  headingSize:  'text-nb-lg',
  pageBg:       'bg-theme-surface-alt',
  svgStroke:    'var(--theme-text-primary, #000)',
  svgFill:      'var(--theme-text-primary, #000)',
  canvasBg:     'bg-theme-surface-alt',
  gridBg:       'bg-theme-accent-subtle',
  gridLine:     'var(--theme-border-default, #000)',
  buttonSurface: 'bg-theme-surface text-theme-text border-2 border-theme-border hover:bg-theme-accent hover:text-theme-text-inverse font-bold shadow-theme-sm nb-active-theme',
  placeholderBg: 'bg-theme-accent-subtle border-2 border-dashed border-theme-border',
  placeholderIcon: 'text-theme-text-muted',
  separator:     'bg-theme-border',
  focusRing:     'ring-theme-border-focus ring-offset-theme-surface',
  svgAccent:     'var(--theme-accent-primary, #0055FF)',
  viewTitle:     'text-nb-lg font-bold text-theme-text',
  sectionHeading: 'text-nb-xs font-bold uppercase tracking-wider font-mono text-theme-text-muted',
  bodyText:      'text-nb-sm font-normal text-theme-text',
  captionText:   'text-nb-xs font-medium text-theme-text-muted',
  microLabel:    'text-nb-caption font-bold uppercase tracking-wider font-mono text-theme-text-muted',
  selected:      'bg-theme-accent-subtle border-l-4 border-l-theme-accent',
  selectedText:  'text-theme-text font-bold',
};

/**
 * Pure function to get contextual class names by theme.
 * In Svelte, this replaces the React useContextualStyles hook.
 * Called from a Svelte derived store or directly in templates.
 */
export function getContextualClasses(themeName: string): ContextualClassNames {
  if (themeName === 'light') return LIGHT_CLASSES;
  if (themeName === 'field') return FIELD_CLASSES;
  return THEME_CLASSES;
}
