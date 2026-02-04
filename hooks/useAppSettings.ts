/**
 * App Settings Management Hook
 *
 * Manages application settings with localStorage persistence.
 * Handles defaults, merging, and auto-save.
 */

import { useCallback, useEffect, useState } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_INGEST_PREFS, DEFAULT_MAP_CONFIG, DEFAULT_ZOOM_CONFIG, IIIF_CONFIG, METADATA_TEMPLATES } from '../constants';

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

interface UseAppSettingsReturn {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
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
      console.warn('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleFieldMode = useCallback(() => {
    setSettings(prev => ({ ...prev, fieldMode: !prev.fieldMode }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    toggleFieldMode,
    resetSettings,
  };
}

export default useAppSettings;
