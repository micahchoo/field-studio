# Field Studio — Migration State

_Single source of truth for the Svelte 5 migration. Updated after every phase loop._

## Current Metrics

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, **2 warnings** (pre-existing a11y) |
| `npm run test` | 117 files, **4978 tests passing** |
| `npm run lint` | **0 errors, 0 warnings** |

All 25 permanent `no-explicit-any` warnings suppressed via file-level `eslint-disable` with TYPE_DEBT annotations (annotorious 14, waveform 9, svelte-shims 2).

---

## Completed Phases (summary)

| Phase | Key Outcome |
|-------|-------------|
| **Phase 1: Type Safety** | `Result<T,E>` type, TYPE_DEBT annotations, `validationHealer` banner |
| **Phase 2: Storage + History** | `StorageService` (idb v8), `HistoryStore<T>` (undo/redo) |
| **Phase 3: Content State + Routing** | `contentStateService` wired, annotation handlers, ViewRouter URL sync |
| **Phase 4: Ingest Tree** | `ingestTree()` sequential builder, YAML sidecar, canvas creation |
| **Phase 5: UI Widgets** | StatusBar, ContextualHelp, AnnotationContext extended |
| **Phase 6: Coverage + Smoke Tests** | Coverage thresholds (s80/b70/f80/l80), 25 smoke tests across 7 files |
| **Runtime Bug Round** | Snippet/prop shadow fix (BoardView), JSON.parse guard (storage), ViewContainer fix |
| **TYPE_DEBT Rounds 1-6** | 163→31 `no-explicit-any` warnings. Key: `HealedIIIF` type, `inspectorValidation` typed, `validator.ts` all `any` removed, `fileIntegrity` real idb import, `csvImporter`/`staticSiteExporter` casts removed |
| **Dead Code + Visual Bug** | `iiifBuilder.ts` 42 dead imports removed, `AnnotationDrawingOverlay` fixed, OSD global export |
| **UI/UX Audit + Semantic HTML** | ModalDialog focus trap + z-index, `<div role="button">` → `<button>` (18 sites), viewport-clamped context menu |
| **Dead Code + Aria** | 126 unused-var warnings eliminated, 29 aria labels added, 3 typed-context-keys fixed |
| **Round 1: Type Foundation** | `ServiceDescriptor` union, NavPlace GeoJSON types, `IIIFProvider` types, `ValidatorIssue`/`InspectorIssue` unification. svelte-check 29→0, ESLint 80→73. |
| **Round 2: Unsafe Cast Elimination** | All 20 `no-unsafe-type-cast-in-props` eliminated. ESLint 73→53. |
| **Phase 1.5: Items Narrowing** | `IIIFItem.items?: any[]` → `unknown[]`. `getChildEntities()` + `isAnnotationPage()` added. 25 break sites fixed across 15 files. `no-explicit-any` 26→25. Tests 4770→4780. |
| **Round 3: UI Wiring Safety** | 2 new ESLint rules (`prefer-type-guards`, `no-migration-stub`). All 17 `as IIIFSubtype` casts in .svelte replaced with type guards (1 annotated exception). 87 new contract tests. ESLint rules 16→18. Tests 4780→4867. |
| **Migration Stub Resolution** | All 83 `@migration` stubs resolved across 23 files. Services wired: storage.saveProject, contentStateService, validator.validateTree, guidanceService, authFlowService, commandHistory, resolveHierarchicalThumbs. ESLint 75→53. Tests 4867→4978. |
| **Decomposition + Cleanup** | 40+ components extracted from oversized organisms/molecules. ViewerView 1552→497, MediaPlayer 952→297, StagingWorkbench 1029→500, BoardView 1033→422, ExportDialog 774→366. All 20 `max-lines-feature` → 0. All 7 `prefer-semantic-elements` → 0. TODO(loop) items resolved. `no-native-html-in-molecules` extended to organisms; all violations fixed via Select/TextArea/RangeInput atoms. 12 new `any` in helpers typed. 5 `component-props-validation` fixed. 25 permanent `any` suppressed. ESLint 53→0. |

---

## Known Debt

### Permanent TYPE_DEBT (external libs — suppressed via eslint-disable)

| Site | Count | Reason |
|------|-------|--------|
| `annotorious.ts` | 14 | No `@types/annotorious` |
| `waveform.ts` | 9 | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` | 2 | Framework shim |

### Structural TYPE_DEBT (remaining)

All five structural items resolved:

| Item | Status |
|------|--------|
| `IIIFItem.service?: any[]` | `ServiceDescriptor` union (Round 1) |
| `IIIFItem.navPlace?: any` | `NavPlace` GeoJSON type (Round 1) |
| `ValidationIssue` 3 shapes | `ValidatorIssue` + `InspectorIssue` (Round 1) |
| `provider.homepage/logo?: any[]` | `ProviderHomepage`, `ProviderLogo` (Round 1) |
| `IIIFItem.items?: any[]` | `unknown[]` + `getChildEntities()` (Phase 1.5) |

### `@migration` stubs: 0

All 83 stubs resolved.

---

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Sequential ingest (no workers) | `USE_WORKER_INGEST: false`; worker pool scaffold exists but IDB-in-worker not validated |
| `registerSave`/`registerClear` in AnnotationContext | Svelte 5 equivalent of React imperative refs |
| IDB mock via `vi.hoisted()` | `vi.mock()` hoists before variable declarations; `vi.hoisted()` needed for closure |
| `$state.raw` for vault | No deep proxy (performance on large trees) |
| `IIIFCanvas extends IIIFItem` | Confirmed — no `(canvas as any).field` casts needed for inherited fields |
| Snippet/prop shadow pattern | `const nameText = $derived(name)` before template shadows binding |
| Effect depth guard pattern | `untrack(() => state)` + early-return to prevent infinite loops |
| `getChildEntities()` for tree walks | Narrows `unknown[]` items by type; use for Manifest/Collection/Range traversal. Canvas→AnnotationPage needs explicit narrowing. |
| `no-native-html-in-molecules` covers organisms | Rule extended to enforce atom reuse in both molecules and organisms. New `RangeInput` atom created for `<input type="range">`. |
| OSD types via aliases | `OsdViewer`/`OsdTileSource` aliases in viewerViewHelpers.ts with TYPE_DEBT annotation (no @types/openseadragon). |
