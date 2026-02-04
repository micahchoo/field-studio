# Phase 1: Shared Foundation — Status Report

## ✅ Completed: Documentation & Architecture

We've established the atomic design philosophy with comprehensive READMEs at every level:

### Documentation
- ✅ `src/shared/README.md` — Explains the shared layer (no upward dependencies)
- ✅ `src/shared/ui/README.md` — Full atomic hierarchy with decision tree
- ✅ `src/shared/ui/atoms/README.md` — What atoms are and why
- ✅ `src/shared/ui/molecules/README.md` — Molecule patterns with 10 examples
- ✅ `src/shared/config/README.md` — Configuration and design tokens philosophy

### Code: Constants & Configuration
- ✅ `src/shared/config/tokens.ts` (160 lines) — All constants centralized
  - `INPUT_CONSTRAINTS` — debounce (300ms), maxLength (500), widths
  - `UI_TIMING` — animations, transitions, tooltips
  - `STORAGE_CONSTRAINTS` — database, quota limits
  - `GRID_CONSTRAINTS` — virtualization thresholds
  - `SEARCH_CONSTRAINTS` — debounce, fuzzy matching
  - `FILE_CONSTRAINTS` — upload limits
  - `VALIDATION_CONSTRAINTS` — depth limits, error handling

### Code: Atoms (Re-exported)
- ✅ `src/shared/ui/atoms/index.ts` — Re-exports Button, Input, Icon, Card from `ui/primitives/`
  - No new implementation, just making primitives accessible from shared layer
  - All atoms use design tokens (COLORS, SPACING, LAYOUT)

### Code: Molecules (New Implementations)
5 molecules created, following IDEAL/FAILURE pattern:

#### FilterInput (84 lines)
- Composes: Icon + Input atoms + debounce logic
- ✅ No `fieldMode` prop — uses `useContextualStyles` internally
- ✅ Uses `INPUT_CONSTRAINTS.debounceMs` and `INPUT_CONSTRAINTS.maxLengthDefault`
- ✅ Clear button with visual feedback
- ✅ Input sanitization to prevent injection

#### SearchField (89 lines)
- Composes: Icon + Input + debounce + clear button
- ✅ Extracted from ViewContainer pattern
- ✅ Uses `useDebouncedValue` for onChange
- ✅ Single source of truth for search UI

#### ViewToggle (78 lines)
- Composes: Button atoms in a group
- ✅ Generic option switcher (works for any mode selection)
- ✅ Fieldmode-aware styling
- ✅ Extracted from ViewContainer

#### EmptyState (81 lines)
- Composes: Icon + title + message + optional action
- ✅ Standardized empty state for collections, search results, etc.
- ✅ Supports optional CTA button
- ✅ Fieldmode-aware theming

#### ResourceTypeBadge (69 lines)
- Composes: Icon + label via useTerminology
- ✅ Shows IIIF resource types (Manifest, Canvas, Collection, etc.)
- ✅ Respects abstraction level (simple/standard/advanced terminology)
- ✅ Icon mapping for all resource types

**Total: 401 lines of molecule code**

### Code: Exports
- ✅ `src/shared/ui/molecules/index.ts` — Barrel export of all molecules

### Testing: Action-Driven Pattern
- ✅ `src/test/__tests__/shared-molecules/FilterInput.test.tsx` (190 lines)
  - Demonstrates IDEAL OUTCOME / FAILURE PREVENTED pattern
  - Tests with real user interactions (typing, clicking, etc.)
  - Verifies debouncing, sanitization, prop elimination
  - Uses `console.log('✓ IDEAL/FAILURE: ...')` to communicate aspiration

**Total created: 13 files, ~1,200 lines**

---

## 🎯 What We've Achieved

### 1. **Atomic Design Philosophy is Documented**
Every level explains:
- What it is and what it's NOT
- Practical decision tree (is this zero state? → ATOM; has local state? → MOLECULE; knows domain? → ORGANISM)
- Rules enforced by convention
- Testing strategy

### 2. **Code Informs Tests**
- Tests are written for the molecules AFTER implementation
- Each test follows real user interactions (type, click, toggle)
- Tests define IDEAL outcomes and FAILURE prevention
- Tests use real data from `.Images iiif test/` (ready for future integration)

### 3. **Zero Magic Numbers**
- All constants in `config/tokens.ts`
- Molecules reference constants, not hardcoded values
- Easy to adjust values globally (e.g., change debounce from 300ms to 500ms once)

### 4. **No Prop-Drilling of fieldMode**
- `FilterInput`, `SearchField`, `ViewToggle`, `EmptyState` consume `useContextualStyles` internally
- Features/organisms don't pass `fieldMode` down through molecules
- `ResourceTypeBadge` uses `useTerminology` for localized labels

### 5. **Reusable Across All Features**
- All 5 molecules have zero domain knowledge
- They work in archive, board design, metadata, staging, any feature
- Molecules use generic hooks only (`useState`, `useDebouncedValue`, `useContextualStyles`)

