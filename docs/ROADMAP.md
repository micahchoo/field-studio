# Field Studio — Roadmap

_Single source of truth for feature parity with the pre-migration React codebase._
_Written: 2026-02-24. Update after each phase closes: overwrite metrics, mark phase ✅._

---

## Philosophy

Types → tests → "why" comments → external docs.
Each layer covers only what the layer above can't express.
Make illegal states unrepresentable. Lint rules and tests are enforcement, not prose.
No `any` or untyped cast without `// TYPE_DEBT: <reason>`.
No doc that drifts from code.

Phases execute infrastructure-first: clean types and real workers before wiring UI.
Exit criterion per phase is measurable; prose alone does not close a phase.

---

## Baseline (2026-02-24)

| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 errors |
| `svelte-check` | 0 errors, 29 warnings |
| `vitest` | 117 files, 4756 passing |
| `eslint` | 0 errors, 310 warnings |
| `grep -rc @migration src/` | ~60 markers |
| Remaining `// TYPE_DEBT:` (actionable) | 5 structural items |
| Workers implemented | 0 / 4 (all stubs) |
| Deployment targets | 0 / 3 (web only) |

### Known permanent TYPE_DEBT (external libs, cannot fix)

| Site | Count | Reason |
|------|-------|--------|
| `viewer/actions/annotorious.ts` | 14 | Annotorious has no `@types` package |
| `viewer/ui/molecules/AudioWaveform.svelte` (waveform.ts) | 9 | WaveSurfer has no `@types` package |
| `svelte-shims.d.ts` | 2 | Framework shim, intentional |

---

## Phase D — Design System Alignment

_Eliminate the two competing token systems and establish a single coherent neobrutalist design language._
_Can run in parallel with Phase 1. No TypeScript changes required. Exit criteria are visual/class-level._
_Audit source: screenshot review + automated grep of all .svelte files (2026-02-24)._

---

### Design system contracts (neobrutalist)

| Contract | Correct | Violation |
|----------|---------|-----------|
| Background | `bg-nb-cream`, `bg-nb-black`, `bg-nb-white` | `bg-white`, `bg-gray-*`, `bg-black` (no prefix) |
| Border | `border-nb-black`, `border-2 border-nb-black` | `border-theme-border`, `border-gray-*` |
| Text | `text-nb-black`, `text-nb-white`, `text-nb-*` | `text-gray-*`, `text-white`, `text-theme-*` |
| Corners | none / `rounded-none` | any `rounded-*` class |
| Shadow | `shadow-brutal`, `shadow-brutal-sm`, `shadow-brutal-lg` | `shadow-xl`, `shadow-lg`, `shadow-md`, `shadow-sm`, `shadow` |
| Icon names | `folder_open`, `close`, `delete` (underscore) | `folder-open`, `x`, `trash-2` (hyphenated Lucide) |
| Transitions | `transition-nb` | `transition-all`, `transition-colors` |
| Typography | `font-mono uppercase tracking-wider` for headers | sans-serif, lowercase headers |
| Overlay | `bg-nb-black/50` | `bg-black/50` |
| Blur | — (no blur in brutalist) | `backdrop-blur-*` |

---

### Exit criteria

- [ ] `grep -r "bg-theme-\|text-theme-\|border-theme-\|bg-theme" src/` → 0 results (excluding App.svelte CSS-var setter)
- [ ] `grep -r "rounded-" src/` count ≤ 5 (only intentional exceptions with `// DS-EXCEPTION:` comment)
- [ ] `grep -r "shadow-xl\|shadow-lg\|shadow-md\|shadow-sm\b\|shadow\"" src/` → 0 (outside Button.svelte CSS block)
- [ ] `grep -r "bg-gray-\|text-gray-\|bg-white\b\|bg-black\b" src/` → 0 (no bare Tailwind colors)
- [ ] `grep -r "backdrop-blur" src/` → 0
- [ ] Visual review: Sidebar, CommandPalette, PersonaSettings, Inspector all read as nb- brutalist

---

### D.1 — Widget token migration (CRITICAL — 150+ `theme-*` usages)

Three widgets were generated with a `theme-*` token system that has no relationship to the `nb-*` neobrutalist system. Every class in these files must be rewritten.

