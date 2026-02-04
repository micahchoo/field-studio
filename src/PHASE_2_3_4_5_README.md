# Phases 2-5: From Entities to Integration

Comprehensive guide for the remaining phases of the atomic design refactor.

---

## Phase 2: Entity Layer (Thin Wrappers)

**Goal:** Establish FSD boundaries

### What It Is
Thin re-export layers that prevent features from reaching directly into services.

```typescript
// Before (features reach into services)
import { selectors } from '@/services/vault';
const manifests = selectors.selectByRoot(root);

// After (features import from entities)
import { manifest } from '@/src/entities/manifest';
const manifests = manifest.model.selectByRoot(root);
```

### Implementation

Create `src/entities/{canvas,manifest,collection}/`:

**`canvas/model.ts`** (Re-exports canvas selectors)
```typescript
export const selectWidth = (canvas: Canvas) => canvas.width;
export const selectHeight = (canvas: Canvas) => canvas.height;
// ... re-export all canvas queries from services/selectors
```

**`canvas/actions.ts`** (Re-exports canvas mutations)
```typescript
export const updateLabel = (id: string, label: LanguageMap) =>
  actions.updateLabel(id, label);
export const updateDimensions = (id: string, w: number, h: number) =>
  actions.batchUpdate([...]);
// ... re-export all canvas mutations from services/actions
```

**`canvas/index.ts`** (Public API)
```typescript
export * as model from './model';
export * as actions from './actions';
export type { Canvas } from '../../types';
```

Repeat for `manifest/` and `collection/`.

### Success Criteria
- ✅ Zero new logic (pure re-exports)
- ✅ One file per domain entity (canvas, manifest, collection)
- ✅ Feature imports use: `import { manifest } from '@/src/entities/manifest'`
- ✅ Tests verify selectors and actions are correctly re-exported

### Files to Create
```
src/entities/
├── canvas/{model.ts, actions.ts, index.ts}
├── manifest/{model.ts, actions.ts, index.ts}
├── collection/{model.ts, actions.ts, index.ts}
├── README.md (specification)
└── IMPLEMENTATION_GUIDE.md (step-by-step)
```

---

## Phase 3: App Layer (Templates, Providers, Routing)

**Goal:** Consolidate global state and routing

### What It Is
- **Templates:** Layout wrappers that inject context
- **Providers:** Consolidated context providers
- **Routing:** Main view dispatcher

### Implementation

**`src/app/providers/index.ts`** (Consolidate providers)
```typescript
export const AppProviders = ({ children }) => (
  <VaultProvider>
    <UserIntentProvider>
      <ResourceContextProvider>
        <ToastProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </ResourceContextProvider>
    </UserIntentProvider>
  </VaultProvider>
);
```

**`src/app/templates/FieldModeTemplate.tsx`** (Inject context to organisms)
```typescript
export const FieldModeTemplate = ({ children }) => {
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);
  return children({ cx, fieldMode: settings.fieldMode });
};
```

**`src/app/templates/BaseTemplate.tsx`** (Global layout)
```typescript
export const BaseTemplate = ({ children }) => (
  <div className="flex h-screen">
    <Sidebar />
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  </div>
);
```

**`src/app/routes/ViewRouter.tsx`** (Route dispatcher)
```typescript
export const ViewRouter = ({ currentMode, selectedId, root, onSelect }) => {
  switch (currentMode) {
    case 'archive':
      return (
        <FieldModeTemplate>
          {({ cx, fieldMode }) => (
            <ArchiveView root={root} cx={cx} fieldMode={fieldMode} />
          )}
        </FieldModeTemplate>
      );
    // ... other routes
  }
};
```

### Success Criteria
- ✅ All context providers in one place
- ✅ Templates receive data via props, inject context
- ✅ Organisms receive `cx` and `fieldMode` from templates
- ✅ Router handles navigation, no feature-to-feature imports
- ✅ Tests verify templates provide correct context

