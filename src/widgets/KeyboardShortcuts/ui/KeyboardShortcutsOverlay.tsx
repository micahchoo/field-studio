/**
 * KeyboardShortcutsOverlay - Global keyboard shortcuts help (Cmd+?)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useFocusTrap } from '@/src/shared/lib/hooks/useFocusTrap';
import {
  CATEGORY_CONFIG,
  compareShortcuts,
  formatShortcut,
  getAvailableContexts,
  getCategoryIcon,
  getCategoryLabel,
  getCheatSheetData,
  getContextLabel,
  getShortcutsByContext,
  groupShortcutsByCategory,
  searchShortcuts,
  ShortcutCategory,
  ShortcutContext,
  ShortcutDefinition,
  SHORTCUTS,
} from '../constants/shortcuts';

export interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext?: ShortcutContext;
}

function checkIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

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

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedContext('all');
      setSelectedCategory(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    focusDelay: 100,
  });

  const filteredShortcuts = useMemo(() => {
    let shortcuts = SHORTCUTS;
    if (searchQuery.trim()) {
      shortcuts = searchShortcuts(searchQuery);
    }
    if (selectedContext !== 'all') {
      shortcuts = shortcuts.filter(s => 
        s.context === 'global' || s.context === selectedContext
      );
    }
    if (selectedCategory) {
      shortcuts = shortcuts.filter(s => s.category === selectedCategory);
    }
    return shortcuts.sort(compareShortcuts);
  }, [searchQuery, selectedContext, selectedCategory]);

  const groupedShortcuts = useMemo(() => {
    return groupShortcutsByCategory(filteredShortcuts);
  }, [filteredShortcuts]);

  const sortedCategories = useMemo(() => {
    return (Object.keys(groupedShortcuts) as ShortcutCategory[])
      .sort((a, b) => (CATEGORY_CONFIG[a]?.order || 99) - (CATEGORY_CONFIG[b]?.order || 99));
  }, [groupedShortcuts]);

  const availableContexts = useMemo(() => getAvailableContexts(), []);

  const contextCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SHORTCUTS.length };
    availableContexts.forEach(ctx => {
      counts[ctx] = SHORTCUTS.filter(s => s.context === 'global' || s.context === ctx).length;
    });
    return counts;
  }, [availableContexts]);

  const handlePrint = useCallback(() => {
    const context = selectedContext === 'all' ? currentContext : (selectedContext as ShortcutContext);
    const data = getCheatSheetData(context);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const platformName = isMac ? 'macOS' : 'Windows/Linux';
    const keyHint = isMac ? '⌘?' : 'Ctrl+?';

    let categoriesHtml = '';
    data.categories.forEach(cat => {
      let shortcutsHtml = '';
      cat.shortcuts.forEach(s => {
        shortcutsHtml += `<div class="shortcut"><span class="description">${s.description}</span><span class="keys">${s.keys}</span></div>`;
      });
      categoriesHtml += `<h2>${cat.name}</h2><div class="shortcuts-grid">${shortcutsHtml}</div>`;
    });

    const content = `<!DOCTYPE html>
<html>
<head>
<title>Field Studio - Keyboard Shortcuts</title>
<meta charset="utf-8">
<style>
@media print {
  @page { margin: 15mm; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #1e293b; line-height: 1.5; }
header { border-bottom: 3px solid #0ea5e9; padding-bottom: 15px; margin-bottom: 25px; }
h1 { font-size: 28px; margin: 0 0 5px 0; color: #0f172a; }
.subtitle { color: #64748b; font-size: 14px; margin: 0; }
.platform { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #475569; margin-top: 10px; }
h2 { font-size: 16px; color: #0f172a; margin: 25px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
.shortcuts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; }
@media (max-width: 600px) { .shortcuts-grid { grid-template-columns: 1fr; } }
.shortcut { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.shortcut:last-child { border-bottom: none; }
.keys { font-family: ui-monospace, SFMono-Regular, monospace; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 13px; color: #334155; font-weight: 500; white-space: nowrap; }
.description { color: #475569; font-size: 14px; flex: 1; margin-right: 15px; }
.footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
.tip { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px 15px; margin: 20px 0; border-radius: 0 6px 6px 0; font-size: 13px; color: #0369a1; }
</style>
</head>
<body>
<header>
<h1>Field Studio Keyboard Shortcuts</h1>
<p class="subtitle">Context: ${data.context} - Generated on ${data.generatedAt}</p>
<span class="platform">${platformName} shortcuts shown</span>
</header>
<div class="tip"><strong>Tip:</strong> Press <strong>${keyHint}</strong> anytime to open this overlay from anywhere in the app.</div>
${categoriesHtml}
<div class="footer">IIIF Field Archive Studio - Press ${keyHint} anytime to view shortcuts</div>
</body>
</html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [selectedContext, currentContext, isMac]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && searchQuery) {
      e.stopPropagation();
      setSearchQuery('');
      searchInputRef.current?.focus();
    }
    if (!searchQuery && e.key >= '1' && e.key <= '6') {
      const idx = parseInt(e.key) - 1;
      const cats = sortedCategories;
      if (cats[idx]) {
        setSelectedCategory(selectedCategory === cats[idx] ? null : cats[idx]);
      }
    }
  }, [searchQuery, sortedCategories, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={containerRef}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-iiif-blue/10 flex items-center justify-center">
              <Icon name="keyboard" className="text-iiif-blue text-xl" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">?</kbd> to toggle - <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Esc</kbd> to close
              </p>
            </div>
          </div>
          
          <div className="flex-1 w-full sm:w-auto flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none placeholder:text-slate-400 transition-all"
                aria-label="Search keyboard shortcuts"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                  aria-label="Clear search"
                >
                  <Icon name="close" className="text-slate-400 text-sm" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Print cheat sheet"
              title="Print cheat sheet"
            >
              <Icon name="print" className="text-lg" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close shortcuts overlay"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Context:</span>
            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value as ShortcutContext | 'all')}
              className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none"
              aria-label="Filter by context"
            >
              <option value="all">All Contexts ({contextCounts.all})</option>
              {availableContexts.map(ctx => (
                <option key={ctx} value={ctx}>
                  {getContextLabel(ctx)} ({contextCounts[ctx]})
                </option>
              ))}
            </select>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">Category:</span>
            {sortedCategories.slice(0, 4).map((cat, idx) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${selectedCategory === cat ? 'bg-iiif-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={`Press ${idx + 1} to toggle`}
              >
                <Icon name={getCategoryIcon(cat)} className="text-sm" />
                {getCategoryLabel(cat)}
              </button>
            ))}
            {selectedCategory && !sortedCategories.slice(0, 4).includes(selectedCategory) && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-iiif-blue text-white transition-all"
              >
                {getCategoryLabel(selectedCategory)}
              </button>
            )}
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label="Clear category filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="search_off" className="text-5xl mb-4 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-2">No shortcuts found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your search or filters</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedContext('all'); }}
                className="mt-4 px-4 py-2 text-sm text-iiif-blue hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map(category => {
                const shortcuts = groupedShortcuts[category];
                if (!shortcuts?.length) return null;
                return (
                  <section key={category} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5" aria-labelledby={`category-${category}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center">
                        <Icon name={getCategoryIcon(category)} className="text-iiif-blue" />
                      </div>
                      <h3 id={`category-${category}`} className="font-bold text-slate-800 dark:text-slate-200 text-lg">{getCategoryLabel(category)}</h3>
                      <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{shortcuts.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {shortcuts.map((shortcut) => (
                        <div key={shortcut.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-iiif-blue/30 dark:hover:border-iiif-blue/30 hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                            {shortcut.icon && <Icon name={shortcut.icon} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />}
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{shortcut.description}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {shortcut.context !== 'global' && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{getContextLabel(shortcut.context)}</span>
                            )}
                            <kbd className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-sm whitespace-nowrap">
                              {formatShortcut(shortcut.keys)}
                            </kbd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono text-[10px]">?</kbd><span>toggle overlay</span></span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono text-[10px]">Esc</kbd><span>close</span></span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono text-[10px]">1-6</kbd><span>filter category</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">{filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-300 dark:text-slate-600">-</span>
            <span>{isMac ? 'macOS' : 'Windows/Linux'} shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GLOBAL_SHORTCUTS: any[] = [];
export default KeyboardShortcutsOverlay;
