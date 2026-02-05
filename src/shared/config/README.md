# Design Tokens & Configuration (`src/shared/config/`)

**No magic numbers, no hardcoded values.** All configuration lives here.

## Purpose

This directory is the **single source of truth** for:
- Spacing, sizing, colors (design tokens)
- Timing (debounce delays, animation durations)
- Constraints (input max lengths, touch target sizes)
- Thresholds (storage warnings, performance limits)

Changes to these values propagate everywhere they're used.

## Files

| File | Purpose |
|------|---------|
| `tokens.ts` | Re-exports design tokens and adds application-specific constants |

### `tokens.ts`

Re-exports design tokens and adds application-specific constants.

**Exported from:**
- `designSystem.ts` (project root) — COLORS, SPACING, LAYOUT, TOUCH_TARGETS, INTERACTION

**Structure:**
```typescript
// Re-exports from designSystem.ts
export { COLORS, SPACING, LAYOUT, TOUCH_TARGETS, INTERACTION } from '../../designSystem';

// New constants (no magic numbers)
export const INPUT_CONSTRAINTS = {
  maxLengthDefault: 500,      // FilterInput max-length
  debounceMs: 300,            // DebouncedInput, SearchField
  width: {
    filter: 'w-64',           // FilterInput width
    search: 'w-96',           // SearchField width (variant)
  },
} as const;

export const UI_TIMING = {
  debounce: 300,              // General debounce delay
  transition: 200,            // CSS transition duration (ms)
  animation: 300,             // Keyframe animations
} as const;
```

## Usage in Molecules

**Before (hardcoded):**
```typescript
export const FilterInput = ({ onChange, placeholder }) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebouncedValue(value, 300); // 🔴 Magic number

  return <input maxLength={500} /* 🔴 Magic number */ />;
};
```

**After (using config):**
```typescript
import { INPUT_CONSTRAINTS, UI_TIMING } from '@/src/shared/config/tokens';

export const FilterInput = ({ onChange, placeholder }) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebouncedValue(value, UI_TIMING.debounce);

  return <input maxLength={INPUT_CONSTRAINTS.maxLengthDefault} />;
};
```

## Benefits

1. **Consistency** — Same debounce delay everywhere
2. **Maintainability** — Change in one place, applies everywhere
3. **Discoverability** — New developers see all configuration in one file
4. **Type safety** — TypeScript catches typos in constant names
5. **Auditability** — Git diff shows exactly what changed

## When to Add a Constant

✅ **Add here:**
- Timing values (debounce, animation, transitions)
- Size constraints (input max length, array limits)
- Thresholds (storage warnings, batch sizes)
- Repeated literals (common class names, API endpoints)

❌ **Don't add:**
- Random strings (error messages → use i18n)
- Computed values (use functions instead)
- Feature-specific config (put in feature directories)

## Design Tokens Reference

### Colors (`COLORS`)
Semantic color tokens for consistent theming.

### Spacing (`SPACING`)
Consistent spacing scale (4px base unit).

### Layout (`LAYOUT`)
Border radius, shadows, z-index scale.

### Touch Targets (`TOUCH_TARGETS`)
Minimum sizes for interactive elements.

### Interaction (`INTERACTION`)
Timing for animations and transitions.

---

**See parent directory (`../README.md`) for guidelines on configuration.**
