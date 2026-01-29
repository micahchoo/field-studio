# Field Studio: Hooks Catalog

Complete documentation of all custom React hooks in the application.

---

## Hook Architecture

Field Studio uses custom hooks extensively to encapsulate reusable logic:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Hook Categories                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  State Mgmt  │  │   Viewport   │  │   Keyboard   │           │
│  │              │  │              │  │              │           │
│  │ • useVault   │  │ • useViewport│  │ • useStruct- │           │
│  │ • useHistory │  │ • usePanZoom │  │   ureKeyboard│           │
│  │ • useURLState│  │ • useView-   │  │ • useView-   │           │
│  │              │  │   portKeybrd │  │   portKeybrd │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     IIIF     │  │     UI       │  │   Staging    │           │
│  │              │  │              │  │              │           │
│  │ • useIIIF-   │  │ • useDialog  │  │ • useStaging-│           │
│  │   Entity     │  │   State      │  │   State      │           │
│  │ • useApp-    │  │ • useRespon- │  │ • useSource- │           │
│  │   Settings   │  │   sive       │  │   Manifests  │           │
│  │ • useInspect-│  │ • useToast   │  │   Builder    │           │
│  │   orTabs     │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Documented Hooks (5)

### State Management Hooks

#### `useVault` (in `services/vault.ts`)

Core state management hook for IIIF entities.

```typescript
function useVault(): {
  state: NormalizedState;
  dispatch: (action: Action) => boolean;
  getEntity: (id: string) => IIIFEntity | null;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
}
```

**Usage:**
```tsx
const { state, dispatch, getEntity, undo } = useVault();
const canvas = getEntity(canvasId);
```

---

#### `useHistory`

Undo/redo history tracking for any state type.

```typescript
function useHistory<T>(initialState: T, options?: {
  maxHistory?: number;
}): {
  state: T;
  update: (updater: (prev: T) => T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

**Used in:**
- `BoardView` - Board state history
- `MetadataEditor` - Field edit history

---

### IIIF Hooks

#### `useIIIFEntity` (in `hooks/useIIIFEntity.tsx`)

React integration for the Vault state manager.

```typescript
function useCanvas(id: string): IIIFCanvas | null;
function useChildren(parentId: string): IIIFEntity[];
function useEntity(type: EntityType, id: string): IIIFEntity | null;
```

---

### Viewport Hooks

#### `useViewport`

Standardized viewport state for pan/zoom.

```typescript
function useViewport(options?: {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialX?: number;
  initialY?: number;
}): UseViewportReturn

interface UseViewportReturn {
  viewport: ViewportState;
  setViewport: (updates: Partial<ViewportState>) => void;
  pan: (dx: number, dy: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number, center?: Point) => void;
  reset: () => void;
  fitToContent: (bounds: Bounds) => void;
  scalePercent: number;
}
```

---

#### `usePanZoomGestures`

Touch/mouse gesture handling for viewport interaction.

```typescript
function usePanZoomGestures(
  containerRef: RefObject<HTMLElement>,
  viewport: UseViewportReturn,
  options?: PanZoomOptions
): UsePanZoomGesturesReturn

interface UsePanZoomGesturesReturn {
  isPanning: boolean;
  isPanModeActive: boolean;
  setPanModeActive: (active: boolean) => void;
  handlers: {
    onMouseDown: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
    onMouseLeave: (e: MouseEvent) => void;
    onWheel: (e: WheelEvent) => void;
  };
}
```

---

## Undocumented Hooks (5)

### `useURLState.ts`

URL state management for deep linking and browser history.

```typescript
interface URLState {
  mode: AppMode;
  selectedId: string | null;
}

interface UseURLStateReturn {
  urlState: URLState;
  setMode: (mode: AppMode) => void;
  setSelectedId: (id: string | null) => void;
  setURLState: (state: Partial<URLState>) => void;
}

