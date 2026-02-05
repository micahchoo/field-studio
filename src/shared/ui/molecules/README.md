# Molecules: Composable UI Units

**Molecules compose atoms with local UI state, zero domain knowledge.**

A molecule is "smart enough" to have hooks and local state, but "dumb enough" that it can be reused in any feature without modification.

## Examples in this directory

### FilterInput
Composes: Icon (atom) + Input (atom) + debounce logic
- Input for searching/filtering
- Built-in debounce at 300ms
- Clear button appears when text exists
- Styles via `cx` prop (fieldMode-aware)

**Usage:**
```typescript
<FilterInput value={filter} onChange={setFilter} placeholder="Search items..." />
```

### DebouncedInput
Composes: Input + debounce + validation
- Text input that debounces onChange after configured delay (default 300ms)
- Optional real-time validation feedback
- Works in forms without thrashing the parent

**Usage:**
```typescript
<DebouncedInput
  value={text}
  onChange={setText}
  debounceMs={500}
  validation={{ maxLength: 500 }}
/>
```

### EmptyState
Composes: Icon + title + message + optional action
- Standardized placeholder for empty collections
- Fieldmode-aware styling via `cx` prop
- Optional call-to-action button

**Usage:**
```typescript
<EmptyState
  icon="inbox"
  title="No items found"
  message="Try importing some files"
  action={{ label: 'Import', onClick: onImport }}
/>
```

### ViewContainer
Composes: Header + filter input + view toggle + content
- Wraps any view with consistent layout
- Built-in filter and view-mode toggle
- Fieldmode-aware theming via `cx` prop

**Usage:**
```typescript
<ViewContainer
  title="Archive"
  icon="inventory_2"
  filter={{ value: filter, onChange: setFilter }}
  viewToggle={{ value: mode, onChange: setMode, options: [...] }}
>
  <Grid items={items} />
</ViewContainer>
```

### Toolbar
Composes: Button group with actions
- Row of action buttons
- Fieldmode-aware styling via `cx` prop
- Disabled state support

**Usage:**
```typescript
<Toolbar>
  <Button onClick={onCreate}>Create</Button>
  <Button onClick={onDelete} variant="danger">Delete</Button>
</Toolbar>
```

### SelectionToolbar
Composes: Toolbar + selection count
- Appears when items are selected
- Shows count and bulk actions
- Dismissible

**Usage:**
```typescript
{selectedIds.length > 0 && (
  <SelectionToolbar count={selectedIds.length}>
    <Button onClick={onBulkDelete} variant="danger">Delete {selectedIds.length}</Button>
  </SelectionToolbar>
)}
```

### LoadingState
Composes: Spinner + optional message
- Consistent loading indicator
- Full-page or inline variants

**Usage:**
```typescript
<LoadingState message="Loading items..." />
```

### SearchField
Composes: Input + Icon + clear button
- Search-specific input with magnifying glass icon
- Clear button appears when text exists
- Keyboard shortcut (Cmd/Ctrl+K) to focus

**Usage:**
```typescript
<SearchField
  value={query}
  onChange={setQuery}
  placeholder="Search..."
/>
```

### ViewToggle
Composes: Button group for view modes
- Grid / List / Map toggle
- Icons for each option
- Current selection highlighted

**Usage:**
```typescript
<ViewToggle
  value={viewMode}
  onChange={setViewMode}
  options={[
    { value: 'grid', icon: 'grid_view', label: 'Grid' },
    { value: 'list', icon: 'list', label: 'List' },
  ]}
/>
```

### ZoomControl
Composes: Zoom in/out/reset buttons
- For map and image viewers
- Keyboard shortcuts (+/-)
- Reset to default zoom

**Usage:**
```typescript
<ZoomControl
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onReset={resetZoom}
/>
```

### PageCounter
Composes: Text showing "X of Y"
- For paginated views
- Click to open page selector

**Usage:**
```typescript
<PageCounter current={5} total={100} onChange={goToPage} />
```

### CollectionCard
Composes: Thumbnail + title + metadata preview
- Card for IIIF collections/manifests
- Hover actions
- Selection state

**Usage:**
```typescript
<CollectionCard
  item={manifest}
  selected={selectedIds.includes(manifest.id)}
  onSelect={() => toggleSelection(manifest.id)}
  onEdit={() => openEditor(manifest.id)}
/>
```

### ResultCard
Composes: Title + snippet + metadata
- Search result display
- Highlight matching text
- Click to navigate

**Usage:**
```typescript
<ResultCard
  result={searchResult}
  query={query}
  onClick={() => navigateToResult(result)}
/>
```

### FacetPill
Composes: Button + count badge
- Filter pills for search (All, Manifest, Canvas, Annotation)
- Shows count of results
- Click to filter

**Usage:**
```typescript
<FacetPill
  label="Manifests"
  count={42}
  active={filter === 'Manifest'}
  onClick={() => setFilter('Manifest')}
/>
```

### MapMarker
Composes: Icon + tooltip
- Map location pin
- Hover to show item details
- Click to select

**Usage:**
```typescript
<MapMarker
  item={geoItem}
  selected={selectedId === geoItem.id}
  onClick={() => selectItem(geoItem.id)}
/>
```

### ClusterBadge
Composes: Badge with count
- Grouped map markers
- Click to expand
- Shows item count

**Usage:**
```typescript
<ClusterBadge
  count={cluster.items.length}
  onClick={() => expandCluster(cluster)}
/>
```

