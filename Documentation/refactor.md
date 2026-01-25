# Code Quality Refactoring Plan: "Efficient Genius" Standard

## Executive Summary

This plan transforms the IIIF Field Studio codebase from "working code with accumulated complexity" to "elegant, maintainable code that an efficient genius would write." The analysis revealed **73 specific issues** across services, components, and architecture.

**Key Findings:**
- 16 instances of `as unknown as` type casting (type system defeats)
- 20+ state variables in App.tsx (should be 5-7)
- 58+ repeated `fieldMode ? 'dark' : 'light'` class patterns
- 923-line ArchiveView.tsx with inline helper components
- Dual state management (Vault + legacy props drilling)

---

## Phase 1: Type Safety & Dead Code (Day 1)

### 1.1 Fix Type System Violations in vault.ts

**Files:** `services/vault.ts`
**Lines:** 183, 315, 336, 367, 377, 381, 395, 404, 411, 413, 425, 436, 443, 449, 451, 457

**Problem:** 16x `as unknown as Record<string, unknown>` double-casting defeats TypeScript.

**Solution:** Create properly typed helper functions:
```typescript
// Add to vault.ts
function cloneEntity<T extends IIIFItem>(entity: T): Record<string, unknown> {
  return { ...entity } as Record<string, unknown>;
}

function asEntity<T>(record: Record<string, unknown>): T {
  return record as T;
}
```

Replace all instances like:
```typescript
// Before:
const collection = { ...state.entities.Collection[id] } as unknown as Record<string, unknown>;
return collection as unknown as IIIFCollection;

// After:
const collection = cloneEntity(state.entities.Collection[id]);
return asEntity<IIIFCollection>(collection);
```

### 1.2 Fix Unsafe Type Casts in actions.ts

**File:** `services/actions.ts`
**Lines:** 283, 293, 299

**Problem:** `(rangeItem as any).type` and `as any` property access.

**Solution:** Use proper type guards:
```typescript
// Before:
if ((rangeItem as any).type === 'Range') {

// After:
if ('type' in rangeItem && rangeItem.type === 'Range') {
```

### 1.3 Remove Dead Code in actions.ts

**File:** `services/actions.ts`
**Lines:** 57-58

**Problem:** `SET_ROOT` and `MERGE_ITEM` action types declared but never implemented.

**Solution:** Remove from Action type union or implement handlers.

### 1.4 Fix Error Handling in searchService.ts

**File:** `services/searchService.ts`
**Lines:** 36-60

**Problem:** Silent failures leave `this.index` in undefined state.

**Solution:**
```typescript
class SearchService {
  private index: any | null = null;
  private isHealthy = false;

  reset(): void {
    try {
      this.index = this.createIndex();
      this.isHealthy = true;
    } catch (e) {
      console.error("Failed to initialize FlexSearch index", e);
      this.index = null;
      this.isHealthy = false;
    }
  }

  search(query: string): SearchResult[] {
    if (!this.isHealthy) return [];
    // ...
  }
}
```

---

## Phase 2: Eliminate Redundancy (Day 2)

### 2.1 Consolidate Storage Quota Logic

**File:** `services/storage.ts`
**Lines:** 56-90, 124-129, 164-169

**Problem:** Quota check + warning pattern duplicated 3x.

**Solution:** Extract single helper:
```typescript
private async checkAndWarnQuota(operation: string): Promise<boolean> {
  const { ok, usagePercent } = await this.checkStorageQuota();
  if (!ok && usagePercent >= STORAGE_CRITICAL_THRESHOLD) {
    this._warningCallback?.({
      type: 'quota_critical',
      message: `Storage quota exceeded during ${operation}`,
      usagePercent
    });
    return false;
  }
  return true;
}
```

### 2.2 Consolidate Word Scoring in searchService.ts

**File:** `services/searchService.ts`
**Lines:** 260-298

**Problem:** `getWordSuggestions()` and `getFuzzySuggestions()` have duplicate iteration patterns.

**Solution:** Extract `scoredWordSuggestions(predicate)` helper.

### 2.3 Create Shared Theme Classes Utility

**Problem:** 58+ instances of `fieldMode ? 'dark-classes' : 'light-classes'`

