/**
 * useCommandHistory - Hook for managing command palette history
 * 
 * Tracks command usage history, recent commands, and frequent commands
 * with localStorage persistence.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { storageLog } from '@/src/shared/services/logger';

export interface CommandHistoryEntry {
  commandId: string;
  timestamp: number;
  useCount: number;
}

export interface UseCommandHistoryReturn {
  recordCommand: (commandId: string) => void;
  getRecentCommands: (hoursThreshold?: number) => CommandHistoryEntry[];
  getFrequentCommands: (limit?: number) => CommandHistoryEntry[];
  history: CommandHistoryEntry[];
  clearHistory: () => void;
}

const STORAGE_KEY = 'command-palette-history';

/**
 * Hook for managing command palette history
 */
export const useCommandHistory = (maxEntries: number = 10): UseCommandHistoryReturn => {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      storageLog.warn('Failed to load command history from localStorage:', error);
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      storageLog.warn('Failed to save command history to localStorage:', error);
    }
  }, [history]);

  const recordCommand = useCallback((commandId: string) => {
    setHistory(prev => {
      const now = Date.now();
      const existingIndex = prev.findIndex(entry => entry.commandId === commandId);
      
      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          timestamp: now,
          useCount: updated[existingIndex].useCount + 1
        };
        return updated;
      } else {
        // Add new entry
        const newEntry: CommandHistoryEntry = {
          commandId,
          timestamp: now,
          useCount: 1
        };
        
        // Keep only the most recent entries
        const updated = [newEntry, ...prev].slice(0, maxEntries);
        return updated;
      }
    });
  }, [maxEntries]);

  const getRecentCommands = useCallback((hoursThreshold: number = 24): CommandHistoryEntry[] => {
    const threshold = Date.now() - (hoursThreshold * 60 * 60 * 1000);
    return history
      .filter(entry => entry.timestamp >= threshold)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const getFrequentCommands = useCallback((limit: number = 5): CommandHistoryEntry[] => {
    return [...history]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return useMemo(() => ({
    recordCommand,
    getRecentCommands,
    getFrequentCommands,
    history,
    clearHistory
  }), [recordCommand, getRecentCommands, getFrequentCommands, history, clearHistory]);
};

export default useCommandHistory;