function useURLState(initialMode?: AppMode): UseURLStateReturn
```

**Features:**
- Synchronizes app state with URL hash parameters
- Handles browser back/forward navigation via `popstate`
- Validates mode against `VALID_MODES` array
- Updates URL on state changes without page reload

**URL Format:**
```
#mode=boards&id=canvas-123
#mode=archive&id=manifest-456
```

**Usage:**
```tsx
const { urlState, setMode, setSelectedId } = useURLState('archive');

// Navigate to board view
setMode('boards');

// Select specific item
setSelectedId('manifest-123');

// Update multiple at once
setURLState({ mode: 'viewer', selectedId: 'canvas-456' });
```

**Valid Modes:**
```typescript
const VALID_MODES: AppMode[] = [
  'archive',
  'collections', 
  'metadata',
  'search',
  'viewer',
  'boards'
];
```

---

### `useResponsive.ts`

Mobile/tablet/desktop detection with breakpoint tracking.

```typescript
interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

function useResponsive(): ResponsiveState
```

**Breakpoints:**
| Breakpoint | Width Range | Flag |
|------------|-------------|------|
| Mobile | < 768px | `isMobile` |
| Tablet | 768px - 1024px | `isTablet` |
| Desktop | > 1024px | `isDesktop` |
| Touch | Mobile + Tablet | `isTouchDevice` |

**Usage:**
```tsx
const { isMobile, isTouchDevice, width } = useResponsive();

// Conditional rendering
{isMobile && <MobileToolbar />}

// Responsive styling
<div className={isTouchDevice ? 'touch-optimized' : 'desktop'}>

// Dynamic columns
const columns = isMobile ? 1 : isTablet ? 2 : 3;
```

**Implementation Notes:**
- Uses `window.innerWidth/Height` for dimensions
- Attaches `resize` event listener
- Cleans up on unmount
- No debouncing (consider adding for performance)

---

### `useViewportKeyboard.ts`

Keyboard shortcuts for viewport navigation.

```typescript
interface UseViewportKeyboardOptions {
  enabled?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotation?: boolean;
  enableReset?: boolean;
  enableSpacePan?: boolean;
  panStep?: number;
  rotationStep?: number;
  onShortcut?: (action: string) => void;
}

interface UseViewportKeyboardReturn {
  triggerAction: (action: KeyboardAction) => void;
}

type KeyboardAction = 
  | 'zoomIn' | 'zoomOut' | 'reset'
  | 'panUp' | 'panDown' | 'panLeft' | 'panRight'
  | 'rotateCW' | 'rotateCCW';

function useViewportKeyboard(
  containerRef: RefObject<HTMLElement>,
  viewport: UseViewportReturn,
  gestures?: UsePanZoomGesturesReturn,
  options?: UseViewportKeyboardOptions
): UseViewportKeyboardReturn
```

**Default Shortcuts:**
| Key | Action | Condition |
|-----|--------|-----------|
| `+` / `=` | Zoom in | `enableZoom` |
| `-` | Zoom out | `enableZoom` |
| `0` + Ctrl/Cmd | Reset view | `enableReset` |
| `↑` | Pan up | `enablePan` |
| `↓` | Pan down | `enablePan` |
| `←` | Pan left | `enablePan` |
| `→` | Pan right | `enablePan` |
| `Space` (hold) | Pan mode | `enableSpacePan` |
| `R` | Rotate CW | `enableRotation` |
| `Shift+R` | Rotate CCW | `enableRotation` |

**Usage:**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const viewport = useViewport();
const gestures = usePanZoomGestures(containerRef, viewport);

useViewportKeyboard(containerRef, viewport, gestures, {
  enableZoom: true,
  enablePan: true,
  enableRotation: true,
  panStep: 50,
  onShortcut: (action) => console.log('Shortcut:', action),
});
```

**Safety Features:**
- Ignores shortcuts when typing in inputs/textareas
- Checks if container or document body has focus
- Prevents default browser behavior for handled keys
- Supports programmatic action triggering via `triggerAction`

---

### `useStructureKeyboard.ts`

Structure view navigation with multi-select support.

