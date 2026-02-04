# Atoms: UI Primitives

**Atoms are indivisible UI elements with zero state and zero logic.**

These are re-exported from `../../ui/primitives/` (the existing primitive components already in the codebase). No new implementation here — just making them accessible from the shared layer.

## What's here

- `Button.tsx` — styled button with variants (primary, secondary, ghost, danger, success)
- `Input.tsx` — form input field with size variants
- `Icon.tsx` — icon component using the existing icon registry
- `Card.tsx` — card container for grouping content
- `index.ts` — barrel export

## Usage

```typescript
import { Button, Input, Icon, Card } from '@/src/shared/ui/atoms';

export const MyComponent = () => (
  <Card>
    <Input placeholder="Search..." />
    <Button variant="primary">Search</Button>
  </Card>
);
```

## Design Principles

1. **Pure props-driven** — No hooks, no internal state
2. **Design token driven** — Colors from `COLORS`, spacing from `SPACING`, not hardcoded
3. **Composable** — Atoms are always part of a molecule or organism, never standalone
4. **Accessible** — Semantic HTML, ARIA labels, keyboard support built-in

## No magic numbers

Every atom uses design tokens from `../../../designSystem.ts`:
- Colors: `COLORS.primary[500]`, `COLORS.semantic.error`
- Spacing: `SPACING[2]`, `SPACING[4]`
- Layout: `LAYOUT.borderRadius.sm`, `LAYOUT.borderRadius.md`
- Touch targets: `TOUCH_TARGETS.button.base.height`
- Interactions: `INTERACTION.duration.base`

## Reviewer Checklist

Before merging changes to atoms:

- [ ] Zero hooks — no `useState`, `useEffect`, `useContext`, or custom hooks
- [ ] Zero internal state — component output is a pure function of its props
- [ ] Props only — all behaviour and appearance driven by props + design tokens
- [ ] Design tokens — no hardcoded colours, spacing, or radii; everything from `designSystem.ts`
- [ ] Accessible — semantic HTML element, `aria-*` attributes where needed, keyboard-reachable
- [ ] No domain imports — nothing from `services/`, `features/`, `entities/`, or `hooks/`

---

**See parent directory (`ui/README.md`) for the full atomic hierarchy.**
