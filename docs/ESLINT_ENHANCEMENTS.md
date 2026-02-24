# ESLint Custom Rules — Field Studio

_Updated: 2026-02-24. Documents the 18 custom ESLint rules in `eslint-rules/`._
_For general project setup, see [CLAUDE.md](./CLAUDE.md). For architecture, see [Architecture.md](./Architecture.md)._

---

## Overview

Field Studio enforces architectural and code-quality conventions through 18 custom ESLint rules packaged as `@field-studio/eslint-plugin` (v4.0.0). The rules target Svelte 5 + TypeScript in a Feature Slice Design (FSD) codebase with Atomic Design UI layers.

**Plugin entry:** `eslint-rules/index.js`
**Configuration:** `eslint.config.js` (flat config)

Two preset configs are available:
- **recommended** — warnings for advisory rules, errors for architecture violations
- **strict** — all rules at error level

Current project uses **recommended** with per-file overrides.

---

## Current Metrics

```
npm run lint   →  0 errors, 80 warnings
```

Most remaining warnings come from `max-lines-feature` (organisms near limits), `component-props-validation` (legacy molecules missing cx/fieldMode), and standard TypeScript `any` usage (not custom rules).

---

## Rules by Category

### Atomic Design / FSD Architecture (6 rules)

#### 1. `component-props-validation` — warn

Molecules must accept optional `cx?` and `fieldMode?` props for contextual styling and high-contrast support. Accepts `theme?` as an alternative to both.

**Applies to:** `.svelte` files in `molecules/` directories
**Checks:** `$props()` destructuring, `export let` declarations, and TypeScript Props interfaces
**Options:** `requireCx` (default true), `requireFieldMode` (default true), `allowExceptions` (string[])

```
[ARCHITECTURE] Molecule {name} should accept optional cx prop for contextual styling.
[ARCHITECTURE] Molecule {name} should accept optional fieldMode prop for high-contrast support.
```

#### 2. `lifecycle-restrictions` — error

Molecules cannot call external services or domain logic from lifecycle hooks. Data fetching belongs in organisms.

**Applies to:** all `.svelte` and `.ts` files
**Checks:** `onMount`, `onDestroy`, `beforeUpdate`, `afterUpdate`, `$effect`, `$effect.pre`
**Flags:**
- Calls matching forbidden patterns: `fetch`, `load`, `get`, `save`, `update`, `delete`, `create`, `api`, `request`
- Async lifecycle callbacks
- Calls on service-like objects (names ending with `Service`, `Api`, `Client`, `Store`)

**Options:** `allowedPatterns` (regex[]), `forbiddenPatterns` (regex[]), `lifecycleHooks` (string[])

```
[ARCHITECTURE] Lifecycle hooks in molecules should not call external services ({callee}).
```

#### 3. `max-lines-feature` — warn

Enforces Atomic Design size constraints. Molecules max 300 lines, organisms max 500 lines (blank lines and comments skipped).

**Applies to:** files under `molecules/` or `organisms/` in any feature
**Options:** `moleculeMax` (default 200, configured as 300), `organismMax` (default 300, configured as 500), `skipBlankLines`, `skipComments`

```
[ARCHITECTURE] Molecule exceeds {max} lines ({actual} lines). Extract logic into atoms or split into smaller molecules.
[ARCHITECTURE] Organism exceeds {max} lines ({actual} lines). Extract sections into molecules.
```

#### 4. `no-native-html-in-molecules` — error

Molecules must use shared atoms (`<Select>`, `<TextArea>`, `<RangeSlider>`) instead of native HTML form elements. This ensures consistent styling and field-mode support.

**Applies to:** files under `molecules/` directories
**Flags:** `<select>`, `<textarea>`, `<input type="range">`, `<input type="color">`
**Options:** `forbiddenElements` (string[]), `forbiddenInputTypes` (string[])

```
[ARCHITECTURE] Use <Select> atom instead of native <select> in molecules.
[ARCHITECTURE] Use <TextArea> atom instead of native <textarea> in molecules.
```

#### 5. `template-constraints` — error

Templates (context providers) cannot fetch data or import services. Data fetching belongs in organisms.

**Applies to:** files under `src/templates/`
**Flags:** fetch calls, data-fetching function names (containing "Data", "Fetch", "Load", "Query", "Mutation"), service imports
**Options:** `allowedFunctions` (string[]), `forbiddenImports` (string[])

```
[ARCHITECTURE] Templates should not fetch data. Data fetching belongs in Organisms.
```

#### 6. `viewer-no-osd-in-atoms` — error

Prevents importing OpenSeadragon (a heavyweight library) in viewer atom components. OSD initialization belongs in organisms.