```typescript
interface UseStructureKeyboardOptions {
  items: string[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onMultiSelect?: (ids: string[], additive: boolean) => void;
  onReorder?: (direction: 'up' | 'down' | 'start' | 'end') => void;
  onDelete?: (ids: string[]) => void;
  onDuplicate?: (ids: string[]) => void;
  onSelectAll?: () => void;
  onOpen?: (id: string) => void;
  enabled?: boolean;
}

interface UseStructureKeyboardResult {
  containerRef: React.RefObject<HTMLDivElement>;
  focusedIndex: number;
}

function useStructureKeyboard(
  options: UseStructureKeyboardOptions
): UseStructureKeyboardResult
```

**Shortcuts:**
| Key | Action | Description |
|-----|--------|-------------|
| `↑` / `←` | Previous item | Navigate up/left |
| `↓` / `→` | Next item | Navigate down/right |
| `Home` | First item | Jump to start |
| `End` | Last item | Jump to end |
| `Enter` | Open item | Activate selected |
| `Space` | Toggle selection | Add/remove from selection |
| `Shift+Arrow` | Extend selection | Range selection |
| `Cmd/Ctrl+A` | Select all | All items |
| `Cmd/Ctrl+D` | Duplicate | Copy selected |
| `Delete` / `Backspace` | Delete | Remove selected |
| `[` | Move up | Reorder backward |
| `]` | Move down | Reorder forward |
| `Shift+[` | Move to start | Jump to beginning |
| `Shift+]` | Move to end | Jump to end |
| `Escape` | Clear selection | Deselect all |

**Usage:**
```tsx
const { containerRef, focusedIndex } = useStructureKeyboard({
  items: itemIds,
  selectedId: currentSelection,
  selectedIds: multiSelection,
  onSelect: handleSelect,
  onMultiSelect: handleMultiSelect,
  onReorder: handleReorder,
  onDelete: handleDelete,
  onDuplicate: handleDuplicate,
});

return (
  <div ref={containerRef} tabIndex={0}>
    {items.map((item, i) => (
      <Item 
        key={item.id}
        focused={i === focusedIndex}
        selected={selectedIds.has(item.id)}
      />
    ))}
  </div>
);
```

**Export for Reference:**
```typescript
export const STRUCTURE_KEYBOARD_SHORTCUTS = [
  { key: 'Arrow Keys', action: 'Navigate items' },
  { key: 'Enter', action: 'Open/activate item' },
  { key: 'Space', action: 'Toggle selection' },
  // ... (see source for full list)
] as const;
```

---

### `useStagingState.ts`

Staging workbench state management for two-pane ingest interface.

```typescript
interface UseStagingStateReturn {
  // Selection
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // Focus
  focusedPane: 'source' | 'archive';
  setFocusedPane: (pane: 'source' | 'archive') => void;

  // Collection operations
  createNewCollection: (name: string, parentId?: string | null) => string;
  addToCollection: (collectionId: string, manifestIds?: string[]) => void;
  removeFromCollection: (collectionId: string, manifestIds: string[]) => void;
  renameCollectionAction: (collectionId: string, newName: string) => void;
  deleteCollectionAction: (collectionId: string) => void;
  moveCollectionAction: (collectionId: string, newParentId: string) => void;

  // Canvas reordering
  reorderCanvases: (manifestId: string, newOrder: string[]) => void;

  // Getters
  getManifest: (id: string) => SourceManifest | undefined;
  getCollection: (id: string) => ArchiveCollection | undefined;
  getAllCollectionsList: () => ArchiveCollection[];
  unassignedManifests: SourceManifest[];
  hasUnassigned: boolean;

  // Direct access
  archiveLayout: ArchiveLayout;
  sourceManifests: SourceManifests;
}

function useStagingState(
  initialSourceManifests: SourceManifests
): UseStagingStateReturn
```

**State Structure:**
```typescript
interface StagingState {
  sourceManifests: SourceManifests;  // Uploaded content
  archiveLayout: ArchiveLayout;      // Organization structure
  selectedIds: Set<string>;          // Current selection
  focusedPane: 'source' | 'archive'; // Active pane
}
```

