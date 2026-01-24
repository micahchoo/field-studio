/**
 * Inspector Tabs Hook
 *
 * Manages tab state with localStorage persistence per resource type.
 */

import { useState, useEffect, useCallback } from 'react';

export type InspectorTab = 'metadata' | 'provenance' | 'geo' | 'learn';

const VALID_TABS: InspectorTab[] = ['metadata', 'provenance', 'geo', 'learn'];

function getStorageKey(resourceType: string): string {
  return `inspector-tab-${resourceType}`;
}

function getStoredTab(resourceType: string): InspectorTab {
  try {
    const stored = localStorage.getItem(getStorageKey(resourceType));
    if (stored && VALID_TABS.includes(stored as InspectorTab)) {
      return stored as InspectorTab;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'metadata';
}

function storeTab(resourceType: string, tab: InspectorTab): void {
  try {
    localStorage.setItem(getStorageKey(resourceType), tab);
  } catch {
    // localStorage may be unavailable
  }
}

interface UseInspectorTabsReturn {
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
}

export function useInspectorTabs(resourceType: string | undefined): UseInspectorTabsReturn {
  const [tab, setTabInternal] = useState<InspectorTab>(() =>
    resourceType ? getStoredTab(resourceType) : 'metadata'
  );

  // Restore tab when resource type changes
  useEffect(() => {
    if (resourceType) {
      setTabInternal(getStoredTab(resourceType));
    }
  }, [resourceType]);

  // Persist tab when it changes
  const setTab = useCallback((newTab: InspectorTab) => {
    setTabInternal(newTab);
    if (resourceType) {
      storeTab(resourceType, newTab);
    }
  }, [resourceType]);

  return { tab, setTab };
}

export default useInspectorTabs;