### TimelineTick
Composes: Date label + item count
- Timeline date marker
- Shows item count for date
- Click to expand/collapse

**Usage:**
```typescript
<TimelineTick
  date="2024-01-15"
  count={5}
  expanded={expandedDate === '2024-01-15'}
  onClick={() => toggleDate('2024-01-15')}
/>
```

### IconButton
Composes: Button + Icon
- Icon-only button with tooltip
- Consistent sizing and styling

**Usage:**
```typescript
<IconButton
  icon="settings"
  title="Settings"
  onClick={openSettings}
/>
```

### ContextMenu
Composes: Menu container + items
- Right-click context menu
- Keyboard navigation
- Positioned at click location

**Usage:**
```typescript
<ContextMenu
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, danger: true },
  ]}
/>
```

### MenuButton
Composes: Button + dropdown menu
- Dropdown trigger button
- Accessible keyboard navigation

**Usage:**
```typescript
<MenuButton
  label="Actions"
  items={[
    { label: 'Export', onClick: handleExport },
    { label: 'Delete', onClick: handleDelete },
  ]}
/>
```

### MuseumLabel
Composes: Label + value pair
- IIIF metadata display
- Supports language maps
- Line clamping for long values

**Usage:**
```typescript
<MuseumLabel
  label="Creator"
  value={metadata.value}
/>
```

### CanvasItem
Composes: Thumbnail + label + checkbox
- Canvas in a list
- Checkbox for selection
- Drag handle for reordering

**Usage:**
```typescript
<CanvasItem
  canvas={canvas}
  selected={selected}
  onSelect={toggleSelection}
  onDragStart={handleDragStart}
/>
```

### StackedThumbnail
Composes: Multiple overlapping thumbnails
- Shows multiple items in small space
- Indicates "more items" count

**Usage:**
```typescript
<StackedThumbnail
  items={thumbnails}
  maxStack={3}
/>
```

### StatusBadge
Composes: Badge with status indicator
- Shows validation status
- Color-coded (success, warning, error)

**Usage:**
```typescript
<StatusBadge status="valid" message="Valid IIIF" />
<StatusBadge status="warning" message="Missing metadata" />
<StatusBadge status="error" message="Invalid structure" />
```

### RangeSelector
Composes: Slider + inputs
- Numeric range selection
- Min/max inputs
- Visual slider

**Usage:**
```typescript
<RangeSelector
  min={0}
  max={100}
  value={range}
  onChange={setRange}
/>
```

## Key Principles

1. **Local state only** — Use `useState`, `useRef`, but NOT `useAppSettings`, `useContext`
2. **Props-driven styling** — Receive `cx` and `fieldMode` via props from organisms
3. **No domain knowledge** — Don't know about manifests, canvases, or IIIF
4. **Reusable** — Can be used in any feature without modification
5. **Composable** — Build complex UIs by composing molecules

## Receiving Context

Molecules receive context via props, not hooks:

```typescript
interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  cx?: ContextualClassNames;      // Received from organism
  fieldMode?: boolean;            // Received from organism
}

// ❌ WRONG: Calling context hook
const FilterInput = () => {
  const cx = useContextualStyles(); // Don't do this!
  return <input className={cx.input} />;
};

// ✅ CORRECT: Receive via props
const FilterInput = ({ cx, fieldMode }: FilterInputProps) => {
  return <input className={cx?.input} />;
};
```

## Full List of Molecules

| Molecule | Purpose |
|----------|---------|
| `ActionButton.tsx` | Button with icon and label |
| `CanvasItem.tsx` | Canvas thumbnail with label |
| `ClusterBadge.tsx` | Map cluster indicator |
| `CollectionCard.tsx` | Collection/manifest card |
| `CollectionCardDropOverlay.tsx` | Drag-drop overlay |
| `CollectionCardEditForm.tsx` | Inline editing form |
| `CollectionCardHeader.tsx` | Card header with actions |
| `CollectionCardMenu.tsx` | Card context menu |
| `ContextMenu.tsx` | Right-click menu |
| `ContextMenuItem.tsx` | Menu item |
| `ContextMenuSection.tsx` | Menu section divider |
| `ContextMenuSelectionBadge.tsx` | Selection badge in menu |
| `DebouncedInput.tsx` | Input with debounce |
| `EmptyState.tsx` | Empty state display |
| `FacetPill.tsx` | Filter pill button |
| `FilterInput.tsx` | Filter with debounce |
| `IconButton.tsx` | Icon-only button |
| `LoadingState.tsx` | Loading spinner |
| `MapMarker.tsx` | Map location pin |
| `MenuButton.tsx` | Dropdown menu button |
| `MuseumLabel.tsx` | IIIF label display |
| `PageCounter.tsx` | Page X of Y |
| `RangeSelector.tsx` | Range slider |
| `ResultCard.tsx` | Search result card |
| `SearchField.tsx` | Search input |
| `SelectionToolbar.tsx` | Multi-selection toolbar |
| `StackedThumbnail.tsx` | Overlapping thumbnails |
| `StatusBadge.tsx` | Status indicator |
| `TimelineTick.tsx` | Timeline date marker |
| `Toolbar.tsx` | Action button group |
| `ViewContainer.tsx` | View wrapper with header |
| `ViewToggle.tsx` | View mode toggle |
| `ZoomControl.tsx` | Zoom controls |

---

**See parent directory (`ui/README.md`) for the full atomic hierarchy.**