#### D.1.1 `Sidebar.svelte` — full rewrite to nb- tokens

**File:** `src/widgets/NavigationSidebar/ui/organisms/Sidebar.svelte`
**Current:** 45+ `theme-*` classes (`bg-theme-surface`, `text-theme-primary`, `border-theme-border`, `bg-theme-surface-raised`, `hover:bg-theme-surface-hover`, `text-theme-text-muted`, `bg-theme-primary/15`, `hover:bg-theme-primary/30`)
**Also:** `rounded-lg` on nav buttons (×1), `rounded-full` on badge dot (×2), context menu (×1); `shadow-xl` mobile, `shadow-lg` context menu; `bg-red-500`, `text-red-600`, `bg-red-50`, `dark:hover:bg-red-900/20` hardcoded reds; `animate-in fade-in-0 zoom-in-95` context menu animation; `bg-black/30` overlay without `nb-` prefix

**Target mapping:**
```
bg-theme-surface            → bg-nb-cream (light) / bg-nb-black (dark/field)
bg-theme-surface-raised     → bg-nb-cream/80
border-theme-border         → border-nb-black/20
text-theme-text             → text-nb-black
text-theme-text-muted       → text-nb-black/40
text-theme-primary          → fieldMode ? text-nb-yellow : text-nb-blue
bg-theme-primary/15         → fieldMode ? bg-nb-yellow/20 : bg-nb-blue/20
hover:bg-theme-surface-hover → hover:bg-nb-black/5
rounded-lg (nav items)      → remove (no rounding)
rounded-full (badges)       → remove; use square w-2 h-2 bg-nb-red
shadow-xl / shadow-lg       → shadow-brutal
bg-red-500 (danger badge)   → bg-nb-red
text-red-600 (danger text)  → text-nb-red
bg-black/30 (overlay)       → bg-nb-black/30
animate-in fade-in-0        → remove; use plain opacity or Svelte transition:fade
```

#### D.1.2 `CommandPalette.svelte` — full rewrite to nb- tokens

**File:** `src/widgets/CommandPalette/ui/CommandPalette.svelte`
**Current:** 35+ `theme-*` classes, `rounded` on kbd elements and list items
**Target:** Same mapping as D.1.1; `<kbd>` elements → `border border-nb-black bg-nb-cream font-mono text-[10px]` (no rounding)

#### D.1.3 `KeyboardShortcutsOverlay.svelte` — full rewrite to nb- tokens

**File:** `src/widgets/KeyboardShortcuts/ui/KeyboardShortcutsOverlay.svelte`
**Current:** 40+ `theme-*` classes, `rounded-lg` on filter pills, `focus:ring-theme-primary/40`
**Target:** Same nb- mapping; category pills → flat `border-2 border-nb-black` with `bg-nb-blue text-nb-white` (active) / `bg-nb-cream text-nb-black` (inactive)

---

### D.2 — Global `rounded-*` removal (HIGH — 50+ instances across 35 files)

Every `rounded-*` class (except intentional ones with `// DS-EXCEPTION:` comment) violates the brutalist spec.

**Priority targets (visual impact):**

| File | Lines | Class | Fix |
|------|-------|-------|-----|
| `MediaPlayer.svelte` | 539 | `rounded-full` play button | remove |
| `BoardView.svelte` | 1045, 1057, 1073 | `rounded` form inputs | remove |
| `BoardView.svelte` | 806, 936, 1137 | `rounded-lg` context menu, rubber band, borders | remove |
| `Inspector.svelte` | 446 | `rounded-full` validation dot | → square `w-2 h-2` |
| `ArchiveView.svelte` | 695, 810 | `rounded-sm` selection badge | remove |
| `MapView.svelte` | 276, 298, 353 | `rounded-full`, `rounded-lg` markers/popup | remove |
| `TimelineView.svelte` | 149, 206 | `rounded-full` timeline markers | → square |
| `FloatingSelectionToolbar.svelte` | 21 | `rounded-lg` | remove |
| `GroupedArchiveGrid.svelte` | 218, 227, 239 | `rounded-full`, `rounded-sm` | remove |
| `AuthDialog.svelte` | 339, 411 | `rounded-full` spinners | → `animate-spin` square |
| `BoardNode.svelte` | 286 | `rounded-full` anchor handles | → square |
| `NavigationHeader.svelte` | 186, 190 | `rounded-full` profile avatars | → square |