**Applies to:** atom files under `src/features/viewer/ui/atoms/` and `src/shared/ui/atoms/`
**Flags:** imports of `openseadragon`, `openseadragon-shim`, `openseadragon-filtering`, `@annotorious/openseadragon`

```
[ARCHITECTURE] Do not import OpenSeadragon in atom components. Use organism-level initialization.
```

---

### Svelte 5 Conventions (5 rules)

#### 7. `no-svelte4-patterns` — error

Bans legacy Svelte 4 syntax that was replaced by Svelte 5 runes.

**Applies to:** `.svelte` files only
**Flags:**
- `$:` reactive labels → use `$derived()` or `$effect()`
- `on:event` directives → use callback props (e.g., `onclick`)
- `<slot>` elements → use snippet props
- `slot="name"` attributes on child elements

**Options:** `allowSlotInWebComponents` (boolean)

```
[SVELTE5] Replace $: reactive label with $derived() or $effect().
[SVELTE5] Replace on:{event} directive with callback prop (e.g., onclick).
[SVELTE5] Replace <slot> with snippet props.
```

#### 8. `no-reactive-destructuring` — error

Prevents destructuring reactive module imports at module scope, which breaks Svelte 5 reactivity.

**Applies to:** all `.svelte` and `.ts` files
**Flags:** `const { state } = vault` at module scope (breaks reactivity tracking)
**Allows:** destructuring inside functions, `$derived.by()`, and `$props()`
**Options:** `additionalModulePatterns` (regex[])

```
[SVELTE5] Do not destructure reactive imports at module scope — access properties directly to preserve reactivity.
```

#### 9. `no-effect-for-derived` — warn

Suggests `$derived()` when a `$effect()` only contains a single variable assignment with no side effects.

**Applies to:** all `.svelte` and `.ts` files
**Flags:** `$effect(() => { x = expression; })` where expression has no side effects
**Skips:** multiple statements, conditionals, async operations, fetch/localStorage/document calls

```
[SVELTE5] Use $derived() instead of $effect() for single-assignment reactive computation.
```

#### 10. `no-state-raw-for-primitives` — warn (fixable)

Warns when `$state.raw()` wraps a primitive value. `$state.raw()` skips deep proxy tracking, which is only useful for objects/arrays.

**Applies to:** `.svelte` files only
**Flags:** `$state.raw('string')`, `$state.raw(42)`, `$state.raw(true)`, `$state.raw(null)`
**Auto-fix:** replaces `$state.raw(value)` with `$state(value)`

```
[SVELTE5] $state.raw() is unnecessary for primitive values — use $state() instead.
```

#### 11. `no-tailwind-interpolation` — warn

Disallows dynamic interpolation inside Tailwind class names in Svelte templates, which breaks Tailwind's static analysis (JIT purge).

**Applies to:** `.svelte` files only
**Flags:** `class="border-{width}"`, `class="bg-{color}-500"`
**Skips:** whole-attribute expressions (`class={str}`) and space-separated conditionals (`class="fixed {cond}"`)

```
[TAILWIND] Do not interpolate inside Tailwind class names — use complete class strings or conditional expressions.
```

---

### Reactivity & Context (2 rules)

#### 12. `typed-context-keys` — warn

Enforces Symbol or variable keys in `setContext`/`getContext` instead of string literals, preventing typo-based bugs and enabling type inference.

**Applies to:** all `.svelte` and `.ts` files
**Flags:** `setContext('theme', value)`, `` getContext(`key-${x}`) ``
**Allows:** Symbol keys, variable keys
**Options:** `allowedStringKeys` (string[])

```
[CONTEXT] Use a typed Symbol or variable key instead of a string literal in setContext/getContext.
```

#### 13. `exhaustive-switch` — warn

Requires a `default` branch in switch statements on discriminated-union fields to prevent silent fall-through when new variants are added.

**Applies to:** all `.svelte` and `.ts` files
**Trigger fields:** `type`, `stage`, `status`, `kind`, `intent`, `motivation`, `level`, `severity`
**Options:** `additionalFields` (string[])

```
[SAFETY] Switch on discriminated-union field '{field}' should include a default branch.
```

---

### Accessibility (2 rules)

#### 14. `require-aria-for-icon-buttons` — warn

Icon-only buttons must have `aria-label` or `aria-labelledby` for screen reader accessibility.

**Applies to:** `.svelte` files only
**Flags:** `<button>` elements whose only children are SVG, icon spans, or short text (≤20 chars) without an aria label

```
[A11Y] Icon-only button must have aria-label or aria-labelledby.
```

