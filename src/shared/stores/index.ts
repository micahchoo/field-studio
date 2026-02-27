/**
 * Stores Index — Re-exports all module stores and contexts
 *
 * Global singletons (import directly):
 *   import { vault } from '@/src/shared/stores/vault.svelte';
 *   import { theme } from '@/src/shared/stores/theme.svelte';
 *   import { toast } from '@/src/shared/stores/toast.svelte';
 *   import { appMode } from '@/src/shared/stores/appMode.svelte';
 *   import { appSettings } from '@/src/shared/stores/appSettings.svelte';
 *   import { search } from '@/src/shared/stores/search.svelte';
 *   import { auth } from '@/src/shared/stores/auth.svelte';
 *   import { activityLog } from '@/src/shared/stores/activityLog.svelte';
 *
 * Scoped contexts (use in setContext/getContext):
 *   import { setAnnotationContext, getAnnotationContext } from '@/src/shared/stores/contexts';
 */

export { vault } from './vault.svelte';
export { theme, applyThemeVars, applyTokensToElement } from './theme.svelte';
export type { ThemeName } from './theme.svelte';
export { toast } from './toast.svelte';
export type { ToastType, ToastAction, ToastItem } from './toast.svelte';
export { appMode } from './appMode.svelte';
export type { AppMode } from './appMode.svelte';
export { appSettings } from './appSettings.svelte';
export type { AppSettings, AbstractionLevel } from './appSettings.svelte';
export { terminology } from './terminology.svelte';
export { search } from './search.svelte';
export type { SearchScope, SearchField } from './search.svelte';
export { auth } from './auth.svelte';
export { activityLog } from './activityLog.svelte';
// Scoped contexts
export {
  setAnnotationContext,
  getAnnotationContext,
  setResourceContext,
  getResourceContext,
  setUserIntentContext,
  getUserIntentContext,
} from './contexts';
export type {
  AnnotationMotivation,
  AnnotationDrawingState,
  TimeRange,
  AnnotationContext,
  ResourceContext,
  UserIntent,
  UserIntentContext,
} from './contexts';
