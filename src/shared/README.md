# Shared Layer (`src/shared/`)

The shared layer is the **foundation that all features depend on**. Nothing in the shared layer knows about features, domains, or business logic. It exists to provide reusable building blocks.

## Structure

```
src/shared/
├── ui/                    # UI component hierarchy (atoms → molecules → organisms)
│   ├── atoms/             # Indivisible UI primitives (no state, no logic)
│   ├── molecules/         # Composed atoms with local UI state (no domain logic)
│   └── organisms/         # (Reserved, not used at shared level)
├── lib/                   # Shared hooks and utilities (non-UI)
├── config/                # Design tokens and configuration constants
└── README.md              # This file
```

## Dependency Flow

Nothing outside `shared/` can import from features or app layers. This is a **one-way dependency**:

```
Everything → shared/*       (allowed)
shared/* → features         (NOT allowed)
shared/* → app             (NOT allowed)
```

## What Goes Here vs What Doesn't

### ✅ Does belong in shared:
- **Atoms**: Button, Input, Icon, Card (zero state, zero logic)
- **Molecules**: FilterInput, SearchField, ViewToggle (local UI state only, no domain knowledge)
- **Hooks**: `useDebouncedValue`, `useContextualStyles`, `useResponsive` (generic, reusable)
- **Constants**: COLORS, SPACING, debounce milliseconds, input constraints
- **Utilities**: String formatting, validation functions

### ❌ Does NOT belong in shared:
- Feature-specific components (ArchiveGrid, BoardView)
- Domain models (Canvas, Manifest selectors)
- Feature hooks (useArchiveFilter, useBoardLayout)
- Business logic (vault operations, IIIF validation)
- Route-specific state

## The Three UI Layers

See `ui/README.md` for detailed explanation of atoms, molecules, and organisms.

## Configuration & Design Tokens

All magic numbers and hardcoded values live in `config/`. This ensures:
- Single source of truth for design decisions
- Easy to adjust spacing, colors, timings across the entire app
- No "magical" values scattered in component source code

See `config/tokens.ts` for the full list.

## Guidelines

1. **Shared code is read-only from features.** Features import from shared, not the other way.
2. **No context providers in shared.** Context (fieldMode, user settings) is provided by the app layer.
3. **Molecules receive context via props.** They use local hooks only (`useState`, `useDebouncedValue`), NOT context hooks like `useContextualStyles` or `useAppSettings`. Context flows via props from Template → Organism → Molecule.
4. **Every file has a purpose.** If a component could be used by only one feature, move it to that feature's directory.

---

For implementation details, see:
- `ui/README.md` — Atomic design philosophy
- `lib/README.md` — Shared hooks and utilities
- `config/README.md` — Design tokens