**Allowed exceptions** (mark with `// DS-EXCEPTION: <reason>`):
- `LoadingState.svelte`: spinner — only if no square equivalent is legible
- Map cluster circles — Leaflet generates these; override via Leaflet CSS

---

### D.3 — Bare color standardization (HIGH — 80+ instances)

**File-level breakdown:**

| File | Issue | Fix |
|------|-------|-----|
| `Inspector.svelte:40-46` | `text-amber-600/emerald-600/blue-500/indigo-500/purple-500/teal-500/slate-500` in `RESOURCE_TYPE_CONFIG` JS object | Map all 7 types to nb- palette: `nb-orange`/`nb-green`/`nb-blue`/`nb-blue`/`nb-pink`/`nb-green`/`nb-black/50` |
| `BoardView.svelte` | `bg-gray-900`, `bg-white`, `bg-blue-500`, `text-red-600`, `text-gray-300/900`, `bg-white/90`, `border-white/20` (28+ lines) | Replace with `nb-black`, `nb-white`, `nb-blue`, `nb-red`, `nb-black/40`, `nb-white/90`, `border-nb-white/20` |
| `ModalDialog.svelte:107` | `bg-black/50 backdrop-blur-sm` overlay | → `bg-nb-black/50` + remove `backdrop-blur-sm` |
| `StagingWorkbench.svelte:958` | `bg-sky-50 border-sky-200 text-sky-700` keyboard help banner | → `bg-nb-blue/10 border-nb-blue/30 text-nb-blue` |
| `Tooltip.svelte:69` | `bg-gray-900 text-white` | → `bg-nb-black text-nb-white` |
| `ResourceTypeBadge.svelte:25` | `bg-gray-100 text-gray-800 border-gray-400` | → `bg-nb-cream border-nb-black text-nb-black` |
| `MediaPlayer.svelte:551` | `text-red-400` error state | → `text-nb-red` |
| `MediaPlayer.svelte:596-597` | `rgba(234,179,8,0.2)` / `#eab308` SVG overlay | → CSS variable `var(--nb-yellow)` |
| `GeoEditor.svelte` | `bg-white/95`, `bg-white/90` | → `bg-nb-white/95`, `bg-nb-white/90` |
| `BoardHeader.svelte` | `bg-white`, `hover:bg-black/5` (10 lines) | → `bg-nb-white`, `hover:bg-nb-black/5` |
| `ViewerView.svelte` | `bg-black` (4 lines) | → `bg-nb-black` |

---

### D.4 — PersonaSettings modal (HIGH — off-system design)

**File:** `src/widgets/PersonaSettings/ui/PersonaSettings.svelte`
**Issues observed (screenshot):**
- White background → `bg-nb-cream`
- Blue native range slider → style with nb- CSS: `accent-color: var(--nb-blue)` or custom track overlay
- Blue native checkbox → custom checkbox using `appearance-none border-2 border-nb-black` + checked state via `bg-nb-blue`
- "8 fields" rounded badge → `border-2 border-nb-black bg-nb-blue text-nb-white text-[10px] font-mono px-1.5 py-0.5` (no rounding)
- Field visibility preview pills (`Label`, `Summary`, etc.) → flat `border border-nb-black text-[10px] font-mono uppercase px-2 py-0.5` (no rounding)
- Body typography → ensure `font-mono` for labels; sans-serif body text acceptable for values only

---

### D.5 — Viewer error state (HIGH — no designed fallback)

**File:** `src/features/viewer/ui/molecules/MediaErrorOverlay.svelte` (likely) or raw in ViewerView/ViewerContent
**Issue:** OpenSeadragon errors render as raw text: `"Unable to open [object Object]: Error loading archive.local/iiif/image/..."`. No styled error component exists.
**Target:** Design a `ViewerErrorState.svelte` molecule:
```
┌─────────────────────────────┐
│  ⚠  LOAD ERROR              │ ← icon + bold mono uppercase
│  archive.local/...          │ ← truncated URL, monospace
│  [RETRY]  [OPEN IN BROWSER] │ ← button row
└─────────────────────────────┘
```
Style: `bg-nb-cream border-2 border-nb-red text-nb-black` with `shadow-brutal`