**Usage:**
```tsx
const staging = useStagingState(initialManifests);

// Select items
staging.toggleSelection('manifest-123');
staging.selectRange('item-1', 'item-5', allIds);

// Manage collections
const newId = staging.createNewCollection('My Collection');
staging.addToCollection(newId);
staging.renameCollectionAction(newId, 'Renamed Collection');

// Access data
const unassigned = staging.unassignedManifests;
const hasWork = staging.hasUnassigned;
```

**Dependencies:**
- `services/stagingService.ts` - Core staging logic
- `types.ts` - `SourceManifests`, `ArchiveLayout` types

---

## Additional Hooks

### UI Hooks

#### `useDialogState`

Simple boolean state for modal dialogs.

```typescript
function useDialogState(initial?: boolean): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
```

---

#### `useAppSettings`

User preferences and application settings.

```typescript
function useAppSettings(): {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}
```

---

#### `useInspectorTabs`

Tab state management for the Inspector panel.

```typescript
function useInspectorTabs(): {
  activeTab: InspectorTab;
  setActiveTab: (tab: InspectorTab) => void;
}

type InspectorTab = 'properties' | 'design' | 'validation' | 'provenance';
```

---

### Specialized Hooks

#### `useSourceManifestsBuilder.ts`

Builds source manifests from uploaded files (in staging).

```typescript
function useSourceManifestsBuilder(
  files: File[]
): {
  manifests: SourceManifest[];
  isBuilding: boolean;
  progress: number;
  error: Error | null;
}
```

---

## Hook Summary Table

| Hook | File | Purpose | Status |
|------|------|---------|--------|
| `useVault` | `services/vault.ts` | IIIF state management | Documented |
| `useHistory` | `hooks/useHistory.ts` | Undo/redo tracking | Documented |
| `useIIIFEntity` | `hooks/useIIIFEntity.tsx` | Entity access | Documented |
| `useViewport` | `hooks/useViewport.ts` | Viewport state | Documented |
| `usePanZoomGestures` | `hooks/usePanZoomGestures.ts` | Touch/mouse gestures | Documented |
| `useURLState` | `hooks/useURLState.ts` | URL synchronization | **Undocumented** |
| `useResponsive` | `hooks/useResponsive.ts` | Breakpoint detection | **Undocumented** |
| `useViewportKeyboard` | `hooks/useViewportKeyboard.ts` | Viewport shortcuts | **Undocumented** |
| `useStructureKeyboard` | `hooks/useStructureKeyboard.ts` | Structure navigation | **Undocumented** |
| `useStagingState` | `staging/hooks/useStagingState.ts` | Staging state | **Undocumented** |
| `useDialogState` | `hooks/useDialogState.ts` | Modal state | Additional |
| `useAppSettings` | `hooks/useAppSettings.ts` | Settings management | Additional |
| `useInspectorTabs` | `hooks/useInspectorTabs.ts` | Tab state | Additional |
| `useVirtualization` | `hooks/useVirtualization.ts` | List/grid virtualization | **New** |
| `useIIIFTraversal` | `hooks/useIIIFTraversal.ts` | IIIF tree traversal | **New** |
| `useSharedSelection` | `hooks/useSharedSelection.ts` | Cross-view selection | **New** |
| `useResizablePanel` | `hooks/useResizablePanel.ts` | Panel resizing | **New** |

---

## New Hooks (Phase 1 Implementation)

### `useVirtualization`

Efficient list and grid virtualization for rendering large datasets. Only renders items visible in the viewport plus an overscan buffer.

```typescript
// List virtualization
function useVirtualization(options: {
  totalItems: number;
  itemHeight: number;
  containerRef: RefObject<HTMLElement>;
  overscan?: number;
}): {
  visibleRange: { start: number; end: number };
  totalHeight: number;
  topSpacer: number;
  bottomSpacer: number;
}

// Grid virtualization with dynamic column calculation
function useGridVirtualization(options: {
  totalItems: number;
  itemSize: { width: number; height: number };
  containerRef: RefObject<HTMLElement>;
  columnsOverride?: number;
  overscan?: number;
  gap?: number;
}): {
  visibleRange: { start: number; end: number };
  columns: number;
  totalHeight: number;
  topSpacer: number;
  bottomSpacer: number;
  rowHeight: number;
}
```

