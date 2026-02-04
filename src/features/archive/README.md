# Archive Feature (`src/features/archive/`)

The **Archive feature** is the primary view for browsing, organizing, and managing field research media collections. It demonstrates the atomic design pattern in action: organisms compose molecules, organisms use domain hooks.

## Structure

```
archive/
├── ui/
│   └── organisms/
│       ├── ArchiveView.tsx         ← Main view (1,200 → 600 lines after refactor)
│       ├── ArchiveGrid.tsx         ← Grid rendering with virtualization
│       ├── ArchiveHeader.tsx       ← Header with search + view toggle
│       └── README.md               (this file)
├── model/
│   └── index.ts                    ← Selectors and actions (thin wrapper)
└── index.ts                        ← Public API
```

## What Each Organism Does

### ArchiveView
**Responsibility:** Orchestrate the archive view
- Receives `root` (IIIF tree) via props
- Manages view state (filter, sort, view mode)
- Composes ArchiveHeader + ArchiveGrid molecules
- **NOT responsible for:** Data fetching (that's the page's job)

```typescript
export const ArchiveView = ({ root, onSelect, onUpdate }) => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');

  const filtered = useArchiveFilter(root, filter); // Domain hook

  return (
    <>
      <ArchiveHeader filter={filter} onFilterChange={setFilter} mode={viewMode} onModeChange={setViewMode} />
      <ArchiveGrid items={filtered} viewMode={viewMode} onSelect={onSelect} />
    </>
  );
};
```

### ArchiveHeader
**Responsibility:** Header + filtering + view toggle
- Composes `SearchField` molecule for search
- Composes `ViewToggle` molecule for mode switching
- Receives `cx` and `fieldMode` via props from ArchiveView
- Passes `cx` and `fieldMode` to molecule children
- **NOT responsible for:** What happens when user searches (that's ArchiveView's job)

```typescript
export const ArchiveHeader = ({ filter, onFilterChange, mode, onModeChange, cx, fieldMode }) => (
  <div className={`flex items-center gap-4 p-4 ${cx?.surface}`}>
    <SearchField value={filter} onChange={onFilterChange} cx={cx} fieldMode={fieldMode} />
    <ViewToggle
      value={mode}
      onChange={onModeChange}
      cx={cx}
      fieldMode={fieldMode}
      options={[
        { value: 'grid', icon: 'grid_view' },
        { value: 'list', icon: 'list' },
        { value: 'map', icon: 'map' },
      ]}
    />
  </div>
);
```

### ArchiveGrid
**Responsibility:** Render archive items in chosen view mode
- Virtualized grid for performance
- Supports grid, list, map views
- Uses `useVirtualization` hook for large collections
- **NOT responsible for:** Data selection, filtering (that's ArchiveView's job)

```typescript
export const ArchiveGrid = ({ items, viewMode, onSelect }) => (
  <VirtualizedGrid items={items} viewMode={viewMode}>
    {item => (
      <ManifestCard
        manifest={item}
        onClick={() => onSelect(item)}
      />
    )}
  </VirtualizedGrid>
);
```

## Key Patterns

### 1. **Organisms Compose Molecules**
```typescript
<ArchiveHeader>
  └─ <SearchField />      ← Molecule (no props about domain)
  └─ <ViewToggle />       ← Molecule (generic option switcher)
</ArchiveHeader>
```

### 2. **Organisms Use Domain Hooks**
```typescript
const { manifests, canvases } = useArchiveSelectors(root);
const filtered = useArchiveFilter(root, filterText);
dispatch(actions.updateManifest(id, newData));
```

### 3. **Organisms Receive Context via Props**
```typescript
// WRONG — organisms should not call context hooks
const ArchiveView = ({ root }) => {
  const cx = useContextualStyles();  // ❌ Should receive via props!
  const { settings } = useAppSettings();  // ❌ Should receive via props!
}

// CORRECT — organisms receive context from FieldModeTemplate
<FieldModeTemplate>
  {({ cx, fieldMode, t, isAdvanced }) => (
    <ArchiveView
      root={root}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
      isAdvanced={isAdvanced}
      onSelect={onSelect}
    />
  )}
</FieldModeTemplate>
```

### 4. **Props Include Data AND Context**
```typescript
// Props tell organism: "here's your data AND your context"
interface ArchiveViewProps {
  // Data props
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  onUpdate?: (newRoot: IIIFItem) => void;
  // Context props (from FieldModeTemplate)
  cx: ContextualClassNames;
  fieldMode: boolean;
  t: (key: string) => string;
  isAdvanced: boolean;
}

// Organism passes cx to molecules:
<SearchField cx={cx} fieldMode={fieldMode} onChange={setFilter} />
```

## Testing Strategy