---

### D.6 — Thumbnail placeholder shimmer (MEDIUM — communicates "broken" not "loading")

**Files:** `ArchiveView.svelte`, `ArchiveGrid.svelte`, `ArchiveList.svelte`, filmstrip modes
**Issue:** Grey `image` icon on cream square with no animation. When SW is not registered or blobs are unset, every card is identical and static — reads as broken, not loading.
**Target:** Replace static placeholder `<div>` with:
```svelte
<!-- While thumbnailUrl is empty -->
<div class="w-full h-full bg-nb-black/5 animate-pulse"></div>
```
Add `loadError` state: if `<img onerror>` fires, swap to icon placeholder (indicating definitively "no image", not "loading").

---

### D.7 — Shadow system cleanup (MEDIUM)

| File | Violation | Fix |
|------|-----------|-----|
| `Sidebar.svelte:463` | `shadow-xl` (mobile) | `shadow-brutal` |
| `Sidebar.svelte:810` | `shadow-lg` (context menu) | `shadow-brutal-sm` |
| `BoardView.svelte` | bare `shadow` | `shadow-brutal-sm` |

---

### D.8 — Transition class standardization (LOW)

Replace `transition-all`, `transition-colors`, `transition-transform` across all feature files with `transition-nb` (already defined in the design system). Exceptions: Sidebar width animation (`transition-[width]`) is fine as-is since `transition-nb` likely doesn't cover arbitrary property transitions.

---

### Tracking

| Sub-task | Status | Files | Violations |
|----------|--------|-------|------------|
| D.1 Widget token migration | pending | Sidebar, CommandPalette, KeyboardShortcuts | 150+ `theme-*` |
| D.2 `rounded-*` removal | pending | 35 files | 50+ instances |
| D.3 Bare color standardization | pending | 13 files | 80+ instances |
| D.4 PersonaSettings | pending | PersonaSettings.svelte | 6 issues |
| D.5 Viewer error state | pending | ViewerContent/ViewerView | 1 component missing |
| D.6 Thumbnail placeholder shimmer | pending | Archive* | all archive views |
| D.7 Shadow cleanup | pending | Sidebar, BoardView | ~10 instances |
| D.8 Transition standardization | pending | ~20 files | ~30 instances |

---

## Phase 1 — TYPE_DEBT Structural

_Fix the five structural `any` root causes that block downstream narrowing._
_Do not widen scope: `IIIFItem.items` is tracked in Phase 1.5._

### Exit criteria

- [ ] `grep -r "service\?: any\[\]" src/shared/types` → 0 results
- [ ] `grep -r "navPlace\?: any" src/shared/types` → 0 results
- [ ] `grep -r "homepage\?: any" src/shared/types` → 0 results (provider)
- [ ] `grep -r "logo\?: any" src/shared/types` → 0 results (provider)
- [ ] Single canonical `ValidationIssue` type; all three consumers import from one location
- [ ] `tsc --noEmit` 0 errors, `vitest` still green
- [ ] ESLint `no-explicit-any` warning count ≤ current baseline (do not regress)

### Tasks

#### 1.1 `ServiceDescriptor` discriminated union

**File:** `src/shared/types/index.ts`
**Current:** `IIIFItem.service?: any[]`
**Target:**
```typescript
export type ServiceDescriptor =
  | { type: 'ImageService3'; id: string; profile: string }
  | { type: 'ImageService2'; '@id': string; '@type': string; profile: string }
  | { type: 'AuthCookieService1'; id: string; label: LanguageMap }
  | { type: 'AuthAccessTokenService1'; id: string }
  | { type: string; id?: string; '@id'?: string; [key: string]: unknown }; // open fallback

// IIIFItem.service?: ServiceDescriptor[]
```
**Call sites requiring narrowing:** `imageSourceResolver.ts` (3 `as any`), `iiifBuilder.ts` (1 `as any`), `staticSiteExporter.ts` (1 `as any`)
**Test:** add unit tests asserting `isImageService3(s)` and `isImageService2(s)` type guards return correct type.

#### 1.2 GeoJSON type for `navPlace`