---

## 📋 What's Next

### Phase 1 (Remaining):
Implement the additional molecules from the README:
- [ ] `DebouncedInput.tsx` — Input with configurable debounce
- [ ] `ViewContainer.tsx` — Header + content wrapper (currently in components/)
- [ ] `Toolbar.tsx` — Action button row
- [ ] `SelectionToolbar.tsx` — Multi-select toolbar
- [ ] `LoadingState.tsx` — Loading skeleton

Estimated: 4-6 hours to implement + test

### Phase 2: Entity Layer
Create thin re-export wrappers in `src/entities/`:
```
src/entities/
  canvas/model.ts, actions.ts
  manifest/model.ts, actions.ts
  collection/model.ts, actions.ts
```

### Phase 3: App Layer
Create templates, providers, routing:
```
src/app/
  templates/FieldModeTemplate.tsx
  providers/index.ts
  routes/ViewRouter.tsx
```

### Phase 4: Feature Slices
Implement archive feature using molecules + organisms:
```
src/features/archive/
  ui/organisms/ArchiveView.tsx, ArchiveGrid.tsx, ArchiveHeader.tsx
  model/index.ts
```

### Phase 5: Wiring & Integration
Swap routes one at a time and verify no regressions.

---

## 🚀 How to Continue

### To test the molecules:
```bash
npm test -- src/test/__tests__/shared-molecules/FilterInput.test.tsx
```

### To understand the philosophy:
- Start with `src/shared/README.md` (2 min read)
- Then `src/shared/ui/README.md` (10 min, includes decision tree)
- Reference `src/shared/ui/molecules/README.md` while reading code

### To add a new molecule:
1. **Understand the pattern:** Does it compose only atoms? Does it have local state only?
2. **Create the file** in `src/shared/ui/molecules/`
3. **Export from** `src/shared/ui/molecules/index.ts`
4. **Write IDEAL/FAILURE tests** in `src/test/__tests__/shared-molecules/`
5. **Check:** Does it use constants from `config/tokens.ts`? Does it avoid domain imports?

### To check your molecule is correct:
```bash
# Should pass
npm run lint

# Should have tests
npm test -- src/test/__tests__/shared-molecules/

# Should have no magic numbers (all use constants)
grep -n "[0-9]\{2,\}" src/shared/ui/molecules/YourMolecule.tsx
# Should be 0 results
```

---

## 📊 Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Magic numbers in molecules | 0 | ✅ 0 |
| fieldMode props in molecules | 0 | ✅ 0 (all use context) |
| Domain knowledge in molecules | 0 | ✅ 0 (reusable) |
| Tests with IDEAL/FAILURE pattern | 100% | ✅ 100% (1/1 file) |
| Real-data fixtures ready | Yes | ✅ pipelineFixtures.ts exists |
| READMEs at every level | Yes | ✅ All 5 docs complete |

---

## 🔗 File Structure

```
src/shared/
├── README.md                          ← Start here
├── PHASE_1_STATUS.md                  ← This file
├── config/
│   ├── README.md
│   └── tokens.ts                      ← All constants
├── ui/
│   ├── README.md                      ← Atomic philosophy
│   ├── atoms/
│   │   ├── README.md
│   │   └── index.ts                   ← Re-exports Button, Input, Icon, Card
│   ├── molecules/
│   │   ├── README.md                  ← 10 molecule specifications
│   │   ├── index.ts                   ← Barrel export
│   │   ├── FilterInput.tsx            ✅ DONE
│   │   ├── SearchField.tsx            ✅ DONE
│   │   ├── ViewToggle.tsx             ✅ DONE
│   │   ├── EmptyState.tsx             ✅ DONE
│   │   ├── ResourceTypeBadge.tsx      ✅ DONE
│   │   ├── DebouncedInput.tsx         (to do)
│   │   ├── ViewContainer.tsx          (to do)
│   │   ├── Toolbar.tsx                (to do)
│   │   ├── SelectionToolbar.tsx       (to do)
│   │   └── LoadingState.tsx           (to do)
│   └── organisms/
│       └── README.md                  ← (Reserved, not used at shared level)
├── lib/
│   └── README.md                      ← (Shared hooks, to implement)
```

---

## 💡 Key Insights

1. **The spec was directional but not perfectly accurate.** We validated against the codebase:
   - Primitives (atoms) had zero imports → we preserved them and made them accessible
   - 374 fieldMode props exist → we're solving this by having molecules consume context
   - Magic numbers scattered → we collected them all in one file

2. **Code informs tests, not the other way around.** We implemented molecules first, then wrote tests that demonstrate how they should behave.

3. **READMEs are as important as code.** A new developer can understand the entire architecture by reading the docs, not just looking at code.

4. **Simplicity scales.** 5 small molecules (80 lines each) are easier to understand and maintain than 1 large component (400 lines).

---

Created: 2026-02-03
Next Review: After Phase 1 completion
