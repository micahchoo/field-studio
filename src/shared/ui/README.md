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
```typescript
// ATOM: Button
// Props-only, uses design tokens
export const Button = ({ variant, size, children, ...props }) => {
  return <button style={variantStyles[variant]}>{children}</button>;
};

// ATOM: Input
// Pure HTML input with design tokens
export const Input = ({ size, disabled, ...props }) => {
  return <input style={sizeStyles[size]} disabled={disabled} {...props} />;
};

// ATOM: Icon
// Just renders an SVG icon, no logic
export const Icon = ({ name, size }) => icons[name];
```

### Files in this directory
- `Button.tsx` — styled button (re-exported from `../../ui/primitives/`)
- `Input.tsx` — form input (re-exported from `../../ui/primitives/`)
- `Icon.tsx` — icon registry (re-exported from `../../ui/primitives/`)
- `Card.tsx` — card container (re-exported from `../../ui/primitives/`)
- `index.ts` — barrel export of all atoms

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
    <div className={cx?.input ?? 'default-input'}>
      <Icon name="search" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
};

interface FilterInputProps {
  onChange: (value: string) => void;
  placeholder?: string;
  cx?: ContextualClassNames;  // Optional — passed from organism
  fieldMode?: boolean;        // Optional — passed from organism
}
```

**SearchField molecule:**
```typescript
// Composes: Icon + Input + clear button
// State: search text, debounce
// Props: receives cx? from organism (NO context hook calls)
export const SearchField = ({ onSearch, placeholder, cx }) => {
  const [text, setText] = useState('');

  return (
    <div className={cx?.surface}>
      <Icon name="search" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
      />
      {text && <button onClick={() => setText('')}>Clear</button>}
    </div>
  );
};