**File:** `src/shared/types/index.ts`
**Current:** `IIIFItem.navPlace?: any`
**Target:**
```typescript
export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: GeoJSONGeometry;
}
export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] | [number, number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'LineString'; coordinates: [number, number][] };

// IIIFItem.navPlace?: GeoJSONFeature
```
**Call sites:** `navPlaceService.ts` (accepts/returns navPlace), `MapView.svelte` (reads coordinates).
**Test:** `navPlaceService` unit test asserting Point/Polygon narrowing.

#### 1.3 `ProviderHomepage` / `ProviderLogo` types

**File:** `src/shared/types/index.ts`
**Current:** `provider.homepage?: any[]`, `provider.logo?: any[]`
**Target:**
```typescript
export interface ProviderHomepage {
  id: string;
  type: 'Text';
  label: LanguageMap;
  format?: string;
  language?: string[];
}
export type ProviderLogo = IIIFExternalWebResource;

// IIIFProvider.homepage?: ProviderHomepage[]
// IIIFProvider.logo?: ProviderLogo[]
```
**Call sites:** `validationHealer.ts` `createMinimalProvider` (removes last `any` fallback there).

#### 1.4 `ValidationIssue` — single canonical type

**Problem:** Three incompatible shapes exist:
| Consumer | Shape |
|----------|-------|
| Vault store (`validationStore.svelte.ts`) | `{ severity: string; title: string; description: string }` |
| Validator (`validator.ts`) | `{ level: string; itemId: string; message: string; fixable: boolean }` |
| QCDashboard (local copy of validator shape) | same as validator |

**Target:** One canonical type exported from `src/entities/manifest/model/validation/validator.ts`:
```typescript
export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  itemId: string;
  message: string;
  fixable: boolean;
  /** @deprecated use level + message */ severity?: never;
  /** @deprecated use message */ title?: never;
}
```
Migrate store and QCDashboard to this type. Remove local copies.
**Test:** `QCDashboard.test.ts` and `validationStore` tests import from single location.

### Phase 1.5 — `IIIFItem.items` narrowing (separate scope)

> Tracked here but executed independently; broader blast radius than the items above.

**Problem:** `IIIFItem.items?: any[]` appears on the base type, used by 15+ call sites without narrowing.
**Approach:** Remove `items` from `IIIFItem`. Add typed `items` to subtypes only:
- `IIIFManifest.items: IIIFCanvas[]`
- `IIIFCanvas.items: IIIFAnnotationPage[]`
- `IIIFAnnotationPage.items: IIIFAnnotation[]`

**Blocker:** Requires all 15 call sites to narrow via `isCanvas` / `isManifest` guards first. Do not attempt until Phase 1 structural fixes are merged and tests are green.

---

## Phase 2 — Workers

_Replace all four worker stubs with real implementations._
_Workers must not import IDB directly; pass structured messages only._

### Exit criteria

- [ ] `src/shared/workers/index.ts` exports real worker factories (no stub comments)
- [ ] `USE_WORKER_INGEST` flag can be set `true` without test failures
- [ ] Search indexing runs off-main-thread (SearchView no longer freezes on large vaults)
- [ ] Validation runs off-main-thread (QCDashboard updates non-blocking)
- [ ] `tsc --noEmit` 0 errors, `vitest` still green

### Tasks

#### 2.1 `ingest.worker.ts`

Re-enable `USE_WORKER_INGEST: true` path in `iiifBuilder.ts`.
Worker receives `{ type: 'ingest'; files: SerializedFile[] }`, returns typed `IngestWorkerResponse` (already defined in `workers/index.ts`).
IDB operations stay on main thread; worker posts back entity data, main thread writes to vault.

#### 2.2 `searchIndexer.ts` → `search.worker.ts`

FlexSearch index build currently blocks main thread in `searchService.ts`.
Worker receives vault snapshot (serialized), builds index, posts back serialized index blob.
`SearchView` receives index via postMessage, stores in `$state`.

#### 2.3 `validation.worker.ts`

`validator.validateTree()` currently called synchronously in `App.svelte` effect.
Worker receives normalized vault state, runs validation, posts back `ValidationIssue[]`.
`QCDashboard` and `FilterPanel` consume from store written by worker result handler.

#### 2.4 `compression.worker.ts`

