/**
 * KeyboardShortcutsOverlay - Global keyboard shortcuts help (Cmd+?)
 * 
 * Provides a searchable, categorized list of all keyboard shortcuts
 * with context-aware display, filtering, and printable cheat sheet.
 * 
 * Features:
 * - Real-time search across all shortcuts
 * - Context filtering (global, collections, board, viewer, metadata)
 * - Platform-aware key display (⌘ vs Ctrl)
 * - Categorized display with icons
 * - Print-friendly cheat sheet generation
 * - Full keyboard accessibility with focus trap
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Icon } from './Icon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  SHORTCUTS,
  ShortcutDefinition,
  ShortcutContext,
  ShortcutCategory,
  formatShortcut,
  getShortcutsByContext,
  searchShortcuts,
  groupShortcutsByCategory,
  getAvailableContexts,
  getContextLabel,
  getCategoryLabel,
  getCategoryIcon,
  getCheatSheetData,
  CATEGORY_CONFIG,
  compareShortcuts,
} from '../constants/shortcuts';

export interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current context to show context-specific shortcuts */
  currentContext?: ShortcutContext;
}

/**
 * Check if the current platform is macOS
 */
function checkIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Global keyboard shortcuts overlay component
 */
export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
  isOpen,
  onClose,
  currentContext = 'global',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<ShortcutContext | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(() => checkIsMac(), []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedContext('all');
      setSelectedCategory(null);
    }
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Setup focus trap for accessibility
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    focusDelay: 100,
  });

  // Filter shortcuts based on search, context, and category
  const filteredShortcuts = useMemo(() => {
    let shortcuts = SHORTCUTS;

    // Filter by search query
    if (searchQuery.trim()) {
      shortcuts = searchShortcuts(searchQuery);
    }

    // Filter by context
    if (selectedContext !== 'all') {
      shortcuts = shortcuts.filter(s => 
        s.context === 'global' || s.context === selectedContext
      );
    }

    // Filter by category
    if (selectedCategory) {
      shortcuts = shortcuts.filter(s => s.category === selectedCategory);
    }

    // Sort by category order and description
    return shortcuts.sort(compareShortcuts);
  }, [searchQuery, selectedContext, selectedCategory]);

  // Group shortcuts by category for display
  const groupedShortcuts = useMemo(() => {
    return groupShortcutsByCategory(filteredShortcuts);
  }, [filteredShortcuts]);

  // Get sorted category keys
  const sortedCategories = useMemo(() => {
    return (Object.keys(groupedShortcuts) as ShortcutCategory[])
      .sort((a, b) => (CATEGORY_CONFIG[a]?.order || 99) - (CATEGORY_CONFIG[b]?.order || 99));
  }, [groupedShortcuts]);

  // Get available contexts for filter
  const availableContexts = useMemo(() => getAvailableContexts(), []);

  // Count shortcuts per context
  const contextCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SHORTCUTS.length };
    availableContexts.forEach(ctx => {
      counts[ctx] = SHORTCUTS.filter(s => s.context === 'global' || s.context === ctx).length;
    });
    return counts;
  }, [availableContexts]);

  // Handle print cheat sheet
  const handlePrint = useCallback(() => {
    const context = selectedContext === 'all' ? currentContext : (selectedContext as ShortcutContext);
    const data = getCheatSheetData(context);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const platformName = isMac ? 'macOS' : 'Windows/Linux';
    const keyHint = isMac ? '⌘?' : 'Ctrl+?';

    const styleContent = `
      <style>
        @media print {
          @page { margin: 15mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          padding: 20px; 
          max-width: 900px; 
          margin: 0 auto;
          color: #1e293b;
          line-height: 1.5;
        }
        header { 
          border-bottom: 3px solid #0ea5e9; 
          padding-bottom: 15px; 
          margin-bottom: 25px;
        }
        h1 { 
          font-size: 28px; 
          margin: 0 0 5px 0;
          color: #0f172a;
        }
        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }
        .platform {
          display: inline-block;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          color: #475569;
          margin-top: 10px;
        }
        h2 { 
          font-size: 16px; 
          color: #0f172a; 
          margin: 25px 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .shortcuts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 30px;
        }
        @media (max-width: 600px) {
          .shortcuts-grid { grid-template-columns: 1fr; }
        }
        .shortcut { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .shortcut:last-child { border-bottom: none; }
        .keys { 
          font-family: ui-monospace, SFMono-Regular, monospace; 
          background: #f8fafc; 
          border: 1px solid #e2e8f0;
          padding: 4px 10px; 
          border-radius: 6px; 
          font-size: 13px;
          color: #334155;
          font-weight: 500;
          white-space: nowrap;
        }
        .description { 
          color: #475569;
          font-size: 14px;
          flex: 1;
          margin-right: 15px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 12px;
          text-align:
