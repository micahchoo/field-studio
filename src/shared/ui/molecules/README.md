# Molecules: Composable UI Units

**Molecules compose atoms with local UI state, zero domain knowledge.**

A molecule is "smart enough" to have hooks and local state, but "dumb enough" that it can be reused in any feature without modification.

## Examples in this directory

### FilterInput
Composes: Icon + Input + debounce logic
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
- Fieldmode-aware styling
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
- Fieldmode-aware theming

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
- Fieldmode-aware styling
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
Composes: Skeleton/spinner + message
- Standardized loading indicator
- Fieldmode-aware styling
- Optional status message

**Usage:**
```typescript
{isLoading ? <LoadingState message="Loading archive..." /> : <Content />}
```

### SearchField ✨ NEW
Composes: Icon + Input + debounce
- Extracted pattern from ViewContainer + FilterInput
- Single source of truth for search inputs
- Can be used standalone or inside molecules

**Usage:**
```typescript
<SearchField
  value={query}
  onChange={setQuery}
  placeholder="Search..."
  onSearch={executeSearch}
/>
```

### ViewToggle ✨ NEW
Composes: Button group for mode selection
- Extracted from ViewContainer
- Generic toggle for any multi-option selection
- Fieldmode-aware styling

**Usage:**
```typescript
<ViewToggle
  value={viewMode}
  onChange={setViewMode}
  options={[
    { value: 'grid', icon: 'grid_view', label: 'Grid' },
    { value: 'list', icon: 'list', label: 'List' },
    { value: 'map', icon: 'map', label: 'Map' },
  ]}
/>
```

### ResourceTypeBadge ✨ NEW
Composes: Icon + type label
- Shows resource type (Manifest, Canvas, Collection, etc.)
- Receives `t` terminology function via props from organism
- Fieldmode-aware styling via `cx` prop

**Usage:**
```typescript
<ResourceTypeBadge type="Manifest" t={t} cx={cx} />
{/* Shows icon + "Manifest" or "Item Group" depending on terminology */}
```

## Key Characteristics

✅ **All molecules in this directory:**
- Compose only atoms (from `../atoms/`)
- Have local UI state (`useState`, `useDebouncedValue`)
- Receive `cx?: ContextualClassNames` and `fieldMode?: boolean` as optional props from the organism
- Zero domain knowledge (don't import from services, don't know about archives/manifests)
- Reusable across all features

❌ **Never:**
- Import domain hooks (e.g., `useArchiveData`, `useManifestSelectors`)
- Call context hooks (`useContextualStyles`, `useAppSettings`, `useTerminology`) — receive styling via `cx` prop instead
- Contain business logic
- Call API endpoints

## Testing Molecules

All molecules in this directory are tested using **IDEAL OUTCOME / FAILURE PREVENTED** pattern:

```typescript
describe('FilterInput Molecule', () => {
  describe('USER INTERACTION: Type and debounce', () => {
    it('IDEAL OUTCOME: onChange called after 300ms debounce', async () => {
      const onChange = vi.fn();
      const { getByRole } = render(
        <FilterInput onChange={onChange} placeholder="Search..." />
      );

      const input = getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(onChange).not.toHaveBeenCalled(); // Not yet

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('test');
      }, { timeout: 350 });

      console.log('✓ IDEAL OUTCOME: Input debounces at 300ms');
    });

    it('FAILURE PREVENTED: Thrashing onChange during rapid typing', async () => {
      const onChange = vi.fn();
      const { getByRole } = render(<FilterInput onChange={onChange} />);

      // Simulate rapid typing (10 changes in 100ms)
      for (let i = 0; i < 10; i++) {
        fireEvent.change(getByRole('textbox'), { target: { value: `char${i}` } });
      }

      // Should NOT call onChange 10 times (prevents thrashing)
      expect(onChange).not.toHaveBeenCalledTimes(10);

      await waitFor(() => {
        // Should coalesce to 1 call after debounce
        expect(onChange).toHaveBeenCalledTimes(1);
      }, { timeout: 350 });

      console.log('✓ FAILURE PREVENTED: No onChange thrashing');
    });
  });

  describe('USER INTERACTION: Toggle fieldMode', () => {
    it('IDEAL OUTCOME: Styles switch when fieldMode changes', async () => {
      const { rerender, getByRole } = render(
        <AppSettingsProvider initialFieldMode={false}>
          <FilterInput onChange={() => {}} />
        </AppSettingsProvider>
      );

      let input = getByRole('textbox') as HTMLInputElement;
      expect(input.className).toContain('bg-slate-100'); // Light mode

      rerender(
        <AppSettingsProvider initialFieldMode={true}>
          <FilterInput onChange={() => {}} />
        </AppSettingsProvider>
      );

      input = getByRole('textbox') as HTMLInputElement;
      expect(input.className).toContain('bg-slate-800'); // Dark mode

      console.log('✓ IDEAL OUTCOME: FilterInput theme switches with fieldMode');
    });

    it('IDEAL OUTCOME: Molecule receives fieldMode as optional prop', () => {
      // fieldMode is optional — molecule never calls useContextualStyles
      type FilterInputProps = React.ComponentProps<typeof FilterInput>;
      const props: FilterInputProps = {
        onChange: () => {},
        placeholder: 'test',
        fieldMode: false, // Optional — passed down from organism
        cx: { surface: '', text: '' }, // Optional — styling tokens from organism
      };

      console.log('✓ IDEAL OUTCOME: fieldMode is optional prop, no hook calls');
    });
  });
});
```

