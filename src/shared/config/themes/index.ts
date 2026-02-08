/**
 * Theme Registry
 *
 * Central registry of all built-in themes + resolver for custom overrides.
 */

export type { ThemeName, ThemeTokens } from './types';
export { tokenToCssVar } from './types';

export { lightTheme } from './light';
export { darkTheme } from './dark';
export { fieldTheme } from './field';

import type { ThemeName, ThemeTokens } from './types';
import { lightTheme } from './light';
import { darkTheme } from './dark';
import { fieldTheme } from './field';

/** All built-in themes keyed by name. */
export const themes: Record<Exclude<ThemeName, 'custom'>, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
  field: fieldTheme,
};

/**
 * Resolve a theme by name, optionally applying custom overrides.
 * `custom` falls back to light with overrides applied.
 */
export function resolveTheme(
  name: ThemeName,
  customOverrides?: Partial<ThemeTokens>,
): ThemeTokens {
  const base = name === 'custom' ? lightTheme : themes[name];
  if (!customOverrides) return base;
  return { ...base, ...customOverrides };
}
