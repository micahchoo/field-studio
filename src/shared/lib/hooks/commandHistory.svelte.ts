/**
 * Command History — Persistent state (Category 5)
 *
 * Replaces useCommandHistory React hook.
 * Architecture doc §4 Cat 5: $state + explicit persist.
 *
 * Tracks command palette usage for recent/frequent suggestions.
 * Persisted to localStorage. Consumers should call persist() from
 * a Svelte $effect to write changes back to storage.
 *
 * Usage in Svelte:
 *   import { commandHistory } from './commandHistory.svelte';
 *   commandHistory.record('toggle-dark-mode', 'Toggle Dark Mode');
 *   // In component: $effect(() => commandHistory.persist());
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface CommandHistoryEntry {
  /** Unique command identifier */
  id: string;
  /** Human-readable command name */
  label: string;
  /** Timestamp (ms since epoch) of last use */
  lastUsed: number;
  /** Total number of times this command has been used */
  useCount: number;
}

// --------------------------------------------------------------------------
// CommandHistoryStore
// --------------------------------------------------------------------------

export class CommandHistoryStore {
  #entries = $state<CommandHistoryEntry[]>([]);
  #storageKey = 'field-studio-command-history';
  #maxEntries = 50;

  // ---- Constructor: load from localStorage ----

  /**
   * Pseudocode:
   *   1. Try to read #storageKey from localStorage
   *   2. Parse JSON, validate it's an array
   *   3. Assign to #entries, or fall back to empty array
   */
  constructor() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.#entries = parsed as CommandHistoryEntry[];
        }
      }
    } catch {
      // localStorage unavailable or corrupted — start fresh
      this.#entries = [];
    }
  }

  // ---- Getters ----

  /** All entries, newest first */
  get entries(): CommandHistoryEntry[] {
    return this.#entries;
  }

  /**
   * Commands used within the last hour, sorted by lastUsed descending.
   *
   * Pseudocode:
   *   1. Calculate cutoff = now - 1 hour
   *   2. Filter entries where lastUsed >= cutoff
   *   3. Sort descending by lastUsed
   */
  get recentCommands(): CommandHistoryEntry[] {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.#entries
      .filter((e) => e.lastUsed >= oneHourAgo)
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }

  /**
   * Top 5 most-used commands, sorted by useCount descending.
   *
   * Pseudocode:
   *   1. Sort all entries by useCount descending
   *   2. Take the first 5
   */
  get frequentCommands(): CommandHistoryEntry[] {
    return [...this.#entries].sort((a, b) => b.useCount - a.useCount).slice(0, 5);
  }

  // ---- Mutations ----

  /**
   * Record a command usage. Updates existing entry or creates a new one.
   *
   * Pseudocode:
   *   1. Find existing entry by id
   *   2. If found: increment useCount, update lastUsed and label
   *   3. If not found: create new entry with useCount=1
   *   4. Trim to #maxEntries (evict least-recently-used)
   */
  record(id: string, label: string): void {
    const now = Date.now();
    const existingIdx = this.#entries.findIndex((e) => e.id === id);

    if (existingIdx >= 0) {
      // Update existing entry
      const updated = [...this.#entries];
      updated[existingIdx] = {
        ...updated[existingIdx],
        label,
        lastUsed: now,
        useCount: updated[existingIdx].useCount + 1,
      };
      this.#entries = updated;
    } else {
      // Add new entry
      const newEntry: CommandHistoryEntry = { id, label, lastUsed: now, useCount: 1 };
      this.#entries = [newEntry, ...this.#entries];
    }

    // Trim if over max — evict the entry with the oldest lastUsed
    if (this.#entries.length > this.#maxEntries) {
      const sorted = [...this.#entries].sort((a, b) => b.lastUsed - a.lastUsed);
      this.#entries = sorted.slice(0, this.#maxEntries);
    }
  }

  /**
   * Clear all command history.
   *
   * Pseudocode:
   *   1. Reset entries to empty array
   *   2. Remove from localStorage
   */
  clear(): void {
    this.#entries = [];
    try {
      localStorage.removeItem(this.#storageKey);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Persist current state to localStorage.
   * Call from a Svelte $effect to auto-persist on changes.
   *
   * Pseudocode:
   *   1. Serialize #entries to JSON
   *   2. Write to localStorage under #storageKey
   */
  persist(): void {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(this.#entries));
    } catch {
      // Storage full or unavailable — silently fail
    }
  }
}

// --------------------------------------------------------------------------
// Singleton export — shared across the app
// --------------------------------------------------------------------------

export const commandHistory = new CommandHistoryStore();