interface SearchFieldProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  cx?: ContextualClassNames;  // Optional — passed from organism
}
```

**ViewToggle molecule:**
```typescript
// Composes: Button atoms in a group
// State: selected mode
// Generic — works for any toggle (archive view mode, board layout, etc.)
export const ViewToggle = ({ value, onChange, options }) => {
  return (
    <div>
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'primary' : 'ghost'}
          onClick={() => onChange(opt.value)}
        >
          <Icon name={opt.icon} />
        </Button>
      ))}
    </div>
  );
};
```

### Files in this directory
- `FilterInput.tsx` — search/filter input with debounce
- `DebouncedInput.tsx` — input with configurable debounce
- `EmptyState.tsx` — standardized empty state placeholder
- `ViewContainer.tsx` — header + content wrapper (for views)
- `Toolbar.tsx` — action button toolbar
- `SelectionToolbar.tsx` — multi-select action toolbar
- `LoadingState.tsx` — loading skeleton
- `SearchField.tsx` — search input (extracted pattern)
- `ViewToggle.tsx` — view mode toggle (extracted pattern)
- `ResourceTypeBadge.tsx` — type indicator + label
- `index.ts` — barrel export of all molecules

---

## Layer 3: Organisms (`organisms/`)

### What is an organism?
**Complex, feature-specific sections** that compose molecules and implement **domain logic**.

Organisms know about your business domain (archives, manifests, canvases). They use domain hooks and API data.

### Characteristics
- ✅ Composes molecules (lower layer)
- ✅ Domain-aware (understands archives, canvases, etc.)
- ✅ Domain hooks allowed (`useArchiveData`, `useManifestSelectors`)
- ✅ Complex state and logic
- ❌ No routing logic
- ❌ No global state mutations (uses actions dispatcher, not direct vault updates)
- ❌ No page-level concerns (data fetching is in pages)

### Examples (in `src/features/*/ui/organisms/`)

**ArchiveGrid organism:**
```typescript
// Knows about manifests and canvases (domain)
// Composes: FilterInput (molecule) + grid renderer
export const ArchiveGrid = ({ root }) => {
  const manifests = useArchiveSelectors(root);
  const [filter, setFilter] = useState('');
  const filtered = manifests.filter(/* domain-aware filter */);

  return (
    <>
      <FilterInput onChange={setFilter} /> {/* Molecule */}
      <div className="grid">
        {filtered.map(manifest => (
          <ManifestCard key={manifest.id} manifest={manifest} />
        ))}
      </div>
    </>
  );
};
```

### NOT in src/shared/ui/organisms/

We don't put organisms in `src/shared/` because organisms are **feature-specific**. They go in `src/features/*/ui/organisms/`.

---

## Practical Decision Tree

**Is this component zero state?**
- Yes → **ATOM**
- No → Next question

**Does it only have local UI state (not domain state)?**
- Yes → **MOLECULE**
- No → **ORGANISM** (put in features/)

**Does it need to know about archives, manifests, or domain logic?**
- Yes → **ORGANISM** (definitely features/)
- No → Could be a molecule

**Is it reusable across multiple features?**
- Yes → **MOLECULE** (shared layer)
- No → **ORGANISM** (feature layer)

---

## Rules Enforced by Convention

1. **Atoms never import molecules or organisms**
2. **Molecules never import organisms or domain hooks**
3. **Organisms never import from app/ or routes/**
4. **All UI styling goes through design tokens (COLORS, SPACING, etc.)**
5. **Context (fieldMode, settings) flows via props from Template → Organism → Molecule**

---

## Testing Strategy

Tests follow **IDEAL OUTCOME / FAILURE PREVENTED** pattern and use **real data**:

### Atom Tests
```typescript
describe('Button Atom', () => {
  it('IDEAL OUTCOME: Renders with correct variant styles', () => {
    const { getByRole } = render(<Button variant="primary">Click</Button>);
    expect(getByRole('button')).toHaveClass('bg-blue-600');
    console.log('✓ IDEAL: Button renders variant correctly');
  });
});
```

### Molecule Tests
```typescript
describe('FilterInput Molecule', () => {
  it('IDEAL OUTCOME: Debounces onChange after 300ms', async () => {
    const onChange = vi.fn();
    const { getByRole } = render(<FilterInput onChange={onChange} />);

    fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).not.toHaveBeenCalled(); // Not yet

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('test'));
    console.log('✓ IDEAL: Input debounces at 300ms');
  });

  it('IDEAL OUTCOME: fieldMode is optional prop (props-driven)', () => {
    // TypeScript check: FilterInput accepts optional cx and fieldMode props
    const props: React.ComponentProps<typeof FilterInput> = {
      onChange: () => {},
      fieldMode: false,  // Optional — passed from organism
      cx: { surface: '', text: '', border: '', input: '' },  // Optional styling
    };
    console.log('✓ IDEAL: Props-driven theming via cx and fieldMode');
  });
});
```

### Organism Tests
```typescript
describe('ArchiveGrid Organism', () => {
  it('IDEAL OUTCOME: Filters manifests from real archive data', async () => {
    const realData = await loadRealArchiveFixture('Karwaan');
    const { getByRole } = render(<ArchiveGrid root={realData} />);

    fireEvent.change(getByRole('textbox'), { target: { value: '110' } });

    await waitFor(() => {
      expect(getByRole('grid').querySelectorAll('[data-testid="item"]')).toHaveLength(1);
    });
    console.log('✓ IDEAL: Grid filters real data correctly');
  });
});
```

---

## Summary Table

| Aspect | Atoms | Molecules | Organisms |
|--------|-------|-----------|-----------|
| **State** | None | Local UI only | Domain + local |
| **Location** | `shared/ui/atoms/` | `shared/ui/molecules/` | `features/*/ui/organisms/` |
| **Composes** | Nothing | Atoms | Molecules + domain |
| **Hooks** | None (pure functions) | Local only (`useState`, `useDebouncedValue`) — no context hooks | Domain (`useArchiveData`, `useManifestSelectors`) + context via props |
| **Props** | Style + content | Generic UI props | Domain data + callbacks |
| **Reusable?** | Across all features | Across all features | Feature-specific |
| **Testable?** | Simple snapshot tests | IDEAL/FAILURE + UI interaction | IDEAL/FAILURE + real data |

---

**Next:** See `atoms/`, `molecules/` directories for implementation examples.