Decompress/compress IIIF JSON payloads for OPFS storage.
Worker wraps `CompressionStream` / `DecompressionStream` (browser-native).
`opfsStorage.ts` calls `getCompressionWorker()` — must no longer return `null`.

---

## Phase 3 — Service Wiring

_Connect services that exist but are not wired to their consumers._
_Each item is tracked by its `// @migration` comment count in the target file._

### Exit criteria

- [ ] `grep -c @migration src/widgets/ContextualHelp` → 0
- [ ] `grep -c @migration src/widgets/CommandPalette` → 0
- [ ] `grep -c @migration src/widgets/AuthDialog` → 0
- [ ] `grep -c @migration src/app/ui/App.svelte` → 0
- [ ] `tsc --noEmit` 0 errors

### Tasks

#### 3.1 `guidanceService` → `ContextualHelp`

`src/shared/services/guidanceService.ts` exists; `ContextualHelp.svelte` stubs it.
Wire `guidanceService.getGuidance(contextKey)` to the `entries` prop.
Wire `WELCOME_MESSAGES` constant (locate in `guidanceService` or add to `src/shared/config/`).

#### 3.2 `commandHistory` store → `CommandPalette`

React version tracked recent commands + frequency map.
Create `src/shared/stores/commandHistory.svelte.ts` with `$state` array + `record(cmd)` / `recent()`.
Wire to `CommandPalette.svelte` recent-commands section.

#### 3.3 `authFlowService` → `AuthDialog`

`src/shared/services/authFlowService.ts` exists (IIIF Auth Flow 2.0).
`AuthDialog.svelte` has five `// @migration stub` comments marking the real flows.
Wire: `handleExternalLogin`, `handleTokenService`, `handleActiveLogin` → actual `authFlowService` calls.
Token storage: `storage.saveAuthToken(id, token)` → add to `StorageService` if missing.

#### 3.4 `validateTree()` → `App.svelte` validation loop

`// @migration: Wire validateTree(state) when validator is available` remains in `App.svelte`.
Wire `validator.validateTree(vault.state)` in the auto-validation `$effect`.
Post result to `validationStore`; `QCDashboard` + `FilterPanel` already read from store.
After Phase 2 (validation worker), swap synchronous call for worker dispatch.

#### 3.5 `changeDiscoveryService` + `activityStream`

Both exist in `src/shared/services/` but have no call sites.
Wire `changeDiscoveryService.startPolling(manifestId)` when a remote manifest is loaded.
Wire `activityStream.record(event)` on vault dispatch (for provenance).

#### 3.6 `searchService` vault traversal → `SearchView`

`SearchView.svelte:21` marks: `buildIndexEntries` depends on vault traversal.
Call `searchService.buildIndexEntries(vault.state)` on vault change (debounced).
After Phase 2, move index build to search worker.

#### 3.7 `tilePipeline` → service worker coordination

`src/shared/services/tilePipeline.ts` exists; relationship to `public/sw.js` is unclear.
Verify tile pipeline is correctly invoked by SW or called from `storage.saveAsset`.
Document the call path in a `// WHY:` comment; delete the file if it is dead code.

---

## Phase 4 — UI Component Wiring

_Replace all `// @migration` placeholder comments with real component imports._
_Prerequisite: Phase 1 (types), Phase 2 (workers), Phase 3 (service wiring) complete._

### Exit criteria

- [ ] `grep -rc "@migration" src/` → 0
- [ ] `tsc --noEmit` 0 errors
- [ ] `svelte-check` 0 errors
- [ ] `vitest` all passing
- [ ] Viewer: image deep-zoom, audio, video, annotation drawing, workbench, filmstrip — all functional

### Domain breakdown

#### 4.1 Viewer (`ViewerView.svelte` — 13 stubs)

