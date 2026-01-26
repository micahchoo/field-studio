import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest } from '../types';
import { Icon } from './Icon';
import { getRelationshipType, buildReferenceMap } from '../utils/iiifHierarchy';
import { resolveHierarchicalThumbs } from '../utils/imageSourceResolver';
import { StackedThumbnail } from './StackedThumbnail';

interface ManifestTreeProps {
  root: IIIFItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Virtualization constants
const ITEM_HEIGHT = 32; // Height of each tree item in pixels
const OVERSCAN_COUNT = 10; // Extra items to render above/below viewport

// Flatten tree to array for keyboard navigation
const flattenTree = (
  item: IIIFItem,
  expandedIds: Set<string>,
  result: { id: string; item: IIIFItem; level: number; parentId: string | null }[] = [],
  level = 0,
  parentId: string | null = null,
  visited = new Set<string>()
): { id: string; item: IIIFItem; level: number; parentId: string | null }[] => {
  if (visited.has(item.id)) return result;
  visited.add(item.id);

  result.push({ id: item.id, item, level, parentId });
  const children = (item as any).items || [];
  if (children.length > 0 && expandedIds.has(item.id)) {
    children.forEach((child: IIIFItem) => flattenTree(child, expandedIds, result, level + 1, item.id, visited));
  }
  return result;
};

// Get icon based on IIIF type
const getIcon = (type: string) => {
  switch (type) {
    case 'Collection': return 'library_books'; // Collections are curated lists
    case 'Manifest': return 'menu_book';       // Manifests are atomic units (books)
    case 'Canvas': return 'image';              // Canvases are owned by Manifests
    case 'Range': return 'segment';
    case 'AnnotationPage': return 'notes';
    default: return 'description';
  }
};

// Relationship type is now imported from utils/iiifHierarchy.ts
// This centralizes IIIF 3.0 hierarchy logic across the application

export const ManifestTree: React.FC<ManifestTreeProps> = ({ root, selectedId, onSelect }) => {
  // Build reference map for cross-collection tracking
  const refMap = useMemo(() => {
    if (!root) return new Map<string, string[]>();
    return buildReferenceMap(root);
  }, [root]);

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Build flat list of visible items for navigation
  const flatItems = useMemo(() => {
    if (!root) return [];
    return flattenTree(root, expandedIds);
  }, [root, expandedIds]);

  // Calculate virtualization range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const totalHeight = flatItems.length * ITEM_HEIGHT;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN_COUNT);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const end = Math.min(flatItems.length - 1, start + visibleCount + OVERSCAN_COUNT * 2);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: flatItems.slice(start, end + 1)
    };
  }, [flatItems, scrollTop, containerHeight]);

  // Track container resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update focused ID when selection changes
  useEffect(() => {
    if (selectedId) setFocusedId(selectedId);
  }, [selectedId]);

  // Focus the element when focusedId changes and scroll into view
  useEffect(() => {
    if (focusedId) {
      const focusedIndex = flatItems.findIndex(f => f.id === focusedId);
      if (focusedIndex !== -1) {
        // Ensure the focused item is in view by adjusting scroll
        const itemTop = focusedIndex * ITEM_HEIGHT;
        const itemBottom = itemTop + ITEM_HEIGHT;
        const container = scrollContainerRef.current;

        if (container) {
          const viewTop = container.scrollTop;
          const viewBottom = viewTop + container.clientHeight;

          if (itemTop < viewTop) {
            container.scrollTop = itemTop;
          } else if (itemBottom > viewBottom) {
            container.scrollTop = itemBottom - container.clientHeight;
          }
        }
      }

      // Focus the DOM element if it's rendered
      if (itemRefs.current.has(focusedId)) {
        const el = itemRefs.current.get(focusedId);
        el?.focus();
      }
    }
  }, [focusedId, flatItems]);

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

  // Calculate total height and offset for virtualization
  const totalHeight = flatItems.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-slate-900 border-r border-slate-800"
      role="tree"
      aria-label="Archive Explorer"
    >
      <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
          Archive Explorer
          {flatItems.length > 100 && (
            <span className="ml-2 text-slate-600 font-normal">({flatItems.length})</span>
          )}
        </h2>
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

      {/* Virtualized scrollable area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
        onScroll={handleScroll}
      >
        {/* Total height spacer for correct scrollbar */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Positioned container for visible items */}
          <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
            {visibleItems.map((flatItem, index) => {
              const { item, level, parentId } = flatItem;
              const isSelected = item.id === selectedId;
              const isFocused = item.id === focusedId;
              const label = item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'Untitled';
              const children = (item as any).items || [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedIds.has(item.id);
              const thumbUrls = resolveHierarchicalThumbs(item, 40);

              // Get parent type to determine relationship using centralized IIIF hierarchy logic
              const parentItem = parentId ? flatItems.find(f => f.id === parentId)?.item : null;
              const relationshipType = getRelationshipType(parentItem?.type || null, item.type);
              const isReference = relationshipType === 'reference'; // 'reference' indicates many-to-many (Collection→Manifest)

              // Type-specific colors
              const typeColors = {
                Collection: { bg: 'bg-amber-500/20', text: 'text-amber-400', selectedBg: 'bg-amber-500' },
                Manifest: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', selectedBg: 'bg-emerald-500' },
                Canvas: { bg: 'bg-blue-500/20', text: 'text-blue-400', selectedBg: 'bg-blue-500' },
                Range: { bg: 'bg-purple-500/20', text: 'text-purple-400', selectedBg: 'bg-purple-500' },
              };
              const colors = typeColors[item.type as keyof typeof typeColors] || { bg: 'bg-slate-500/20', text: 'text-slate-400', selectedBg: 'bg-slate-500' };

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  role="treeitem"
                  aria-selected={isSelected}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  aria-level={level + 1}
                  aria-setsize={flatItems.length}
                  aria-posinset={startIndex + index + 1}
                  tabIndex={isFocused ? 0 : -1}
                  onKeyDown={(e) => handleKeyNav(e, item.id)}
                  onFocus={() => setFocusedId(item.id)}
                  className={`flex items-center gap-2 cursor-pointer transition-colors outline-none select-none ${
                    isFocused ? 'ring-2 ring-iiif-blue/50 ring-inset' : ''
                  } ${isSelected ? `${colors.selectedBg} text-white` : 'text-slate-400 hover:bg-slate-800'}`}
                  style={{
                    height: ITEM_HEIGHT,
                    paddingLeft: level * 12 + 8,
                    paddingRight: 8
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                      className="p-0.5 hover:bg-white/10 rounded flex-shrink-0"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <Icon name={isExpanded ? "expand_more" : "chevron_right"} className="text-sm" />
                    </button>
                  ) : (
                    <span className="w-5 flex-shrink-0" />
                  )}

                  {/* Thumbnail/Icon with reference indicator */}
                  <div className="relative flex-shrink-0">
                    <StackedThumbnail 
                      urls={thumbUrls} 
                      size="xs" 
                      icon={getIcon(item.type)}
                      placeholderBg="bg-transparent"
                    />
                    {/* Show link badge for referenced items (Collections reference Manifests) */}
                    {isReference && (
                      <Icon name="link" className="absolute -bottom-0.5 -right-0.5 text-[8px] text-amber-400" />
                    )}
                  </div>

                  <span className="text-xs truncate font-medium">{label}</span>

                  {/* Cross-collection references badge */}
                  {(item.type === 'Collection' || item.type === 'Manifest') && (refMap.get(item.id)?.length || 0) > 1 && (
                    <div 
                      className={`ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                      title={`Referenced in ${refMap.get(item.id)?.length} collections`}
                    >
                      <Icon name="layers" className="text-[10px]" />
                      {refMap.get(item.id)?.length}
                    </div>
                  )}

                  {/* Type indicator for Collections and Manifests */}
                  {(item.type === 'Collection' || item.type === 'Manifest') && (
                    <span className={`${(item.type === 'Collection' || item.type === 'Manifest') && (refMap.get(item.id)?.length || 0) > 1 ? 'ml-1' : 'ml-auto'} text-[8px] font-bold uppercase px-1 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : colors.bg + ' ' + colors.text
                    }`}>
                      {item.type === 'Collection' ? 'C' : 'M'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
