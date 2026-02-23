/**
 * useContextualStyles — Re-export shim for Svelte migration
 *
 * In React, `useContextualStyles` was a hook that read from ThemeContext.
 * In Svelte 5, themes are passed as a `cx: ContextualClassNames` prop from
 * parent templates; components never call this hook at runtime.
 *
 * This module re-exports all types and constants from contextual-styles so
 * that files importing from '@/src/shared/lib/hooks/useContextualStyles'
 * continue to compile without changes.
 */

export type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
export {
  LIGHT_CLASSES,
  FIELD_CLASSES,
  THEME_CLASSES,
  getContextualClasses,
} from '@/src/shared/lib/contextual-styles';