#### 15. `prefer-semantic-elements` — warn

Non-interactive elements with interactive ARIA roles should use native HTML elements instead (e.g., `<div role="button">` → `<button>`).

**Applies to:** `.svelte` files only
**Flags:** `<div role="button">`, `<span role="link">`, and other role→element mismatches on `div`, `span`, `section`, `article`, etc.
**Options:** `additionalRoles` (object), `ignoreElements` (string[])

```
[A11Y] Use <button> instead of <div role="button"> for native keyboard and focus support.
```

---

### Type Safety (2 rules)

#### 16. `no-unsafe-type-cast-in-props` — warn

Disallows double casts (`as unknown as T`) at component prop boundaries, which bypass the type system.

**Applies to:** all `.svelte` and `.ts` files
**Flags:** `value as unknown as SomeType`
**Allows:** single casts (`as T`), terminal `as unknown`, and patterns matching allowed config
**Options:** `allowedPatterns` (regex[])

```
[TYPE-SAFETY] Avoid 'as unknown as T' double cast in component props — fix the type or use a type guard.
```

#### 17. `molecule-props-validation` — (not configured)

TypeScript-only variant of `component-props-validation` for `.ts` prop definition files. Superseded by rule #1 which handles `.svelte` directly. Kept for backward compatibility but not active in project config.

---

### Legacy / Unused (1 rule)

#### 18. `useeffect-restrictions` — (not configured)

React `useEffect` restriction rule. Functionally identical to `lifecycle-restrictions` (#2) but targets React hooks. Not configured in the Svelte project. Kept in the plugin for potential React→Svelte migration linting.

---

## Severity Summary

| # | Rule | Severity | Category |
|---|------|----------|----------|
| 1 | `component-props-validation` | warn | Atomic Design |
| 2 | `lifecycle-restrictions` | error | Atomic Design |
| 3 | `max-lines-feature` | warn | Atomic Design |
| 4 | `no-native-html-in-molecules` | error | Atomic Design |
| 5 | `template-constraints` | error | Atomic Design |
| 6 | `viewer-no-osd-in-atoms` | error | Architecture |
| 7 | `no-svelte4-patterns` | error | Svelte 5 |
| 8 | `no-reactive-destructuring` | error | Svelte 5 |
| 9 | `no-effect-for-derived` | warn | Svelte 5 |
| 10 | `no-state-raw-for-primitives` | warn | Svelte 5 |
| 11 | `no-tailwind-interpolation` | warn | Svelte 5 |
| 12 | `typed-context-keys` | warn | Reactivity |
| 13 | `exhaustive-switch` | warn | Best Practices |
| 14 | `require-aria-for-icon-buttons` | warn | Accessibility |
| 15 | `prefer-semantic-elements` | warn | Accessibility |
| 16 | `no-unsafe-type-cast-in-props` | warn | Type Safety |
| 17 | `molecule-props-validation` | — | (not configured) |
| 18 | `useeffect-restrictions` | — | (not configured) |

**Active: 16 rules** (6 error, 10 warn). **Inactive: 2 rules** (legacy/superseded).

---

## Configuration

### eslint.config.js structure

The flat config applies rules through file-targeted overrides:

```javascript
// Shared .ts files (all active rules)
{ files: ['src/**/*.ts'], rules: { '@field-studio/*': ... } }

// Svelte files (all active rules + Svelte-specific)
{ files: ['src/**/*.svelte'], rules: { '@field-studio/*': ... } }

// Viewer atoms (extra OSD restriction)
{ files: ['src/features/viewer/ui/atoms/**'], rules: { 'viewer-no-osd-in-atoms': 'error' } }

// Test files (relax architecture/count rules, keep Svelte 5 bans)
{ files: ['**/__tests__/**'], rules: { 'max-lines-feature': 'off', ... } }
```

### Project-specific overrides

```javascript
'@field-studio/max-lines-feature': ['warn', { moleculeMax: 300, organismMax: 500 }]
```

### Running

```bash
npm run lint          # All rules
npm run lint:fix      # Auto-fix where supported (no-state-raw-for-primitives)
```

---

## Adding a New Rule

1. Create `eslint-rules/rules/<rule-name>.js` with standard ESLint rule shape (`meta` + `create`)
2. Import and register in `eslint-rules/index.js` under `rules` object
3. Add to both `recommended` and `strict` configs with appropriate severity
4. Add file-targeted override in `eslint.config.js` if the rule is layer-specific
5. Run `npm run lint` to verify — zero new errors expected

---

## References

- [ESLint Custom Rules Guide](https://eslint.org/docs/latest/extend/custom-rules)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$state)
