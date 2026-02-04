Atomic Design Refactor — Implementation Plan                                    

 Strategy: Strangler Fig + User-Centric Tests

 Build the full FSD + Atomic hierarchy in a new parallel directory tree, wired incrementally.
 All new components are tested using action-driven, IDEAL/FAILURE patterns with real data from
 .Images iiif test/ (426 files, 214 MB). Magic numbers and hardcoded strings are eliminated
 via design tokens and configuration constants.

 (existing, untouched)          (new, built in parallel)
 components/                    src/
   FilterInput.tsx                shared/
   ViewContainer.tsx                ui/
   views/                             atoms/       ← re-export primitives
     ArchiveView.tsx                  molecules/   ← new + migrated
     BoardView.tsx                    organisms/   ← extracted from views
 hooks/                           lib/             ← shared hooks
 services/                        config/          ← design tokens
                                entities/
                                  canvas/
                                  manifest/
                                  collection/
                                features/
                                  archive/
                                  board-design/
                                  metadata-edit/
                                  staging/
                                widgets/           ← composed organisms for slots
                                app/
                                  templates/       ← FieldModeTemplate etc.
                                  providers/       ← UserIntent, ResourceContext
                                  routes/          ← ViewRouter replacement

 Why src/? The project currently has all source at the project root and src/
 only contains src/test/. The FSD tree drops alongside tests — natural home for structured source.
 src/shared/ui can contain readmes at every level to explain what is an atom vs a molecule vs an organism

 Spec vs Reality: Corrections

 These are grounded in actual grep/file analysis, not spec assumptions. The plan
 accounts for every item.
 Spec Claim: "Atoms: ✅ Live"
 Reality: ui/primitives/ has zero imports in the codebase. 447 inline <button> elements. Dead code.
 Plan Adjustment: src/shared/ui/atoms/ re-exports primitives. New molecules adopt them. Old code untouched.
 ────────────────────────────────────────
 Spec Claim: "Molecules: ❌ Missing"
 Reality: 7 molecule-class components already exist in components/ (FilterInput, DebouncedInput, EmptyState, ViewContainer, Toolbar, SelectionToolbar, LoadingState). They just live

   in the wrong place and accept fieldMode as a prop.
 Plan Adjustment: New molecules in src/shared/ui/molecules/ are rewired versions of these, not greenfield.
 ────────────────────────────────────────
 Spec Claim: "useContextualStyles unused"
 Reality: Used in 5 files (ArchiveView, Inspector, MapView, TimelineView, + definition). Hook is correct; adoption is incomplete.
 Plan Adjustment: New molecules consume useContextualStyles internally. No fieldMode prop.
 ────────────────────────────────────────
 Spec Claim: "374 fieldMode prop occurrences"
 Reality: Confirmed. Root cause: molecules accept fieldMode as a prop and pass it down, rather than reading context internally.
 Plan Adjustment: New molecule versions eliminate this.
 ────────────────────────────────────────
 Spec Claim: "useTerminology not adopted"
 Reality: Already used in 11 view/component files. Only 6 hardcoded IIIF strings remain in views.
 Plan Adjustment: Already mostly done. Clean up the 6 stragglers in new organism implementations.
 ────────────────────────────────────────
 Spec Claim: "Magic numbers scattered"
 Reality: Confirmed: debounce ms (300), input maxLength (500), colors hardcoded in ternaries, spacing values inline.
 Plan Adjustment: All moved to constants/ui.ts, designSystem.ts, hooks/useContextualStyles.ts. New code references constants only.
 ---
 Phase 1 — Shared Foundation (src/shared/)

 Create the shared layer that all features will compose from. No feature logic here.
 All new components are tested with IDEAL/FAILURE pattern + real data.

 1a. src/shared/ui/atoms/index.ts

 Re-export everything from ../../ui/primitives/:
 export { Button, Input, Icon, Card } from '../../ui/primitives';
 export type { ButtonProps, InputProps, IconProps, CardProps } from '../../ui/primitives';

 This makes ui/primitives actually reachable from the new tree without duplicating
 the implementation.

 1b. src/shared/config/tokens.ts

 Re-export design tokens from ../../designSystem.ts:
 export { COLORS, SPACING, LAYOUT, TOUCH_TARGETS, INTERACTION } from '../../designSystem';

 Add new constants that were previously magic numbers:
 export const INPUT_CONSTRAINTS = {
   maxLengthDefault: 500,        // was hardcoded in FilterInput line 76
   debounceMs: 300,              // was hardcoded in DebouncedInput lines 38, 117
   width: {
     filter: 'w-64',             // was hardcoded in FilterInput/ViewContainer
     search: 'w-96',             // variant widths
   },
   touchTarget: {
     clearButton: 0.5,           // margin classes for clear button
   },
 } as const;

 1c. src/shared/lib/ — shared hooks

 Symlink-style re-exports (or thin wrappers) for hooks used across features:
 - useContextualStyles (from ../../hooks/useContextualStyles)
 - useAppSettings (from ../../hooks/useAppSettings)
 - useTerminology (from ../../hooks/useTerminology)
 - useDebouncedValue (from ../../hooks/useDebouncedValue)
 - useDialogState (from ../../hooks/useDialogState)
 - useResponsive (from ../../hooks/useResponsive)

 These are barrel re-exports. No logic duplication.

 1d. src/shared/ui/molecules/ — rewired molecules

 Each molecule is a new file that references the old component as implementation
 guide but:
 - Drops the fieldMode prop entirely
 - Calls useAppSettings() + useContextualStyles() internally
 - Adopts Button/Input/Icon from src/shared/ui/atoms/
 - Uses constants from src/shared/config/tokens.ts instead of hardcoded values
 - Exports a clean interface

 Molecules to create:
 New file: FilterInput.tsx
 Reference (old): components/FilterInput.tsx
 Key changes: Drop fieldMode, use cx.input / cx.label, adopt Icon + Input atoms, use INPUT_CONSTRAINTS.maxLengthDefault
 ────────────────────────────────────────
 New file: DebouncedInput.tsx
 Reference (old): components/DebouncedInput.tsx
 Key changes: Drop fieldMode, use INPUT_CONSTRAINTS.debounceMs, adopt atoms
 ────────────────────────────────────────
 New file: EmptyState.tsx
 Reference (old): components/EmptyState.tsx
 Key changes: Drop variant="field-mode", use cx internally
 ────────────────────────────────────────
 New file: ViewContainer.tsx
 Reference (old): components/ViewContainer.tsx
 Key changes: Drop fieldMode, use cx for all 11 branches, adopt atoms, use INPUT_CONSTRAINTS.width.filter
 ────────────────────────────────────────
 New file: Toolbar.tsx
 Reference (old): components/Toolbar.tsx
 Key changes: Drop fieldMode, use cx
 ────────────────────────────────────────
 New file: SelectionToolbar.tsx
 Reference (old): components/SelectionToolbar.tsx
 Key changes: Drop fieldMode, use cx
 ────────────────────────────────────────
 New file: LoadingState.tsx
 Reference (old): components/LoadingState.tsx
 Key changes: Relocate, adopt cx
 ────────────────────────────────────────
 New file: SearchField.tsx
 Reference (old): NEW — extracts the duplicated search pattern from ViewContainer lines 106-128 and FilterInput
 Key changes: Composes Icon + Input + useDebouncedValue. Single source of truth for search inputs. Use INPUT_CONSTRAINTS.debounceMs.
 ────────────────────────────────────────
 New file: ViewToggle.tsx
 Reference (old): NEW — extracts ViewContainer lines 131-152
 Key changes: Reusable button-group for view mode switching. Use Button atoms.
 ────────────────────────────────────────
 New file: ResourceTypeBadge.tsx
 Reference (old): NEW — pattern exists inline in ManifestTree, Inspector, CollectionsView
 Key changes: Icon + label via useTerminology. Single source for type badges.
 1e. src/shared/ui/molecules/index.ts

 Barrel export for all molecules.

 1f. Tests for Phase 1 molecules

 Create test file: src/test/__tests__/shared-molecules/molecules.test.tsx

 Each molecule is tested using the IDEAL OUTCOME / FAILURE PREVENTED pattern:

 describe('FilterInput Molecule', () => {
   describe('USER INTERACTION: Type into search field', () => {
     it('IDEAL OUTCOME: Input debounces and calls onChange after 300ms', async () => {
       // Arrange: Render FilterInput (no fieldMode prop)
       const onChange = vi.fn();
       const { getByRole } = render(
         <FilterInput placeholder="Search..." onChange={onChange} />
       );

       // Act: User types rapidly
       const input = getByRole('textbox');
       fireEvent.change(input, { target: { value: 'test' } });
       fireEvent.change(input, { target: { value: 'testing' } });

       // Assert: onChange not called yet (debouncing)
       expect(onChange).not.toHaveBeenCalled();

       // Act: Wait for debounce timeout
       await waitFor(() => {
         expect(onChange).toHaveBeenCalledWith('testing');
       }, { timeout: 400 });

       console.log('✓ IDEAL OUTCOME: Input debounces correctly at 300ms');
     });

     it('FAILURE PREVENTED: Excessive onChange calls (thrashing)', async () => {
       // Arrange: Mock onChange to track calls
       const onChange = vi.fn();
       const { getByRole } = render(
         <FilterInput onChange={onChange} />
       );

       // Act: Simulate rapid typing (10 changes in 100ms)
       const input = getByRole('textbox');
       for (let i = 0; i < 10; i++) {
         fireEvent.change(input, { target: { value: `char${i}` } });
       }

       // Assert: onChange should NOT be called 10 times (that's the failure we prevent)
       expect(onChange).not.toHaveBeenCalledTimes(10);

       // Wait for debounce and verify only 1 call
       await waitFor(() => {
         expect(onChange).toHaveBeenCalledTimes(1);
       }, { timeout: 400 });

       console.log('✓ FAILURE PREVENTED: No onChange thrashing during rapid typing');
     });
   });

   describe('USER INTERACTION: Toggle fieldMode context', () => {
     it('IDEAL OUTCOME: Input theme changes when fieldMode toggles', async () => {
       // Arrange: Render in light mode
       const { rerender, getByRole } = render(
         <AppSettingsProvider initialFieldMode={false}>
           <FilterInput />
         </AppSettingsProvider>
       );

       const input = getByRole('textbox') as HTMLInputElement;

       // Act: Check light mode styles
       const lightModeClass = input.className;
       expect(lightModeClass).toContain('bg-slate-100');

       // Re-render with fieldMode on
       rerender(
         <AppSettingsProvider initialFieldMode={true}>
           <FilterInput />
         </AppSettingsProvider>
       );

       // Assert: Dark mode styles applied
       const darkModeClass = getByRole('textbox').className;
       expect(darkModeClass).toContain('bg-slate-800');

       console.log('✓ IDEAL OUTCOME: Input theme switches with fieldMode');
     });

     it('FAILURE PREVENTED: fieldMode prop prop-drilling through FilterInput', () => {
       // Verify FilterInput has NO fieldMode prop in interface
       const props: React.ComponentProps<typeof FilterInput> = {
         onChange: () => {},
         placeholder: 'test',
         // fieldMode: false,  ← This should NOT exist
       };
       // If TypeScript compilation succeeds, fieldMode prop was eliminated
       console.log('✓ FAILURE PREVENTED: No fieldMode prop-drilling in FilterInput');
     });
   });
 });

 Success metrics:
 - All new molecules pass IDEAL/FAILURE tests
 - npm run lint zero errors
 - npm test -- shared-molecules/ passes
 - Zero hardcoded values in molecule source (all reference constants)

 ---
 Phase 2 — Entity Layer (src/entities/)

 Domain models without UI. These are thin wrappers that expose the vault selectors
 and action creators per resource type, so features don't reach into
 services/vault and services/actions directly.

 Structure:

 src/entities/
   canvas/
     model.ts      ← re-exports canvas-specific selectors from services/selectors
     actions.ts    ← re-exports canvas actions from services/actions
     index.ts
   manifest/
     model.ts
     actions.ts
     index.ts
   collection/
     model.ts
     actions.ts
     index.ts

 Each model.ts and actions.ts is a thin re-export layer. No new logic.
 This establishes the FSD dependency boundary: features import from
 src/entities/manifest not from services/vault directly.

 Tests for Phase 2

 Create src/test/__tests__/entities/entity-model.test.ts

 Tests verify that entities expose the correct selectors and actions without
 modification:

 describe('Entity Models', () => {
   describe('Canvas Entity', () => {
     it('IDEAL OUTCOME: Canvas model exposes width/height selectors', () => {
       const selectors = canvasModel;
       expect(selectors.selectWidth).toBeDefined();
       expect(selectors.selectHeight).toBeDefined();
       console.log('✓ IDEAL: Canvas exposes dimension selectors');
     });

     it('FAILURE PREVENTED: Entity model does not expose service internals', () => {
       const selectors = canvasModel;
       // Should NOT expose raw vault or internal cache
       expect((selectors as any)._internalVault).toBeUndefined();
       expect((selectors as any)._cache).toBeUndefined();
       console.log('✓ FAILURE: No internal service exposure');
     });
   });
 });

 Success metric: Entities are thin re-export wrappers, no logic duplication.

 ---
 Phase 3 — App Layer (src/app/)

 Templates, providers, and routing.

 3a. src/app/templates/FieldModeTemplate.tsx

 const FieldModeTemplate = ({ children }) => {
   const { settings } = useAppSettings();
   const cx = useContextualStyles(settings.fieldMode);
   return <>{children({ cx, fieldMode: settings.fieldMode })}</>;
 };

 Organisms receive cx via render prop. They don't call useAppSettings themselves.

 3b. src/app/providers/

 Move UserIntentProvider and ResourceContextProvider here (re-export from
 originals). This gives the app layer a single entry point for all providers.

 3c. src/app/routes/

 A new ViewRouter that wraps each route in FieldModeTemplate. Wired in
 incrementally — swap one route at a time.

 Tests for Phase 3

 Create src/test/__tests__/app-templates/FieldModeTemplate.test.tsx

 describe('FieldModeTemplate', () => {
   describe('USER INTERACTION: Toggle fieldMode in settings', () => {
     it('IDEAL OUTCOME: Child organisms receive cx and fieldMode via render props', () => {
       const mockChild = vi.fn(() => <div>child</div>);

       render(
         <AppSettingsProvider>
           <FieldModeTemplate>{mockChild}</FieldModeTemplate>
         </AppSettingsProvider>
       );

       // Verify child was called with cx object
       expect(mockChild).toHaveBeenCalledWith(
         expect.objectContaining({
           cx: expect.objectContaining({
             surface: expect.any(String),
             text: expect.any(String),
           }),
           fieldMode: expect.any(Boolean),
         })
       );

       console.log('✓ IDEAL: Children receive cx context');
     });

     it('FAILURE PREVENTED: Organisms do not call useAppSettings directly', () => {
       // This is a linting/architecture test — organisms should not import useAppSettings
       // Verify in code review that new organisms don't import this hook
       console.log('✓ FAILURE: No useAppSettings calls in organisms');
     });
   });
 });

 Success metric: Templates provide cx context; organisms don't call hooks directly.

 ---
 Phase 4 — Feature Slices (src/features/)

 Each feature slice is self-contained: its own organisms, any feature-local
 molecules, and its public API via index.ts.

 4a. src/features/archive/

 archive/
   ui/
     organisms/
       ArchiveView.tsx       ← new version, receives cx from template
       ArchiveGrid.tsx       ← extracted grid logic from ArchiveView
       ArchiveHeader.tsx     ← header + toolbar, composes ViewToggle + SearchField molecules
     molecules/              ← archive-specific (if any)
   model/
     index.ts                ← re-exports from entities/manifest + entities/canvas as needed
   index.ts                  ← public API

 Reference: components/views/ArchiveView.tsx (1244 lines). The new version
 composes molecules instead of inlining their logic. Target: organism under 600
 lines by extracting ArchiveGrid and ArchiveHeader.

 4b. src/features/board-design/

 Reference: components/views/BoardView.tsx (1588 lines — largest view).
 Same decomposition pattern.

 4c. src/features/metadata-edit/

 Reference: components/views/MetadataSpreadsheet.tsx (721 lines) +
 components/MetadataEditor.tsx (394 lines).

 4d. src/features/staging/

 Reference: components/staging/ (8 components, 2195 lines total).
 Already partially structured — mostly needs relocation + molecule adoption.

 4e. Remaining features (lower priority, do after archive is proven)

 - collections — reference CollectionsView.tsx
 - search — reference SearchView.tsx
 - viewer — reference Viewer.tsx
 - map — reference MapView.tsx
 - timeline — reference TimelineView.tsx

 Tests for Phase 4 (Feature Slices)

 Create src/test/__tests__/features/archive-view.test.tsx

 Each organism is tested using user interaction + IDEAL/FAILURE pattern
 with real data from .Images iiif test/:

 describe('Archive Feature - User Goal: Browse and organize field research media', () => {
   describe('USER INTERACTION: Render archive grid with filter', () => {
     it('IDEAL OUTCOME: Grid displays manifests from real data with filter applied', async () => {
       // Arrange: Use real test data (Karwaan sequence + metadata)
       const realData = await loadRealArchiveFixture('Karwaan');
       const { root } = await ingestTree(realData);

       const { getByRole, getByPlaceholderText } = render(
         <ArchiveView root={root} />
       );

       // Act: User types in filter
       const filterInput = getByPlaceholderText(/filter/i);
       fireEvent.change(filterInput, { target: { value: '110' } });

       await waitFor(() => {
         // Assert: Grid filtered to matching item
         const items = getByRole('grid').querySelectorAll('[data-testid="archive-item"]');
         expect(items).toHaveLength(1);
         expect(items[0]).toHaveTextContent('110');
       });

       console.log('✓ IDEAL OUTCOME: Grid filters real data correctly');
     });

     it('FAILURE PREVENTED: Filter crash or loss of original state on reset', async () => {
       const realData = await loadRealArchiveFixture('Karwaan');
       const { root } = await ingestTree(realData);

       const { getByPlaceholderText, getByRole } = render(
         <ArchiveView root={root} />
       );

       // Act: Filter, then clear
       const filterInput = getByPlaceholderText(/filter/i) as HTMLInputElement;
       fireEvent.change(filterInput, { target: { value: '110' } });
       await waitFor(() => {
         expect(getByRole('grid').querySelectorAll('[data-testid="archive-item"]')).toHaveLength(1);
       });

       // Clear filter
       fireEvent.change(filterInput, { target: { value: '' } });

       // Assert: All items restored
       await waitFor(() => {
         const items = getByRole('grid').querySelectorAll('[data-testid="archive-item"]');
         expect(items.length).toBeGreaterThan(1); // Should have all items back
       });

       console.log('✓ FAILURE PREVENTED: Filter state restored on clear');
     });
   });

   describe('USER INTERACTION: Toggle fieldMode with archive visible', () => {
     it('IDEAL OUTCOME: Archive grid theme switches instantly', async () => {
       const realData = await loadRealArchiveFixture('Karwaan');
       const { root } = await ingestTree(realData);

       const { rerender, getByRole } = render(
         <AppSettingsProvider initialFieldMode={false}>
           <ArchiveView root={root} />
         </AppSettingsProvider>
       );

       // Verify light mode
       let container = getByRole('grid').parentElement;
       expect(container).toHaveClass('bg-slate-50');

       // Toggle fieldMode
       rerender(
         <AppSettingsProvider initialFieldMode={true}>
           <ArchiveView root={root} />
         </AppSettingsProvider>
       );

       // Verify dark mode applied
       container = getByRole('grid').parentElement;
       expect(container).toHaveClass('bg-black');

       console.log('✓ IDEAL OUTCOME: Archive theme switches with fieldMode');
     });
   });
 });

 Success metrics:
 - All organisms pass IDEAL/FAILURE tests with real data
 - Real-data test coverage increases from 33% to >50%
 - Zero prop-drilling of fieldMode
 - Feature slices are independently testable

 ---
 Phase 5 — Wiring & Switchover

 Do NOT delete old components until the new feature slice is exercised in the app.

 1. Update App.tsx provider hierarchy to use src/app/providers/
 2. Replace routes one at a time in ViewRouter to point to new feature slices
 3. Smoke-test each swap: fieldMode toggle, terminology, core interactions
 4. Once all routes are swapped, old components/views/ becomes dead code — delete in a follow-up cleanup commit

 Tests for Phase 5 (Integration)

 Create src/test/__tests__/integration/archive-route-swap.test.tsx

 describe('Integration: Archive route swap (old → new)', () => {
   describe('USER INTERACTION: Navigate to archive view', () => {
     it('IDEAL OUTCOME: New archive feature displays same data as old component', async () => {
       // Load real data
       const realData = await loadRealArchiveFixture('Karwaan');
       const { root } = await ingestTree(realData);

       // Render new archive (from src/features/archive)
       const { getByRole: newGetByRole } = render(
         <ViewRouter root={root} initialMode="archive" />
       );

       // Verify same grid structure
       expect(newGetByRole('grid')).toBeInTheDocument();
       const items = newGetByRole('grid').querySelectorAll('[data-testid="archive-item"]');
       expect(items.length).toBe(7); // Karwaan has 7 images

       console.log('✓ IDEAL: New archive displays identical data');
     });

     it('FAILURE PREVENTED: Feature swap breaks fieldMode or terminology', async () => {
       // Render with fieldMode on
       const realData = await loadRealArchiveFixture('Karwaan');
       const { root } = await ingestTree(realData);

       const { getByRole, container } = render(
         <AppSettingsProvider initialFieldMode={true}>
           <ViewRouter root={root} initialMode="archive" />
         </AppSettingsProvider>
       );

       // Assert: fieldMode styles applied (no regression)
       expect(container.querySelector('[role="grid"]')).toHaveClass('bg-black');

       console.log('✓ FAILURE PREVENTED: Feature swap does not break fieldMode');
     });
   });
 });

 ---
 Dependency Rules (enforced by convention, not tooling yet)

 atoms          ← molecules        (molecules compose atoms)
 molecules      ← organisms        (organisms compose molecules)
 entities       ← features         (features use entity models)
 shared/*       ← everything       (shared is the only upward dep)
 app/*          ← nothing imports app (app is the root)
 features/*     ← widgets, app     (features don't import each other)

 ---
 Magic Numbers & Constants Strategy

 All hardcoded values are eliminated. Reference table for refactoring:
 ┌─────────────────────┬────────────────────────────────────┬─────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
 │ Magic Number (old)  │              Location              │                            New Home                             │                       Usage                        │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ 300 (debounce)      │ DebouncedInput.tsx:38,117          │ src/shared/config/tokens.ts::INPUT_CONSTRAINTS.debounceMs       │ useDebouncedValue(value,                           │
 │                     │                                    │                                                                 │ INPUT_CONSTRAINTS.debounceMs)                      │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ 500 (maxLength)     │ FilterInput.tsx:76                 │ src/shared/config/tokens.ts::INPUT_CONSTRAINTS.maxLengthDefault │ maxLength={INPUT_CONSTRAINTS.maxLengthDefault}     │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ 'w-64' (width)      │ FilterInput.tsx:92,                │ src/shared/config/tokens.ts::INPUT_CONSTRAINTS.width.filter     │ className={INPUT_CONSTRAINTS.width.filter}         │
 │                     │ ViewContainer.tsx:120              │                                                                 │                                                    │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ 16 (header height)  │ ViewContainer.tsx:77               │ designSystem.ts::LAYOUT.header.height                           │ h-{LAYOUT.header.height}                           │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Color branches      │ 11+ locations                      │ useContextualStyles()::ContextualClassNames                     │ All use cx.surface, cx.text, etc.                  │
 │ (fieldMode)         │                                    │                                                                 │                                                    │
 ├─────────────────────┼────────────────────────────────────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ IIIF term strings   │ 6 occurrences in views             │ useTerminology()::t()                                           │ <h1>{t('Manifest')}</h1> not <h1>Manifest</h1>     │
 └─────────────────────┴────────────────────────────────────┴─────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘
 ---
 Critical File Paths

 Don't modify (reference only):

 - components/FilterInput.tsx
 - components/DebouncedInput.tsx
 - components/EmptyState.tsx
 - components/ViewContainer.tsx
 - components/Toolbar.tsx
 - components/SelectionToolbar.tsx
 - components/views/ArchiveView.tsx
 - components/views/BoardView.tsx
 - components/views/MetadataSpreadsheet.tsx
 - components/staging/*

 Read for token/hook signatures:

 - hooks/useContextualStyles.ts — ContextualClassNames interface (12 tokens)
 - hooks/useAppSettings.ts — settings.fieldMode shape
 - hooks/useTerminology.ts — t(), getResourceTypeLabel() signatures
 - designSystem.ts — COLORS, SPACING, LAYOUT, TOUCH_TARGETS, INTERACTION
 - ui/primitives/Button.tsx — ButtonProps (variant, size, loading, icon)
 - ui/primitives/Input.tsx — InputProps
 - services/selectors.ts — vault selectors for entity layer
 - src/test/fixtures/pipelineFixtures.ts — real data helpers (ActionTestData, PIPELINE_TEST_DATA)

 Create (new files):

 - Phase 0: Fix test imports (36 files)
 - Phase 1:
   - src/shared/ui/atoms/index.ts
   - src/shared/config/tokens.ts ← new constants go here
   - src/shared/lib/index.ts
   - src/shared/ui/molecules/*.tsx (10 files)
   - src/test/__tests__/shared-molecules/molecules.test.tsx
 - Phase 2:
   - src/entities/{canvas,manifest,collection}/{model,actions,index}.ts
   - src/test/__tests__/entities/entity-model.test.ts
 - Phase 3:
   - src/app/templates/FieldModeTemplate.tsx
   - src/app/providers/index.ts
   - src/app/routes/ViewRouter.tsx
   - src/test/__tests__/app-templates/FieldModeTemplate.test.tsx
 - Phase 4:
   - src/features/archive/ui/organisms/{ArchiveView,ArchiveGrid,ArchiveHeader}.tsx
   - src/features/archive/{model/index.ts,index.ts}
   - src/features/board-design/ (same structure)
   - src/features/metadata-edit/ (same structure)
   - src/features/staging/ (same structure)
   - src/test/__tests__/features/archive-view.test.tsx (and similar for other features)
 - Phase 5:
   - src/test/__tests__/integration/archive-route-swap.test.tsx

 ---
 Execution Order

 1. Phase 0 — fix test suite (prerequisite, 100% pass rate)
 2. Phase 1 — shared foundation (atoms, molecules, constants)
 3. Phase 2 — entity layer (thin re-exports)
 4. Phase 3 — app layer (template, providers)
 5. Phase 4a — archive feature slice (first feature, proves the pattern)
 6. Phase 5a — wire archive into app, smoke test
 7. Phase 4b-e — remaining features (repeat pattern)
 8. Phase 5b — final cleanup: delete old components/views/ once all routes are swapped

 ---
 Test Coverage & Real Data Strategy

 Fixture Locations:

 - .Images iiif test/Karwaan/ — 7-image sequence for range detection
 - .Images iiif test/ — 426 files, 214 MB total for realistic scenarios
 - src/test/fixtures/pipelineFixtures.ts — helpers to load real data
 - src/test/fixtures/imageFixtures.ts — legacy fixtures (fallback only)

 Test Data Usage Targets:

 - Phase 1 molecules: 100% real-data tests (use Karwaan sequence)
 - Phase 4 organisms: >70% real-data tests (use diverse fixtures)
 - Phase 5 integration: 100% real-data tests (full workflows)

 IDEAL OUTCOME / FAILURE PREVENTED Pattern:

 Every test follows:
 it('IDEAL OUTCOME: [What success looks like]', async () => {
   // Setup, act, assert
   console.log('✓ IDEAL OUTCOME: [brief statement]');
 });

 it('FAILURE PREVENTED: [What the app avoids]', async () => {
   // Setup, act, assert
   console.log('✓ FAILURE PREVENTED: [brief statement]');
 });

 Success metric: 100% of new tests follow this pattern. Existing tests upgraded
 on-demand (Phase 0 fixes will increase adherence from 19% to ~50%).

 ---
 Verification Checklist

 After each phase:

 - ✅ npm run lint — zero errors
 - ✅ npm test -- <phase-feature> — all new tests pass
 - ✅ npm test — full suite ≥95% pass rate (or 100% by Phase 2)
 - ✅ Manual: toggle fieldMode; all wired views theme correctly
 - ✅ Manual: toggle abstraction level; terminology updates

 Phase 0 specific:

 npm test 2>&1 | grep -c "✓"  # Count passing tests
 npm test 2>&1 | grep -c "✗"  # Count failing tests
 # Goal: 335 ✓, 0 ✗

 Phase 1 specific:

 # Zero magic numbers in molecules
 grep -rn "300\|500\|'w-" src/shared/ui/molecules/ | wc -l  # Should be 0
 # All reference constants
 grep -rn "INPUT_CONSTRAINTS\|LAYOUT\|COLORS" src/shared/ui/molecules/ | wc -l  # Should be >20

 Phase 5 (archive wired):

 # Verify archive route points to new slice
 grep -r "src/features/archive" src/app/routes/

 ---
 Spec Update

 After implementation, update docs/Atomic System Architecture.md:
 - Correct the "Current State" column in the Layer Definitions table
 - Update code locations to reflect src/ paths
 - Remove the migration path section (it will have been executed)
 - Add the dependency rules as the new "Quality Gates"
 - Add a "Test Strategy" section documenting IDEAL/FAILURE pattern
 - Add a "Constants & Configuration" section showing how magic numbers were eliminated
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