**Solution:** Create `utils/themeClasses.ts`:
```typescript
export const createThemeClasses = (fieldMode: boolean) => ({
  input: fieldMode
    ? 'bg-slate-900 text-white border-slate-800'
    : 'bg-white text-slate-900 border-slate-300',
  container: fieldMode
    ? 'bg-black text-white'
    : 'bg-white text-slate-900',
  button: fieldMode
    ? 'bg-yellow-400 text-black'
    : 'bg-iiif-blue text-white',
  // ... 8 more patterns
});

// Usage in components:
const theme = createThemeClasses(settings.fieldMode);
<input className={theme.input} />
```

---

## Phase 3: Split Large Components (Days 3-4)

### 3.1 Split App.tsx (572 lines → ~150 lines)

**Current problems:**
- 20+ state variables
- 8 useEffect blocks with tangled dependencies
- 200 lines of conditional view rendering

**New structure:**
```
components/App/
├── App.tsx              (150 lines - layout + composition)
├── AppLayout.tsx        (sidebar + main + inspector structure)
├── ViewRouter.tsx       (conditional view rendering)
└── hooks/
    ├── useURLState.ts       (URL hash sync)
    ├── useAppSettings.ts    (settings + localStorage)
    ├── useStorageWatcher.ts (quota monitoring)
    └── useNavigation.ts     (mode transitions)
```

### 3.2 Split ArchiveView.tsx (923 lines → ~400 lines)

**Extract to separate files:**
- `VirtualizedGrid.tsx` (120 lines)
- `VirtualizedList.tsx` (100 lines)
- `AssetCard.tsx` (80 lines)
- `SelectionBar.tsx` (60 lines)

**Extract to hooks:**
- `useRubberBandSelection.ts` (80 lines)
- `useVirtualization.ts` (50 lines - make reusable)

### 3.3 Split Inspector.tsx (515 lines → ~250 lines)

**Extract tab panels:**
- `MetadataTab.tsx`
- `BehaviorTab.tsx`
- `GeoTab.tsx`
- `LearnTab.tsx`

**Extract components:**
- `MetadataFieldEditor.tsx`
- `RequiredStatementEditor.tsx`

**Extract hook:**
- `useInspectorTabs.ts` (tab persistence)

### 3.4 Split useIIIFEntity.tsx (623 lines → modular)

**New structure:**
```
hooks/
├── useIIIFEntity.ts     (re-exports only)
├── vault/
│   ├── VaultContext.tsx
│   ├── useVault.ts
│   ├── useEntity.ts
│   └── useEntityTypes.ts
├── useHistory.ts
├── useBulkOperations.ts
└── useUndoRedoShortcuts.ts
```

---

## Phase 4: Fix State Management (Day 5)

### 4.1 Consolidate App.tsx State Variables

**Before (20 variables):**
```typescript
const [currentMode, setCurrentMode] = useState<AppMode>('archive');
const [showSidebar, setShowSidebar] = useState(true);
const [showInspector, setShowInspector] = useState(false);
const [showExport, setShowExport] = useState(false);
// ... 16 more
```

**After (structured):**
```typescript
interface AppUIState {
  mode: AppMode;
  viewType: ViewType;
  panels: { sidebar: boolean; inspector: boolean };
  modals: {
    export: boolean;
    qcDashboard: boolean;
    settings: boolean;
    // ...
  };
}

const [ui, dispatchUI] = useReducer(uiReducer, initialUIState);
```

### 4.2 Create useDialogState Hook

**Problem:** 11 dialog open/close states scattered across App.tsx.

**Solution:**
```typescript
// hooks/useDialogState.ts
export function useDialogState(key: string) {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
```

### 4.3 Create useResponsive Hook

**Problem:** Mobile/tablet detection repeated.

**Solution:**
```typescript
// hooks/useResponsive.ts
export function useResponsive() {
  const [width, setWidth] = useState(window.innerWidth);
  // ... resize listener
  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}
```

### 4.4 Consolidate Viewer.tsx Panel State

**Before (6 booleans):**
```typescript
const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
const [showSearchPanel, setShowSearchPanel] = useState(false);
const [showWorkbench, setShowWorkbench] = useState(false);
// ... 3 more
```

**After (1 union):**
```typescript
type ViewerPanel = 'transcription' | 'search' | 'workbench' | 'composer' | 'annotation' | null;
const [openPanel, setOpenPanel] = useState<ViewerPanel>(null);
```

---

## Phase 5: Effect Dependencies (Day 5, continued)

### 5.1 Fix App.tsx Effect Dependencies

