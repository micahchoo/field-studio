/**
 * CommandPalette - Fuzzy search command palette with history
 * 
 * Provides fzf-style fuzzy matching, command history tracking,
 * recent commands, and rich command previews.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { Button } from '@/src/shared/ui/atoms';
import { fuzzyMatch, FuzzyMatchResult } from '@/utils/fuzzyMatch';
import { CommandHistoryEntry, useCommandHistory } from '@/src/shared/lib/hooks/useCommandHistory';

export interface Command {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Section/category */
  section: string;
  /** Icon name */
  icon?: string;
  /** Keyboard shortcut to display */
  shortcut?: string;
  /** Description of what the command does */
  description?: string;
  /** Execute handler */
  onExecute: () => void;
  /** Whether command is currently available */
  isAvailable?: () => boolean;
}

export interface CommandPaletteProps {
  /** Whether palette is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Available commands */
  commands: Command[];
  /** Maximum history entries to store (default: 10) */
  maxHistoryEntries?: number;
}

type MatchType = 'exact' | 'prefix' | 'word' | 'fuzzy' | 'none';

interface CommandMatch {
  command: Command;
  score: number;
  matchType: MatchType;
  highlightRanges: Array<{ start: number; end: number }>;
  isRecent?: boolean;
  isFrequent?: boolean;
}

const RECENT_THRESHOLD_HOURS = 24;

/**
 * Command palette with fuzzy search and history
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  maxHistoryEntries = 10
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use the command history hook
  const {
    recordCommand,
    getRecentCommands,
    getFrequentCommands,
    history
  } = useCommandHistory(maxHistoryEntries);

  // Filter available commands
  const availableCommands = useMemo(() => {
    return commands.filter(cmd => !cmd.isAvailable || cmd.isAvailable());
  }, [commands]);

  // Calculate matches with proper ordering
  const matches = useMemo<CommandMatch[]>(() => {
    const recentEntries = getRecentCommands(RECENT_THRESHOLD_HOURS);
    const frequentEntries = getFrequentCommands(5);
    const recentIds = new Set(recentEntries.map(e => e.commandId));
    const frequentIds = new Set(frequentEntries.map(e => e.commandId));

    if (!query.trim()) {
      // Show recent and frequent commands when no query
      const results: CommandMatch[] = [];

      // 1. Recent commands (last 24 hours)
      for (const entry of recentEntries) {
        const command = availableCommands.find(c => c.id === entry.commandId);
        if (command) {
          results.push({
            command,
            score: 1000,
            matchType: 'none',
            highlightRanges: [],
            isRecent: true
          });
        }
      }

      // 2. Frequent commands (not already in recent)
      for (const entry of frequentEntries) {
        if (!recentIds.has(entry.commandId)) {
          const command = availableCommands.find(c => c.id === entry.commandId);
          if (command) {
            results.push({
              command,
              score: 900,
              matchType: 'none',
              highlightRanges: [],
              isFrequent: true
            });
          }
        }
      }

      // 3. Remaining commands
      const usedIds = new Set(results.map(m => m.command.id));
      const remainingCommands = availableCommands
        .filter(c => !usedIds.has(c.id))
        .slice(0, 10)
        .map(c => ({
          command: c,
          score: 0,
          matchType: 'none' as MatchType,
          highlightRanges: []
        }));

      return [...results, ...remainingCommands];
    }

    // Fuzzy search with query
    const results: CommandMatch[] = [];

    for (const command of availableCommands) {
      // Match against label (primary)
      const labelMatch = fuzzyMatch(command.label, query);
      
      // Match against section (secondary, lower weight)
      const sectionMatch = fuzzyMatch(command.section, query);
      
      // Match against description (tertiary, lowest weight)
      const descMatch = command.description 
        ? fuzzyMatch(command.description, query)
        : null;

      // Determine best match
      let bestMatch: FuzzyMatchResult | null = null;
      let bestScore = 0;
      let matchType: MatchType = 'none';

      if (labelMatch) {
        bestMatch = labelMatch;
        bestScore = labelMatch.score;
        
        // Determine match type based on score
        if (bestScore >= 100) {
          matchType = 'exact';
        } else if (bestScore >= 50) {
          matchType = 'prefix';
        } else if (bestScore >= 15) {
          matchType = 'word';
        } else {
          matchType = 'fuzzy';
        }
      }

      if (sectionMatch && sectionMatch.score * 0.8 > bestScore) {
        bestMatch = sectionMatch;
        bestScore = sectionMatch.score * 0.8;
        matchType = sectionMatch.score >= 50 ? 'word' : 'fuzzy';
      }

      if (descMatch && descMatch.score * 0.6 > bestScore) {
        bestMatch = descMatch;
        bestScore = descMatch.score * 0.6;
        matchType = 'fuzzy';
      }

      if (bestMatch !== null) {
        // Boost score for recent/frequent commands
        let finalScore = bestScore;
        const historyEntry = history.find(h => h.commandId === command.id);
        
        if (historyEntry) {
          // Boost based on frequency
          finalScore += Math.min(historyEntry.useCount * 5, 25);
          
          // Boost for recent usage
          if (recentIds.has(command.id)) {
            finalScore += 20;
          }
        }

        results.push({
          command,
          score: finalScore,
          matchType,
          highlightRanges: labelMatch?.matches ?? [],
          isRecent: recentIds.has(command.id),
          isFrequent: frequentIds.has(command.id) && !recentIds.has(command.id)
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }, [query, availableCommands, history, getRecentCommands, getFrequentCommands]);

  // Reset selection when matches change
  useEffect(() => {
    setSelectedIndex(0);
  }, [matches.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < matches.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (matches[selectedIndex]) {
            const match = matches[selectedIndex];
            match.command.onExecute();
            recordCommand(match.command.id);
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matches, selectedIndex, onClose, recordCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleExecute = useCallback((match: CommandMatch) => {
    match.command.onExecute();
    recordCommand(match.command.id);
    onClose();
  }, [onClose, recordCommand]);

  // Highlight matching text
  const highlightText = useCallback((text: string, ranges: Array<{ start: number; end: number }>) => {
    if (ranges.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    // Sort ranges by start position
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedRanges.length; i++) {
      const { start, end } = sortedRanges[i];
      
      // Add text before match
      if (start > lastEnd) {
        parts.push(text.slice(lastEnd, start));
      }
      
      // Add highlighted match
      parts.push(
        <mark key={i} className="bg-yellow-200 text-slate-900 font-semibold rounded px-0.5">
          {text.slice(start, end)}
        </mark>
      );
      
      lastEnd = end;
    }

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }

    return parts;
  }, []);

  // Group matches by section when no query
  const groupedMatches = useMemo(() => {
    if (query.trim()) {
      return { searchResults: matches };
    }

    const groups: Record<string, CommandMatch[]> = {};

    // Recent section
    const recent = matches.filter(m => m.isRecent);
    if (recent.length > 0) {
      groups.recent = recent;
    }

    // Frequent section
    const frequent = matches.filter(m => m.isFrequent);
    if (frequent.length > 0) {
      groups.frequent = frequent;
    }

    // All commands by section
    const others = matches.filter(m => !m.isRecent && !m.isFrequent);
    others.forEach(match => {
      const {section} = match.command;
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(match);
    });

    return groups;
  }, [matches, query]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-slate-200 p-4 flex items-center gap-3">
          <Icon name="search" className="text-slate-400 text-xl" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 text-lg outline-none placeholder:text-slate-400 bg-transparent"
            aria-label="Search commands"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <kbd className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2"
          role="listbox"
          aria-label="Command results"
        >
          {matches.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Icon name="search_off" className="text-4xl mb-2 mx-auto" />
              <p>No commands found</p>
            </div>
          ) : (
            Object.entries(groupedMatches).map(([section, sectionMatches]) => (
              <div key={section} role="group" aria-label={section}>
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {section}
                </div>
                {sectionMatches.map((match) => {
                  const isSelected = globalIndex === selectedIndex;
                  const index = globalIndex++;

                  return (
                    <Button
                      key={match.command.id}
                      onClick={() => handleExecute(match)}
                      variant="ghost"
                      fullWidth
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        border: 'none',
                        borderRadius: 0,
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {match.command.icon && (
                          <Icon 
                            name={match.command.icon} 
                            className={`text-lg ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">
                            {highlightText(match.command.label, match.highlightRanges)}
                          </div>
                          {match.command.description && (
                            <div className="text-xs text-slate-400 truncate">
                              {match.command.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {match.isRecent && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              recent
                            </span>
                          )}
                          {match.command.shortcut && (
                            <kbd className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono">
                              {match.command.shortcut}
                            </kbd>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-2 flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">Enter</kbd>
            <span>Select</span>
          </div>
          <div className="flex-1" />
          <span>{matches.length} commands</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
