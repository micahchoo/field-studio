/**
 * Command history hook with localStorage persistence
 * 
 * Tracks command usage and provides recent/frequent command access.
 */

import { useCallback, useState, useEffect } from 'react';

export interface CommandHistoryEntry {
  /** Command identifier */
  commandId: string;
  /** Timestamp of last use */
  usedAt: number;
  /** Number of times command was used */
  useCount: number;
}

const STORAGE_KEY = 'field-studio:command-history';
const DEFAULT_MAX_ENTRIES = 10;

/**
 * Hook for managing command history
 */
export function useCommandHistory(maxEntries: number = DEFAULT_MAX_ENTRIES): {
  /** Record a command usage */
  recordCommand: (commandId: string) => void;
  /** Get commands used within the last N hours */
  getRecentCommands: (hours?: number) => CommandHistoryEntry[];
  /** Get most frequently used commands */
  getFrequentCommands: (limit?: number) => CommandHistoryEntry[];
  /** Full history array */
  history: CommandHistoryEntry[];
  /** Clear all history */
  clearHistory: () => void;
} {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CommandHistoryEntry[];
        // Validate and filter entries
        const validEntries = Array.isArray(parsed) 
          ? parsed.filter(entry => 
              entry && 
              typeof entry.commandId === 'string' &&
              typeof entry.usedAt === 'number' &&
              typeof entry.useCount === 'number'
            )
          : [];
        setHistory(validEntries);
      }
    } catch {
      // Ignore parse errors or localStorage errors
      setHistory([]);
    }
    setIsLoaded(true);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch {
        // Ignore localStorage errors (e.g., quota exceeded)
      }
    }
  }, [history, isLoaded]);

  /**
   * Record a command usage
   */
  const recordCommand = useCallback((commandId: string) => {
    if (!commandId) return;

    setHistory(prev => {
      const now = Date.now();
      const existingIndex = prev.findIndex(h => h.commandId === commandId);
      let newHistory: CommandHistoryEntry[];

      if (existingIndex !== -1) {
        // Update existing entry
        newHistory = [...prev];
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          usedAt: now,
          useCount: newHistory[existingIndex].useCount + 1
        };
      } else {
        // Add new entry
        newHistory = [...prev, { commandId, usedAt: now, useCount: 1 }];
      }

      // Sort by useCount descending, then by usedAt descending
      newHistory.sort((a, b) => {
        if (b.useCount !== a.useCount) {
          return b.useCount - a.useCount;
        }
        return b.usedAt - a.usedAt;
      });

      // Limit entries
      if (newHistory.length > maxEntries) {
        newHistory = newHistory.slice(0, maxEntries);
      }

      return newHistory;
    });
  }, [maxEntries]);

  /**
   * Get commands used within the last N hours
   */
  const getRecentCommands = useCallback((hours: number = 24): CommandHistoryEntry[] => {
    const now = Date.now();
    const thresholdMs = hours * 60 * 60 * 1000;
    
    return history
      .filter(entry => now - entry.usedAt < thresholdMs)
      .sort((a, b) => b.usedAt - a.usedAt); // Sort by most recent first
  }, [history]);

  /**
   * Get most frequently used commands
   */
  const getFrequentCommands = useCallback((limit: number = 5): CommandHistoryEntry[] => {
    return history
      .slice(0, limit)
      .sort((a, b) => {
        if (b.useCount !== a.useCount) {
          return b.useCount - a.useCount;
        }
        return b.usedAt - a.usedAt;
      });
  }, [history]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    recordCommand,
    getRecentCommands,
    getFrequentCommands,
    history,
    clearHistory
  };
}

export default useCommandHistory;