### Files to Create
```
src/app/
├── templates/{FieldModeTemplate.tsx, BaseTemplate.tsx, README.md}
├── providers/{index.ts, README.md}
├── routes/{ViewRouter.tsx, README.md}
├── README.md (overview)
└── IMPLEMENTATION_GUIDE.md (step-by-step)
```

---

## Phase 4: Feature Slices (Organisms + Domain Logic)

**Goal:** Implement end-to-end features using molecules

### What It Is
Self-contained feature implementations that compose molecules into organisms.

### Implementation Pattern

**`src/features/archive/`** (Main example)

```
archive/
├── ui/organisms/
│   ├── ArchiveView.tsx      (300 lines)
│   │   ├── Manages: filter, sort, view mode
│   │   ├── Composes: ArchiveHeader + ArchiveGrid
│   │   └── Uses: manifest.model.selectAll(), canvas actions
│   │
│   ├── ArchiveGrid.tsx      (200 lines)
│   │   ├── Renders: virtualized grid/list
│   │   ├── Composes: ManifestCard for each item
│   │   └── No domain logic (receives data from ArchiveView)
│   │
│   └── ArchiveHeader.tsx    (80 lines)
│       ├── Composes: SearchField + ViewToggle molecules
│       └── No domain knowledge
│
├── model/
│   └── index.ts             (Domain selectors, helpers)
│       ├── Imports: from @/src/entities/manifest, canvas
│       ├── Exports: selectAll(), filterByTerm(), sortBy()
│       └── No UI logic
│
└── index.ts                 (Public API)
    └── Exports: ArchiveView, archive.model
```

### ArchiveView Example
```typescript
export const ArchiveView = ({ root, onSelect, onUpdate }) => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use domain model
  const manifests = archive.model.selectAll(root);
  const filtered = archive.model.filterByTerm(manifests, filter);

  return (
    <>
      <ArchiveHeader
        filter={filter}
        onFilterChange={setFilter}
        mode={viewMode}
        onModeChange={setViewMode}
      />
      <ArchiveGrid
        items={filtered}
        viewMode={viewMode}
        onSelect={onSelect}
      />
    </>
  );
};
```

### Success Criteria
- ✅ Each feature is <1000 lines total
- ✅ Organisms compose molecules
- ✅ Domain logic in `model/index.ts`
- ✅ No hardcoded values
- ✅ Tests use real data from `.Images iiif test/`
- ✅ No imports between features

### Features to Implement
1. **archive** (Primary, proves pattern)
2. **board-design** (Layout editor)
3. **metadata-edit** (Metadata form)
4. **staging** (Two-pane import)
5. **search** (Full-text search)
6. **viewer** (IIIF viewer)
7. **map** (Geographic map)
8. **timeline** (Temporal timeline)

---

## Phase 5: Integration & Wiring

**Goal:** Wire new features into app, verify no regressions

### What It Is
Incremental switchover from old to new architecture.

### Process

**Step 1: Update App.tsx**
```typescript
import { AppProviders } from '@/src/app/providers';
import { BaseTemplate } from '@/src/app/templates/BaseTemplate';
import { ViewRouter } from '@/src/app/routes/ViewRouter';

export const MainApp = () => (
  <AppProviders>
    <BaseTemplate>
      <ViewRouter
        currentMode={currentMode}
        selectedId={selectedId}
        root={root}
        onSelect={onSelect}
      />
    </BaseTemplate>
  </AppProviders>
);
```

**Step 2: Wire one feature at a time**
- Update ViewRouter to import new feature
- Run tests
- Verify fieldMode toggle works
- Verify terminology works
- Check for console errors

**Step 3: Repeat for each feature**
```typescript
case 'archive':
  return (
    <FieldModeTemplate>
      {({ cx, fieldMode }) => (
        <ArchiveView root={root} cx={cx} fieldMode={fieldMode} onSelect={onSelect} />
      )}
    </FieldModeTemplate>
  );
case 'board':
  return <BoardView root={root} />;
// ... etc
```

