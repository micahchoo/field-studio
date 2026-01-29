# Test Coverage Analysis

## Current Test Status

**Total Test Files**: 13  
**Total Tests**: 416  
**Passing**: 400 (96.2%)

## Coverage by Category

### ✅ Well Tested (99%+ coverage)
| Module | Files | Test File | Coverage |
|--------|-------|-----------|----------|
| **Utilities - Core** | 6 | 6 test files | 99.7% |
| | filenameUtils.ts | filenameUtils.test.ts | ✅ 100% |
| | fuzzyMatch.ts | fuzzyMatch.test.ts | ✅ 100% |
| | iiifTypes.ts | iiifTypes.test.ts | ✅ 100% |
| | iiifValidation.ts | iiifValidation.test.ts | ✅ 100% |
| | mediaTypes.ts | mediaTypes.test.ts | ✅ 100% |
| | sanitization.ts | sanitization.test.ts | ✅ 97% |

### ✅ Services - Core (100% coverage)
| Module | Test File | Coverage |
|--------|-----------|----------|
| vault.ts | vault.test.ts | ✅ 100% |
| actions.ts | actions.test.ts | ✅ 100% |
| iiifBuilder.ts | iiifBuilder.test.ts | ✅ 100% |

### ✅ Hooks - Selectors (100% coverage)
| Module | Test File | Coverage |
|--------|-----------|----------|
| useVaultSelectors.ts | useVaultSelectors.test.tsx | ✅ 100% |

---

## 🔴 Critical Gaps - High Priority

### 1. **IIIF Behavior Utilities** (`utils/iiifBehaviors.ts`)
**Why Critical**: Core IIIF spec compliance validation  
**Functions to Test** (22 functions):
- `validateBehaviors()` - Validate behavior combinations
- `findBehaviorConflicts()` - Find mutually exclusive behaviors
- `doesInheritBehavior()` - Check behavior inheritance
- `getBehaviorCategory()` - Categorize behaviors
- `isBehaviorAllowed()` - Check if behavior valid for type
- `BEHAVIOR_VALIDITY_MATRIX` - Validity matrix testing
- `DISJOINT_SETS` - Mutually exclusive sets

**Test Cases Needed**: ~40

### 2. **IIIF Hierarchy Utilities** (`utils/iiifHierarchy.ts`)
**Why Critical**: Tree structure operations used throughout app  
**Functions to Test** (32 functions):
- `isValidChildType()` - Parent-child validation
- `getValidChildTypes()` - Get allowed children
- `getRelationshipType()` - Relationship classification
- `findNodeById()` - Tree traversal
- `getPathToNode()` - Path finding
- `createRange()` / `createNestedRange()` - Range creation
- Collection manipulation functions

**Test Cases Needed**: ~50

### 3. **Validation Service** (`services/validator.ts`)
**Why Critical**: Data integrity and IIIF compliance  
**Class**: `ValidationService`
**Methods to Test**:
- `validateTree()` - Full tree validation
- `validateItem()` - Single item validation
- `mapSchemaErrors()` - Error mapping
- Issue categorization

**Test Cases Needed**: ~30

### 4. **Trash Service** (`services/trashService.ts`)
**Why Critical**: Data safety feature  
**Class**: `TrashService`
**Methods to Test**:
- `moveToTrash()` - Soft delete
- `restore()` - Restore with relationships
- `emptyTrash()` - Permanent deletion
- `getStats()` - Statistics
- `cleanup()` - Auto-cleanup

**Test Cases Needed**: ~25

---

## 🟠 Important Gaps - Medium Priority

### 5. **Export Service** (`services/exportService.ts`)
**Why Important**: Core feature for publishing  
**Class**: `ExportService`
**Methods to Test**:
- `exportToIIIF()` - IIIF export
- `exportCanopy()` - Static site generation
- `generateInfoJson()` - Image API info.json
- `resizeImage()` - Image processing

**Test Cases Needed**: ~30

### 6. **CSV Importer** (`services/csvImporter.ts`)
**Why Important**: Data migration feature  
**Class**: `CSVImporterService`
**Methods to Test**:
- `parseCSV()` - CSV parsing
- `validateMapping()` - Column mapping
- `importToManifest()` - Import process
- `generateTemplate()` - Template generation

**Test Cases Needed**: ~25

### 7. **Metadata Harvester** (`services/metadataHarvester.ts`)
**Why Important**: EXIF/metadata extraction  
**Function**: `extractMetadata()`
**Test Cases Needed**: ~15

### 8. **App Settings Hook** (`hooks/useAppSettings.ts`)
**Why Important**: User preferences persistence  
**Hook**: `useAppSettings()`
**Test Cases Needed**: ~15

### 9. **Responsive Hook** (`hooks/useResponsive.ts`)
**Why Important**: UI breakpoint handling  
**Hook**: `useResponsive()`
**Test Cases Needed**: ~10

