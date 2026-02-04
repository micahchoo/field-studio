# Molecules: Composable UI Units

**Molecules compose atoms with local UI state, zero domain knowledge.**

A molecule is "smart enough" to have hooks and local state, but "dumb enough" that it can be reused in any feature without modification.

## Examples in this directory

### FilterInput
Composes: Icon + Input + debounce logic
- Input for searching/filtering
- Built-in debounce at 300ms
- Clear button appears when text exists
- Styles via `useContextualStyles` (fieldMode-aware)

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
Composes: Icon + type label via terminology
- Shows resource type (Manifest, Canvas, Collection, etc.)
- Uses `useTerminology` to get localized labels
- Fieldmode-aware styling

**Usage:**
```typescript
<ResourceTypeBadge type="Manifest" />
{/* Shows icon + "Manifest" or "Item Group" depending on abstraction level */}
```

## Key Characteristics

✅ **All molecules in this directory:**
- Compose only atoms (from `../atoms/`)
- Have local UI state (`useState`, `useDebouncedValue`)
- Call generic context hooks (`useContextualStyles`, `useAppSettings`, `useTerminology`)
- Zero domain knowledge (don't import from services, don't know about archives/manifests)
- Reusable across all features

❌ **Never:**
- Import domain hooks (e.g., `useArchiveData`, `useManifestSelectors`)
- Have prop drilling of `fieldMode` (they consume `useContextualStyles` internally)
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

    it('FAILURE PREVENTED: fieldMode prop prop-drilling', () => {
      // Verify no fieldMode prop in the interface
      type FilterInputProps = React.ComponentProps<typeof FilterInput>;
      const props: FilterInputProps = {
        onChange: () => {},
        placeholder: 'test',
        // fieldMode: false, ← Should NOT be allowed
      };

      console.log('✓ FAILURE PREVENTED: No fieldMode prop-drilling');
    });
  });
});
```

## Rules for Molecules

1. **Import atoms, never organisms or domain code**
2. **Use generic hooks only** (`useState`, `useDebouncedValue`, `useContextualStyles`)
3. **Accept plain data props**, never domain objects
4. **Never accept `fieldMode` as a prop** — consume it via `useContextualStyles`
5. **No magic numbers** — use `INPUT_CONSTRAINTS` from config

---

**See parent directory (`ui/README.md`) for the full atomic hierarchy.**
