/**
 * usePersistedTab
 *
 * Generic hook for tab state that survives page reloads.
 * Reads/writes to localStorage under a namespaced key.
 * Validates stored value against an allowlist to guard against stale data.
 *
 * @param namespace   Prefix for the storage key (e.g. 'inspector')
 * @param key         Secondary key segment (e.g. the resource type)
 * @param allowedValues  Exhaustive list of valid tab identifiers
 * @param defaultValue   Fallback when storage is empty or invalid
 */

import { useState, useEffect, useRef } from 'react';

export function usePersistedTab<T extends string>(
  namespace: string,
  key: string,
  allowedValues: readonly T[],
  defaultValue: T
): [T, (tab: T) => void] {
  const storageKey = `${namespace}-tab-${key}`;

  const [tab, setTab] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && allowedValues.includes(stored as T)) {
        return stored as T;
      }
    } catch {}
    return defaultValue;
  });

  // Write on tab change; skip on key-switch to let the re-read effect load first
  const prevKeyRef = useRef(storageKey);
  useEffect(() => {
    if (storageKey !== prevKeyRef.current) {
      prevKeyRef.current = storageKey;
      return; // key changed — re-read effect will set the correct tab
    }
    try {
      localStorage.setItem(storageKey, tab);
    } catch {}
  }, [tab, storageKey]);

  // If the key changes (e.g. user selects a different resource), re-read storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && allowedValues.includes(stored as T)) {
        setTab(stored as T);
        return;
      }
    } catch {}
    setTab(defaultValue);
  }, [storageKey, defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return [tab, setTab];
}