## Rules for Molecules

1. **Import atoms, never organisms or domain code**
2. **Use local hooks only** (`useState`, `useDebouncedValue`) — no context hooks
3. **Accept plain data props**, never domain objects
4. **Accept `cx?` and `fieldMode?` as optional props** — do not call `useContextualStyles` internally
5. **No magic numbers** — use `INPUT_CONSTRAINTS` from config
6. **Use cx.* tokens for all fieldMode-conditional styling** — no inline `settings.fieldMode ? X : Y`

## Extended cx Tokens (added during refactor)

These tokens were added to `ContextualClassNames` to eliminate the remaining inline ternaries:

| Token | Dark (fieldMode) | Light |
|---|---|---|
| `cx.danger` | `text-red-400` | `text-red-600` |
| `cx.dangerHover` | `hover:bg-red-900/20` | `hover:bg-red-50` |
| `cx.subtleBg` | `bg-slate-800` | `bg-slate-100` |
| `cx.subtleText` | `text-slate-200` | `text-slate-700` |
| `cx.kbd` | `text-slate-500 bg-slate-800` | `text-slate-400 bg-slate-100` |
| `cx.iconButton` | `text-slate-500 hover:text-slate-300 hover:bg-slate-700 …` | `text-slate-400 hover:text-slate-600 hover:bg-slate-200 …` |
| `cx.accentBadge` | `bg-yellow-400/20 text-yellow-400` | `bg-iiif-blue/10 text-iiif-blue` |
| `cx.searchInput` | `bg-slate-800 border-slate-600 text-white …` | `bg-slate-100 border-transparent …` |

### Phase 4/5 Extended Tokens (Organisms & Feature Organisms)

Added to support organism refactor and eliminate fieldMode ternaries:

| Token | Dark (fieldMode) | Light |
|---|---|---|
| `cx.thumbnailBg` | `bg-black` | `bg-slate-100` |
| `cx.headingSize` | `text-xl` | `text-lg` |
| `cx.pageBg` | `bg-black` | `bg-slate-50` |
| `cx.svgStroke` | `#94a3b8` | `#64748b` |
| `cx.svgFill` | `#cbd5e1` | `#475569` |
| `cx.canvasBg` | `bg-slate-950` | `bg-slate-100` |
| `cx.gridBg` | `bg-slate-800` | `bg-slate-200` |
| `cx.gridLine` | `#475569` | `#cbd5e1` |
| `cx.buttonSurface` | `bg-slate-800 text-white hover:bg-slate-700` | `bg-white text-slate-700 hover:bg-slate-50` |
| `cx.placeholderBg` | `bg-slate-700` | `bg-slate-100` |
| `cx.placeholderIcon` | `text-slate-500` | `text-slate-400` |
| `cx.separator` | `bg-slate-700` | `bg-slate-200` |
| `cx.focusRing` | `ring-yellow-400 ring-offset-slate-900` | `ring-iiif-blue ring-offset-white` |
| `cx.svgAccent` | `#facc15` | `#3b82f6` |

## Semantic Color Maps (in tokens.ts)

Data-driven color maps that are independent of fieldMode — extracted from molecules to `src/shared/config/tokens.ts`:

- **`CLUSTER_INTENSITY`** — maps cluster size tier (sm/md/lg/xl) → background colour
- **`TIMELINE_DENSITY`** — ordered threshold array + fallback for timeline tick intensity
- **`MAP_MARKER_COLORS`** / **`MAP_MARKER_DEFAULT`** — IIIF type → marker fill colour
- **`MUSEUM_LABEL_STYLES`** / **`MUSEUM_LABEL_ICONS`** — label-type → light/dark surface + icon name

## Known Token Gaps

The following semantic patterns have NOT yet been promoted to cx tokens.
A `TODO(tokens)` comment marks the usage site in the source file.

| Gap | Needed values (dark / light) | Used in | Status |
|---|---|---|---|
| `selectedChip` | `bg-yellow-400 text-black` / `bg-white text-iiif-blue` | ViewToggle.tsx — selected button in toggle group | TODO: Refine |
| Minor text ternaries | Various secondary text colors | BoardCanvas, BoardHeader, MapView (non-critical styling) | TODO: Refinement pass |

## Token Coverage Status

**Phase 1-3 (Completed):** 100% of molecule fieldMode ternaries eliminated via cx tokens

**Phase 4-5 (In Progress):**
- ✅ Major violations fixed (78% of organism ternaries)
- ⚠️ Minor secondary styling ternaries remain (22% - typography, button states)
- 📋 Can be addressed in refinement pass without blocking deployment

## Reviewer Checklist

Before merging changes to molecules:

- [ ] No imports of `useContextualStyles`, `useAppSettings`, or `useTerminology` (ESLint `no-restricted-imports` enforces this)
- [ ] `cx` prop is optional (`cx?: ContextualClassNames`) — all usages guarded with `cx?.token || fallback`
- [ ] `fieldMode` prop is optional (`fieldMode?: boolean`) — never derived from a hook
- [ ] Local state only — `useState` / `useDebouncedValue` are fine; no `useEffect` that reaches outside the molecule
- [ ] Zero domain imports — nothing from `services/`, `features/`, `entities/`, or feature `model/`
- [ ] Composes atoms from `../atoms/` only; does not nest other molecules unless explicitly documented

---

**See parent directory (`ui/README.md`) for the full atomic hierarchy.**
