# UI Simplification & Contextual Enrichment — Architecture Blueprint

> **Role of this document:** Stable architecture reference. Describes *what the system is*, what patterns to follow, and what infrastructure exists. Does not track status or task assignments — see `METHODOLOGY.md` for that.

---

## 1. The Problem & Resolution

The directive: **"Make the UI simpler in the code but more contextual in the front."**

The paradox: richer user-facing context normally means more code in components. The resolution: move complexity *down* into shared infrastructure (hooks, contexts, design tokens) so that individual components stay minimal while the UI they render stays rich.

### 1.1 Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  Context‑aware microcopy · Dynamic styling · Progressive    │
│  disclosure · Adaptive layouts · Terminology translation    │
├─────────────────────────────────────────────────────────────┤
│                    COMPONENT LAYER                          │
│  Pure rendering · Event delegation to hooks                 │
│  Composition of UI Primitives · Zero business logic         │
├─────────────────────────────────────────────────────────────┤
│                    CONTEXT LAYER                            │
│  UserIntent (split-context) · ResourceContext (split)       │
│  AppSettings · AbstractionLevel                             │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                            │
│  Vault (normalised state) · Actions (dispatchers)           │
│  Validation · Storage · Image pipeline                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure That Exists

Everything in this section is **live code**. Import paths are relative to `src/`.

### 2.1 Design Tokens — `designSystem.ts`

`CONTEXTUAL_TOKENS` extends the base design system with semantic context maps:

```typescript
CONTEXTUAL_TOKENS.contexts          // keyed by intent/state → { border, background, icon, microcopy }
CONTEXTUAL_TOKENS.microcopy         // template functions: emptyState(), validationHint(), progress()
```

These are the single source of truth for intent-driven inline styles. For Tailwind className-based styling, use `useContextualStyles` instead (§2.3).

### 2.2 Context Providers — mounted in `App.tsx`

**Current provider order** (outermost first):
```
VaultProvider → ToastProvider → ErrorBoundary → UserIntentProvider → ResourceContextProvider → MainApp
```

**UserIntentProvider** (`hooks/useUserIntent.tsx`)
- Split-context: `UserIntentStateContext` (re-renders on read) + `UserIntentDispatchContext` (stable)
- 12 intent types: `viewing | editing | selecting | dragging | exporting | importing | validating | searching | navigating | annotating | designing | fieldMode | idle`
- Hooks: `useUserIntentState`, `useUserIntentDispatch`, `useUserIntent` (combined), `useUserIntentOptional` (null-safe), `useIsEditing`, `useIsFieldMode`, `useIntentMicrocopy`

**ResourceContextProvider** (`hooks/useResourceContext.tsx`)
- Same split-context pattern
- Tracks: resource, type, validationStatus, editHistory, collaborationState, accessibilityFeatures
- Hooks: `useResourceContextState`, `useResourceContextDispatch`, `useResourceContext`, `useResourceContextOptional`, `useHasResource`, `useIsCanvas`, `useIsManifest`, `useIsCollection`, `useResourceMicrocopy`

**UIStateProvider** (`hooks/useUIState.tsx`) — *consolidated alternative*
- Merges `UserIntent` and `ResourceContext` into a single split-context provider.
- Reduces boilerplate while preserving the split‑context performance benefits.
- Available for incremental migration; not yet enabled in `App.tsx`.
- Hooks: `useUIState`, `useUIDispatch`, `useUIStateOptional`.

### 2.3 Contextual Styles — `hooks/useContextualStyles.ts`

Returns a memoised `ContextualClassNames` object with 12 Tailwind className slots, branching on `fieldMode`:

| Key | fieldMode=true | fieldMode=false |
|---|---|---|
| `surface` | `bg-slate-900 border-slate-800` | `bg-white border-slate-200` |
| `text` | `text-white` | `text-slate-800` |
| `textMuted` | `text-slate-400` | `text-slate-500` |
| `border` | `border-slate-800` | `border-slate-300` |
| `input` | `bg-slate-900 text-white border-slate-800 focus:border-yellow-400` | `bg-white border-slate-300 focus:ring-2 focus:ring-blue-500` |
| `label` | `text-slate-500` | `text-slate-400` |
| `divider` | `border-slate-800` | `border-slate-100` |
| `active` | `text-yellow-400 border-yellow-400` | `text-blue-600 border-blue-600 bg-blue-50/20` |
| `inactive` | `text-slate-400 hover:text-slate-200` | `text-slate-400 hover:text-slate-600` |
| `accent` | `text-yellow-400` | `text-blue-600` |
| `warningBg` | `bg-slate-900 border-slate-800` | `bg-orange-50 border-orange-200` |
| `headerBg` | `bg-black border-slate-800` | `bg-slate-50 border-slate-200` |

Usage: `const cx = useContextualStyles(fieldMode);` then `className={cx.surface}`.

**When not to use:** Complex card states with selected/unselected variants that combine background + border + ring in ways that don't map to a single token. Keep those as explicit ternaries — forcing a fit degrades readability.

### 2.4 Terminology & Progressive Disclosure — `hooks/useTerminology.ts`

Translates IIIF terms into user-friendly language based on `AbstractionLevel`:

| Level | Collection | Manifest | Canvas |
|---|---|---|---|
| simple | Album | Item Group | Page |
| standard | Collection | Manifest | Canvas |
| advanced | Collection | Manifest | Canvas |

Usage:
```typescript
const { t, isAdvanced, isSimple } = useTerminology({ level: abstrjiraactionLevel });
<button>{t('Collection')}</button>  // "Album" in simple, "Collection" otherwise
```

**i18n infrastructure**: The hook is powered by `i18next` with locale files in `i18n/locales/`. Install missing dependencies (`i18next`, `react-i18next`, `i18next-browser-languagedetector`) before building. Translations are loaded dynamically; the default locale is English (`en`). The terminology mapping is defined in `i18n/locales/en.json` under the `terminology` namespace.

Progressive disclosure rule: **hide explanatory UI for advanced users, show it for simple/standard**. Use `isAdvanced` to gate `MuseumLabel` components and IIIF-concept explanations, as well as technical coordinate displays (e.g., map bounds, raw IDs).

### 2.5 Phase 2 Extraction Hooks

| Hook | File | What it encapsulates |
|---|---|---|
| `useDebouncedValue` | `hooks/useDebouncedValue.ts` | Input-aware debounce with flush-on-blur semantics |
| `usePersistedTab` | `hooks/usePersistedTab.ts` | localStorage-backed tab state with allowlist validation |
| `useInspectorValidation` | `hooks/useInspectorValidation.ts` | Validation lifecycle: run, fixIssue, fixAllIssues |
| `useMetadataEditor` | `hooks/useMetadataEditor.ts` | Metadata CRUD: updateField, addField, removeField |
| `useLayerHistory` | `hooks/useLayerHistory.ts` | 50-entry undo/redo stack, canvas annotation parser, Cmd+Z |
| `buildCanvasFromLayers` | `hooks/useLayerHistory.ts` | Pure utility: layers → IIIF painting annotations |
| `useContextualStyles` | `hooks/useContextualStyles.ts` | fieldMode → 12 Tailwind className slots (see §2.3) |

### 2.6 UI Primitives — `ui/primitives/`

| Primitive | Variants / features |
|---|---|
| `Button` | primary, secondary, ghost, danger, success · sm, base, lg, xl |
| `Input` | label + help text + error · aria-invalid/required/describedby |
| `Icon` | emoji or SVG · aria-hidden / aria-label |
| `Card` | header/body/footer slots · selected/disabled states |

All are zero-business-logic. Business logic lives in hooks. Export barrel: `ui/primitives/index.ts`.

### 2.7 Debug Tooling — `components/ContextDebugPanel.tsx`

Dev-only overlay. Activated by `?debug=true` URL param. Shows live intent, resource type, validation count. Uses `*Optional` hooks — renders gracefully even if providers are missing.

---

## 3. Coding Patterns

### 3.1 The Hook → Component Contract

```
hooks/          ← state, side-effects, data transforms, business logic
components/     ← rendering, event delegation, composition
```

A component should read like a template: hook calls at the top, JSX below. If you're writing logic inside JSX callbacks, extract it to a hook.

### 3.2 Eliminating `fieldMode` Prop Drilling

`fieldMode` is available globally via `useAppSettings().settings.fieldMode`. Components that previously received it as a prop should call the hook directly. When doing so:
- Remove `fieldMode` from the props interface
- Remove it from the caller's JSX
- Remove it from any `React.memo` comparison function (the hook triggers re-renders via context independently)
- Sub-components defined in the same file that are `React.memo`'d can still receive it as a prop for their memo gate — that's fine

### 3.3 Applying Context Hooks to a View Component

Checklist for applying Phase 3 enrichment to a new view:
1. Import `useAppSettings` and/or `useContextualStyles` if the component has `fieldMode` ternaries
2. Import `useTerminology` if the component displays IIIF resource names or action labels
3. Apply `cx` tokens where they match directly (surface, header, label, input, accent, active/inactive)
4. Apply `t()` to resource-type labels and button text
5. Gate explanatory UI (`MuseumLabel`, help panels) with `isAdvanced` — hide for advanced users
6. Leave complex nested ternaries (selected/unselected card states) alone if they don't map cleanly to tokens

### 3.4 Anti-Patterns

1. **`fieldMode` as a prop on a top-level view** — use `useAppSettings` instead
2. **Business logic in JSX** — extract to hooks
3. **Hardcoded IIIF terms in UI strings** — use `t()` from `useTerminology`
4. **Forcing a token fit** — if the shade is off by one step, keep the explicit ternary
5. **`require()` in ESM files** — use static `import`

---

## 4. Data Flow

```
User Event → Action Dispatcher (services/actions.ts)
           → Vault Update (services/vault.ts, normalised state)
           → Context Propagation (UserIntent, ResourceContext)
           → Component Re-render (hooks read new state)
           → UI Adaptation (cx tokens, t() terms, progressive disclosure)
```

- All IIIF mutations go through `services/actions.ts`
- State is normalised in `services/vault.ts`
- Components read via `useVaultState()`, write via `useVaultDispatch()`
- Intent and resource context are set by components that initiate actions; consumed by components that render

---

## 5. Performance & Error Resilience

### 5.1 Performance Guardrails
- **Context updates**: The split‑context pattern minimises re‑renders, but frequent toggles of `fieldMode` or `abstractionLevel` can still cause unnecessary updates. Measure with React DevTools; if excessive, reintroduce selective memoization for heavy sub‑trees.
- **Derived values**: Use `useMemo` for `cx` tokens and `t()` translations when they depend on stable inputs (e.g., `useContextualStyles(fieldMode)` already memoises internally).
- **Performance budget**: Aim for ~50ms paint time after a context change on mid‑tier hardware. Add performance tests to the existing 915‑test baseline.
- **Performance test suite**: `src/test/__tests__/view-and-navigate/performance.test.ts` provides baseline measurements for vault normalization, denormalization, and entity lookup.
- **Performance analyzer**: `.roo/tools/performance-analyzer.sh` scans for inline arrow functions, expensive operations, and missing memoization.

### 5.2 Error Resilience & Fallbacks
- **Missing providers**: All contextual hooks (`useUserIntent`, `useResourceContext`, `useTerminology`) have `*Optional` variants that return safe defaults when providers are absent. Use them in leaf components that may render outside the provider tree.
- **Graceful degradation**: If a required context is missing, fall back to neutral styling and standard IIIF terminology. Never crash the UI.
- **Error boundaries**: Wrap view components with `ErrorBoundary` (already present in `ViewRouter`) to isolate failures.
- **Try‑catch wrappers**: Critical hooks include try‑catch blocks to prevent runtime exceptions from propagating.

### 5.3 Theming Extensibility
The current `CONTEXTUAL_TOKENS` support two themes (field/non‑field). The architecture is designed to accommodate future themes (high‑contrast, color‑blind modes, institutional branding) by extending `designSystem.ts` with a theme configuration object. Runtime theme switching can be implemented by adding a `ThemeProvider` that feeds a theme key into `useContextualStyles`.

### 5.4 Quantitative Success Metrics

To objectively measure the simplification initiative:
- Count of `fieldMode` prop usages reduced by ≥90% from baseline.
- 100% of IIIF term displays go through `t()`.
- ≥95% consistency score across views (manual audit).
Run a script (`scripts/audit-props.ts`) to track these metrics.

---

## 6. Quality Gates

These are constraints, not status items. Every piece of work should satisfy them:

- **Cyclomatic complexity** < 10 per component
- **Prop count** < 8 per presentation component
- **Hook count** < 5 per component
- **Test coverage** > 90% for new hooks
- **Zero regressions** on the 893-test baseline (22 pre-existing failures are known; do not increase)
- **No new `fieldMode` props** on view-layer components — use the hook

---

*Document version: 4.0*
*Last updated: 2026‑02‑03*
*This document reflects the architecture after implementing the strategic recommendations from `UI_SIMPLIFICATION_PLAN_ARCHITECTURE_CRITIQUE.md`. For current status and next steps, see `UI_SIMPLIFICATION_METHODOLOGY.md`.*