**Line 268:** Missing `showToast` dependency
**Line 278:** `exportRoot` recreated each render - wrap in useCallback

### 5.2 Fix Viewer.tsx Effect Dependencies

**Line 62:** Missing `onComposerOpened` callback
**Lines 83-97:** Consolidate into single effect with `[item?.id]` only

### 5.3 Fix ArchiveView.tsx Circular Dependency

**Line 352:** `handleDelete` is in deps but depends on values that create circular refs. Move logic into effect or extract to separate hook.

---

## Phase 6: Architectural Cleanup (Days 6-7)

### 6.1 Reorganize services/ Directory

**Current:** 25 files flat
**Proposed:**
```
services/
├── state/           (vault.ts, actions.ts, contentState.ts)
├── builders/        (iiifBuilder.ts, specBridge.ts, autoStructure.ts)
├── io/              (csvImporter.ts, exportService.ts, archivalPackageService.ts)
├── search/          (searchService.ts, contentSearchService.ts)
├── validation/      (validator.ts, fileIntegrity.ts, viewerCompatibility.ts)
├── persistence/     (storage.ts, activityStream.ts, provenanceService.ts)
├── media/           (avService.ts, tileWorker.ts)
└── index.ts         (re-exports)
```

### 6.2 Move Utilities Out of types.ts

**Current:** types.ts has LanguageString class (170 lines) and type guards (40 lines)

**Extract to:**
- `utils/languageString.ts`
- `utils/typeGuards.ts`

### 6.3 Consolidate Metadata Definitions

**Problem:** BEHAVIOR_DEFINITIONS exists in both constants.ts AND designSystem.ts

**Solution:** Single source of truth in constants.ts, remove from designSystem.ts

### 6.4 Create Modal Service

**Problem:** 11 dialogs with duplicate patterns

**Solution:**
```typescript
// services/modalService.ts
export const useModal = () => {
  const openModal = (config: ModalConfig) => { /* ... */ };
  const closeModal = (id: string) => { /* ... */ };
  return { openModal, closeModal };
};

// In App.tsx: <ModalContainer /> renders active modals
```

---

## Files to Modify

### High Priority (Type Safety)
- `services/vault.ts` - 16 type cast fixes
- `services/actions.ts` - 3 type fixes + dead code removal
- `services/searchService.ts` - error handling

### Medium Priority (Redundancy)
- `services/storage.ts` - quota consolidation
- `services/searchService.ts` - word scoring consolidation
- NEW: `utils/themeClasses.ts`

### Component Splits
- `App.tsx` → `components/App/` module
- `components/views/ArchiveView.tsx` → extract 4 components + 2 hooks
- `components/Inspector.tsx` → extract 4 tab components + 1 hook
- `hooks/useIIIFEntity.tsx` → `hooks/vault/` module

### New Hooks
- `hooks/useDialogState.ts`
- `hooks/useResponsive.ts`
- `hooks/useVirtualization.ts`
- `hooks/useRubberBandSelection.ts`

### Architectural
- Reorganize `services/` into subdirectories
- Extract utilities from `types.ts`
- Remove duplication from `designSystem.ts`

---

## Verification Plan

### After Phase 1 (Type Safety)
```bash
npx tsc --noEmit  # Should pass with 0 errors
npm run build     # Should succeed
```

### After Phase 3 (Component Splits)
```bash
npm run dev       # App should load
# Manual: Navigate all views, verify no regressions
```

### After All Phases
```bash
npm run build                    # Production build
npx tsc --noEmit                 # Type check
# Manual verification:
# - Import files via drag-drop
# - Edit metadata in Inspector
# - Export as ZIP
# - Test all 5 view modes
# - Verify field mode toggle
# - Test keyboard shortcuts (Cmd+K, Cmd+Z)
```

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Type casts (`as any`, `as unknown`) | 35+ | 0 |
| App.tsx lines | 572 | ~150 |
| ArchiveView.tsx lines | 923 | ~400 |
| Inspector.tsx lines | 515 | ~250 |
| useIIIFEntity.tsx lines | 623 | ~100 (with modules) |
| Repeated theme class patterns | 58+ | 0 (centralized) |
| State variables in App.tsx | 20+ | 5-7 |
| Effect dependency warnings | 8 | 0 |

**Total LOC reduction:** ~1,500 lines (moved to smaller, focused files)
**Files added:** ~15 (smaller, single-purpose)
**Cognitive load reduction:** Significant - each file has one clear purpose
