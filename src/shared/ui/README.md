# UI Hierarchy: Atoms, Molecules, Organisms

This directory implements **Atomic Design**: a methodology for building UI systems from small, self-contained pieces that compose into larger structures.

## The Hierarchy

```
ATOMS (No state, no logic)
    ↓ (composes)
MOLECULES (Local state, zero domain logic)
    ↓ (composes)
ORGANISMS (Domain logic, feature-specific)
    ↓ (composes)
TEMPLATES (Context + layout)
    ↓ (composes)
PAGES (Routes + data fetching)
```

**Key principle:** Each layer only composes from layers below it. An atom never knows about a molecule. A molecule never uses domain hooks.

---

## Layer 1: Atoms (`atoms/`)

### What is an atom?
An **indivisible UI primitive** with **zero state, zero logic, zero context awareness**.

An atom is to UI what hydrogen is to chemistry — you can't break it down further without losing its purpose.

### Characteristics
- ✅ Pure function (same props → same output)
- ✅ No `useState`, no hooks with side effects
- ✅ Props only (no context consumption)
- ✅ Single responsibility (one visual purpose)
- ✅ Driven by design tokens (colors from COLORS constant, spacing from SPACING)
- ❌ No conditional rendering based on app state
- ❌ No API calls
- ❌ No data fetching

### Examples

**Atom: Button**
```typescript
// Props-only, uses design tokens
export const Button = ({ variant, size, children, ...props }) => {
  return <button style={variantStyles[variant]}>{children}</button>;
};
```

**Atom: Input**
```typescript
// Pure HTML input with design tokens
export const Input = ({ size, disabled, ...props }) => {
  return <input style={sizeStyles[size]} disabled={disabled} {...props} />;
};
```

**Atom: Icon**
```typescript
// Just renders an SVG icon, no logic
export const Icon = ({ name, size }) => icons[name];
```

### Files in this directory
- `Button.tsx` — styled button (re-exported from `../../ui/primitives/`)
- `Input.tsx` — form input (re-exported from `../../ui/primitives/`)
- `Icon.tsx` — icon registry (re-exported from `../../ui/primitives/`)
- `Card.tsx` — card container (re-exported from `../../ui/primitives/`)
- `index.ts` — barrel export of all atoms

See [`src/shared/ui/atoms/README.md`](./atoms/README.md) for details.

---

## Layer 2: Molecules (`molecules/`)

### What is a molecule?
A **self-contained UI component** that composes atoms and manages **local UI state only**. No domain knowledge.

A molecule is the first "smart" component — it has hooks and state — but it's still completely generic.

### Characteristics
- ✅ Composes only atoms (lower layer)
- ✅ Local state only (`useState`, `useDebouncedValue`, local UI state)
- ✅ Props-driven (receives `cx?` and `fieldMode?` from organism — no context hook calls)
- ✅ No domain logic (doesn't know about manifests, canvases, archives)
- ✅ Reusable across features
- ❌ No feature-specific hooks (e.g., no `useManifestData`)
- ❌ No internal business logic
- ❌ No API calls

### Examples

**FilterInput molecule:**
```typescript
// Composes: Icon (atom) + Input (atom) + useDebouncedValue (local hook)
// State: internal search text + debounce timer
// Props: receives cx? and fieldMode? from organism (NO context hook calls)
export const FilterInput = ({ onChange, placeholder, cx, fieldMode }) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebouncedValue(value, 300);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue]);

  return (
    <div className={cx?.input}>
      <Icon name="search" />
      <Input
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        className={fieldMode ? 'high-contrast' : ''}
      />
    </div>
  );
};
```

### Files in this directory
- `FilterInput.tsx` — Debounced search input
- `SearchField.tsx` — Search field with clear button
- `ViewToggle.tsx` — Grid/list/map toggle
- `EmptyState.tsx` — Empty state placeholder
- `LoadingState.tsx` — Loading indicator
- `Toolbar.tsx` — Action button toolbar
- `SelectionToolbar.tsx` — Selection count + bulk actions
- `DebouncedInput.tsx` — Input with debounced onChange
- `ZoomControl.tsx` — Zoom in/out/reset
- `ViewContainer.tsx` — Consistent view wrapper
- `PageCounter.tsx` — "X of Y" counter
- `ClusterBadge.tsx` — Map cluster indicator
- `ContextMenu.tsx` — Right-click context menu
- `FacetPill.tsx` — Filter pill (All, Manifest, etc.)
- `FilterInput.tsx` — Filter input with debounce
- `IconButton.tsx` — Icon-only button
- `MapMarker.tsx` — Map location marker
- `MenuButton.tsx` — Menu trigger button
- `MuseumLabel.tsx` — IIIF label display
- `RangeSelector.tsx` — Range slider
- `ResultCard.tsx` — Search result card
- `SearchField.tsx` — Search input
- `SelectionToolbar.tsx` — Multi-selection toolbar
- `StackedThumbnail.tsx` — Stacked thumbnail display
- `StatusBadge.tsx` — Status indicator badge
- `TimelineTick.tsx` — Timeline date marker
- `ViewToggle.tsx` — View mode toggle
- And more...

See [`src/shared/ui/molecules/README.md`](./molecules/README.md) for details.

---

## Layer 3: Organisms (Not at Shared Level)

Organisms contain **domain logic** and are **feature-specific**. They live in `src/features/*/ui/organisms/`.

**Why not in shared?**
- Organisms know about manifests, canvases, and IIIF
- They use domain hooks like `useArchiveFilter`
- They're specific to a feature's business logic
- They import from entities and services

Example: `ArchiveView`, `BoardView`, `MetadataView`

---

## Context Flow

The key insight: **Context is injected at the template level and flows down via props.**

```
FieldModeTemplate (reads context via hooks)
    ↓
    props: { cx, fieldMode, t, isAdvanced }
    ↓
Organism (ArchiveView)
    ↓
    props: { cx, fieldMode }
    ↓
Molecule (FilterInput)
    ↓
    props: { className }
    ↓
Atom (Input)
```

**No hook calls in organisms or molecules.** Only templates call `useAppSettings()` and `useContextualStyles()`.

---

## Migration Path

### Before (prop drilling):
```typescript
<App fieldMode={fieldMode}>
  <Page fieldMode={fieldMode}>
    <View fieldMode={fieldMode}>
      <Component fieldMode={fieldMode}>
        <FilterInput fieldMode={fieldMode} /> {/* Finally used here */}
      </Component>
    </View>
  </Page>
</App>
```

### After (template injection):
```typescript
<FieldModeTemplate>
  {({ cx, fieldMode }) => (
    <ArchiveView cx={cx} fieldMode={fieldMode}>
      <ArchiveHeader>
        <FilterInput /> {/* Receives styling via cx prop */}
      </ArchiveHeader>
    </ArchiveView>
  )}
</FieldModeTemplate>
```

---

## Summary Table

| Layer | State | Domain Logic | Context Hooks | Location |
|-------|-------|--------------|---------------|----------|
| Atoms | None | None | None | `src/shared/ui/atoms/` |
| Molecules | Local UI only | None | None | `src/shared/ui/molecules/` |
| Organisms | Feature state | Yes | None (receive via props) | `src/features/*/ui/organisms/` |
| Templates | App context | No | Yes (useAppSettings, useContextualStyles) | `src/app/templates/` |

---

See individual README files for each layer:
- [`src/shared/ui/atoms/README.md`](./atoms/README.md)
- [`src/shared/ui/molecules/README.md`](./molecules/README.md)