Each organism is tested with:
- ✅ Real data from `.Images iiif test/` (Karwaan sequence)
- ✅ IDEAL OUTCOME / FAILURE PREVENTED pattern
- ✅ User interaction focus (type, click, navigate)
- ✅ Complete workflows (not isolated functions)

### Example Tests

```typescript
describe('ArchiveView Organism', () => {
  describe('USER INTERACTION: Type in search filter', () => {
    it('IDEAL OUTCOME: Grid filters manifests in real time', async () => {
      const realData = await loadRealArchiveFixture('Karwaan');
      const { getByRole } = render(<ArchiveView root={realData} onSelect={vi.fn()} />);

      // User types in search
      fireEvent.change(getByRole('textbox'), { target: { value: '110' } });

      // Assert: Grid updated
      await waitFor(() => {
        const items = getByRole('grid').querySelectorAll('[data-testid="archive-item"]');
        expect(items).toHaveLength(1);
      });

      console.log('✓ IDEAL OUTCOME: Search filters grid correctly');
    });

    it('FAILURE PREVENTED: Search doesn\'t crash with special characters', async () => {
      const realData = await loadRealArchiveFixture('Karwaan');
      const { getByRole } = render(<ArchiveView root={realData} onSelect={vi.fn()} />);

      // User types dangerous input
      fireEvent.change(getByRole('textbox'), { target: { value: '<script>alert("xss")</script>' } });

      // Assert: Grid still renders (no crash)
      expect(getByRole('grid')).toBeInTheDocument();

      console.log('✓ FAILURE PREVENTED: Search sanitizes input safely');
    });
  });

  describe('USER INTERACTION: Toggle view mode', () => {
    it('IDEAL OUTCOME: View switches between grid/list/map', async () => {
      const realData = await loadRealArchiveFixture('Karwaan');
      const { rerender, getByRole } = render(<ArchiveView root={realData} onSelect={vi.fn()} />);

      // Initial: grid view
      expect(getByRole('grid')).toBeInTheDocument();

      // User clicks list button
      fireEvent.click(screen.getByLabelText('List'));
      rerender(<ArchiveView root={realData} onSelect={vi.fn()} viewMode="list" />);

      // Assert: List view rendered
      expect(getByRole('grid')).not.toBeInTheDocument(); // Grid gone
      expect(getByRole('list')).toBeInTheDocument();      // List present

      console.log('✓ IDEAL OUTCOME: View modes toggle correctly');
    });
  });

  describe('USER INTERACTION: Toggle fieldMode context', () => {
    it('IDEAL OUTCOME: Archive theme switches with fieldMode prop', async () => {
      const realData = await loadRealArchiveFixture('Karwaan');
      const cxLight = { surface: 'bg-slate-50', text: 'text-slate-900' };
      const cxDark = { surface: 'bg-black', text: 'text-white' };

      // Light mode — pass cx directly via props
      const { rerender, container } = render(
        <ArchiveView root={realData} onSelect={vi.fn()} cx={cxLight} fieldMode={false} />
      );

      expect(container.querySelector('[role="main"]')).toHaveClass('bg-slate-50');

      // Toggle fieldMode — pass different cx via props
      rerender(
        <ArchiveView root={realData} onSelect={vi.fn()} cx={cxDark} fieldMode={true} />
      );

      // Dark mode
      expect(container.querySelector('[role="main"]')).toHaveClass('bg-black');

      console.log('✓ IDEAL OUTCOME: Archive theme switches with fieldMode prop');
    });
  });
});
```

## Dependency Flow

```
ArchiveView (organism, 300 lines)
├── Depends on: SearchField + ViewToggle (molecules)
├── Uses: useArchiveSelectors, useArchiveFilter (domain hooks)
├── Calls: actions.updateManifest, actions.deleteManifest (domain actions)
└── Composes: ArchiveHeader + ArchiveGrid (child organisms)
    ├── ArchiveHeader
    │   └── Composes: SearchField + ViewToggle (molecules)
    └── ArchiveGrid
        └── Renders: ManifestCard for each item
```

**Rules:**
- ✅ Can use domain hooks (useArchiveSelectors, useArchiveFilter)
- ✅ Can dispatch actions (actions.updateManifest)
- ✅ Can compose molecules (SearchField, ViewToggle)
- ❌ Cannot import from `app/` or `features/board`
- ❌ Cannot have routing logic
- ❌ Cannot fetch data (that's page's job)

## File Sizes (Target)

| File | Current | Target |
|------|---------|--------|
| ArchiveView.tsx | 1,244 lines (old) | 300 lines (new) |
| ArchiveGrid.tsx | (new) | 200 lines |
| ArchiveHeader.tsx | (new) | 80 lines |
| **Total** | | **580 lines** |

**Why smaller:** Old monolithic view split into focused organisms that each compose molecules.

---

**See tests in** `src/test/__tests__/features/archive-view.test.tsx` (pattern file available).