**Features:**
- Calculates visible range based on scroll position and viewport dimensions
- Automatic column calculation for grid layouts based on container width
- Configurable overscan for smoother scrolling
- ResizeObserver integration for responsive layouts
- Passive scroll event listeners for performance

**Usage:**
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { visibleRange } = useVirtualization({
  totalItems: items.length,
  itemHeight: 56,
  containerRef,
  overscan: 10
});

const visibleItems = items.slice(visibleRange.start, visibleRange.end);
```

**Used in:**
- `ArchiveView` - Grid and list view virtualization
- Can be adopted by `CollectionsView`, `SearchView` for performance

---

### `useIIIFTraversal`

Memoized IIIF tree traversal utilities. Provides efficient O(1) lookup for finding nodes, parents, and children in the IIIF hierarchy.

```typescript
function useIIIFTraversal(root: IIIFItem | null): {
  findNode: (id: string) => IIIFItem | null;
  findAllByType: <T extends IIIFItem>(type: string) => T[];
  flattenItems: () => IIIFItem[];
  getChildren: (id: string) => IIIFItem[];
  getParent: (id: string) => IIIFItem | null;
  getAllCanvases: () => IIIFCanvas[];
  getAllManifests: () => IIIFManifest[];
  getAllCollections: () => IIIFCollection[];
  hasNode: (id: string) => boolean;
  getDepth: (id: string) => number;
  getPath: (id: string) => string[];
}
```

**Features:**
- Builds lookup maps once when root changes
- O(1) node lookup vs O(n) tree traversal
- Memoized for performance
- Type-safe generic findAllByType
- Path tracking from root to any node

**Usage:**
```tsx
const { findNode, getAllCanvases, getParent } = useIIIFTraversal(root);

// Find any node by ID
const canvas = findNode('canvas-123');

// Get all items of a specific type
const allManifests = getAllManifests();

// Get parent relationship
const parent = getParent('canvas-123');
```

**Used in:**
- `ArchiveView` - Getting all canvases
- `CollectionsView` - Finding nodes, getting manifests/collections
- Replaces duplicated `findNode` implementations across views

---

### `useSharedSelection`

Lifted selection state for cross-view persistence. Enables selection to be maintained when switching between views.

```typescript
function useSharedSelection(persist: boolean = true): {
  selectedIds: Set<string>;
  lastClickedId: string | null;
  selectionAnchor: string | null;
  
  // Basic selection
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  
  // Range selection
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  
  // Multi-selection with modifier keys
  handleSelectWithModifier: (
    id: string,
    event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
    allItems: IIIFItem[]
  ) => void;
  
  // Batch operations
  selectAll: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  selectedCount: number;
}
```

**Features:**
- localStorage persistence (optional)
- Modifier key support (Shift, Ctrl/Cmd, Alt)
- Range selection between two items
- Selection anchor tracking for range operations

**Usage:**
```tsx
const {
  selectedIds,
  handleSelectWithModifier,
  selectAll,
  clear,
  isSelected
} = useSharedSelection(true);

// Handle click with modifiers
const handleClick = (e, item) => {
  handleSelectWithModifier(item.id, e, allItems);
};

// Check if selected
const selected = isSelected(item.id);
```

**Used in:**
- `ArchiveView` - Grid/list selection
- `CollectionsView` - Multi-select in StructureCanvas
- Enables cross-view selection persistence

---

### `useResizablePanel`

Comprehensive panel resizing hook with drag, keyboard, and touch support. Provides consistent resizable behavior for Sidebar, Inspector, and split panes.

```typescript
interface ResizablePanelConfig {
  /** Unique key for localStorage persistence */
  id: string;
  /** Default width/height in pixels */
  defaultSize: number;
  /** Minimum size in pixels */
  minSize: number;
  /** Maximum size in pixels */
  maxSize: number;
  /** Direction of resize: 'horizontal' for width, 'vertical' for height */
  direction: 'horizontal' | 'vertical';
  /** Which side the resize handle is on */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Size below which panel collapses (optional) */
  collapseThreshold?: number;
  /** Whether to persist size to localStorage */
  persist?: boolean;
  /** Callback when panel is collapsed */
  onCollapse?: () => void;
  /** Callback when panel is expanded */
  onExpand?: () => void;
}

