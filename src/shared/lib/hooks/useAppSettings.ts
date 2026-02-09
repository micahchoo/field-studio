/**
 * App Settings Management Hook
 *
 * Manages application settings with localStorage persistence.
 * Handles defaults, merging, and auto-save.
 *
 * LOCATION: app/providers/
 * This is a template-level hook that provides global app settings context.
 * Organisms should NOT import this directly - receive via FieldModeTemplate props.
 */

import { useCallback, useEffect, useState } from 'react';
import { storageLog } from '@/src/shared/services/logger';
import { AppSettings } from '@/src/shared/types';
import { DEFAULT_INGEST_PREFS, DEFAULT_MAP_CONFIG, DEFAULT_ZOOM_CONFIG, IIIF_CONFIG, METADATA_TEMPLATES } from '@/src/shared/constants';
import type { ThemeName } from '@/src/shared/config/themes/types';
import { themeBus } from '@/src/shared/lib/theme-bus';

const SETTINGS_KEY = 'iiif-field-settings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultBaseUrl: IIIF_CONFIG.BASE_URL.DEFAULT,
  language: 'en',
  theme: 'light',
  fieldMode: false,
  abstractionLevel: 'standard',
  mapConfig: DEFAULT_MAP_CONFIG,
  zoomConfig: DEFAULT_ZOOM_CONFIG,
  height: 800,
  ingestPreferences: DEFAULT_INGEST_PREFS,
  autoSaveInterval: 30,
  showTechnicalIds: false,
  metadataTemplate: METADATA_TEMPLATES.ARCHIVIST,
  metadataComplexity: 'standard',
};

export interface UseAppSettingsReturn {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setTheme: (theme: ThemeName) => void;
  toggleFieldMode: () => void;
  resetSettings: () => void;
}

export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge stored settings with defaults (in case new settings were added)
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      storageLog.warn('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      storageLog.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Sync theme bus whenever settings.theme changes
  useEffect(() => {
    themeBus.setTheme(settings.theme as ThemeName);
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Set theme by name. Derives fieldMode from the theme value
   * so existing `fieldMode: boolean` consumers keep working.
   */
  const setTheme = useCallback((theme: ThemeName) => {
    setSettings(prev => ({
      ...prev,
      theme,
      fieldMode: theme === 'field',
    }));
  }, []);

  /**
   * Toggle field mode. Also syncs the theme field bidirectionally:
   * turning fieldMode ON sets theme='field', turning it OFF sets theme='light'.
   */
  const toggleFieldMode = useCallback(() => {
    setSettings(prev => {
      const nextFieldMode = !prev.fieldMode;
      return {
        ...prev,
        fieldMode: nextFieldMode,
        theme: nextFieldMode ? 'field' : (prev.theme === 'field' ? 'light' : prev.theme),
      };
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    setTheme,
    toggleFieldMode,
    resetSettings,
  };
}

export default useAppSettings;