| Stub | Real component | File |
|------|---------------|------|
| ViewerToolbar | `viewer/ui/molecules/ViewerToolbar.svelte` | exists |
| ViewerContent | `viewer/ui/molecules/ViewerContent.svelte` | exists |
| FilmstripNavigator | `viewer/ui/molecules/FilmstripNavigator.svelte` | exists |
| ImageFilterPanel | `viewer/ui/molecules/ImageFilterPanel.svelte` | exists |
| MeasurementOverlay | `viewer/ui/molecules/MeasurementOverlay.svelte` | exists |
| ComparisonViewer | `viewer/ui/molecules/ComparisonViewer.svelte` | exists |
| AnnotationDrawingOverlay | `viewer/ui/molecules/AnnotationDrawingOverlay.svelte` | exists |
| AnnotationLayerPanel | `viewer/ui/molecules/AnnotationLayerPanel.svelte` | exists |
| ViewerWorkbench | `viewer/ui/molecules/ViewerWorkbench.svelte` | exists |
| ViewerPanels | `viewer/ui/molecules/ViewerPanels.svelte` | exists |
| KeyboardShortcutsModal | `viewer/ui/molecules/KeyboardShortcutsModal.svelte` | exists |
| AudioWaveform | `viewer/ui/molecules/AudioWaveform.svelte` | exists |
| storage.saveProject | `shared/services/storage.ts` | exists |

Also wire `contentStateService.updateUrl` in `ViewerView` (marked `// @migration: contentStateService not yet wired`).

#### 4.2 Sidebar — StructureTree (`Sidebar.svelte` — 4 stubs)

| Stub | Target |
|------|--------|
| `StructureTreeView` (non-virtual DOM tree) | `features/structure-view/ui/organisms/StructureTreeView.svelte` |
| `TreeSearchBar` placeholder | `features/structure-view/ui/atoms/TreeSearchBar.svelte` |
| `VirtualTreeList` | `features/structure-view/ui/molecules/VirtualTreeList.svelte` |
| `resizablePanel` | Svelte 5 runes store (no hook equivalent) |

#### 4.3 Board design (`BoardView.svelte` — 8 stubs)

| Stub | Action |
|------|--------|
| `resolveHierarchicalThumb` | Implement in `board-design/model/index.ts`; call through service worker |
| Board thumbnail from IIIF SW | Wire through `tilePipeline` (Phase 3.7) |
| z-index management | Implement `reorderItems(id, direction)` in board model |
| `ConnectionLine` integration | Already exists as atom; import in `ConnectionLayer.svelte` |
| `ConnectionEditPanel` integration | Already exists; wire via board store |
| `PresentationOverlay` integration | Already exists; conditional render |
| `AlignmentGuideLine` integration | Already exists; conditional render during drag |
| Board export | `html2canvas` → PNG; SVG serialiser; IIIF Content State → clipboard |

#### 4.4 Validation / QC

| Stub | Action |
|------|--------|
| `validateTree()` in App.svelte | Done in Phase 3.4; Phase 4 connects QCDashboard read |
| `validationHealer` in QCDashboard | Wire `validationHealer.safeHealAll(item)` on heal-button click |

#### 4.5 Annotation widget

| Stub | Action |
|------|--------|
| `AnnotationToolPanel` | Wire `features/viewer/ui/organisms/AnnotationToolPanel.svelte` into `AnnotationToolbar.svelte` |
| `MetadataEditorPanel` | Wire `features/metadata-edit/ui/organisms/MetadataEditorPanel.svelte` into `AnnotationToolbar.svelte` |

#### 4.6 Archive

| Stub | Action |
|------|--------|
| `GroupedArchiveGrid` placeholder | Import `archive/ui/molecules/GroupedArchiveGrid.svelte` |
| `StackedThumbnail` placeholder | Import `shared/ui/molecules/StackedThumbnail.svelte` |
| Create-manifest-from-canvases | Wire `vault.dispatch(actions.addManifest(...))` on multi-select confirm |

#### 4.7 Search / Map / Timeline

| File | Stub | Action |
|------|------|--------|
| `SearchView.svelte` | `usePipeline().searchToArchive(id)` | Call `appMode.setMode('archive')` + `vault.setSelected(id)` |
| `MapView.svelte` | canvas thumbnail URL | Resolve via `imageSourceResolver.resolveThumb(canvas)` |
| `TimelineView.svelte` | canvas thumbnail URL | Same as Map |

#### 4.8 App-level

| Stub | Action |
|------|--------|
| Rename-pattern support (`getIIIFValue`) | Wire `getIIIFValue` from `src/shared/lib/iiif-value.ts`; used in `App.svelte:549` |

---

## Phase 5 — Deployment Targets

