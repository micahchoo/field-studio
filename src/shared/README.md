# Shared Layer (`src/shared/`)

The shared layer is the **foundation that all features depend on**. Nothing in the shared layer knows about features, domains, or business logic. It exists to provide reusable building blocks.

## Structure

```
src/shared/
├── ui/                    # UI component hierarchy
│   ├── atoms/             # Indivisible UI primitives (no state, no logic)
│   ├── molecules/         # Composed atoms with local UI state (no domain logic)
│   ├── organisms/         # (Reserved, not used at shared level)
│   ├── README.md          # Atomic design philosophy
│   └── molecules/README.md # Molecule documentation
├── config/                # Design tokens and configuration constants
│   ├── tokens.ts          # Re-exports designSystem + app constants
│   └── README.md          # Configuration documentation
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
- **Hooks**: Generic hooks like `useDebouncedValue`, `useContextualStyles` (in hooks/ at root)
- **Constants**: COLORS, SPACING, debounce milliseconds, input constraints
- **Utilities**: String formatting, validation functions

### ❌ Does NOT belong in shared:
- Feature-specific components (ArchiveGrid, BoardView)
- Domain models (Canvas, Manifest selectors)
- Feature hooks (useArchiveFilter, useBoardLayout)
- Business logic (vault operations, IIIF validation)
- Route-specific state

## The Three UI Layers

See [`src/shared/ui/README.md`](./ui/README.md) for detailed explanation of atoms, molecules, and organisms.

### Atoms (`ui/atoms/`)

**Indivisible UI primitives** with zero state, zero logic, zero context awareness.

Examples: Button, Input, Icon, Card

See [`src/shared/ui/atoms/README.md`](./ui/atoms/README.md)

### Molecules (`ui/molecules/`)

**Composable UI units** that compose atoms with local UI state only. No domain knowledge.

Examples: FilterInput, SearchField, ViewToggle, EmptyState, LoadingState

See [`src/shared/ui/molecules/README.md`](./ui/molecules/README.md)

### Organisms (Not at Shared Level)

Organisms contain domain logic and are feature-specific. They live in `src/features/*/ui/organisms/`.

## Configuration & Design Tokens

All magic numbers and hardcoded values live in `config/`. This ensures:
- Single source of truth for design decisions
- Easy to adjust spacing, colors, timings across the entire app
- No "magical" values scattered in component source code

See [`src/shared/config/README.md`](./config/README.md) for the full list.

### Key Files

| File | Purpose |
|------|---------|
| `config/tokens.ts` | Re-exports from designSystem.ts + app-specific constants |

## Guidelines

1. **Shared code is read-only from features.** Features import from shared, not the other way.
2. **No context providers in shared.** Context (fieldMode, user settings) is provided by the app layer.
3. **Molecules receive context via props.** They use local hooks only (`useState`, `useDebouncedValue`), NOT context hooks like `useContextualStyles` or `useAppSettings`. Context flows via props from Template → Organism → Molecule.
4. **Every file has a purpose.** If a component could be used by only one feature, move it to that feature's directory.

## Import Patterns

```typescript
// From atoms
import { Button, Input, Icon, Card } from '@/src/shared/ui/atoms';

// From molecules
import { FilterInput, SearchField, EmptyState } from '@/src/shared/ui/molecules';

// From config
import { INPUT_CONSTRAINTS, UI_TIMING } from '@/src/shared/config/tokens';
```

---

For implementation details, see:
- [`src/shared/ui/README.md`](./ui/README.md) — Atomic design philosophy
- [`src/shared/config/README.md`](./config/README.md) — Design tokens
- [`src/shared/ui/atoms/README.md`](./ui/atoms/README.md) — Atoms
- [`src/shared/ui/molecules/README.md`](./ui/molecules/README.md) — Molecules