interface UseResizablePanelReturn {
  /** Current size in pixels */
  size: number;
  /** Whether panel is collapsed */
  isCollapsed: boolean;
  /** Whether resize is in progress */
  isResizing: boolean;
  /** Start resizing (call on mousedown/touchstart) */
  startResize: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Reset to default size */
  resetSize: () => void;
  /** Toggle collapsed state */
  toggleCollapse: () => void;
  /** Set size programmatically */
  setSize: (size: number) => void;
  /** Expand panel if collapsed */
  expand: () => void;
  /** Collapse panel */
  collapse: () => void;
  /** Props to spread on the resize handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-orientation': 'horizontal' | 'vertical';
    style: React.CSSProperties;
    className: string;
  };
  /** CSS style for the panel container */
  panelStyle: React.CSSProperties;
}

function useResizablePanel(config: ResizablePanelConfig): UseResizablePanelReturn
```

**Features:**
- Mouse drag resizing with cursor feedback
- Touch drag resizing for mobile/tablet
- Keyboard resizing (Arrow keys, Shift for larger steps, Home/End for min/max)
- Double-click to reset to default size
- localStorage persistence (optional)
- Min/max size constraints with clamping
- Collapse threshold support
- Full accessibility (ARIA attributes, keyboard navigation)

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| `Arrow Left/Right` | Resize horizontal panels (±10px) |
| `Arrow Up/Down` | Resize vertical panels (±10px) |
| `Shift + Arrow` | Large resize step (±50px) |
| `Home` | Set to minimum size |
| `End` | Set to maximum size |
| `Double-click` | Reset to default size |

**Usage:**
```tsx
const {
  size,
  isCollapsed,
  isResizing,
  handleProps,
  panelStyle,
  toggleCollapse,
} = useResizablePanel({
  id: 'sidebar',
  defaultSize: 256,
  minSize: 200,
  maxSize: 400,
  direction: 'horizontal',
  side: 'right',
  collapseThreshold: 100,
  persist: true,
});

return (
  <aside style={panelStyle} className="relative">
    {/* Panel content */}
    <div className="flex-1">{children}</div>

    {/* Resize handle */}
    <div
      {...handleProps}
      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
        ${isResizing ? 'bg-blue-500' : 'hover:bg-blue-300'}`}
    />
  </aside>
);
```

**Used in:**
- `Sidebar.tsx` - Main navigation sidebar (200-400px)
- `Inspector.tsx` - Property editor panel (280-480px)
- `CollectionsView.tsx` - Tree sidebar with collapse support (200-500px)
- `ResizablePanel.tsx` - Higher-level component wrapper

**Default Configurations:**
```typescript
const PANEL_DEFAULTS = {
  sidebar: {
    id: 'sidebar',
    defaultSize: 256,
    minSize: 200,
    maxSize: 400,
    direction: 'horizontal',
    side: 'right',
    collapseThreshold: 100,
  },
  inspector: {
    id: 'inspector',
    defaultSize: 320,
    minSize: 280,
    maxSize: 480,
    direction: 'horizontal',
    side: 'left',
    collapseThreshold: 200,
  },
  collectionsTree: {
    id: 'collections-tree',
    defaultSize: 280,
    minSize: 200,
    maxSize: 500,
    direction: 'horizontal',
    side: 'right',
    collapseThreshold: 100,
  },
};
```

---

## Related Documentation

- [Components.md](./Components.md) - Component catalog
- [Services.md](./Services.md) - Service layer
- [Underneath.md](./Underneath.md) - Technical architecture
