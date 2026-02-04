# UI Simplification & Context Enrichment — Task Tracker

> **Role of this document:** Living status log. Tracks what is done, what is in progress, and what comes next. Architecture patterns and infrastructure descriptions live in `UI_SIMPLIFICATION_CONTEXTUAL_ENRICHMENT_BLUEPRINT.md` — do not duplicate them here.

---

## How to read this document

| Section | Meaning |
|---|---|
| [In Progress](#in-progress) | Active work. Pick up here if you are resuming. |
| [Next](#next) | Ordered queue. Work top-to-bottom. |
| [Done](#done) | Finished and tested. Do not revisit unless a regression surfaces. |

**Test baseline:** 915 total tests. 22 pre-existing failures (known, do not increase). 893 passing, including 43 new integration tests added in Phase 1.

---

---

## In Progress

*Nothing currently active. Phase 4 strategic recommendations have been implemented.*

---

## Next

### Quantitative Metrics Improvement

Current audit results (2026‑02‑03 23:37) show:
- **Prop‑drilling reduction**: 13.8% (baseline 58 → current 50) (target ≥90%) — ❌ **needs major improvement**
- **Terminology coverage**: 9.5% (29 of 306 terms use `t()`) (target 100%) — ❌ **needs systematic conversion**
- **Consistency score**: 37.5% (3 of 8 views consistent) (target ≥95%) — ❌ **needs near‑complete adoption**

**Actions:**
- Identify and eliminate remaining `fieldMode` prop usages (target 5 or fewer).
- Replace all raw IIIF term displays with `t()` calls across all components (including non‑view).
- Apply the Phase‑3 checklist to any remaining view‑layer components (e.g., Inspector, CanvasComposer).

### Performance Baseline Validation

Performance tests are now part of the test suite (`src/test/__tests__/view-and-navigate/performance.test.ts`). Validate that:
- Paint time after context changes remains <50ms on mid‑tier hardware.
- Re‑render counts after toggling `fieldMode`/`abstractionLevel` are acceptable (use React DevTools).

## Done

### Phase 1 — Foundation

1. **Extended design system** — `CONTEXTUAL_TOKENS` added to `designSystem.ts` (semantic context map + microcopy templates).
2. **Context providers built** — `UserIntentProvider` (`hooks/useUserIntent.tsx`) and `ResourceContextProvider` (`hooks/useResourceContext.tsx`). Both use the split-context pattern (State context + Dispatch context) to avoid unnecessary re-renders.
3. **Providers mounted** — `App.tsx` provider order: `VaultProvider → ToastProvider → ErrorBoundary → UserIntentProvider → ResourceContextProvider → MainApp`.
4. **Name collision resolved** — Dead `useDebouncedValue` export removed from `hooks/useDebouncedCallback.ts`. Canonical version is `hooks/useDebouncedValue.ts`.
5. **`usePersistedTab` write-effect bug fixed** — Write effect used a `prevKeyRef` to skip writes on key-switch, letting the re-read effect load the correct stored value first. Without this, switching tabs overwrote the new key's stored value with the stale tab.
6. **Integration test suite written** — `src/test/__tests__/manage-lifecycle/phase1-2-hooks.test.ts`. 43 tests, all green. Covers: `useDebouncedValue` (6), `usePersistedTab` (5), `useContextualStyles` (4), `buildCanvasFromLayers` (5), `useLayerHistory` (7), `UserIntentProvider` (6), `ResourceContextProvider` (8), provider composition (2).

### Phase 2 — Hook Extraction

1. **Inspector + CanvasComposer refactored** using the smart-hook / dumb-component pattern.
2. **Seven hooks extracted:**
   - `useDebouncedValue` — input-aware debounce with flush-on-blur
   - `usePersistedTab` — localStorage-backed tab state with allowlist validation
   - `useInspectorValidation` — validation lifecycle (run, fixIssue, fixAllIssues)
   - `useMetadataEditor` — metadata CRUD (updateField, addField, removeField)
   - `useLayerHistory` — 50-entry undo/redo stack, canvas annotation parser, Cmd+Z
   - `buildCanvasFromLayers` — pure utility: layers → IIIF painting annotations
   - `useContextualStyles` — fieldMode → 12 Tailwind className slots
3. **Sidebar prop-drilling audit** — 18 props identified; `fieldMode` confirmed available via `useAppSettings`.

### Phase 3 — View-Layer Enrichment (completed views)

#### ArchiveView — cx tokens + fieldMode elimination
- Removed `fieldMode` prop from `ArchiveViewProps`.
- Component reads `fieldMode` from `useAppSettings().settings.fieldMode` directly.
- Added `useContextualStyles(fieldMode)` (`cx`). Applied tokens: `cx.surface` (header + list wrapper), `cx.accent` (title), `cx.label` (search icon), `cx.headerBg` + `cx.textMuted` + `cx.border` (thead).
- Complex card selected/unselected ternaries intentionally left as explicit ternaries — shade mismatches make forced token fits worse, not better (see Blueprint §3.3 anti-pattern 4).
- `VirtualizedList` sub-component: added its own `cx` instance (receives `fieldMode` as memo-gate prop, which is fine per Blueprint §3.2).
- `ViewRouter.tsx`: removed `fieldMode={fieldMode}` from both `<ArchiveView>` JSX instances.
- React.memo comparator: removed `prevFieldMode`/`nextFieldMode` lines; hook-driven re-renders handle this independently.

#### CollectionsView — terminology + progressive disclosure
- Added `useTerminology({ level: abstractionLevel })` → destructured `{ t, isAdvanced }`.
- `t()` applied to: stats line (`Collection`/`Manifest`/`Canvas` labels), Create Collection button, Create Manifest button.
- MuseumLabel ("IIIF Hierarchy Model") gated with `{!isAdvanced && (...)}` — advanced users skip the explanatory panel.

#### BoardView — terminology + progressive disclosure
- Added `useTerminology({ level: settings.abstractionLevel })` → destructured `{ t, isAdvanced }`. Used `settings.abstractionLevel` directly (already on `AppSettings`); no prop change needed.
- `t()` applied to: card type badge (`it.resourceType`), card `aria-label`.
- Empty-state keyboard-shortcut tips gated with `{!isAdvanced && (...)}` — title and subtitle remain for all users so the empty board is never featureless. Tips are purely instructional, not IIIF-concept explanations.
- `mode === 'view'` ternaries left untouched — these are board-local edit/view mode switches, orthogonal to `fieldMode`. `cx` tokens don't apply.
- `settings.fieldMode` passed to child panels (ItemPreviewPanel, BoardDesignPanel, ItemDetailModal, BoardExportDialog) left as-is — imported sub-components, not view-layer; out of scope per Blueprint §3.2.

#### Viewer — terminology + technical-detail progressive disclosure
- No `settings` prop — used `useAppSettings()` directly to access `abstractionLevel`, same pattern as ArchiveView's `fieldMode` elimination. No prop changes to Viewer or ViewRouter.
- Added `useTerminology({ level: settings.abstractionLevel })` → destructured `{ t, isAdvanced }`.
- `t()` applied to: empty-state prompt ("Select a canvas…" → uses `t('Canvas').toLowerCase()`), filmstrip `title`/`alt` attributes, metadata panel header ("Canvas Metadata"), metadata panel Type field (`item.type`).
- Technical details gated with `{isAdvanced && (...)}` (hidden for simple/standard): raw IIIF ID in metadata panel, truncated annotation ID in the format badge, "Copy W3C JSON-LD" button on annotation cards, W3C compliance footer with spec link. These map to the `showTechnicalIds` / `showRawIIIF` flags in the abstraction config.
- No `cx` work — viewer is always dark.

#### SearchView — terminology pass (complete)
- Added `useAppSettings()` + `useTerminology()`. Destructured only `{ t }` — no explanatory UI to gate.
- `t()` applied to: filter pill labels (Manifest / Canvas / Annotation; "All" kept literal) **and result‑type badges** (`res.type`).
- Placeholder text and empty-state messages use "manifests" as general prose, not type labels — left as-is.

#### MetadataSpreadsheet — terminology + progressive disclosure
- Added `useAppSettings()` + `useTerminology()` → destructured `{ t, isAdvanced }`.
- `t()` applied to: resource-type tab labels (Collection / Manifest / Canvas; "All" kept literal), table Type-column badge (`item.type`).
- "Archival Catalog Mode" info box (explains IIIF semantic model projection) gated with `{!isAdvanced && (...)}` — explanatory, shown to simple/standard only.
- "Archival ID (URI)" block in expanded row gated with `{isAdvanced && (...)}` — raw technical ID, shown to advanced only.
#### Sidebar — fieldMode prop elimination
- Removed `fieldMode: boolean` from `SidebarProps` interface.
- Component reads `fieldMode` via `useAppSettings().settings.fieldMode` directly (two lines: destructure `settings`, then `const fieldMode = settings.fieldMode`).
- `App.tsx`: removed `fieldMode={settings.fieldMode}` from `<Sidebar>` JSX.
- React.memo comparator: removed `prev.fieldMode === next.fieldMode`; context-driven re-renders propagate fieldMode changes independently.
- `NavItem`, `TreeItem` (same-file sub-components) and `Toolbar` (imported) continue to receive `fieldMode` as a prop — unchanged, per Blueprint §3.2.

### Phase 4 — Strategic Recommendations Implementation

1. **MapView enriched** — Added `useAppSettings`, `useContextualStyles`, `useTerminology`. Component now uses `cx` tokens and translates IIIF terms. Progressive disclosure of technical coordinates pending.
2. **Context providers consolidated** — Created `UIStateProvider` (`hooks/useUIState.tsx`) merging `UserIntent` and `ResourceContext` split-context patterns.
3. **Error resilience strengthened** — Added try‑catch wrappers and optional hooks (`useUserIntentOptional`, `useResourceContextOptional`). Graceful fallbacks for missing providers.
4. **Theming extensibility planned** — Refactored `designSystem.ts` to accept theme configuration object; ready for runtime theme switching.
5. **Performance guardrails established** — Added performance tests (`src/test/__tests__/view-and-navigate/performance.test.ts`) and performance analyzer script (`.roo/tools/performance-analyzer.sh`).
6. **Quantitative success criteria defined** — Audit script (`scripts/audit‑props.ts`) measures prop‑drilling reduction, terminology coverage, and view consistency. Baseline metrics collected.



---

*Document version: 4.0*
*Last updated: 2026‑02‑03*
*Companion: `UI_SIMPLIFICATION_CONTEXTUAL_ENRICHMENT_BLUEPRINT.md` (architecture reference)*
