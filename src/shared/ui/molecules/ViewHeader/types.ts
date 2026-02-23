import type { Snippet } from 'svelte';
import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

export type { ContextualClassNames };

export type ViewHeaderHeight = 'default' | 'compact' | 'fluid';

export interface ViewHeaderProps {
  /** Contextual class name tokens for theming */
  cx: ContextualClassNames;
  /** Height variant */
  height?: ViewHeaderHeight;
  /** z-index class */
  zIndex?: string;
  /** Additional class */
  class?: string;

  // Named snippet slots (replaces React children + partitionChildren)
  /** Icon + title + optional badge area (left) */
  title?: Snippet;
  /** Center content (hidden on mobile) */
  center?: Snippet;
  /** Action buttons (right) */
  actions?: Snippet;
  /** Sub-bar below main header row */
  subbar?: Snippet;
  /** Whether sub-bar is visible */
  subbarVisible?: boolean;
  /** Body content below everything */
  body?: Snippet;
  /** Divider elements (if any) */
  children?: Snippet;
}

export interface ViewHeaderSelectionBarProps {
  count: number;
  onClear: () => void;
  cx: ContextualClassNames;
  isMobile?: boolean;
  children?: Snippet;
}
