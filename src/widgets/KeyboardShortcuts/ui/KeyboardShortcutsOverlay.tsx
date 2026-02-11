/**
 * KeyboardShortcutsOverlay - Global keyboard shortcuts help (Cmd+?)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useFocusTrap } from '@/src/shared/lib/hooks/useFocusTrap';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';
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
} from '@/src/shared/constants/shortcuts';

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
  const cx = useContextualStyles();
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

    const esc = (str: string) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    let categoriesHtml = '';
    data.categories.forEach(cat => {
      let shortcutsHtml = '';
      cat.shortcuts.forEach(s => {
        shortcutsHtml += `<div class="shortcut"><span class="description">${esc(s.description)}</span><span class="keys">${esc(s.keys)}</span></div>`;
      });
      categoriesHtml += `<h2>${esc(cat.name)}</h2><div class="shortcuts-grid">${shortcutsHtml}</div>`;
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
<p class="subtitle">Context: ${esc(data.context)} - Generated on ${esc(data.generatedAt)}</p>
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
      className="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={containerRef}
        className={cn(cx.surface, 'shadow-brutal-lg w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95')}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className={cn('border-b p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4', cx.divider)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-iiif-blue/10 flex items-center justify-center">
              <Icon name="keyboard" className="text-iiif-blue text-xl" />
            </div>
            <div>
              <h2 id="shortcuts-title" className={cn('text-xl font-bold', cx.text)}>
                Keyboard Shortcuts
              </h2>
              <p className={cn('text-xs', cx.textMuted)}>
                Press <kbd className={cn('px-1 py-0.5 font-mono text-[10px]', cx.kbd)}>?</kbd> to toggle - <kbd className={cn('px-1 py-0.5 font-mono text-[10px]', cx.kbd)}>Esc</kbd> to close
              </p>
            </div>
          </div>
          
          <div className="flex-1 w-full sm:w-auto flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-nb-black/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts..."
                className={cn('w-full pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none transition-nb', cx.searchInput)}
                aria-label="Search keyboard shortcuts"
              />
              {searchQuery && (
                <Button variant="ghost" size="bare"
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-nb-cream "
                  aria-label="Clear search"
                >
                  <Icon name="close" className="text-nb-black/40 text-sm" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="bare"
              onClick={handlePrint}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-nb', cx.iconButton)}
              aria-label="Print cheat sheet"
              title="Print cheat sheet"
            >
              <Icon name="print" className="text-lg" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="ghost" size="bare"
              onClick={onClose}
              className={cn('p-2.5 transition-nb', cx.iconButton)}
              aria-label="Close shortcuts overlay"
            >
              <Icon name="close" />
            </Button>
          </div>
        </div>

        <div className={cn('border-b px-4 py-3 flex flex-wrap items-center gap-3', cx.divider)}>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium uppercase tracking-wider', cx.textMuted)}>Context:</span>
            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value as ShortcutContext | 'all')}
              className={cn('px-3 py-1.5 text-sm focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none', cx.input)}
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
          <div className="w-px h-6 bg-nb-cream/80 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-medium uppercase tracking-wider hidden sm:inline', cx.textMuted)}>Category:</span>
            {sortedCategories.slice(0, 4).map((cat, idx) => (
              <Button variant="ghost" size="bare"
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn('px-3 py-1.5 text-xs font-medium transition-nb flex items-center gap-1.5', selectedCategory === cat ? cx.active : cn(cx.subtleBg, cx.textMuted))}
                title={`Press ${idx + 1} to toggle`}
              >
                <Icon name={getCategoryIcon(cat)} className="text-sm" />
                {getCategoryLabel(cat)}
              </Button>
            ))}
            {selectedCategory && !sortedCategories.slice(0, 4).includes(selectedCategory) && (
              <Button variant="ghost" size="bare"
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1.5 text-xs font-medium bg-iiif-blue text-white transition-nb"
              >
                {getCategoryLabel(selectedCategory)}
              </Button>
            )}
            {selectedCategory && (
              <Button variant="ghost" size="bare"
                onClick={() => setSelectedCategory(null)}
                className="px-2 py-1.5 text-xs text-nb-black/50 hover:text-nb-black/80"
                aria-label="Clear category filter"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="search_off" className="text-5xl mb-4 mx-auto text-nb-black/30" />
              <p className="text-nb-black/50 mb-2">No shortcuts found</p>
              <p className="text-sm text-nb-black/40">Try adjusting your search or filters</p>
              <Button variant="ghost" size="bare"
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedContext('all'); }}
                className="mt-4 px-4 py-2 text-sm text-iiif-blue hover:underline"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map(category => {
                const shortcuts = groupedShortcuts[category];
                if (!shortcuts?.length) return null;
                return (
                  <section key={category} className={cn('p-5', cx.subtleBg)} aria-labelledby={`category-${category}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-nb-white/80 shadow-brutal-sm flex items-center justify-center">
                        <Icon name={getCategoryIcon(category)} className="text-iiif-blue" />
                      </div>
                      <h3 id={`category-${category}`} className={cn('font-bold text-lg', cx.text)}>{getCategoryLabel(category)}</h3>
                      <span className="text-xs text-nb-black/40 bg-nb-cream/80 px-2 py-0.5 ">{shortcuts.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {shortcuts.map((shortcut) => (
                        <div key={shortcut.id} className={cn('flex items-center justify-between p-3 border hover:border-iiif-blue/30 hover:shadow-brutal-sm transition-nb group', cx.surface)}>
                          <div className="flex items-center gap-3 min-w-0">
                            {shortcut.icon && <Icon name={shortcut.icon} className="text-nb-black/40 group-hover:text-nb-black/60 transition-nb" />}
                            <span className={cn('text-sm truncate', cx.text)}>{shortcut.description}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {shortcut.context !== 'global' && (
                              <span className="text-[10px] text-nb-black/40 bg-nb-cream/80 px-1.5 py-0.5 rounded">{getContextLabel(shortcut.context)}</span>
                            )}
                            <kbd className={cn('px-2.5 py-1.5 text-xs font-medium shadow-brutal-sm whitespace-nowrap', cx.kbd)}>
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

        <div className={cn('border-t px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs', cx.divider, cx.subtleBg, cx.textMuted)}>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5"><kbd className={cn('px-1.5 py-0.5 text-[10px]', cx.kbd)}>?</kbd><span>toggle overlay</span></span>
            <span className="flex items-center gap-1.5"><kbd className={cn('px-1.5 py-0.5 text-[10px]', cx.kbd)}>Esc</kbd><span>close</span></span>
            <span className="flex items-center gap-1.5"><kbd className={cn('px-1.5 py-0.5 text-[10px]', cx.kbd)}>1-6</kbd><span>filter category</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-nb-black/40">{filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''}</span>
            <span className="text-nb-black/30">-</span>
            <span>{isMac ? 'macOS' : 'Windows/Linux'} shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GLOBAL_SHORTCUTS: any[] = [];
export default KeyboardShortcutsOverlay;