### 10. **IIIF Schema Utils** (`utils/iiifSchema.ts`)
**Why Important**: Schema validation  
**Functions to Test**:
- `validateResource()`
- `IIIF_SCHEMA` validation
- Property recommendations

**Test Cases Needed**: ~25

---

## 🟡 Nice to Have - Lower Priority

### 11. **UI Hooks** (8 hooks)
| Hook | Purpose | Tests |
|------|---------|-------|
| useDialogState.ts | Modal state | ~8 |
| useDebouncedCallback.ts | Debouncing | ~6 |
| useFocusTrap.ts | Accessibility | ~6 |
| useReducedMotion.ts | Motion prefs | ~5 |
| useURLState.ts | URL sync | ~8 |
| useTerminology.ts | i18n terms | ~6 |
| useHistory.ts | Undo/redo | ~10 |
| useKeyboardDragDrop.ts | A11y DnD | ~10 |

### 12. **Specialized Services** (10 services)
| Service | Purpose | Tests |
|---------|---------|-------|
| provenanceService.ts | Audit trail | ~15 |
| searchService.ts | FlexSearch | ~20 |
| contentState.ts | URL encoding | ~15 |
| navPlaceService.ts | Geo data | ~10 |
| authService.ts | IIIF Auth | ~15 |
| stagingService.ts | Staging | ~15 |
| fileIntegrity.ts | SHA-256 | ~10 |
| virtualManifestFactory.ts | Virtual manifests | ~20 |
| tileWorker.ts | Image tiles | ~15 |
| staticSiteExporter.ts | Export | ~15 |

### 13. **Component Tests** (Critical Components)
| Component | Purpose | Tests |
|-----------|---------|-------|
| Toast.tsx | Notifications | ~10 |
| ErrorBoundary.tsx | Error handling | ~8 |
| Inspector.tsx | Property editing | ~15 |
| Sidebar.tsx | Navigation | ~12 |
| CommandPalette.tsx | Commands | ~15 |
| ExportDialog.tsx | Export UI | ~10 |

---

## 📊 Priority Matrix

| Priority | Category | Files | Est. Tests | Effort |
|----------|----------|-------|------------|--------|
| 🔴 **P0 - Critical** | Core IIIF utils | 3 | ~120 | Medium |
| 🟠 **P1 - High** | Services | 4 | ~85 | Medium |
| 🟡 **P2 - Medium** | Hooks | 8 | ~60 | Low |
| 🟢 **P3 - Low** | Components | 6 | ~70 | High |

**Total Estimated New Tests**: ~335

---

## 🎯 Recommended Test Implementation Order

### Phase 1: Core IIIF Compliance (Week 1)
1. `utils/iiifBehaviors.ts` - Behavior validation (~40 tests)
2. `utils/iiifHierarchy.ts` - Tree operations (~50 tests)
3. `utils/iiifSchema.ts` - Schema validation (~25 tests)

### Phase 2: Data Services (Week 2)
4. `services/validator.ts` - Validation (~30 tests)
5. `services/trashService.ts` - Trash/restore (~25 tests)
6. `services/csvImporter.ts` - CSV import (~25 tests)

### Phase 3: Core Hooks (Week 3)
7. `hooks/useAppSettings.ts` - Settings (~15 tests)
8. `hooks/useResponsive.ts` - Responsive (~10 tests)
9. `hooks/useHistory.ts` - Undo/redo (~10 tests)
10. `hooks/useDialogState.ts` - Dialogs (~8 tests)

### Phase 4: Feature Services (Week 4)
11. `services/exportService.ts` - Export (~30 tests)
12. `services/metadataHarvester.ts` - Metadata (~15 tests)
13. `services/provenanceService.ts` - Audit (~15 tests)

### Phase 5: Critical Components (Week 5)
14. `components/Toast.tsx` - Notifications (~10 tests)
15. `components/ErrorBoundary.tsx` - Errors (~8 tests)
16. `components/Inspector.tsx` - Inspector (~15 tests)

---

## 📈 Expected Final Coverage

| Metric | Current | After Phase 1-2 | After All |
|--------|---------|-----------------|-----------|
| **Total Tests** | 416 | 631 (+215) | 751 (+335) |
| **Utils Coverage** | 99.7% | 99.7% | 99.7% |
| **Services Coverage** | 85% | 92% | 95% |
| **Hooks Coverage** | 80% | 85% | 90% |
| **Components Coverage** | 10% | 15% | 40% |
| **Overall Coverage** | 85% | 90% | 93% |

---

## 🔧 Quick Wins (Can add immediately)

These tests can be added with minimal setup:

1. **useAppSettings.ts** - Simple hook test
2. **useResponsive.ts** - Window mock test  
3. **useDialogState.ts** - State hook test
4. **iiifHierarchy.ts** - Pure function tests
5. **iiifBehaviors.ts** - Pure function tests

**Quick Win Total**: ~80 tests with minimal effort
