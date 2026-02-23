/**
 * App Settings Store — Svelte 5 Runes
 *
 * Global singleton replacing React useAppSettings hook.
 * Settings are persisted to localStorage. Per architecture doc §3.E,
 * $effect cannot live in module singletons — the root layout component
 * calls persist() inside a $effect for auto-save.
 *
 * React source: src/shared/lib/hooks/useAppSettings.ts
 *
 * Usage:
 *   import { appSettings } from '@/src/shared/stores/appSettings.svelte';
 *
 *   // Reactive reads:
 *   appSettings.settings         // full settings object
 *   appSettings.fieldMode        // derived: theme === 'field'
 *   appSettings.themeName        // current theme name
 *   appSettings.abstractionLevel // current abstraction level
 *
 *   // Actions:
 *   appSettings.update({ language: 'fr' });
 *   appSettings.setTheme('dark');
 *   appSettings.toggleFieldMode();
 *   appSettings.reset();
 *
 *   // Root layout calls this in $effect:
 *   appSettings.persist();
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

import { theme } from './theme.svelte';
import type { ThemeName } from '@/src/shared/config/themes/types';
import type { AbstractionLevel } from '@/src/shared/types';

export type { AbstractionLevel };

export interface AppSettings {
  defaultBaseUrl: string;
  language: string;
  theme: ThemeName;
  fieldMode: boolean;
  abstractionLevel: AbstractionLevel;
  autoSaveInterval: number;
  showTechnicalIds: boolean;
  height: number;
}

const SETTINGS_KEY = 'iiif-field-settings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultBaseUrl: 'https://iiif.io/api/',
  language: 'en',
  theme: 'light',
  fieldMode: false,
  abstractionLevel: 'standard',
  autoSaveInterval: 30,
  showTechnicalIds: false,
  height: 800,
};

/** Derive fieldMode from theme — single source of truth */
function withFieldMode(s: Omit<AppSettings, 'fieldMode'> & { fieldMode?: boolean }): AppSettings {
  return { ...s, fieldMode: s.theme === 'field' };
}

class AppSettingsStore {
  #settings = $state<AppSettings>(DEFAULT_SETTINGS);

  constructor() {
    this.loadFromStorage();
  }

  // ── Reactive reads ──

  /** Full settings object (reactive) */
  get settings(): Readonly<AppSettings> {
    return this.#settings;
  }

  /** Whether field mode is active (reactive, derived from theme) */
  get fieldMode(): boolean {
    return this.#settings.fieldMode;
  }

  /** Current theme name (reactive) */
  get themeName(): ThemeName {
    return this.#settings.theme;
  }

  /** Current abstraction level (reactive) */
  get abstractionLevel(): AbstractionLevel {
    return this.#settings.abstractionLevel;
  }

  // ── Actions ──

  /** Update one or more settings. fieldMode is auto-derived from theme. */
  update(changes: Partial<AppSettings>): void {
    this.#settings = withFieldMode({ ...this.#settings, ...changes });
    // Sync theme store if theme changed
    if (changes.theme !== undefined) {
      theme.setTheme(changes.theme);
    }
  }

  /** Set theme by name. Syncs both settings and theme store. */
  setTheme(name: ThemeName): void {
    this.#settings = withFieldMode({ ...this.#settings, theme: name });
    theme.setTheme(name);
  }

  /** Toggle between field and light theme. */
  toggleFieldMode(): void {
    const nextTheme: ThemeName = this.#settings.theme === 'field' ? 'light' : 'field';
    this.setTheme(nextTheme);
  }

  /** Reset all settings to defaults. */
  reset(): void {
    this.#settings = withFieldMode(DEFAULT_SETTINGS);
    theme.setTheme(DEFAULT_SETTINGS.theme);
  }

  // ── Persistence ──
  // These are called explicitly by the root layout, not by $effect in the store.
  // Per §3.E: module singletons can't own $effects.

  /** Persist current settings to localStorage. */
  persist(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.#settings));
    } catch {
      // Storage full or unavailable — ignore
    }
  }

  /** Load settings from localStorage, merging with defaults. */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fieldMode: _ignored, ...rest } = parsed;
        this.#settings = withFieldMode({ ...DEFAULT_SETTINGS, ...rest });
        // Sync theme store with loaded theme
        theme.setTheme(this.#settings.theme);
      }
    } catch {
      // Corrupted or unavailable — use defaults
    }
  }
}

/** Singleton app settings store */
export const appSettings = new AppSettingsStore();

/** Export defaults for testing */
export { DEFAULT_SETTINGS, SETTINGS_KEY };
