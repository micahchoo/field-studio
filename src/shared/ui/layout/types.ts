export type GapSize = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type Alignment = 'start' | 'center' | 'end' | 'stretch';
export type Justify = 'start' | 'center' | 'end' | 'between';
export type OverflowAxis = 'y' | 'x' | 'both';

export const gapClasses: Record<GapSize, string> = {
  none: '',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

export const alignClasses: Record<Alignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export const justifyClasses: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export const overflowClasses: Record<OverflowAxis, string> = {
  y: 'overflow-y-auto overflow-x-hidden',
  x: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
};

/** Named height presets mapping to CSS vars or Tailwind classes */
export type ShelfHeight = 'header' | 'header-compact' | 'status-bar' | 'auto';
/** Named width presets */
export type ShelfWidth = 'sidebar' | 'inspector' | 'filmstrip' | 'auto';

export const shelfHeightClasses: Record<ShelfHeight, string> = {
  header: 'h-header',
  'header-compact': 'h-12',
  'status-bar': 'h-8',
  auto: '',
};

export const shelfWidthClasses: Record<ShelfWidth, string> = {
  sidebar: 'w-[280px]',
  inspector: 'w-[352px]',
  filmstrip: 'w-[288px]',
  auto: '',
};