**Step 4: Final cleanup**
Once all routes are wired:
- Delete old `components/views/` directory
- Delete old `components/staging/` directory
- Verify zero references to old paths in codebase
- Run full test suite
- Check build output size

### Success Criteria
- ✅ All routes wired to new features
- ✅ fieldMode toggle works on all views
- ✅ Terminology respects abstraction level
- ✅ No console errors
- ✅ No performance regressions
- ✅ All tests passing
- ✅ Old components deleted

### Test Strategy
Integration tests verify complete workflows:

```typescript
describe('Integration: Full app workflow', () => {
  it('IDEAL OUTCOME: User can import, browse, and export archive', async () => {
    const { getByRole } = render(<MainApp />);

    // 1. Navigate to archive
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));

    // 2. See archive view
    expect(getByRole('main')).toBeInTheDocument();

    // 3. Toggle fieldMode
    fireEvent.click(screen.getByRole('button', { name: /field mode/i }));

    // 4. Archive theme changes
    expect(getByRole('main')).toHaveClass('bg-black');

    // 5. Search works
    fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
    await waitFor(() => {
      expect(getByRole('grid').querySelectorAll('[data-testid="item"]')).toBeDefined();
    });

    console.log('✓ IDEAL OUTCOME: Full workflow successful');
  });
});
```

---

## Summary of Phases 2-5

| Phase | Goal | Files | LOC | Focus |
|-------|------|-------|-----|-------|
| **2** | Entity boundaries | 9 | 200-300 | Thin re-exports |
| **3** | Global state | 8 | 400-500 | Templates, routing |
| **4** | Features | 40+ | 3,000+ | Organisms, domain logic |
| **5** | Integration | Tests | 500+ | Wiring, verification |

---

## Architecture Summary

```
App.tsx
  ├── <AppProviders>              (Vault, Intent, Resource, Toast)
  │   └── <BaseTemplate>          (Sidebar, Header, Main)
  │       └── <ViewRouter>        (Route dispatcher)
  │           └── <FieldModeTemplate>
  │               └── <ArchiveView />     (Feature organism)
  │                   ├── <ArchiveHeader />
  │                   │   ├── <SearchField />  (Molecule)
  │                   │   └── <ViewToggle />   (Molecule)
  │                   └── <ArchiveGrid />
  │                       └── <ManifestCard>
```

---

## Key Metrics (Final)

| Metric | Target | Notes |
|--------|--------|-------|
| Magic numbers | 0 | All in `config/tokens.ts` |
| fieldMode prop-drilling | 0 | All molecules use context |
| Feature cross-imports | 0 | Each feature independent |
| App layer LOC | <500 | Just routing, templates, providers |
| Entity layer LOC | <500 | Thin re-exports only |
| Shared layer LOC | <3,000 | Atoms + molecules (already done) |
| Features layer LOC | 3,000+ | Domain logic, organisms |
| Tests with IDEAL/FAILURE | 100% | All new tests follow pattern |
| Real-data usage | 100% | All organisms tested with real data |

---

## Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| **2: Entity Layer** | 2-3 hours | Thin re-exports |
| **3: App Layer** | 3-4 hours | Templates, routing |
| **4: Features** | 20-30 hours | 8 features × 2.5-4 hours each |
| **5: Integration** | 5-8 hours | Wiring, cleanup, verification |
| **Total** | 30-45 hours | Full refactor |

---

## Next Steps

1. **Start Phase 2:** Implement entity layer (canvas, manifest, collection)
2. **Then Phase 3:** Templates, providers, routing
3. **Then Phase 4:** Archive feature (first feature, proves pattern)
4. **Then Repeat:** Board, metadata, staging, etc.
5. **Finally Phase 5:** Wire all features, cleanup, verify

---

For implementation details, see individual phase READMEs:
- `src/entities/README.md`
- `src/app/README.md`
- `src/features/README.md`
