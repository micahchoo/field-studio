# Field Studio — Migration State

_Single source of truth for the Svelte 5 migration plan._
_Updated after every phase loop. See [plan](docs/migration-plan.md) for background._

## Current Phase: TYPE_DEBT Round 6 ✅ COMPLETE

### Metrics (post TYPE_DEBT Round 6)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, 29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **310 warnings** (was 327; 17 fewer) |

### TYPE_DEBT Round 6 — Changes Made
**`exportService.ts` — 8 explicit `any` removed:**
- `rewriteIds(obj: any): any` → `(obj: unknown): unknown`; `result: any` → `Record<string, unknown>`; `Object.entries(obj as Record<string, unknown>)`
- `(originalItem as any).items?.[idx]` → `originalItem.items?.[idx]` (items is `any[]` on IIIFItem)
- `(root as any).summary` → `root.summary` (summary is direct field on IIIFItem)
- `extractIIIFValue(val: any)` → `(val: LanguageMap | undefined)` + added `LanguageMap` to import
- `info: any` → `Record<string, unknown>`
- `child: any` and `thumb: any` in JSON.parse callbacks: eslint-disabled + TYPE_DEBT comment (any.map() callbacks can't infer param type without explicit annotation)

**`archivalPackageService.ts` — 3 explicit `any` removed:**
- `(canvas as any)._fileRef` (×2) → `const canvasRecord = canvas as unknown as Record<string, unknown>; canvasRecord._fileRef`
- `(body as any)?.id` → `'id' in body ? body.id : undefined` (narrows IIIFAnnotationBody to ExternalWebResource)

**`structureTree.svelte.ts` — 2 explicit `any` removed:**
- Defined `VaultEntity = { id?: string; label?: unknown }` and `VaultState` types before the class
- `buildFromVault(state: any)` → `buildFromVault(state: VaultState)`
- `entities: Record<string, Record<string, any>>` → `Record<string, Record<string, VaultEntity>>` (via safe cast from `unknown`)

**`logger.ts` — 1 explicit `any` removed:**
- `(import.meta as any).env?.DEV` → `import.meta.env?.DEV` (already under `@ts-ignore` directive)

**`staticSiteExporter.ts` — 1 explicit `any` removed:**
- `(paintingAnno.body as any)?.id` → `rawBody = Array.isArray(...) ? [0] : single; 'id' in rawBody ? rawBody.id : undefined`

**`iiifBuilder.ts` — 1 explicit `any` removed:**
- `resource as any` → `resource as Record<string, unknown>` (function validates shape via runtime checks)

**Blocked (properly annotated):**
- `annotorious.ts` (14) + `waveform.ts` (9): external libs, no @types
- `shared/types/index.ts` (6): items/service/navPlace structural debt
- `svelte-shims.d.ts` (2): framework shim
- `technical-tab-wiring.test.ts` (2): test file callbacks

---

## Current Phase: TYPE_DEBT Round 5 ✅ COMPLETE

### Metrics (post TYPE_DEBT Round 5)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, 29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **327 warnings** (was 344; 17 fewer) |

### TYPE_DEBT Round 5 — Changes Made
**`debouncedCallback.ts` — 4 `any` via CallbackFn type alias:**
- `T extends (...args: any[]) => any` × 2 → extracted to `type CallbackFn = (...args: any[]) => any`
  with single `eslint-disable-next-line` (standard TS callable-bound idiom; `Parameters<T>` requires it)
- Interface + function generic now use `T extends CallbackFn` — no `any` visible in callers.

**`avService.ts` — 4 `any` removed:**
- Imported `IIIFAnnotationPage` from `@/src/shared/types`
- `PlaceholderCanvas.items?: any[]` → `IIIFAnnotationPage[]`
- `AccompanyingCanvas.items?: any[]` → `IIIFAnnotationPage[]`
- `generateSyncPoints` body access: `(body[0] as any)?.value` / `(body as any)?.value`
  → `bodyItem = Array.isArray(body) ? body[0] : body` + `'value' in bodyItem ? bodyItem.value : ''`
- `createAccompanyingCanvas`: added `as const` on `type: 'Annotation'`, `motivation: 'supplementing'`, `type: 'TextualBody'` — fixes new tsc errors introduced by typed items array.

**`fileIntegrity.ts` — 4 `any` in inline IDB stubs removed:**
- Replaced inline `interface IDBPDatabase<T>` stub + `declare function openDB` with real `import { openDB, type IDBPDatabase, type DBSchema } from 'idb'`
- `fileIntegrity.test.ts` updated: replaced `globalThis.openDB` injection with `vi.mock('idb', ...)` (same pattern as `storage.test.ts`).

**`imageSourceResolver.ts` — 3 `any` suppressed with TYPE_DEBT comments:**
- All 3 `as any` are consequences of `IIIFItem.items?: any[]` and the union `IIIFCanvas | Record<string,unknown>` parameter.
- Added `// TYPE_DEBT:` + `// eslint-disable-next-line` at each site explaining the root cause.

**Deferred:**
- `annotorious.ts` (14) + `waveform.ts` (9): External libs, no @types — stays TYPE_DEBT-bannered
- `exportService.ts` (9): Next candidate
- `shared/types/index.ts` (6): items/service/navPlace/provider.homepage/provider.logo — structural TYPE_DEBT
- `svelte-shims.d.ts` (2): Framework shims — intentional `any`

---

## Current Phase: TYPE_DEBT Round 4 ✅ COMPLETE

### Metrics (post TYPE_DEBT Round 4)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, 29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **344 warnings** (was 350; 6 fewer — `validator.ts` all `any` removed) |

### TYPE_DEBT Round 4 — Changes Made
**`validator.ts` — all 6 `any` instances removed:**
- `traverse()` inner closure: `(item as any).items || (item as any).annotations || (item as any).structures`
  → `item.items ?? item.annotations` + guard `isManifest(item) ? (item as IIIFManifest).structures ?? [] : []`
  — `item.items` is already `any[]` (TYPE_DEBT on base type); `item.annotations` is `IIIFAnnotationPage[]`; structures accessed via `isManifest` guard.
- `children.forEach((child: any) => ...)` → `(child)` — type inferred from children array; explicit `child as IIIFItem` on `traverse()` call.
- Canvas painting check: `raw.items?.some((p: any) => p.items?.some((a: any) => a.motivation === 'painting'))`
  → `raw.items?.some((p) => p.items?.some((a) => a.motivation === 'painting'))`
  — `p: IIIFAnnotationPage`, `a: IIIFAnnotation`, `motivation: IIIFMotivation | IIIFMotivation[]`; comparison compiles because `IIIFMotivation` includes `string`.

**Deferred (still TYPE_DEBT marked):**
- `shared/types/index.ts`: `provider.homepage?: any[]` / `provider.logo?: any[]` — needs `ProviderHomepage` interface
- ValidationIssue type unification (3 incompatible shapes: healer severity/title, validator level/message/fixable, QCDashboard)
- `IIIFItem.service?: any[]` — needs `ServiceDescriptor` discriminated union
- `IIIFItem.navPlace?: any` — needs GeoJSON type
- `IIIFItem.items?: any[]` — needs removal from base; callers narrow via `isCanvas`/`isManifest` guards

---

## Current Phase: TYPE_DEBT Round 3 ✅ COMPLETE

### Metrics (post TYPE_DEBT Round 3)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, 29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **350 warnings** (was 411; 61 fewer — mainly `validationHealer.ts` 56→~0 `any`) |

### TYPE_DEBT Round 3 — Changes Made
**`HealedIIIF` type introduced in `validationHealer.ts`:**
- Defined `type HealedIIIF = IIIFItem & Partial<{width,height,duration,structures,format,motivation}> & Record<string,unknown>`
  — Canvas/Manifest/Annotation sub-interface fields explicitly added; Record index allows setting/deleting non-IIIFItem properties.
- Added `const h = healed as HealedIIIF;` once at top of `performHealing` — replaces ~35 `(healed as any).xxx` casts.
- All `(healed as any)` cast sites replaced with `h.xxx` direct access.
- `createMinimalProvider` return type: `any` → `NonNullable<IIIFItem['provider']>`.
- `createMinimalThumbnail` return type: `any[]` → `IIIFExternalWebResource[]` (+ `type: 'Image' as const`).
- Added `IIIFExternalWebResource` to import from `@/src/shared/types`.
- `h.type = 'ContentResource' as IIIFItem['type']` — one explicit cast, self-documenting.
- `healAllIssues` return type: `{ item: IIIFItem }` → `{ item: IIIFItem | null }` — removes `null as any`.
- `safeHealAll`: `updatedItem: result.item` → `result.item ?? item` — handles nullable result.
- `validBehaviors.includes(b)` — cast changed from `b as any` to `(validBehaviors as string[]).includes(b)` (IIIFBehavior literal union vs string[]).
- Removed explicit `: any` from `.filter((entry: any))`, `.map((entry: any))`, `.filter((item: any))` callbacks.

**`inspectorValidation.ts` — remaining 3 `any` resolved:**
- `getMetadataValues(metadata: any[])` → `(metadata: NonNullable<IIIFItem['metadata']>)` — removed TYPE_DEBT comment.
- `sanitizeLabelValue(value: any): any` → `sanitizeLabelValue<T extends Record<string,string[]>|string>(value: T): T` — generic preserves caller return types; `as T` casts needed in body (implementation detail only).
- `fixed.summary = sanitizeLabelValue(fixed.summary!)` — non-null assertion safe (rule only fires when summary is defined).
- `fixed.metadata.filter((_: any, i) => ...)` → `(_, i) =>` — inferred from array element type.
- Rule 15: `items.some((item: any) => ...)` → `(item) =>` — inferred from `any[]`.

**Deferred (still TYPE_DEBT marked):**
- `validationHealer.ts`: `provider.homepage?: any[]` / `provider.logo?: any[]` (in IIIFItem definition — needs ProviderHomepage interface)
- `validator.ts`: 6 `any` instances — next candidate
- ValidationIssue type unification (3 incompatible shapes across healer/inspector/QCDashboard)
- ServiceDescriptor discriminated union for `IIIFItem.service`
- GeoJSON type for `IIIFItem.navPlace`

### TYPE_DEBT Round 2 — Changes Made
**Runtime bug fixed:**
- `Sidebar.svelte` — `effect_update_depth_exceeded` crash on archive item click.
  Root cause: `$effect` at lines 393-406 read `expandedIds` via `new Set(expandedIds)` AND wrote
  `expandedIds = next`. Every write created a new Set reference → re-triggered effect → infinite loop.
  Fix: `import { untrack } from 'svelte'`; read current value via `untrack(() => expandedIds)`;
  added early-return guard to skip write when all ancestor IDs are already present.

**`(canvas as any)` / `(item as any)` casts removed — `IIIFCanvas extends IIIFItem` confirmed:**
- `features/ingest/model/csvImporter.ts` — removed all 12+ `(canvas as any).field` and `(item as any).field`
  casts in `applyPropertyToCanvas`, `collectItems`, `extractProperty`. `IIIFCanvas` inherits `summary`,
  `rights`, `requiredStatement`, `navDate`, `annotations` from `IIIFItem` — no casts needed.
  TYPE_DEBT banner updated to "resolved".
- `features/export/model/staticSiteExporter.ts` — removed all `(item/manifest/collection as any).summary`
  casts. Fixed `getPaintingAnnotation` return type from `any` to `IIIFAnnotation | null`; removed
  `(page as any).items` cast (IIIFAnnotationPage.items is already typed). TYPE_DEBT banner updated.

**`inspectorValidation.ts` public API typed with `IIIFItem`:**
- `detectType(resource: IIIFItem, typeHint?: string)` — simplified body to `return typeHint ?? resource.type`
  (heuristics removed; `IIIFItem.type` is always defined). Added `navDate` null-guard in `fixIssue`.
  `members` (IIIF v2 Collection compat) accessed via `as unknown as Record<string, unknown>`.
- `RuleFn = (resource: IIIFItem, ...)` — all 18 rules typed against IIIFItem
- `validateResource(resource: IIIFItem | null | undefined)` — was `resource: any`
- `fixIssue(resource: IIIFItem): IIIFItem` — was `(any): any`
- `fixAll(resource: IIIFItem): IIIFItem` — was `(any): any`

**`inspectorValidation.test.ts` — fixed all tsc errors:**
- Factory functions (`makeValidManifest`, `makeValidCanvas`, `makeValidCollection`, `makeValidRange`)
  now return `IIIFItem` via `as IIIFItem` cast (spread of `Record<string, unknown>` overrides requires it)
- Inline call-site objects: added `as IIIFItem` or `as unknown as IIIFItem` at each `validateResource`,
  `fixIssue`, and `fixAll` call where the object literal doesn't structurally overlap with `IIIFItem`
  (e.g., missing `id`, `type: 'Unknown'`, `label: 'Hello'`, `label: 12345`)
- Added `!` non-null assertions on optional IIIFItem fields accessed from `fixed` return values:
  `fixed.metadata![n]`, `fixed.summary!.en[n]`, `fixed.requiredStatement!.value`, `resource.metadata!.length`
- Updated 3 "heuristic" test descriptions (heuristics removed from `detectType`; tests now describe
  explicit type behavior)

---

### Runtime Bug Fix Round ✅ COMPLETE (previous round)

### Metrics (post runtime-bug round)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, 29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **442 warnings** (`no-explicit-any`: 163) |

### Runtime Bug Round — Changes Made
**`invalid_snippet_arguments` crash in BoardView (Boards view broken):**
- Root cause: `{#snippet title()}` in `BoardHeader.svelte` template shadows the `title: string` prop.
  Inside the snippet body, `{title}` referred to the snippet function itself, not the string.
- Fix: Added `const titleText = $derived(title)` in `<script>` before the template shadows the binding.
  Changed `{title}` → `{titleText}` inside the snippet.

**`JSON.parse: unexpected character at line 1 column 1` on startup:**
- Root cause: A previous session stored `JSON.stringify(undefined)` = the string `"undefined"` in IDB.
  `loadProject()` retrieved it as Blob text `"undefined"`, then `JSON.parse("undefined")` threw.
- Fix: Added guard in `storage.ts` `loadProject()` before `JSON.parse`:
  `if (!text || text === 'undefined' || text === 'null') return null;`

**Snippet/prop shadow audit (class-wide fix):**
- Scanned all `.svelte` files for `{#snippet name()}` conflicting with same-named prop.
- Found second real conflict: `ViewContainer.svelte` line 69 — `{#snippet children()}{@render children()}{/snippet}`
  inside `<ErrorBoundary>` would render the snippet recursively instead of passing the prop through.
- Fix: Replaced the self-referential snippet wrapper with `<ErrorBoundary {children} />` (shorthand prop pass-through).
- False positives (no action): `FieldModeTemplate.svelte` (comment block), `SelectionToolbar.svelte`,
  `MenuButton.svelte` (both are nested slot-props inside `<Button>`, not top-level shadows).

---

### TYPE_DEBT Loop Round 1 ✅ COMPLETE (previous round)

### Metrics (post TYPE_DEBT round 1)
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** (was 1 stale test import; fixed) |
| `npx svelte-check` | 0 errors, ~29 warnings |
| `npm run test` | 117 files, **4756 tests passing** |
| `npm run lint` | 0 errors, **442 warnings** (`no-explicit-any`: 163, was 172) |
| `grep -r "@migration" src/` | ~60 remaining (non-actionable stubs) |

### TYPE_DEBT Round 1 — Changes Made
**Fixed (any → proper type):**
- `entities/manifest/model/actions/range.ts` — 4 `(item: any)` → `(item: RangeItem)` alias
- `entities/manifest/model/actions/index.ts` — 3 `(action as any).x` → `(action as Record<string, unknown>).x as string`
- `shared/types/index.ts` — `start.selector?: any` → `Selector | Selector[]`; `items?: any[]` kept with TYPE_DEBT comment
- `entities/manifest/model/validation/validationHealer.ts` — manualDeepClone: `clone: any[]` → `unknown[]`, `clone: any` → `Record<string,unknown>`, `(obj as any)[key]` → `(obj as Record<string,unknown>)[key]`; `ensureLanguageMap(value: any)` → `value: unknown`
- `features/viewer/__tests__/keyboard-shortcuts-modal.test.ts` — import fixed to use `.constants.ts`

**Annotated with // TYPE_DEBT: (cannot fix this loop):**
- `shared/types/index.ts` — `items`/`service`/`navPlace`/`provider.homepage`/`provider.logo` all have `// TYPE_DEBT:` + `// TODO(loop):` comments explaining the constraint
- `app/ui/App.svelte` — `validationIssuesMap` casts annotated: ValidationIssue mismatch (store: `severity/title/description` vs QCDashboard/validator: `level/itemId/message/fixable`)
- `entities/manifest/model/validation/validationHealer.ts` — file-level TYPE_DEBT banner: ~60 remaining `as any` for partial IIIF mutation; needs `HealedIIIF` discriminated union
- `features/viewer/actions/annotorious.ts` — file-level TYPE_DEBT banner: ~14 `as any` from Annotorious external lib (no @types package)

**Deferred (TODO(loop)):**
- ValidationIssue type unification: store (`severity/title`) ≠ validator (`level/itemId/message/fixable`) ≠ QCDashboard (local copy of validator type)
- ServiceDescriptor discriminated union for `IIIFItem.service`
- GeoJSON type for `IIIFItem.navPlace`
- HealedIIIF type to replace `as any` in validationHealer

---

## Phase History

### Phase 1: Type Safety Hardening ✅
- `Result<T,E>` added to `src/shared/types/index.ts`
- `ViewerView` annotation cast fixed
- `App.svelte` `validationIssuesMap` cast annotated with TYPE_DEBT (deeper unification deferred)
- `validationHealer.ts`: TYPE_DEBT banner added; manualDeepClone `any` improved to `unknown`/`Record<string,unknown>`

### Phase 2: Storage Service + History Wire ✅
- `StorageService` implemented in `src/shared/services/storage.ts` (idb v8)
- `HistoryStore<T>` wired in App.svelte (undo/redo/canUndo/canRedo)
- Storage tests use `vi.hoisted()` + in-memory Map mock for idb
- 6/6 storage tests passing

### Phase 3: Content State + ViewRouter Wiring ✅
- `contentStateService` import uncommented in App.svelte
- `handleDeleteAnnotation` / `handleEditAnnotation` wired to `vault.dispatch`
- `handleDrop` calls `contentStateService.parseFromUrl`
- ViewRouter: `contentStateService.updateUrl` uncommented in debounced effect
- `annotation.triggerSave?.()` / `annotation.triggerClear?.()` wired in ViewRouter
- 12/12 content-state tests passing

### Phase 4: Ingest Tree Migration ✅
- `ingestTree()` implemented in `iiifBuilder.ts` (sequential main-thread)
- `processNodeIngest()` recursive builder: YAML sidecar, media files, canvas creation
- `USE_WORKER_INGEST` flag remains `false`; worker pool path is scaffolded but unused
- 13/13 ingest-tree tests passing

### Phase 5: UI Widgets + @migration Cleanup ✅
- `StatusBar` wired in App.svelte (replaces inline tray)
- `ContextualHelp` wired in App.svelte
- `AnnotationContext` extended: `triggerSave`, `triggerClear`, `registerSave`, `registerClear`
- `NULL_ANNOTATION_CONTEXT` fallback updated; contexts.test.ts updated
- Widget `@migration` comments removed from App.svelte

### Phase 6: Coverage Thresholds + Smoke Tests ✅
1. Added `coverage` block to `vitest.config.ts` (v8, thresholds: s80/b70/f80/l80)
2. Smoke tests created and passing (25 tests across 7 new files):
   - `SearchView` — `src/features/search/__tests__/search-view-smoke.test.ts`
   - `MapView` — `src/features/map/__tests__/map-view-smoke.test.ts`
   - `TimelineView` — `src/features/timeline/__tests__/timeline-view-smoke.test.ts`
   - `ExportDialog` — `src/features/export/__tests__/export-dialog-smoke.test.ts`
   - `BatchEditor` — `src/features/metadata-edit/__tests__/batch-editor-smoke.test.ts`
   - `QCDashboard` — `src/widgets/QCDashboard/__tests__/qc-smoke.test.ts`
   - `AuthDialog` — `src/widgets/AuthDialog/__tests__/auth-dialog-smoke.test.ts`

### Bug Fixes (mid-Phase 6 session)
- **Viewer blank for MP4**: ViewRouter archive-mode was using `selectedItem` (normalized, items:[]) instead of `viewerData.canvas` (denormalized); fixed 3 usages
- **`&#9974;` literal in toolbar**: Svelte text-escapes HTML entities in `{}` expressions; replaced with actual Unicode characters `'⛶'`/`'✖'`
- **Sidebar "-" icons**: NAV_ITEMS used Lucide-style names; app only loads Material Icons font; fixed all icon names to Material Icons format (e.g. `visibility`, `grid_view`, `expand_more`)
- **No thumbnails**: Service worker never registered; added `navigator.serviceWorker.register('/sw.js')` in `main.ts`

---

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Sequential ingest (no worker pool) | `USE_WORKER_INGEST: false`; worker pool scaffold exists but enabling it requires IDB-in-worker support not yet validated |
| `registerSave`/`registerClear` in AnnotationContext | Svelte 5 equivalent of React imperative refs — viewer overlay calls register on mount, ViewRouter calls trigger |
| IDB mock via `vi.hoisted()` | `vi.mock()` is hoisted before variable declarations; `vi.hoisted()` is needed to declare the in-memory Map that the factory closes over |
| Svelte-check warnings left (~29) | All are minor type-inference gaps in `.svelte` files; no actionable correctness issues |
| `IIIFItem.service` stays `any[]` | Changing to `unknown[]` breaks imageSourceResolver and iiif-bridge which access `.type`/`.id` on service objects without narrowing. Fix requires ServiceDescriptor union first. |
| `IIIFItem.items` stays `any[]` | Changing to `unknown[]` breaks ~15 call sites that iterate items on base IIIFItem type. Fix requires removing the property from base IIIFItem. |
| Svelte 5 snippet/prop shadow rule | `{#snippet name()}` in a template creates a binding that shadows any same-named variable from `<script>`. Pattern: `const nameText = $derived(name)` before the template to capture the prop. For children pass-through to a child component, use `<Child {children} />` shorthand instead of a wrapper snippet. |
| Svelte 5 `effect_update_depth_exceeded` | Thrown when a `$effect` both reads and writes the same reactive state. Even if values are identical, a new object reference (e.g., `new Set(...)`) triggers re-run. Fix: use `untrack(() => state)` to read without registering a dependency; add an early-return guard to skip the write when state is already correct. |
| `IIIFCanvas extends IIIFItem` (confirmed) | `IIIFCanvas` inherits all `IIIFItem` fields (`summary`, `rights`, `requiredStatement`, `navDate`, `annotations`). `(canvas as any).field` casts are unnecessary when the field is on the base `IIIFItem` interface. |
