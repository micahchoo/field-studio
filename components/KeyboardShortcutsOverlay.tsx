/**
 * KeyboardShortcutsOverlay - Global keyboard shortcuts help (Cmd+?)
 * 
 * Provides a searchable, categorized list of all keyboard shortcuts
 * with context-aware display and printable cheat sheet.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icon';

export interface ShortcutDefinition {
  /** Keyboard keys (e.g., ['Cmd', 'K']) */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Icon for visual identification */
  icon?: string;
}

export interface ShortcutCategory {
  /** Category name */
  name: string;
  /** Icon for the category */
  icon: string;
  /** Shortcuts in this category */
  shortcuts: ShortcutDefinition[];
  /** Whether this category is context-specific */
  isContextual?: boolean;
}

export interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** All shortcut categories */
  categories: ShortcutCategory[];
  /** Current context (e.g., 'archive', 'collections', 'viewer') */
  currentContext?: string;
}

/**
 * Global keyboard shortcuts overlay component
 * 
 * @example
 * <KeyboardShortcutsOverlay
 *   isOpen={showShortcuts}
 *   onClose={() => setShowShortcuts(false)}
 *   categories={GLOBAL_SHORTCUTS}
 *   currentContext="archive"
 * />
 */
export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
  isOpen,
  onClose,
  categories,
  currentContext
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter categories based on search and context
  const filteredCategories = useMemo(() => {
    let cats = categories;

    // Filter by context if specified
    if (currentContext) {
      cats = cats.filter(cat => !cat.isContextual || cat.name.toLowerCase() === currentContext.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cats = cats.map(cat => ({
        ...cat,
        shortcuts: cat.shortcuts.filter(shortcut =>
          shortcut.description.toLowerCase().includes(query) ||
          shortcut.keys.some(k => k.toLowerCase().includes(query))
        )
      })).filter(cat => cat.shortcuts.length > 0);
    }

    // If active category selected, only show that one
    if (activeCategory) {
      cats = cats.filter(cat => cat.name === activeCategory);
    }

    return cats;
  }, [categories, currentContext, searchQuery, activeCategory]);

  // Get all unique category names for tabs
  const allCategories = useMemo(() => {
    return categories.filter(cat => !cat.isContextual || !currentContext || cat.name.toLowerCase() === currentContext.toLowerCase());
  }, [categories, currentContext]);

  // Format key combo for display
  const formatKeys = (keys: string[]): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    return keys.map(key => {
      if (key === 'Cmd') return isMac ? '⌘' : 'Ctrl';
      if (key === 'Alt') return isMac ? '⌥' : 'Alt';
      if (key === 'Shift') return isMac ? '⇧' : 'Shift';
      if (key === 'Ctrl') return isMac ? '⌃' : 'Ctrl';
      return key;
    }).join(isMac ? '' : '+');
  };

  // Printable cheat sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const keySeparator = isMac ? '' : '+';

    const content = `
      <html>
        <head>
          <title>Field Studio - Keyboard Shortcuts</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 16px; color: #666; margin-top: 32px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
            .shortcut { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .keys { font-family: monospace; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
            .description { color: #333; }
            .date { color: #999; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <h1>Field Studio Keyboard Shortcuts</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          ${categories.map(cat => `
            <h2>${cat.name}</h2>
            ${cat.shortcuts.map(s => `
              <div class="shortcut">
                <span class="description">${s.description}</span>
                <span class="keys">${s.keys.join(keySeparator)}</span>
              </div>
            `).join('')}
          `).join('')}
          <p class="date">Press Cmd+? (or Ctrl+?) anytime to view this overlay</p>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200 p-4 flex items-center gap-4">
          <Icon name="keyboard" className="text-iiif-blue text-2xl" />
          <h2 className="text-xl font-bold text-slate-800 flex-1">Keyboard Shortcuts</h2>
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none"
              autoFocus
            />
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="print" className="text-sm" />
            Print
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Category tabs */}
        {!searchQuery && !activeCategory && (
          <div className="border-b border-slate-200 px-4 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border-b-2 border-iiif-blue"
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 whitespace-nowrap"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Back button when viewing single category */}
        {activeCategory && !searchQuery && (
          <div className="border-b border-slate-200 px-4 py-2">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              <Icon name="arrow_back" className="text-sm" />
              Back to all categories
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icon name="search_off" className="text-4xl mb-2 mx-auto" />
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCategories.map(category => (
                <div key={category.name} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name={category.icon} className="text-iiif-blue" />
                    <h3 className="font-bold text-slate-800">{category.name}</h3>
                    {category.isContextual && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {shortcut.icon && (
                            <Icon name={shortcut.icon} className="text-slate-400 group-hover:text-slate-600" />
                          )}
                          <span className="text-sm text-slate-700">{shortcut.description}</span>
                        </div>
                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600 shadow-sm">
                          {formatKeys(shortcut.keys)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">?</kbd>
              to toggle
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono">Esc</kbd>
              to close
            </span>
          </div>
          <span>Press Cmd+? (or Ctrl+?) anytime</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Default global shortcuts for Field Studio
 */
export const GLOBAL_SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'Navigation',
    icon: 'navigation',
    shortcuts: [
      { keys: ['Cmd', 'K'], description: 'Open Command Palette', icon: 'search' },
      { keys: ['Cmd', '1'], description: 'Go to Archive View', icon: 'inventory_2' },
      { keys: ['Cmd', '2'], description: 'Go to Collections', icon: 'folder_special' },
      { keys: ['Cmd', '3'], description: 'Go to Metadata', icon: 'table_chart' },
      { keys: ['Cmd', '4'], description: 'Go to Search', icon: 'search' },
    ]