_Build storage adapters and sync layer for Docker and Tauri._
_Prerequisite: Phase 4 complete (web app at full React parity)._

### Exit criteria

- [ ] `npm run build:docker` succeeds
- [ ] `npm run build:tauri` succeeds (Tauri CLI available)
- [ ] E2E import → view → export works on all three targets
- [ ] `tsc --noEmit` 0 errors on all build variants

### Sub-phases

#### 5.1 Storage abstraction

Extract `StorageAdapter` interface from `storage.ts`.
Implement `WebStorageAdapter` (current IDB logic), `DockerStorageAdapter` (HTTP REST), `TauriStorageAdapter` (native FS via `invoke`).
Factory: `createStorageAdapter()` reads `VITE_DEPLOYMENT_TARGET`.
Tests: each adapter tested in isolation with mocked transport.

Reference: `docs/deployment/feature-parity-maintenance.md § UnifiedStorage Adapter`

#### 5.2 IIIF tile serving — Docker

Express route: `GET /tiles/:assetId/:z/:x/:y.jpg` using `sharp` for on-demand generation.
Cache tiles on disk; serve from cache on repeat requests.
Update `public/sw.js` to detect Docker target and skip SW interception for tile routes.

#### 5.3 File import — Tauri

`TauriImportManager` wraps `@tauri-apps/plugin-dialog` `open()`.
Converts native paths to `FileInfo` via Rust `get_file_info` command.
Shares `ImportOptions` interface with `WebImportManager`.

#### 5.4 P2P sync — Web + Tauri

`WebRTCSync` wraps `y-webrtc` `WebrtcProvider`.
`SyncProvider` interface: `connect() / disconnect() / getDocument() / getUsers()`.
Vault mutations write to `Y.Doc`; remote changes merge into vault via `Y.Doc` observer.

#### 5.5 Server sync — Docker

`WebSocketSync` wraps `y-websocket` `WebsocketProvider` pointed at self-hosted server.
Shares `SyncProvider` interface with `WebRTCSync`.

#### 5.6 Build + CI

Add `build:docker`, `build:tauri`, `dev:docker` scripts.
GitHub Actions matrix: web (GH Pages), Docker image push, Tauri Windows MSI + Linux Flatpak.
Reference: `docs/deployment/feature-parity-maintenance.md § CI/CD Pipeline`

---

## Tracking

### Phase status

| Phase | Status | `@migration` count | TYPE_DEBT delta | Workers |
|-------|--------|--------------------|-----------------|---------|
| Baseline | current | ~60 | 5 structural | 0/4 |
| D — Design system alignment | pending | — | — | — |
| 1 — TYPE_DEBT structural | pending | — | 0 remaining | 0/4 |
| 1.5 — items narrowing | deferred | — | — | — |
| 2 — Workers | pending | — | — | 4/4 |
| 3 — Service wiring | pending | ~35 | — | — |
| 4 — UI wiring | pending | 0 | — | — |
| 5 — Deployment | pending | — | — | — |

### Permanent blockers (will never be zero)

| Item | Reason |
|------|--------|
| `annotorious.ts` 14× `any` | No `@types/annotorious` |
| `waveform.ts` 9× `any` | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` 2× `any` | Framework shim |

### `TODO(loop)` survivors (3+ rounds)

| Item | Rounds | Next action |
|------|--------|-------------|
| `ValidationIssue` unification | 6 | Phase 1.4 |
| `ServiceDescriptor` union | 6 | Phase 1.1 |
| `IIIFItem.navPlace` GeoJSON | 6 | Phase 1.2 |
| `IIIFItem.items` base removal | 6 | Phase 1.5 (deferred) |

---

## Loop discipline

Each phase runs the loop until the exit criteria above are met:

```
ORIENT  → read this file + STATE.md; note drift
BUILD   → implement; types from single source of truth
TEST    → tsc + svelte-check + vitest all green
RECTIFY → lint; add linter rule if class of bug is preventable
SYNC    → update STATE.md delta; update this file's Tracking table
```

Exit condition for the whole roadmap: Tracking table shows all phases ✅, `@migration` count = 0, `tsc` clean, tests green, no stale docs.

When all phases are ✅: write to memory, compact context if > 50% used.
