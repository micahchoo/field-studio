# Features Layer (`src/features/`)

The **features layer** contains domain-specific feature implementations. Each feature is a self-contained slice with its own UI, models, and logic.

## Philosophy

**"A feature is a complete user scenario from UI to domain logic."**

Each feature:
- Knows about its domain (manifests, canvases, etc.)
- Uses entity models and actions
- Composes molecules into organisms
- Doesn't know about other features
- Is independently testable

## Structure

```
src/features/
├── archive/                     ← Browse and organize collections
│   ├── ui/
│   │   └── organisms/
│   │       ├── ArchiveView.tsx       (300 lines)
│   │       ├── ArchiveGrid.tsx       (200 lines)
│   │       ├── ArchiveHeader.tsx     (80 lines)
│   │       └── README.md
│   ├── model/
│   │   └── index.ts            ← Re-exports from entities, domain logic
│   └── index.ts                ← Public API
│
├── board-design/                ← Edit board layouts
│   ├── ui/organisms/
│   ├── model/
│   └── index.ts
│
├── metadata-edit/               ← Edit metadata fields
│   ├── ui/organisms/
│   ├── model/
│   └── index.ts
│
├── staging/                     ← Two-pane import workbench
│   ├── ui/organisms/
│   ├── model/
│   └── index.ts
│
├── search/                      ← Full-text search
├── viewer/                      ← IIIF viewer
├── map/                         ← Geographic map
└── timeline/                    ← Temporal timeline
```

## Feature: Archive

### ArchiveView (Organism)
**Responsibility:** Orchestrate archive feature
- Manage filter, sort, view mode
- Compose ArchiveHeader + ArchiveGrid
- Handle selection and actions

```typescript
export const ArchiveView = ({ root, onSelect, onUpdate }) => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Domain selectors
  const manifests = archive.model.selectAll(root);
  const filtered = manifests.filter(m => m.label?.en?.[0]?.includes(filter));

  return (
    <>
      <ArchiveHeader
        filter={filter}
        onFilterChange={setFilter}
        mode={viewMode}
        onModeChange={setViewMode}
      />
      <ArchiveGrid items={filtered} viewMode={viewMode} onSelect={onSelect} />
    </>
  );
};
```

### ArchiveGrid (Organism)
**Responsibility:** Render archive items
- Virtualized grid/list view
- Item cards with interactions
- Doesn't manage data (receives it from parent)

### ArchiveHeader (Organism)
**Responsibility:** Header UI
- Composes SearchField + ViewToggle molecules
- No domain logic

### model/index.ts
Domain-specific selectors and helpers:

```typescript
// Import from entities
export { manifest, canvas, collection } from '@/src/entities';

// Domain-specific helpers
export const selectAll = (root: IIIFItem) =>
  manifest.model.selectByRoot(root);

export const filterByTerm = (manifests: Manifest[], term: string) =>
  manifests.filter(m =>
    m.label?.en?.[0]?.toLowerCase().includes(term.toLowerCase())
  );

export const sortBy = (manifests: Manifest[], key: 'date' | 'name') =>
  key === 'date'
    ? manifests.sort((a, b) => (a.navDate || '').localeCompare(b.navDate || ''))
    : manifests.sort((a, b) =>
        (a.label?.en?.[0] || '').localeCompare(b.label?.en?.[0] || '')
      );
```

### index.ts (Public API)
What the outside world imports:

```typescript
export { ArchiveView } from './ui/organisms/ArchiveView';
export * as archive from './model';
```

## Testing Strategy

Each feature is tested with IDEAL/FAILURE patterns and real data:

```typescript
describe('Archive Feature', () => {
  describe('USER SCENARIO: Browse, filter, and view archive', () => {
    it('IDEAL OUTCOME: User can filter manifests and switch view modes', async () => {
      const realData = await loadRealArchiveFixture('Karwaan');

      const { getByRole } = render(
        <ArchiveView root={realData} onSelect={vi.fn()} />
      );

      // 1. User searches
      fireEvent.change(getByRole('textbox'), { target: { value: '110' } });

      // 2. Grid updates
      await waitFor(() => {
        expect(getByRole('grid').querySelectorAll('[data-testid="item"]'))
          .toHaveLength(1);
      });

      // 3. User toggles to list view
      fireEvent.click(screen.getByLabelText('List'));

      // 4. List renders
      expect(getByRole('list')).toBeInTheDocument();

      console.log('✓ IDEAL OUTCOME: Browse, filter, and view modes work');
    });
  });
});
```

## Rules

✅ **Features CAN:**
- Use domain hooks (`useArchiveFilter`, `useManifestSelectors`)
- Dispatch domain actions (`manifest.actions.update`)
- Compose molecules (SearchField, ViewToggle, Toolbar)
- Import from entities layer
- Have complex state and logic

❌ **Features CANNOT:**
- Import from other features
- Import from app layer
- Know about routing
- Access global state directly (must go through entities)
- Have hardcoded values (use constants)

## Dependency Flow

```
Archive Feature
  ├── Organisms: ArchiveView, ArchiveGrid, ArchiveHeader
  │   └── Compose molecules: SearchField, ViewToggle, Toolbar
  │
  └── Model: domain selectors and actions
      └── Import from: entities/manifest, entities/canvas
          └── Which re-export from: services
```

**Unidirectional:** Features → Entities → Services → Vault

## Feature Checklist

When building a new feature:

- [ ] Create `ui/organisms/` directory with 2-3 focused organisms
- [ ] Create `model/index.ts` with domain selectors and helpers
- [ ] Create `index.ts` with public API
- [ ] Write tests using IDEAL/FAILURE pattern
- [ ] Use real data from `.Images iiif test/`
- [ ] No hardcoded values (use constants)
- [ ] No other feature imports
- [ ] No app layer imports
- [ ] Organisms receive `cx`, `fieldMode`, `t`, `isAdvanced` as props — never call `useContextualStyles`, `useAppSettings`, or `useTerminology` directly
- [ ] Organisms pass `cx` and `fieldMode` down to every molecule child
- [ ] Domain hooks (e.g., `useMap`, `useViewer`, `useHistory`) are allowed inside organisms; context hooks are not

## Next Steps

See individual feature READMEs:
- `archive/README.md` — Archive feature specification
- `board-design/README.md` — Board editor specification
- `metadata-edit/README.md` — Metadata editor specification
- `staging/README.md` — Staging workbench specification
