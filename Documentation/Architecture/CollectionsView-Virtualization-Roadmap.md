# CollectionsView Tree Virtualization Technical Roadmap

## Executive Summary

This document provides a detailed architectural analysis of CollectionsView.tsx's TreeNode recursive rendering structure and outlines the technical implementation roadmap for adding virtualization support. The CollectionsView presents unique challenges compared to ArchiveView's flat-list virtualization due to its hierarchical, expandable tree structure.

---

## 1. Current Architecture Analysis

### 1.1 TreeNode Component Structure

```typescript
// From CollectionsView.tsx lines 555-667
interface TreeNodeProps {
  node: IIIFItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (draggedId: string, targetId: string) => void;
  level: number;           // Indentation level (0 = root)
  referenceMap: Map<string, string[]>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node, selectedId, onSelect, onDrop, level, referenceMap
}) => {
  const [expanded, setExpanded] = React.useState(level < 3);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const children = (node as any).items || (node as any).annotations || [];
  const isAtDepthLimit = level >= MAX_NESTING_DEPTH; // 15 levels max
  
  // Recursive rendering of children
  return (
    <div style={{ paddingLeft: level > 0 ? 12 : 0 }}>
      {/* Node UI */}
      {expanded && children.length > 0 && !isAtDepthLimit && (
        <div className="border-l border-slate-200 ml-4">
          {children.map((child: any) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrop={onDrop}
              level={level + 1}  // Increment level for recursion
              referenceMap={referenceMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 1.2 Key Architectural Characteristics

| Characteristic | Current Implementation | Virtualization Challenge |
|----------------|----------------------|------------------------|
| **Structure** | Recursive component tree | Flattened list required for windowing |
| **Height** | Variable (depends on content) | Unknown until render, requires measurement |
| **Expansion** | Local React state per node | Must be lifted to control visible set |
| **Indentation** | CSS padding-left based on level | Must be preserved in flattened view |
| **Nesting** | Up to 15 levels (MAX_NESTING_DEPTH) | Deep nesting = large visible set |
| **Drag/Drop** | Native HTML5 drag API | DOM nodes must exist for drag handles |
| **Selection** | Click to select single item | Must work with virtual rendering |

### 1.3 Data Structure

```typescript
// IIIFItem hierarchy
interface IIIFItem {
  id: string;
  type: 'Collection' | 'Manifest' | 'Canvas' | ...;
  label: InternationalizedLabel;
  items?: IIIFItem[];  // Children for Collection/Manifest
  annotations?: AnnotationPage[];  // Alternative children
  // ... other properties
}

// Example tree structure
Collection ("My Archive")
├── Collection ("Historical Photos")
│   ├── Manifest ("1900s Collection")
│   │   ├── Canvas ("Photo 1")
│   │   ├── Canvas ("Photo 2")
│   │   └── ... (50+ canvases)
│   └── Manifest ("1910s Collection")
├── Collection ("Documents")
│   └── Manifest ("Correspondence")
└── Manifest ("Miscellaneous")
```

---

## 2. Tree Virtualization Requirements

### 2.1 Core Challenges vs Flat-List

| Aspect | ArchiveView (Flat) | CollectionsView (Tree) |
|--------|-------------------|----------------------|
| **Item count** | Known upfront | Dynamic (depends on expansion) |
| **Item height** | Fixed (estimated) | Variable (depends on nesting) |
| **Scroll position** | Direct pixel mapping | Complex coordinate mapping |
| **Visible set** | Continuous range | Sparse set (gaps for collapsed) |
| **Total height** | items × itemHeight | Sum of visible node heights |
| **Index mapping** | Linear | Hierarchical flattening required |

### 2.2 Required Data Transformations

#### A. Tree Flattening Strategy

```typescript
// Flattened node representation
interface FlattenedTreeNode {
  id: string;
  node: IIIFItem;
  level: number;
  index: number;           // Position in flattened array
  parentId: string | null;
  hasChildren: boolean;
  isExpanded: boolean;
  isVisible: boolean;      // In viewport?
  measuredHeight: number;  // Cached height
  top: number;            // Accumulated top position
}

// Flattening algorithm
function flattenTree(
  root: IIIFItem,
  expandedIds: Set<string>,
  startIndex = 0
): FlattenedTreeNode[] {
  const result: FlattenedTreeNode[] = [];
  let index = startIndex;
  let currentTop = 0;

  function traverse(node: IIIFItem, level: number, parentId: string | null) {
    const hasChildren = hasNodeChildren(node);
    const isExpanded = expandedIds.has(node.id);
    
    // Measure or estimate height
    const height = measureNodeHeight(node, level);
    
    result.push({
      id: node.id,
      node,
      level,
      index: index++,
      parentId,
      hasChildren,
      isExpanded,
      isVisible: false, // Will be set by virtualization
      measuredHeight: height,
      top: currentTop
    });
    
    currentTop += height;
    
    // Recurse into children if expanded
    if (isExpanded && hasChildren) {
      const children = getNodeChildren(node);
      children.forEach(child => traverse(child, level + 1, node.id));
    }
  }
  
  traverse(root, 0, null);
  return result;
}
```

#### B. Coordinate Mapping

```typescript
// Virtual scroll state for trees
interface TreeVirtualizationState {
  // All flattened nodes
  flattenedNodes: FlattenedTreeNode[];
  
  // Visible range indices
  visibleStartIndex: number;
  visibleEndIndex: number;
  
  // Scroll position
  scrollTop: number;
  
  // Overscan buffer
  overscan: number;
  
  // Height cache
  heightCache: Map<string, number>;
}

// Calculate visible range
function calculateVisibleRange(
  state: TreeVirtualizationState,
  containerHeight: number
): { start: number; end: number } {
  const { flattenedNodes, scrollTop, overscan } = state;
  
  // Binary search to find start index
  let startIndex = binarySearchForScrollTop(flattenedNodes, scrollTop);
  
  // Find end index based on container height
  let accumulatedHeight = 0;
  let endIndex = startIndex;
  
  while (accumulatedHeight < containerHeight && endIndex < flattenedNodes.length) {
    accumulatedHeight += flattenedNodes[endIndex].measuredHeight;
    endIndex++;
  }
  
  // Apply overscan
  return {
    start: Math.max(0, startIndex - overscan),
    end: Math.min(flattenedNodes.length - 1, endIndex + overscan)
  };
}

// Binary search for scroll position in variable-height list
function binarySearchForScrollTop(
  nodes: FlattenedTreeNode[],
  scrollTop: number
): number {
  let left = 0;
  let right = nodes.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const node = nodes[mid];
    
    if (node.top <= scrollTop && node.top + node.measuredHeight > scrollTop) {
      return mid;
    } else if (node.top < scrollTop) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return left;
}
```

---

## 3. Implementation Architecture

### 3.1 State Management Outside Render Tree

```typescript
// hooks/useTreeVirtualization.ts
interface UseTreeVirtualizationOptions {
  root: IIIFItem | null;
  containerRef: RefObject<HTMLElement>;
  estimatedRowHeight?: number;
  overscan?: number;
  maxDepth?: number;
}

interface UseTreeVirtualizationReturn {
  // Flattened visible nodes
  visibleNodes: FlattenedTreeNode[];
  
  // Total scrollable height
  totalHeight: number;
  
  // Expansion state (lifted from TreeNode)
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Selection (can integrate with useSharedSelection)
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  
  // Height measurement callbacks
  measureNode: (id: string, height: number) => void;
  
  // Spacer heights for virtualization
  topSpacerHeight: number;
  bottomSpacerHeight: number;
}

export function useTreeVirtualization(
  options: UseTreeVirtualizationOptions
): UseTreeVirtualizationReturn {
  const { root, containerRef, estimatedRowHeight = 40, overscan = 5 } = options;
  
  // Lifted expansion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => 
    new Set() // Start collapsed, or pre-populate with defaultExpanded
  );
  
  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Height cache
  const [heightCache, setHeightCache] = useState<Map<string, number>>(new Map());
  
  // Scroll position
  const [scrollTop, setScrollTop] = useState(0);
  
  // Container height
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Flatten tree whenever root or expandedIds changes
  const flattenedNodes = useMemo(() => {
    if (!root) return [];
    return flattenTree(root, expandedIds, heightCache, estimatedRowHeight);
  }, [root, expandedIds, heightCache, estimatedRowHeight]);
  
  // Calculate visible range
  const { visibleStartIndex, visibleEndIndex, totalHeight } = useMemo(() => {
    const range = calculateVisibleRange(
      flattenedNodes,
      scrollTop,
      containerHeight,
      overscan
    );
    const total = flattenedNodes[flattenedNodes.length - 1]?.top + 
                  flattenedNodes[flattenedNodes.length - 1]?.measuredHeight || 0;
    return { ...range, totalHeight: total };
  }, [flattenedNodes, scrollTop, containerHeight, overscan]);
  
  // Extract visible nodes
  const visibleNodes = useMemo(() => 
    flattenedNodes.slice(visibleStartIndex, visibleEndIndex + 1),
    [flattenedNodes, visibleStartIndex, visibleEndIndex]
  );
  
  // Calculate spacer heights
  const topSpacerHeight = visibleStartIndex > 0 
    ? flattenedNodes[visibleStartIndex].top 
    : 0;
  const bottomSpacerHeight = totalHeight - 
    (flattenedNodes[visibleEndIndex]?.top + flattenedNodes[visibleEndIndex]?.measuredHeight || 0);
  
  // Scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => setScrollTop(container.scrollTop);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  
  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);
  
  // Measurement callback
  const measureNode = useCallback((id: string, height: number) => {
    setHeightCache(prev => {
      if (prev.get(id) === height) return prev;
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  }, []);
  
  // Expansion helpers
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  return {
    visibleNodes,
    totalHeight,
    expandedIds,
    toggleExpanded,
    expandAll: () => setExpandedIds(new Set(flattenedNodes.map(n => n.id))),
    collapseAll: () => setExpandedIds(new Set()),
    selectedId,
    setSelectedId,
    measureNode,
    topSpacerHeight,
    bottomSpacerHeight
  };
}
```

### 3.2 Virtualized TreeNode Component

```typescript
// components/VirtualizedTreeNode.tsx
interface VirtualizedTreeNodeProps {
  node: FlattenedTreeNode;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDrop: (draggedId: string) => void;
  onMeasure: (height: number) => void;
}

export const VirtualizedTreeNode = React.forwardRef<
  HTMLDivElement,
  VirtualizedTreeNodeProps
>(({ node, isSelected, isDragOver, onSelect, onToggleExpand, onDrop, onMeasure }, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);
  
  // Measure actual height after render
  useEffect(() => {
    if (innerRef.current) {
      onMeasure(innerRef.current.offsetHeight);
    }
  }, [onMeasure]);
  
  // Merge refs
  const mergedRef = (el: HTMLDivElement) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  
  const { node: item, level, hasChildren, isExpanded } = node;
  const children = getNodeChildren(item);
  
  return (
    <div
      ref={mergedRef}
      style={{ paddingLeft: level > 0 ? level * 12 : 0 }}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all select-none border ${
        isDragOver ? 'bg-blue-100 border-blue-500' : 
        isSelected ? 'bg-white border-blue-400 shadow-md font-bold' : 
        'hover:bg-slate-50 text-slate-700 border-transparent'
      }`}
    >
      {/* Expand/Collapse button */}
      {hasChildren && (
        <div
          className={`p-0.5 rounded hover:bg-black/10 ${!children.length ? 'invisible' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
        >
          <Icon name={isExpanded ? "expand_more" : "chevron_right"} className="text-[14px]" />
        </div>
      )}
      
      {/* Thumbnail */}
      <StackedThumbnail 
        urls={resolveHierarchicalThumbs(item, 40)} 
        size="xs" 
        icon={getResourceIcon(item.type)}
        placeholderBg="bg-transparent"
      />
      
      {/* Label */}
      <span className="text-sm truncate flex-1">
        {getIIIFValue(item.label) || 'Untitled'}
      </span>
      
      {/* Type badge, reference count, etc. */}
      {/* ... */}
    </div>
  );
});
```

### 3.3 CollectionsView Integration

```typescript
// Updated CollectionsView.tsx (key changes)
export const CollectionsView: React.FC<CollectionsViewProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    visibleNodes,
    totalHeight,
    expandedIds,
    toggleExpanded,
    selectedId,
    setSelectedId,
    measureNode,
    topSpacerHeight,
    bottomSpacerHeight
  } = useTreeVirtualization({
    root,
    containerRef,
    estimatedRowHeight: 40,
    overscan: 10
  });
  
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header unchanged */}
      
      {/* Virtualized tree container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ position: 'relative' }}
      >
        {/* Top spacer */}
        {topSpacerHeight > 0 && (
          <div style={{ height: topSpacerHeight }} aria-hidden="true" />
        )}
        
        {/* Visible nodes */}
        {visibleNodes.map(node => (
          <VirtualizedTreeNode
            key={node.id}
            node={node}
            isSelected={selectedId === node.id}
            isDragOver={dragOverId === node.id}
            onSelect={() => setSelectedId(node.id)}
            onToggleExpand={() => toggleExpanded(node.id)}
            onDrop={handleDrop}
            onMeasure={(height) => measureNode(node.id, height)}
          />
        ))}
        
        {/* Bottom spacer */}
        {bottomSpacerHeight > 0 && (
          <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
        )}
        
        {/* Empty state */}
        {visibleNodes.length === 0 && root && (
          <EmptyState icon="account_tree" title="No visible items" />
        )}
      </div>
    </div>
  );
};
```

---

## 4. Complexity Analysis

### 4.1 Comparison: Flat List vs Tree Virtualization

| Metric | ArchiveView (Flat) | CollectionsView (Tree) | Impact |
|--------|-------------------|----------------------|--------|
| **Algorithm Complexity** | O(1) index lookup | O(log n) binary search | Slightly slower scroll response |
| **Memory Usage** | O(visible items) | O(visible items) + O(expanded nodes) | Higher memory for expansion state |
| **Recalculation** | On scroll only | On scroll + expansion change | More frequent updates |
| **Initial Render** | Flatten once | Flatten on every expansion | Need memoization strategy |
| **Height Calculation** | Fixed | Variable + cached | Measurement overhead |
| **Drag/Drop** | Simple | Complex (DOM must exist) | Limit virtual window during drag |

### 4.2 Performance Considerations

```typescript
// Optimization strategies

// 1. Memoized flattening
const flattenedNodes = useMemo(() => {
  if (!root) return [];
  return flattenTree(root, expandedIds, heightCache, estimatedRowHeight);
  // Dependencies minimized to prevent unnecessary recalculation
}, [root?.id, expandedIds, heightCache]); // Note: root.id not root object

// 2. Debounced scroll handling
const debouncedSetScrollTop = useMemo(
  () => debounce(setScrollTop, 16), // 1 frame
  []
);

// 3. Height estimation fallback
function getNodeHeight(node: FlattenedTreeNode): number {
  return heightCache.get(node.id) ?? estimatedRowHeight;
}

// 4. Incremental measurement
// Only measure nodes that haven't been measured yet
const measureNode = useCallback((id: string, height: number) => {
  if (!heightCache.has(id)) {
    setHeightCache(prev => new Map(prev).set(id, height));
  }
}, [heightCache]);
```

---

## 5. Risk Assessment

### 5.1 High Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Drag/Drop breaks** | Medium | High | Disable virtualization during drag, or use library like react-window with DnD support |
| **Scroll jank with expansion** | High | Medium | Debounce flattening, use RAF for updates |
| **Memory leak with height cache** | Low | High | Implement cache size limit (LRU eviction) |

### 5.2 Medium Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Incorrect scroll position after expand** | Medium | Medium | Recalculate scroll position after expansion |
| **Focus loss during virtual scroll** | Medium | Medium | Restore focus to virtual node after render |
| **Animation/transition conflicts** | Medium | Low | Disable animations during virtual scroll |

### 5.3 Low Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Selection state desync** | Low | Medium | Use lifted selection state |
| **Reference count display lag** | Low | Low | Background recalculation |

---

## 6. Implementation Roadmap

### Phase 1: Foundation (2-3 days)
- [ ] Create `useTreeVirtualization` hook
- [ ] Implement tree flattening algorithm
- [ ] Add height measurement system
- [ ] Create `VirtualizedTreeNode` component
- [ ] Basic integration test

### Phase 2: Polish (2-3 days)
- [ ] Optimize flattening with memoization
- [ ] Add overscan buffer
- [ ] Implement smooth scroll handling
- [ ] Add expansion state persistence
- [ ] Handle edge cases (empty tree, single node)

### Phase 3: Integration (3-4 days)
- [ ] Integrate into CollectionsView
- [ ] Update drag/drop handlers
- [ ] Connect with useSharedSelection
- [ ] Test with large archives (1000+ nodes)
- [ ] Performance profiling

### Phase 4: Stabilization (2-3 days)
- [ ] Fix drag/drop edge cases
- [ ] Add scroll position restoration
- [ ] Implement cache eviction
- [ ] Accessibility audit
- [ ] Documentation

**Total Estimated Effort: 9-13 days**

---

## 7. Alternative Approaches

### Option A: Hybrid Rendering (Recommended)
- Virtualize only deep levels (>3)
- Render first 3 levels normally
- Reduces complexity while improving performance

### Option B: Windowed Expansion
- Limit visible children per node (show "Load more" button)
- Simpler than full virtualization
- May impact UX for deeply nested archives

### Option C: Pagination
- Replace tree with paginated list
- Flatten hierarchy with breadcrumbs
- Major UX change, not recommended

---

## 8. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Initial render time** | O(n) all nodes | O(visible) | React Profiler |
| **Scroll FPS** | <30 with 500+ nodes | >55 | Chrome DevTools |
| **Memory usage** | Grows with tree size | Bounded | Chrome Memory tab |
| **Interaction latency** | ~100ms | <16ms | User timing API |

---

## 9. Conclusion

CollectionsView tree virtualization is significantly more complex than ArchiveView's flat list due to:

1. **Dynamic visible set** based on expansion state
2. **Variable node heights** requiring measurement
3. **Hierarchical coordinate mapping** for scroll position
4. **Drag/Drop requirements** limiting virtual window during interaction

The recommended approach uses a hybrid strategy with:
- Lifted expansion state outside render tree
- Memoized tree flattening
- Binary search for scroll position
- Height caching with measurement
- Disabled virtualization during drag operations

**Recommendation:** Proceed with Phase 1 implementation only if archives regularly exceed 500+ visible nodes. For smaller archives, the current implementation is sufficient.
