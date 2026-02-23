/**
 * Theme Reactive Module — Svelte 5 Runes Interface
 *
 * Single source of truth for the active theme. Wraps the pure
 * getContextualClasses() function with $state for reactive access.
 * Also provides theme token resolution for CSS custom property injection.
 *
 * Replaces both React ThemeRoot (CSS var injection) and useTheme/useThemeName hooks.
 *
 * Usage in templates:
 *   import { theme } from '@/src/shared/stores/theme.svelte';
 *
 *   // Reactive reads
 *   theme.name        // 'light' | 'field' | 'dark' | string
 *   theme.cx          // ContextualClassNames for current theme
 *   theme.fieldMode   // shorthand: theme.name === 'field'
 *   theme.tokens      // resolved ThemeTokens for current theme
 *
 *   // CSS var injection (in root layout component):
 *   use:themeVars={theme.tokens}
 *
 *   // Pass to atoms:
 *   <Tag cx={theme.cx}>Label</Tag>
 *
 * WARNING: Do NOT destructure — breaks reactivity:
 *   const { cx } = theme;  // ❌ captures value
 *   theme.cx;              // ✅ reads through getter
 */

import {
  getContextualClasses,
  type ContextualClassNames,
} from '@/src/shared/lib/contextual-styles';
import type { ThemeTokens, ThemeName as ConfigThemeName } from '@/src/shared/config/themes/types';
import { resolveTheme, tokenToCssVar } from '@/src/shared/config/themes';

export type ThemeName = ConfigThemeName | (string & {});

class ThemeStore {
  /** Current theme name */
  #name = $state<ThemeName>('light');

  /** Custom token overrides (for 'custom' theme) */
  #customOverrides = $state<Partial<ThemeTokens> | undefined>(undefined);

  // ──────────────────────────────────────────────
  // Reactive reads
  // ──────────────────────────────────────────────

  /** Active theme name */
  get name(): ThemeName {
    return this.#name;
  }

  /** ContextualClassNames for the active theme (derived from name) */
  get cx(): ContextualClassNames {
    return getContextualClasses(this.#name);
  }

  /** Shorthand: is the current theme 'field' mode? */
  get fieldMode(): boolean {
    return this.#name === 'field';
  }

  /** Resolved ThemeTokens for the active theme (for CSS var injection) */
  get tokens(): ThemeTokens {
    return resolveTheme(
      this.#name as ConfigThemeName,
      this.#customOverrides,
    );
  }

  // ──────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────

  /**
   * Set the active theme. Triggers reactive update to all
   * components reading theme.name, theme.cx, theme.fieldMode, theme.tokens.
   */
  setTheme(name: ThemeName, customOverrides?: Partial<ThemeTokens>): void {
    this.#name = name;
    this.#customOverrides = customOverrides;
  }

  // ──────────────────────────────────────────────
  // CSS Custom Property Injection
  // Replaces React ThemeRoot's useEffect + ref.style.setProperty
  // In Svelte, use as a Svelte action: <div use:applyThemeVars>
  // ──────────────────────────────────────────────

  /**
   * Get a single token value for imperative use (canvas, SVG, chart renderers).
   * NOT reactive — reads the current snapshot.
   */
  getToken<K extends keyof ThemeTokens>(key: K): ThemeTokens[K] {
    return this.tokens[key];
  }
}

/** Singleton theme store */
export const theme = new ThemeStore();

/**
 * Svelte action that applies theme tokens as CSS custom properties on an element.
 * Replaces React ThemeRoot component.
 *
 * Usage:
 *   <div use:applyThemeVars>...</div>
 *
 * This is a plain .ts-compatible action (no runes). The reactive update
 * is driven by components re-calling the action when theme.tokens changes.
 */
export function applyThemeVars(node: HTMLElement): { update?: () => void; destroy?: () => void } {
  // Pre-compute CSS var names (cached across calls)
  const CSS_VAR_NAMES: Record<string, string> = {};
  function getCssVarName(key: string): string {
    if (!CSS_VAR_NAMES[key]) CSS_VAR_NAMES[key] = tokenToCssVar(key);
    return CSS_VAR_NAMES[key];
  }

  function apply() {
    const tokens = theme.tokens;
    const themeName = theme.name;
    for (const [key, value] of Object.entries(tokens)) {
      node.style.setProperty(getCssVarName(key), value);
    }
    node.dataset.theme = String(themeName);
  }

  apply();

  // Note: In a component, the action is called once. To make it reactive,
  // use $effect in the component to re-apply when theme.tokens changes.
  return {};
}

/**
 * Applies all theme tokens as CSS custom properties to an element.
 * Utility function for imperative use (not a Svelte action).
 */
export function applyTokensToElement(el: HTMLElement, tokens: ThemeTokens, themeName: string): void {
  for (const [key, value] of Object.entries(tokens)) {
    el.style.setProperty(tokenToCssVar(key), value);
  }
  el.dataset.theme = themeName;
}
