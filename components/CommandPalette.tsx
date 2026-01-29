/**
 * CommandPalette - Fuzzy search command palette with history
 * 
 * Provides fzf-style fuzzy matching, command history tracking,
 * recent commands, and rich command previews.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from './Icon';

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

export interface CommandHistoryEntry {
  commandId: string;
  usedAt: number;
  useCount: number;
}

export interface CommandPaletteProps {
  /** Whether palette is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Available commands */
  commands: Command[];
  /** Maximum history entries to store */
  maxHistoryEntries?: number;
}

interface CommandMatch {
  command: Command;
  score: number;
  matchType: 'exact' | 'prefix' | 'substring' | 'fuzzy';
  highlightRanges: [number, number][];
  isRecent?: boolean;
  isFrequent?: boolean;
}

const HISTORY_STORAGE_KEY = 'field-studio:command-history';
const RECENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fuzzy matching algorithm (simplified fzf-style)
 */
function fuzzyMatch(text: string, pattern: string): [boolean, number, [number, number][]] {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  // Exact match
  if (textLower === patternLower) {
    return [true, 100, [[0, text.length]]];
  }
  
  // Prefix match
  if (textLower.startsWith(patternLower)) {
    return [true, 80, [[0, pattern.length]]];
  }
  
  // Substring match
  const substringIndex = textLower.indexOf(patternLower);
  if (substringIndex !== -1) {
    return [true, 60, [[substringIndex, substringIndex + pattern.length]]];
  }
  
  // Fuzzy match
  let patternIdx = 0;
  let textIdx = 0;
  const matches: [number, number][] = [];
  let matchStart = -1;
  let score = 40;
  
  while (patternIdx < pattern.length && textIdx < text.length) {
    if (textLower[textIdx] === patternLower[patternIdx]) {
      if (matchStart === -1) {
        matchStart = textIdx;
      }
      patternIdx++;
      
      // Bonus for consecutive matches
      if (textIdx > 0 && textLower[textIdx - 1] === patternLower[patternIdx - 2]) {
        score += 5;
      }
      // Bonus for word boundaries
      if (textIdx === 0 || text[textIdx - 1] === ' ' || text[textIdx - 1] === '-') {
        score += 10;
      }
    } else if (matchStart !== -1) {
      matches.push([matchStart, textIdx]);
      matchStart = -1;
      score -= 2; // Penalty for gaps
    }
    textIdx++;
  }
  
  if (matchStart !== -1) {
    matches.push([matchStart, textIdx]);
  }
  
  if (patternIdx === pattern.length) {
    return [true, Math.max(0, score), matches];
  }
  
  return [false, 0, []];
}

/**
 * Command palette with fuzzy search and history
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  maxHistoryEntries = 50
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save history when it changes
  const saveHistory = useCallback((newHistory: CommandHistoryEntry[]) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    setHistory(newHistory);
  }, []);

  // Record command usage
  const recordUsage = useCallback((commandId: string) => {
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
      if (newHistory.length > maxHistoryEntries) {
        newHistory = newHistory.slice(0, maxHistoryEntries);
      }
      
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [maxHistoryEntries]);

  // Filter available commands
  const availableCommands = useMemo(() => {
    return commands.filter(cmd => !cmd.isAvailable || cmd.isAvailable());
  }, [commands]);

  // Calculate matches
  const matches = useMemo<CommandMatch[]>(() => {
    if (!query.trim()) {
      // Show recent and frequent when no query
      const now = Date.now();
      const recentEntries = history.filter(h => now - h.usedAt < RECENT_THRESHOLD_MS);
      const frequentEntries = history.filter(h => !recentEntries.includes(h));
      
      const recentCommands = recentEntries
        .map(h => availableCommands.find(c => c.id === h.commandId))
        .filter((c): c is Command => c !== undefined)
        .slice(0, 5)
        .map(c => ({ 
          command: c, 
          score: 1000, 
          matchType: 'exact' as const, 
          highlightRanges: [],
          isRecent: true 
        }));
      
      const frequentCommands = frequentEntries
        .map(h => availableCommands.find(c => c.id === h.commandId))
        .filter((c): c is Command => c !== undefined)
        .slice(0, 5)
        .map(c => ({ 
          command: c, 
          score: 900, 
          matchType: 'exact' as const, 
          highlightRanges: [],
          isFrequent: true 
        }));
      
      // Add remaining commands
      const usedIds = new Set([...recentCommands, ...frequentCommands].map(m => m.command.id));
      const remainingCommands = availableCommands
        .filter(c => !usedIds.has(c.id))
        .slice(0, 10)
        .map(c => ({ command: c, score: 0, matchType: 'exact' as const, highlightRanges: [] }));
      
      return [...recentCommands, ...frequentCommands, ...remainingCommands];
    }
    
    // Fuzzy search with query
    const results: CommandMatch[] = [];
    
    for (const command of availableCommands) {
      // Match against label
      const [labelMatches, labelScore, labelRanges] = fuzzyMatch(command.label, query);
      
      // Match against section
      const [sectionMatches, sectionScore, sectionRanges] = fuzzyMatch(command.section, query);
      
      // Match against description
      const [descMatches, descScore, descRanges] = command.description 
        ? fuzzyMatch(command.description, query)
        : [false, 0, []];
      
      if (labelMatches || sectionMatches || descMatches) {
        const bestScore = Math.max(
          labelMatches ? labelScore : 0,
          sectionMatches ? sectionScore * 0.8 : 0,
          descMatches ? descScore * 0.6 : 0
        );
        
        const bestRanges = labelMatches ? labelRanges : 
                          sectionMatches ? sectionRanges : descRanges;
        
        const matchType: CommandMatch['matchType'] = 
          labelScore === 100 ? 'exact' :
          labelScore >= 80 ? 'prefix' :
          labelScore >= 60 ? 'substring' : 'fuzzy';
        
        // Boost score for recent/frequent commands
        const historyEntry = history.find(h => h.commandId === command.id);
        let finalScore = bestScore;
        if (historyEntry) {
          finalScore += Math.min(historyEntry.useCount * 5, 25);
        }
        
        results.push({
          command,
          score: finalScore,
          matchType,
          highlightRanges: bestRanges,
          isRecent: historyEntry ? Date.now() - historyEntry.usedAt < RECENT_THRESHOLD_MS : false
        });
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results;
  }, [query, availableCommands, history]);

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
            recordUsage(match.command.id);
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matches, selectedIndex, onClose, recordUsage]);

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
    recordUsage(match.command.id);
    onClose();
  }, [onClose, recordUsage]);

  // Highlight matching text
  const highlightText = (text: string, ranges: [number, number][]) => {
    if (ranges.length === 0) return text;
    
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    
    ranges.forEach(([start, end], i) => {
      if (start > lastEnd) {
        parts.push(text.slice(lastEnd, start));
      }
      parts.push(
        <mark key={i} className="bg-yellow-200 text-slate-900 font-semibold">
          {text.slice(start, end)}
        </mark>
      );
      lastEnd = end;
    });
    
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }
    
    return parts;
  };

  if (!isOpen) return null;

  // Group matches by section when no query
  const groupedMatches = useMemo(() => {
    if (query.trim()) {
      return { 'Search Results': matches };
    }
    
    const groups: Record<string, CommandMatch[]> = {};
    
    // Recent section
    const recent = matches.filter(m => m.isRecent);
    if (recent.length > 0) {
      groups['Recent'] = recent;
    }
    
    // Frequent section
    const frequent = matches.filter(m => m.isFrequent && !m.isRecent);
    if (frequent.length > 0) {
      groups['Frequent'] = frequent;
    }
    
    // All commands by section
    const others = matches.filter(m => !m.isRecent && !m.isFrequent);
    others.forEach(match => {
      const section = match.command.section;
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(match);
    });
    
    return groups;
  }, [matches, query]);

  let globalIndex = 0;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
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
            className="flex-1 text-lg outline-none placeholder:text-slate-400"
            aria-label="Search commands"
          />
          <kbd className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2"
        >
          {matches.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Icon name="search_off" className="text-4xl mb-2 mx-auto" />
              <p>No commands found</p>
            </div>
          ) : (
            Object.entries(groupedMatches).map(([section, sectionMatches]) => (
              <div key={section}>
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {section}
                </div>
                {sectionMatches.map((match) => {
                  const isSelected = globalIndex === selectedIndex;
                  const index = globalIndex++;
                  
                  return (
                    <button
                      key={match.command.id}
                      onClick={() => handleExecute(match)}
                      className={`
                        w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                        ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}
                      `}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {match.command.icon && (
                        <Icon 
                          name={match.command.icon} 
                          className={`text-lg ${isSelected ? 'text-iiif-blue' : 'text-slate-400'}`}
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
                    </button>
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
