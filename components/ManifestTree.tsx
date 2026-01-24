import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest } from '../types';
import { Icon } from './Icon';

interface ManifestTreeProps {
  root: IIIFItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Flatten tree to array for keyboard navigation
const flattenTree = (
  item: IIIFItem,
  expandedIds: Set<string>,
  result: { id: string; item: IIIFItem; level: number; parentId: string | null }[] = [],
  level = 0,
  parentId: string | null = null
): { id: string; item: IIIFItem; level: number; parentId: string | null }[] => {
  result.push({ id: item.id, item, level, parentId });
  const children = (item as any).items || [];
  if (children.length > 0 && expandedIds.has(item.id)) {
    children.forEach((child: IIIFItem) => flattenTree(child, expandedIds, result, level + 1, item.id));
  }
  return result;
};

// Get icon based on IIIF type
const getIcon = (type: string) => {
  switch (type) {
    case 'Collection': return 'folder';
    case 'Manifest': return 'menu_book';
    case 'Canvas': return 'image';
    case 'Range': return 'segment';
    case 'AnnotationPage': return 'notes';
    default: return 'description';
  }
};

interface TreeItemProps {
  item: IIIFItem;
  level: number;
  selectedId: string | null;
  focusedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onToggle: (id: string) => void;
  onKeyNav: (e: React.KeyboardEvent, id: string) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

const TreeItem: React.FC<TreeItemProps> = ({
  item, level, selectedId, focusedId, expandedIds, onSelect, onFocus, onToggle, onKeyNav, itemRefs
}) => {
  const isSelected = item.id === selectedId;
  const isFocused = item.id === focusedId;
  const label = item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'Untitled';
  const children = (item as any).items || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(item.id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyNav(e, item.id);
  };

  const setRef = useCallback((el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(item.id, el);
    else itemRefs.current.delete(item.id);
  }, [item.id, itemRefs]);

  return (
    <div className="select-none" role="none">
      <div
        ref={setRef}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(item.id)}
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer transition-colors outline-none ${
          isFocused ? 'ring-2 ring-iiif-blue/50 ring-inset' : ''
        } ${isSelected ? 'bg-iiif-blue text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        style={{ paddingLeft: level * 12 + 8 }}
        onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
            className="p-0.5 hover:bg-white/10 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Icon name={isExpanded ? "expand_more" : "chevron_right"} className="text-sm" />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Icon name={getIcon(item.type)} className="text-sm" />
        <span className="text-xs truncate font-medium">{label}</span>
      </div>
      {hasChildren && isExpanded && children.map((child: IIIFItem) => (
        <TreeItem
          key={child.id}
          item={child}
          level={level + 1}
          selectedId={selectedId}
          focusedId={focusedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onFocus={onFocus}
          onToggle={onToggle}
          onKeyNav={onKeyNav}
          itemRefs={itemRefs}
        />
      ))}
    </div>
  );
};

export const ManifestTree: React.FC<ManifestTreeProps> = ({ root, selectedId, onSelect }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand root and first level
    const initial = new Set<string>();
    if (root) {
      initial.add(root.id);
      const children = (root as any).items || [];
      children.forEach((c: IIIFItem) => initial.add(c.id));
    }
    return initial;
  });
  const [focusedId, setFocusedId] = useState<string | null>(selectedId || root?.id || null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Build flat list of visible items for navigation
  const flatItems = useMemo(() => {
    if (!root) return [];
    return flattenTree(root, expandedIds);
  }, [root, expandedIds]);

  // Update focused ID when selection changes
  useEffect(() => {
    if (selectedId) setFocusedId(selectedId);
  }, [selectedId]);

  // Focus the element when focusedId changes
  useEffect(() => {
    if (focusedId && itemRefs.current.has(focusedId)) {
      const el = itemRefs.current.get(focusedId);
      el?.focus();
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedId]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleKeyNav = useCallback((e: React.KeyboardEvent, currentId: string) => {
    const currentIndex = flatItems.findIndex(f => f.id === currentId);
    if (currentIndex === -1) return;

    const current = flatItems[currentIndex];
    const children = (current.item as any).items || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(currentId);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < flatItems.length - 1) {
          setFocusedId(flatItems[currentIndex + 1].id);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setFocusedId(flatItems[currentIndex - 1].id);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren) {
          if (!isExpanded) {
            toggleExpanded(currentId);
          } else if (children.length > 0) {
            // Move to first child
            setFocusedId(children[0].id);
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          // Collapse
          toggleExpanded(currentId);
        } else if (current.parentId) {
          // Move to parent
          setFocusedId(current.parentId);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(currentId);
        break;

      case 'Home':
        e.preventDefault();
        if (flatItems.length > 0) {
          setFocusedId(flatItems[0].id);
        }
        break;

      case 'End':
        e.preventDefault();
        if (flatItems.length > 0) {
          setFocusedId(flatItems[flatItems.length - 1].id);
        }
        break;

      case '*':
        // Expand all siblings
        e.preventDefault();
        if (current.parentId) {
          const parent = flatItems.find(f => f.id === current.parentId);
          if (parent) {
            const siblings = ((parent.item as any).items || []) as IIIFItem[];
            setExpandedIds(prev => {
              const next = new Set(prev);
              siblings.forEach(s => next.add(s.id));
              return next;
            });
          }
        }
        break;
    }
  }, [flatItems, expandedIds, toggleExpanded, onSelect]);

  if (!root) return <div className="p-4 text-xs text-slate-500">No archive loaded.</div>;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 border-r border-slate-800"
      role="tree"
      aria-label="Archive Explorer"
    >
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Archive Explorer</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setExpandedIds(new Set([root.id]))}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"
            title="Collapse All"
            aria-label="Collapse All"
          >
            <Icon name="unfold_less" className="text-sm" />
          </button>
          <button
            type="button"
            onClick={() => {
              const all = new Set<string>();
              const addAll = (item: IIIFItem) => {
                all.add(item.id);
                ((item as any).items || []).forEach(addAll);
              };
              addAll(root);
              setExpandedIds(all);
            }}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"
            title="Expand All"
            aria-label="Expand All"
          >
            <Icon name="unfold_more" className="text-sm" />
          </button>
        </div>
      </div>
      <TreeItem
        item={root}
        level={0}
        selectedId={selectedId}
        focusedId={focusedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onFocus={setFocusedId}
        onToggle={toggleExpanded}
        onKeyNav={handleKeyNav}
        itemRefs={itemRefs}
      />
    </div>
  );
};
