# field-studio Reconstruction Prompts

Prompt set for Claude Code sessions applying Singer's shaping methodology to reconstruct field-studio, with Mulch for expertise accumulation across sessions.

---

## Execution Map

```
PHASE 0  Setup                          ── ✅ DONE
PHASE 1  Reverse-breadboard             ── ✅ DONE
PHASE 2  Extract requirements           ── ✅ DONE
PHASE 3  Spike unknowns                 ── ✅ DONE (9 spikes, all resolved)
PHASE 4  Shape solutions + fit-check    ── ✅ DONE (+ 2 adversarial rounds, gap spike, LOC eval)
PHASE 5  Breadboard + slice             ── ✅ DONE
PHASE 6  Build slices                   ── 🔨 IN PROGRESS — Track 1 ✅, Track 2 V1 ✅ V2 ✅, V3 next
PHASE 7  Cleanup (dead code)            ── ⚠️ PARTIAL (7a done, 7b scoped down, 7c folded into V6)
PHASE 8  Merge + verify                 ── sequential, one session
```

Phases 0–5 are complete. Phase 6 is in progress. Track 1 (V5+V6) is done and merged. Track 2 V1 and V2 are done and merged; V3 is next. Track 3 (V4, V7) is unblocked (V1 gate cleared). Phase 7 is partially done (7a complete, remaining work scoped down). Phase 8 is the final merge and verify.

**Revised build sequence (from adversarial evaluation):**
```
Track 1 (Day 1 quick wins): B5(3h) + B6(5h)     ← ✅ DONE, merged to main
Track 2 (critical path):    B1(6-8h) → B2(6-8h) → B3(23-28h, phased per-view)
                             ✅ DONE    ✅ DONE    ⬅️ NEXT
Track 3 (after B1):         B4(8-10h) ∥ B7(16-20h)  ← UNBLOCKED (V1 merged)
Total: 66-83h, net -1460 LOC
```

---

## Mulch Domain Setup

Run once before anything else. This is not a prompt for Claude Code — it is shell commands you run yourself.

```bash
cd field-studio
mulch init
mulch add vault        # state management, mutations, normalization
mulch add persistence  # IndexedDB, auto-save, storage service
mulch add imaging      # SW, IIIF, tiles, image pipeline
mulch add ui           # Svelte components, reactivity, views
mulch add migration    # React→Svelte debt, dead code, type unification
mulch add shaping      # Rs, shapes, breadboards, slices, fit-checks
```

---

## PHASE 0 — Seed Expertise from Fragility Analysis

**Mode:** Sequential, single session
**Why first:** Every subsequent session starts with `mulch prime` to load context. Seeding the domains means no agent starts from zero.

### Prompt 0

```
Read the fragility analysis at docs/fragility-analysis-field-studio.md.

For each finding, record it into the appropriate mulch domain. Use these
mappings:

  vault domain:
  - Dual mutation paths (vault.update vs vault.dispatch) → type: failure
  - Undo/redo desync (HistoryStore vs ActionHistory) → type: failure
  - $state.raw destructuring breaks reactivity → type: convention
  - vault.getEntity returns stripped normalized form for canvases → type: pattern
  - Extension round-trip orphaning during updates → type: failure

  persistence domain:
  - Silent .catch(() => {}) on all storage writes → type: failure
  - Auto-save marks "saved" even when IndexedDB write fails → type: failure
  - No quota monitoring or threshold dialog trigger → type: failure
  - loadProject returns null on corrupt blob with no recovery UI → type: failure
  - No beforeunload handler to force save on tab close → type: failure

  imaging domain:
  - SW TILE_REQUEST has no main-thread listener → type: failure
  - Two separate IndexedDB databases (biiif-archive-db vs field-studio-tiles) → type: decision
  - IngestWorkerPool throws "not yet implemented" → type: failure
  - IIIF Image API path works via direct IDB, tile path is severed → type: pattern
  - OPFS fallback has 1s timeout race → type: convention

  ui domain:
  - 200ms debounced vault.export() triggers full denormalization per edit → type: failure
  - root prop cascades re-renders across all views → type: pattern
  - 9 $effect blocks in App.svelte with overlapping reactive deps → type: pattern
  - Annotation context save/clear fns become stale closures on view switch → type: failure
  - Board feature: 13 @migration stubs, save does nothing → type: failure

  migration domain:
  - 5 incompatible ValidationIssue type definitions → type: failure
  - React primitives (Button, Card, Icon, Input) still compiled → type: failure
  - react-i18next in dep tree but Svelte app uses own i18n → type: failure
  - _archived/ has 156K lines inflating bundle → type: failure

Use --classification foundational for all of these. They represent the
structural baseline every future session needs to know.

After recording, run `mulch prime` and paste the output so I can verify
the domains are populated correctly.
```

---

## PHASE 1 — Reverse-Breadboard the Existing System

**Mode:** Sequential, single session (expect this to be long)
**Input:** The codebase + mulch expertise
**Output:** `docs/shaping.md` with reverse-breadboard tables

### Prompt 1

```
Run `mulch prime` to load project expertise.

We are applying Ryan Singer's shaping methodology to reconstruct this
codebase. The first step is to reverse-breadboard what actually exists
today — not what the code claims to do, but what is actually wired.

Create docs/shaping.md with frontmatter `shaping: true`.

Reverse-breadboard the following subsystems. For each, produce an
affordance table with columns: ID | Type (UI/Code) | Place | Name |
Wires Out | Returns To. Mark any severed wires (wires-out pointing to
nonexistent affordances) with ⛓️‍💥. Mark stubs with ⚠️.

Subsystem 1: Vault Mutation Circuit
  Trace both paths: vault.update() and vault.dispatch(). Show where they
  enter, what they call, how they reach the normalized state, and where
  they notify subscribers. Show the history recording path (or lack of it).
  Start from: Inspector metadata edit, Viewer annotation creation.

Subsystem 2: Persistence Circuit
  Trace from autoSave.markDirty() through the debounce, through the
  $effect that watches dirty, through vault.export(), through
  storage.saveProject(), into IndexedDB. Show where errors are caught
  and swallowed. Show the load path from storage.loadProject() back
  to vault.load().

Subsystem 3: Image Serving Circuit
  Trace from a canvas requesting an image URL through imageSourceResolver,
  through the Service Worker fetch handler, through the IIIF Image API
  path (direct IDB) and the tile path (message-passing bridge). Show the
  severed TILE_REQUEST wire. Show the two separate IndexedDB databases.

Subsystem 4: Undo/Redo Circuit
  Trace from Ctrl+Z through handleUndo, through HistoryStore.undo(),
  through vault.load(prev). Show which mutation paths push to history
  and which don't. Show the unused ActionHistory system.

Subsystem 5: View Rendering Circuit
  Trace from vault state change → 200ms export debounce → root prop
  update → ViewRouter → individual views. Show which views guard for
  null root and which don't.

After the tables, add a Mermaid diagram for each subsystem showing the
wiring. Use `---` dashed lines for severed or stub wires.

Record any new findings to mulch as you go. At the end, record a
`guide` type entry in the shaping domain summarizing what you produced.
```

---

## PHASE 2 — Extract Requirements and First Shape

**Mode:** Sequential, single session
**Input:** `docs/shaping.md` from Phase 1
**Output:** Requirements table (R0–Rn), Shape A with parts, fit-check matrix

### Prompt 2

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md (the reverse breadboard). Now we separate problem
from solution.

STEP 1 — REQUIREMENTS (R)
Add a Requirements section to docs/shaping.md. Extract requirements
that are solution-independent — they should hold regardless of whether
we keep Svelte 5, switch frameworks, or rewrite from scratch. Number
them R0, R1, R2...

Start from these (refine as you see fit from the breadboard evidence):
  - R0: Single coordinated mutation path. No mutation can silently
    overwrite an in-flight mutation.
  - R1: All user-initiated state changes must be undoable.
  - R2: Persistence failures must be surfaced to the user. No silent
    data loss.
  - R3: Images must be servable as IIIF Image API 3.0 without depending
    on cross-context message passing.
  - R4: One canonical type per shared concept (ValidationIssue, IIIFItem, etc).
  - R5: Spatial state (boards) must persist across sessions.
  - R6: Editing one entity must not trigger full-tree reconstruction.
  - R7: File ingest must not block the main thread.
  - R8: Tab/browser close must not lose unsaved work.

Add any Rs you discover from the breadboard that I've missed. Flag
requirements that might actually belong in the solution shape (like
Singer's R6-R10 in his example).

STEP 2 — SHAPE A (current system, annotated)
Add Shape A representing the current codebase. List parts A1..An
corresponding to the existing subsystems. For each part, note:
  - What it does today
  - Which Rs it satisfies (✅), partially satisfies (🟡), or fails (❌)
  - Any unknowns (⚠️)

STEP 3 — FIT CHECK (R × A)
Produce the fit-check matrix: rows are R0..Rn, columns are A1..An.
Each cell is ✅/🟡/❌/⚠️.

Then rotate it: A × R. Add commentary at the bottom identifying the
highest-priority gaps — which parts of A fail the most Rs, and which
Rs have no passing parts.

STEP 4 — UNKNOWNS
List things we need to spike before we can shape a reconstruction. I
expect at least:
  - Can vault.dispatch() absorb vault.update() without breaking the
    existing call sites? (affects R0)
  - Can the SW serve tiles directly from IDB without the message bridge?
    (affects R3)
  - What is the actual memory cost of HistoryStore's JSON.stringify
    comparison on a real 500-canvas manifest? (affects R1, R6)
  - Can we remove the 200ms export debounce and pass normalized state
    directly to views? (affects R6)

Record a decision to the shaping domain documenting the Rs we chose
and why.
```

---

## PHASE 3 — Spike Unknowns

**Mode:** PARALLEL — one agent per spike, separate worktrees
**Input:** Unknowns list from Phase 2
**Output:** `docs/spike-*.md` files with findings

Each spike agent should begin with `mulch prime` and end with `mulch record`.

### Prompt 3a — Spike: Vault Mutation Unification

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md, specifically the unknowns section and the vault
mutation breadboard.

Spike the question: Can vault.dispatch() absorb vault.update() as the
single mutation path?

Write findings to docs/spike-vault-unification.md. Structure:
  1. Context (what we're trying to answer)
  2. Questions (numbered)
  3. Findings (with code evidence)
  4. Recommendation (Shape B option for vault mutations)

Investigate:
  - How many call sites use vault.update() vs vault.dispatch()? List them.
  - What does vault.update() do that dispatch doesn't? (validation,
    type checking, direct entity merge)
  - Can we create action types for every current vault.update() use case
    (UPDATE_METADATA, UPDATE_LABEL, etc)?
  - What is the performance difference? vault.update() is O(1) merge,
    dispatch snapshots full state + runs reducer.
  - Alternative: vault.update() internally creates+dispatches an action.
    What would that look like?

Record findings to mulch vault domain as type: decision.
```

### Prompt 3b — Spike: Direct Tile Serving

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md, specifically the imaging breadboard and the severed
TILE_REQUEST wire.

Spike the question: Can the Service Worker serve tiles directly from
IndexedDB without the main-thread message bridge?

Write findings to docs/spike-tile-serving.md. Structure as above.

Investigate:
  - The SW already accesses biiif-archive-db directly via getFromIDB()
    for the IIIF Image API path. Why was the tile path designed differently?
  - The tile pipeline stores tiles in field-studio-tiles database. Can the
    SW open this database directly?
  - Is there a reason tiles went through message passing? (Possibly the
    original design intended main-thread tile generation on demand?)
  - What if we drop the tile pyramid entirely and serve all images through
    the IIIF Image API path with on-demand downscaling via OffscreenCanvas?
  - What is the performance cost of on-demand vs pre-generated tiles for
    a 5000×4000px field photograph?

Record findings to mulch imaging domain as type: decision.
```

### Prompt 3c — Spike: History Store Memory Cost

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md, specifically the undo/redo breadboard.

Spike the question: What is the actual memory and CPU cost of
HistoryStore's current approach on realistic data?

Write findings to docs/spike-history-cost.md.

Investigate:
  - Create a synthetic 500-canvas manifest (representative of a field
    research project). Measure JSON.stringify time and output size.
  - Multiply by maxHistory (50) to estimate peak memory for undo stack.
  - Measure: how long does a single history.update() take including the
    JSON.stringify equality check?
  - Compare alternatives:
    a) Immer patches (structural sharing, only store diffs)
    b) JSON Patch (RFC 6902) generation via fast-json-patch
    c) Normalized state snapshots (store NormalizedState instead of
       denormalized tree — much smaller per snapshot)
  - For each alternative, estimate: memory per undo entry, comparison
    cost, undo/redo application cost.

Actually run the benchmarks. Write a script at scripts/bench-history.ts,
execute it, include the numbers in the spike doc.

Record findings to mulch vault domain as type: pattern with the benchmark
numbers in the description.
```

### Prompt 3d — Spike: Eliminating the Export Cascade

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md, specifically the view rendering breadboard and the
200ms export debounce.

Spike the question: Can views consume normalized state directly instead
of receiving a denormalized root prop?

Write findings to docs/spike-export-cascade.md.

Investigate:
  - Which views actually use root as a nested tree vs which just pass it
    through or extract a single entity?
  - For each view (ArchiveView, MetadataView, MapView, TimelineView,
    BoardView, ViewerView), list exactly which properties of root they
    access and whether those could come from vault.getEntity(id) instead.
  - The Inspector already uses vault.getEntity(selectedId). Could all
    views follow this pattern?
  - What about views that need the tree structure (ArchiveView showing
    collection→manifest→canvas hierarchy)? Could they use
    vault.getReferences(id) to walk the tree on demand?
  - What about export/download? That legitimately needs the full
    denormalized tree. Can vault.export() be called only on explicit
    user action (File → Export) instead of on every mutation?
  - What breaks if we remove root as a prop entirely?

Record findings to mulch ui domain as type: decision.
```

---

## PHASE 4 — Shape the Reconstruction

**Mode:** Sequential, single session
**Input:** Spike findings (docs/spike-*.md), updated shaping.md
**Output:** Shape B (reconstruction plan) with fit-check

### Prompt 4

```
Run `mulch prime` to load project expertise.

Read all spike documents: docs/spike-vault-unification.md,
docs/spike-tile-serving.md, docs/spike-history-cost.md,
docs/spike-export-cascade.md.

Now shape the reconstruction. Add Shape B to docs/shaping.md. Shape B
represents the reconstructed system — the target architecture.

For each part of Shape B, reference the spike findings that inform it.
Flag any remaining unknowns with ⚠️.

I expect Shape B to have roughly these parts (adjust based on spikes):

  B1: Unified vault mutation via dispatch
      All mutations → action → reducer → state update → subscriber notify.
      vault.update() becomes a thin wrapper that creates+dispatches an action.
      Every dispatch records undo patches to ActionHistory.

  B2: Patch-based undo/redo
      Replace HistoryStore's full-tree cloning with JSON patches (or
      whatever the spike recommended). Undo = apply reverse patch to
      normalized state. No vault.load() roundtrip.

  B3: Normalized state to views
      Remove root prop. Views consume vault.getEntity(id) and
      vault.getReferences(id). vault.export() only called for
      File → Export and persistence.

  B4: Explicit error propagation in persistence
      storage.saveProject() returns success/failure. Auto-save surfaces
      failures as toast. beforeunload forces synchronous save attempt.
      Quota monitoring triggers warning dialog at 80%.

  B5: Direct IDB tile serving (or unified IIIF path)
      Based on spike findings — either SW reads tile DB directly, or we
      drop the tile pyramid and serve everything via IIIF Image API with
      on-demand scaling.

  B6: Single ValidationIssue type + connected validator
      One type definition in shared/types. Validator wired to vault state
      changes. QC Dashboard and StatusBar consume real issues.

  B7: Board persistence via vault actions
      CREATE_BOARD, UPDATE_BOARD_ITEM, REMOVE_BOARD_ITEM actions wired
      through the unified dispatch path. Board state persists in
      normalized store → auto-save → IndexedDB.

After defining parts, produce:
  - Fit check: R × B (should be mostly ✅ now)
  - Any remaining ❌ or ⚠️ cells indicate more shaping needed
  - Commentary on what Shape B trades off vs Shape A

Record a decision to shaping domain with the Shape B rationale.
```

---

## PHASE 5 — Breadboard and Slice

**Mode:** Sequential, single session
**Input:** Shape B in docs/shaping.md
**Output:** Breadboard tables + Mermaid, vertical slices

### Prompt 5

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md — the full document including Shape B (B1-B7),
all spike findings, adversarial evaluation, gap spike deep-dive, and
LOC impact evaluation.

STEP 1 — BREADBOARD
Breadboard Shape B. Produce affordance tables for the reconstructed
system. Format: ID | Type (UI/Code) | Place | Name | Wires Out |
Returns To.

Places should include: Inspector, Viewer, ArchiveView, BoardView,
VaultStore, ActionReducer, ActionHistory, StorageService, AutoSave,
ServiceWorker, Validator.

Note: "HistoryManager" from the original plan is replaced by
ActionHistory (the revived patch-based undo system in
actions/index.ts:84-249). The external HistoryStore is eliminated
by B1.

Every UI affordance (button, field, gesture) must wire to at least one
code affordance. Every code affordance must wire to either another code
affordance or a data store. No dangling wires.

Generate a Mermaid diagram showing the full circuit.

Compare to the Phase 1 reverse-breadboard (Subsystems 1-5 in
shaping.md). Explicitly list:
  - Wires that existed in A and are preserved in B
  - Wires that existed in A and are removed in B (with justification)
  - New wires in B that didn't exist in A
  - Severed wires from A that are now connected in B

STEP 2 — SLICE
Slice the breadboard into vertical scopes organized by the revised
build sequence (3 parallel tracks, not 7 linear slices). Each slice
must be:
  - Demoable (has UI that a person can interact with to verify)
  - Independent within its track
  - Bounded (a single Claude Code agent can build it in one session)

Build tracks:

  Track 1 — Day 1 Quick Wins (independent, ship immediately):

    V5: Delete broken tile pipeline
        Demo: Import 10 images. Open in viewer. Deep zoom works.
        No 10-second timeouts in network tab. Verify /tiles/ routes
        to IIIF Image API handler.

    V6: Unify ValidationIssue types + wire validator
        Demo: Open QC Dashboard. See real validation issues for a
        manifest with missing labels or invalid metadata. TypeScript
        exhaustive switch on issue.kind works.

  Track 2 — Critical Path (serial: V1 → V2 → V3):

    V1: Unified vault mutation + eliminate dual undo stacks
        Demo: Edit metadata in Inspector, create annotation in Viewer,
        both go through dispatch. External HistoryStore eliminated.
        vault.load() pushes RELOAD_TREE to ActionHistory. 10 bypass
        methods deleted from VaultStore.

    V2: Patch-based undo/redo via revived ActionHistory
        Demo: Edit 10 fields, Ctrl+Z 10 times, all 10 revert. Create
        annotation, Ctrl+Z, annotation removed. Memory stays flat.
        Entity-level patches (not full-state clones).

    V3: Views consume normalized state (phased per-view)
        Demo: Edit 50 metadata fields rapidly. No lag. DevTools shows
        no vault.export() call between edits. Root prop removed from
        ViewRouter.

  Track 3 — After V1 (parallel with Track 2):

    V4: Persistence error propagation + tab-close safety
        Demo: Simulate IndexedDB failure → toast appears. Close tab →
        beforeunload fires + visibilitychange flushes. Reopen → dirty
        flag detected, recovery prompt shown.

    V7: Board persistence via vault actions
        Demo: Open board. Arrange 5 items with connections. Close
        board. Reopen. Items and connections are where you left them.
        Grid/snap settings survive via BoardWorkspaceState.

For each slice, list the affordance IDs from the breadboard that are
included. Note any stub wires to later slices.

Record the slicing decisions to shaping domain as type: guide.
```

---

## PHASE 6 — Build Slices

**Mode:** PARALLEL — 3 tracks, separate git worktrees
**Input:** docs/shaping.md (breadboard + slice definitions from Phase 5)
**Output:** Working code on feature branches

Each agent gets the same preamble, then its slice-specific instructions. Every agent must begin with `mulch prime` and end with `mulch record`.

**Track execution order:**
```
Track 1 (Day 1):  V5 + V6              ← ✅ DONE, merged to main
Track 2 (serial): V1 → V2 → V3         ← V1 ✅ DONE, V2 ✅ DONE, V3 ⬅️ NEXT
Track 3 (after V1 merges): V4 ∥ V7     ← UNBLOCKED (V1 merged)
```

### Prompt 6-preamble (shared across all slice agents)

```
Run `mulch prime` to load project expertise.

Read docs/shaping.md — focus on the breadboard tables, your assigned
slice definition, the fit-check matrix, the adversarial evaluation,
the gap spike deep-dive, and the LOC impact evaluation.

Rules for this build session:
  1. Only touch code within your slice's affordance scope. If you need
     to modify shared code (VaultStore, types, etc), make the minimum
     change and note it for the merge agent.
  2. Stub wires to later slices with TODO comments referencing the
     slice ID (e.g. // TODO(V5): wire tile serving here).
  3. Write at least one integration test that exercises the demo
     described in the slice definition.
  4. Run the existing test suite before and after. Do not break tests
     outside your slice.
  5. Consult the verified dead code inventory in shaping.md (LOC
     Impact Evaluation section) — if dead code falls within your
     slice's scope, delete it as part of the slice.
  6. Before finishing, record to mulch:
     - Any conventions you established (type: convention)
     - Any patterns you applied (type: pattern)
     - Any failures you hit and resolved (type: failure)
     - Any decisions you made that affect other slices (type: decision)
```

---

### Track 1 — Day 1 Quick Wins ✅ DONE

### ~~Prompt 6.V5 — Build: Delete Broken Tile Pipeline~~ ✅ DONE (merged to main)

```
[preamble]

Your slice: V5 — Unified IIIF image serving (pure deletion).

Affordances in scope: IM-8 (new redirect). Deletes Phase A's IM-6A,
IM-7A, IM-11A, IM-12A, IM-13A, IM-16A.

This is the highest-ROI slice: ~720 lines deleted, ~5 lines added.
The spike (docs/spike-tile-serving.md) resolved this definitively:
the tile pipeline is dead code with zero consumers.

Implementation plan:
  1. Delete src/features/viewer/model/tilePipeline.ts (543 lines).
     Verify zero imports point to it.
  2. Delete src/features/viewer/model/tileWorker.ts (22 lines).
     Verify zero imports.
  3. In public/sw.js:
     - Remove the /tiles/ path handler and TILE_REQUEST/TILE_RESPONSE
       message passing bridge (~150 lines)
     - Remove pendingTileRequests map
     - Add a 5-line route that redirects /tiles/{assetId}/... to the
       existing /iiif/image/{assetId}/... handler
  4. Remove the field-studio-tiles IDB schema from sw.js (the database
     was never written to — TILE_GENERATION_ENABLED=false).
  5. Optional cleanup: add a one-time deleteDatabase('field-studio-tiles')
     call in storage.ts to clean up existing installations (~5 lines).

Demo test: Import 5 images of varying sizes. Open each in viewer. Pan
and zoom. No broken tiles, no timeouts in network tab. Verify the IIIF
Image API path serves all requests.

Run all tests. Run the app to verify the demo works.
```

### ~~Prompt 6.V6 — Build: Validation Type Unification + Wire Validator~~ ✅ DONE (merged to main)

```
[preamble]

Your slice: V6 — Single ValidationIssue type + connected validator.

Affordances in scope: VA-1, VA-2, VA-3, VA-4, VA-5, VA-6 (entire
validation circuit).

The gap spike resolved the type design: use a discriminated union with
kind: 'tree' | 'field' to distinguish tree-level (validator) from
field-level (inspector) issues. Do NOT use a flat superset type.

Implementation plan:
  1. Define the discriminated union in src/shared/types/:

       interface ValidationIssueBase {
         id: string;
         severity: IssueSeverity;
         category?: IssueCategory;
       }

       interface TreeValidationIssue extends ValidationIssueBase {
         kind: 'tree';
         itemId: string;
         itemLabel: string;
         message: string;
         fixable: boolean;
       }

       interface FieldValidationIssue extends ValidationIssueBase {
         kind: 'field';
         field?: string;
         title: string;
         description: string;
         autoFixable: boolean;
         fixSuggestion?: string;
         currentValue?: unknown;
       }

       type ValidationIssue = TreeValidationIssue | FieldValidationIssue;

  2. Delete InspectorIssue (shared/types/index.ts:148-157) and
     StatusBarValidationIssue (StatusBar.svelte). Redirect all 4
     re-export paths to the single source.
  3. Add kind: 'tree' to all ValidatorIssue creation sites. Add
     kind: 'field' to all InspectorIssue creation sites. Rename
     level → severity across consumers.
  4. Delete the statusBarIssues passthrough alias in App.svelte:237
     (confirmed zero-value: $derived.by(() => flatValidationIssues)).
     Replace with flatValidationIssues directly.
  5. Remove all `as any` casts on validation issue maps.
  6. Wire the actual validator into validation.scheduleValidation():
     replace stub with call to validateTree(state) returning real
     issues.
  7. Also handle Phase 7c type unification work (originally a separate
     prompt): audit src/shared/types/ for duplicate type definitions
     beyond ValidationIssue. Redirect imports to canonical sources.

Demo test: Create a manifest with canvases missing labels. Open QC
Dashboard → see TreeValidationIssues. Open Inspector → see
FieldValidationIssues. TypeScript exhaustive switch on issue.kind
compiles correctly.

Run all tests. Run the app to verify the demo works.
```

---

### Track 2 — Critical Path

### ~~Prompt 6.V1 — Build: Unified Vault Mutation + Eliminate Dual Undo Stacks~~ ✅ DONE (merged to main)

```
[preamble]

Your slice: V1 — Unified vault mutation via dispatch.

Affordances in scope: MC-1..MC-14 (mutation circuit), UR-1, UR-2
(undo/redo entry). Deletes Phase A's VM-2A, VM-5A, VM-8A, VM-13A,
UR-2A, UR-5A, UR-6A.

This is the foundational slice. Everything in Tracks 2 and 3 depends
on it. The adversarial evaluation and gap spike identified this as
CRITICAL: the codebase has 12 public mutation methods on VaultStore,
only dispatch() goes through the reducer. There are also dual undo
stacks (external HistoryStore + ActionHistory) that can diverge.

Read these before implementing:
  - docs/shaping.md: Gap 1 (vault.load — 12 bypass methods + dual undo)
  - docs/spike-vault-unification.md
  - src/shared/stores/vault.svelte.ts (VaultStore class)
  - src/app/ui/App.svelte (HistoryStore at line ~192, undo/redo handlers)

Implementation plan:
  1. Delete 10 bypass methods from VaultStore's public API: update,
     add, remove, moveToTrash, restoreFromTrash, emptyTrash, move,
     addToCollection, removeFromCollection, restore. The underlying
     Vault methods remain for internal use by reducers.
  2. Keep only vault.load() and vault.dispatch() as public mutation
     paths.
  3. Wire vault.load() into ActionHistory via the existing RELOAD_TREE
     special-case path (actions/index.ts:106-116). All 7 vault.load()
     call sites in App.svelte now push to ActionHistory.
  4. Eliminate the external HistoryStore:
     - Delete import and instantiation (App.svelte:192)
     - Delete canUndo/canRedo derived from history store
     - Replace handleUndo/handleRedo to call ActionHistory.undoPatched()
       and ActionHistory.redoPatched() via vault.dispatch
     - Delete src/shared/lib/hooks/history.svelte.ts (73 lines)
  5. Delete dead code within scope:
     - lastActionType + ACTION_LABELS (App.svelte:106-132,191) — never
       written, never read
     - history.update() call sites in App.svelte
  6. Update all production call sites that used vault.update() etc. to
     use vault.dispatch(actions.xxx(...)) instead. The gap analysis
     identified 18 production sites and 55 test sites.
  7. Phase 0 root-consumer migration (from Gap 3):
     - BatchEditor: replace root snapshot with vault.snapshot()
     - ExportDialog: call vault.export() on dialog open instead of
       receiving root prop

Demo test: Edit metadata in Inspector → goes through dispatch. Create
annotation in Viewer → goes through dispatch. Ctrl+Z → ActionHistory
undoes (not external HistoryStore). vault.load() during ingest → pushes
RELOAD_TREE to ActionHistory. Verify only dispatch() and load() are
public on VaultStore.

Run all tests (expect ~55 test files need mechanical vault.update →
vault.dispatch migration). Run the app to verify the demo works.
```

### ~~Prompt 6.V2 — Build: Patch-Based Undo/Redo via Revived ActionHistory~~ ✅ DONE (merged to main)

```
[preamble]

Your slice: V2 — Patch-based undo/redo.
...
```

**V2 completion notes:** 5 commits on feat/v2-patch-undo-redo, net -25 LOC. jsonPatch deepened to 3-level entity diffing with reference equality at every level. Critical bug found and fixed: parsePath naively split on all `/`, destroying URI-based entity IDs (IIIF IDs contain slashes). Fix: limit split to max 3 segments. Deprecated push()/undo()/redo() and LegacyHistoryEntry deleted. 4993 tests pass, 0 type errors. V1's bulk dead code deletion (ActionDispatcher, activityStream, getChangedIds, etc.) already absorbed ~60% of V2's planned deletions.

### Prompt 6.V3 — Build: Views Consume Normalized State (Phased)

```
[preamble]

Your slice: V3 — Remove root prop cascade, views read vault directly.

Affordances in scope: VR-1..VR-14 (entire view rendering circuit).
Deletes Phase A's VR-2A, VR-3A, VR-4A, VR-12A, VR-13A.

This is the largest slice by hours (23-28h). It is a PHASED migration,
not a single big-bang. The gap spike (Gap 3) established the phase
order. Use feature flags (compile-time constants) to enable per-view.

This slice depends on V1 and V2 being merged first. Both are now ✅ DONE.

Read these before implementing:
  - docs/shaping.md: Shape B part B3, Gap 3 evaluation
  - docs/spike-export-cascade.md
  - docs/spike-normalized-persistence.md
  - src/app/ui/App.svelte (200ms export debounce, root prop cascade)

Implementation plan — 5 phases:

  Phase 1: BoardView + ViewerView + Inspector
    These views already use vault.getEntity() for most data. Minimal
    changes needed. Remove root prop dependency, replace remaining
    root reads with vault queries.

  Phase 2: SearchView + MapView + TimelineView
    Replace entity lookups that currently traverse root tree with
    vault.getEntity(id) and a new getEntitiesByType() vault query
    (~15 lines on VaultStore). These views need entity lists, not
    tree structure.

  Phase 3: MetadataView
    The hardest single view. Replace updateItemInTree() O(n) tree walk
    with direct vault.dispatch(). Replace flattenTree/collectItems/
    flattenItem (~53 lines) with vault entity queries. Route all 7
    mutation surfaces through dispatch.

  Phase 4: ArchiveView
    Needs tree structure for collection→manifest→canvas hierarchy.
    Add vault.getChildIds(id) recursive walker. Add REORDER_CANVAS
    and GROUP_INTO_MANIFEST actions (~80 lines in action handlers).
    Remove JSON.parse(JSON.stringify(root)) deep-clone.

  Phase 5: Kill the root prop
    - Delete 200ms export debounce $effect (App.svelte:209-223)
    - Delete root state declaration
    - Delete root prop from ViewRouter and all view signatures
    - vault.export() now called ONLY for File→Export and auto-save
    - Sidebar and QCDashboard: continue receiving vault state via
      queries (Sidebar needs vault-aware tree traversal, QCDashboard
      healer needs rewrite — these are the hardest consumers)

After each phase, run all tests and verify no regressions. Each phase
should be independently committable.

Demo test: After Phase 5 — Edit 50 metadata fields rapidly. DevTools
Performance panel shows no vault.export() calls between edits. No
full-tree denormalization. UI stays responsive. All views render
correctly from vault queries.

Run all tests after each phase. Run the app to verify the demo works.
```

---

### Track 3 — After V1 Merges

### Prompt 6.V4 — Build: Persistence Error Propagation + Tab-Close Safety

```
[preamble]

Your slice: V4 — Explicit error propagation + tab-close safety.

Affordances in scope: PS-1..PS-17 (entire persistence circuit).
Deletes Phase A's PS-3A, PS-5A, PS-8A, PS-9A, PS-10A, PS-14A.

This slice depends on V1 being merged (for unified dispatch path).
It can run in parallel with V2, V3, and V7.

Read these before implementing:
  - docs/shaping.md: Shape B part B4
  - docs/spike-tab-close-safety.md (Strategy A+D: periodic checkpoint
    + visibilitychange flush + localStorage dirty-flag)
  - docs/spike-normalized-persistence.md (store NormalizedState
    directly in IDB, skip vault.export() on auto-save)
  - src/shared/services/storage.ts
  - src/app/stores/autoSave.svelte.ts

Implementation plan:
  1. Change storage.saveProject() to return { ok: boolean; error?: string }
     instead of swallowing errors. Remove try/catch that returns void.
  2. Update autoSave.save() to handle the result: increment failure
     counter on error, set saveStatus to 'error'.
  3. Delete unused autoSave methods: markSaved() and resetFailures()
     have no production callers (test-only — update tests).
  4. Add autoSave.flush() method: saves immediately, no debounce.
  5. Add periodic checkpointing: when dirty flag is set for >5 seconds,
     force an IDB write (~15 lines).
  6. Add root-level beforeunload handler in App.svelte:
     - localStorage.setItem('field-studio-dirty', Date.now().toString())
     - event.returnValue = '' (trigger browser dialog)
     - Remove MetadataView's isolated beforeunload handler (lines
       137-146) — now handled at root level
  7. Add visibilitychange handler in App.svelte:
     - if (document.visibilityState === 'hidden' && autoSave.isDirty)
       autoSave.flush()
  8. Add recovery-on-load: check localStorage dirty flag on startup →
     prompt "Recover last session?" (~15 lines).
  9. Switch auto-save to store NormalizedState directly in IDB:
     - JSON.stringify(vault.state) instead of vault.export() + tree
     - Bump IDB version to 7 as safety signal
     - Add format detection at load time: top-level has 'entities' +
       'rootId' = normalized, has 'id' + 'type' + 'items' = legacy
     - Legacy format auto-migrates on first save (transparent rolling
       migration)
  10. Remove fire-and-forget .catch(() => {}) patterns in App.svelte
      (~3 sites). Replace with autoSave.markDirty() for consistent
      error handling.
  11. Add save-failure toast notification (~20 lines UI component).
  12. Add quota monitoring: check navigator.storage.estimate() on each
      save. When usage > 80%, show warning toast (~5 lines).

Demo test: Mock IDB write failure → toast appears. Close tab →
beforeunload fires. visibilitychange to 'hidden' → flush triggers.
Set localStorage dirty flag → reopen → recovery prompt shown. Verify
NormalizedState format in IDB after save. Verify legacy format
auto-migrates on load.

Run all tests. Run the app to verify the demo works.
```

### Prompt 6.V7 — Build: Board Persistence via Vault Actions

```
[preamble]

Your slice: V7 — Board persistence through unified vault dispatch.

Affordances in scope: BD-1..BD-5 (board persistence circuit), MC-4
(board vault.dispatch). Deletes Phase A's ephemeral BoardVaultStore.

This slice depends on V1 being merged (for unified dispatch path).
It can run in parallel with V2, V3, and V4.

Read these before implementing:
  - docs/shaping.md: Shape B part B7, Gap 5 (connection enum), Board
    Type Divergence spike
  - docs/spike-board-roundtrip.md (bridge is sufficient for persistence)
  - src/features/board-design/model/index.ts (model-layer types)
  - src/features/board-design/stores/boardVault.svelte.ts (store types
    — to be deleted)
  - src/features/board-design/model/iiif-bridge.ts (round-trip bridge)

Implementation plan — 4-phase type reconciliation + vault wiring:

  Phase 1: Geometry rename (2-3h, low risk)
    Rename width/height → w/h across 9 files that use store BoardItem.
    Mechanical find-replace.

  Phase 2: Type discriminator (3-4h, medium risk)
    Replace store's type: 'canvas' | 'note' | 'group' with model's
    resourceType: string + isNote?: boolean across 4 files.

  Phase 3: Connection enum (30min, low risk — SIMPLIFIED)
    Keep store's 4 connection types (sequence, reference, supplement,
    custom). Add 10-line mapping function at IIIF bridge export boundary:
      storeTypeToModel: sequence→sequence, reference→references,
                        supplement→associated, custom→associated
    Delete model's 6-value ConnectionType enum — connectionTypeToMotivation()
    collapses ALL 6 to 'linking' motivation (zero IIIF semantic value).

  Phase 4: BoardState merge (2-3h, low risk)
    Merge model-layer BoardState fields (groups, viewport) into the
    canonical type. Extract grid/snap to BoardWorkspaceState:
      interface BoardWorkspaceState {
        gridSize: number;       // default 8
        snapEnabled: boolean;   // default false
      }
    Persist BoardWorkspaceState as a separate IDB key (not IIIF).

  Phase 5: Vault wiring
    - Wire ViewRouter.handleBoardSave() to vault.dispatch() (replace
      console.warn stub)
    - Wire board load: on board view mount, read board entities from
      vault via manifestToBoardState()
    - Add new vault action handlers for board operations (connections,
      notes, groups): ~80 lines
    - Delete BoardVaultStore class (boardVault.svelte.ts, 547 lines)
    - Delete board model selectors that become vault queries
      (selectAllItems, selectAllConnections, etc. — ~48 lines)
    - Verify auto-save picks up board changes via dispatch → dirty flag

Demo test: Open board. Add 5 items with connections. Arrange spatially.
Set grid snap. Close board. Reopen. Items, connections, and grid/snap
settings all survive. Ctrl+Z undoes board edits (via unified dispatch
path from V1).

Run all tests. Run the app to verify the demo works.
```

---

## PHASE 7 — Cleanup (Scoped Down)

**Mode:** Single agent, one session
**Status:** 7a ✅ DONE (commit 5dedc249, -1774 lines). 7c folded into V6.

Only 7b remains, scoped to items NOT already covered by Phase 6 slices.

### ~~Prompt 7a — Remove React Remnants~~ ✅ DONE

Completed in commit `5dedc249`:
- Deleted `_archived/` (accessibility.ts, localIIIFServer.ts, virtualizedData.ts)
- Deleted `ui/primitives/` (5 React .tsx files)
- Deleted `ingestWorkerPool.ts` + dead `USE_WORKER_INGEST` branch
- Removed vi.mock stubs from 2 test files
- 5055 tests passing, tsc --noEmit: 0 errors

### Prompt 7b — Remove Remaining Dead Code (scoped down)

```
Run `mulch prime` to load project expertise.

This is a cleanup task. You must not change any behavior. Only remove
verified dead code.

The LOC evaluation in docs/shaping.md identified dead code that falls
OUTSIDE any Phase 6 slice's scope. Phase 6 slices handle their own
dead code (V1 deletes HistoryStore, V2 deletes ActionDispatcher, V5
deletes tile pipeline, V7 deletes BoardVaultStore). This prompt covers
the remainder.

  1. Find and remove all commented-out import blocks in feature model
     files (board-design/model, metadata-edit/model, staging/model,
     viewer/model).
  2. Find all console.warn messages containing "@migration" or "not yet
     migrated". For each:
     - If a Phase 6 slice handles it, leave it (the slice will clean up)
     - If it's for a feature genuinely out of scope, leave it
     - If it's dead code that serves no purpose, remove it
  3. Remove any files that have zero imports pointing to them (verify
     with grep). Candidates to check:
     - Any remaining dead exports in shared/services/index.ts
     - Any remaining dead re-exports in shared/lib/hooks/index.ts
  4. Run the full build. Run all tests. Nothing should break.

NOTE: Do NOT delete commandHistory.svelte.ts (imported by
CommandPalette) or layerHistory.svelte.ts (imported by composer.ts).
These were incorrectly flagged as dead in one evaluation — they are
live code.

Record findings to mulch migration domain.
```

### ~~Prompt 7c — Unify Shared Types~~ → Folded into V6

Type unification work is now part of Prompt 6.V6 (step 7). V6 handles
both ValidationIssue unification and the broader type audit.

---

## Post-Build: Merge and Verify

**Mode:** Sequential, single session, after all Phase 6 and 7 branches merge

### Prompt 8

```
Run `mulch prime` to load project expertise.

All reconstruction slices and cleanup branches have been merged. Run
a full verification:

  1. Run the full build (npm run build or equivalent). Fix any
     compilation errors from merge conflicts.
  2. Run all tests. Fix any failures.
  3. Open the app. Perform the demo sequence for every slice:
     - V1: Edit metadata, create annotation, verify single dispatch path
     - V2: Edit 10 fields, undo 10 times, verify memory
     - V3: Rapid-edit 50 fields, verify no lag
     - V4: Check save failure toast works
     - V5: Import images, verify deep zoom
     - V6: Open QC Dashboard, verify real issues
     - V7: Arrange board items, close/reopen, verify persistence
  4. Run the fit-check one more time:

     Read docs/shaping.md. Update the R × B matrix based on the actual
     state of the code now. Mark each cell as ✅ verified, 🟡 partial,
     or ❌ still failing.

  5. For any remaining ❌ cells, create a follow-up task description
     in docs/shaping.md under a "Remaining Work" section.

  6. Record a comprehensive guide entry to mulch shaping domain
     summarizing: what was reconstructed, what was deferred, and what
     the current architectural state is.

  7. Run `mulch prime --no-limit` and review the full expertise dump.
     Prune any entries that are now stale (they describe the old broken
     state that no longer exists). Use `mulch record --supersedes <id>`
     for entries that replace old ones.
```

---

## Execution Notes

**Phase 7 status.** 7a is done (commit 5dedc249, -1774 lines). 7b is scoped down to remaining dead code not covered by Phase 6 slices. 7c is folded into V6. Run 7b anytime — it's a behavioral no-op.

**Why Phase 6 uses 3 tracks instead of 7 linear slices.** The adversarial evaluation revealed that B5 and B6 have zero dependencies on B1 — they can ship Day 1 as quick wins. B4 and B7 depend on B1 but not on B2 or B3, so they can run in parallel with Track 2 after V1 merges. This reduces calendar time from ~7 serial sessions to ~4.

**Merge order for Phase 6:**

```
Track 1 (Day 1):
  V5 (tile deletion)           ← ✅ DONE, merged to main
  V6 (validation types)        ← ✅ DONE, merged to main

Track 2 (serial):
  V1 (vault unification)       ← ✅ DONE, merged to main (-580 LOC, 9 commits)
    └─ V2 (undo/redo)          ← ✅ DONE, merged to main (-25 LOC, 5 commits)
      └─ V3 (export cascade)   ← ⬅️ NEXT — depends on V1+V2, phased per-view

Track 3 (after V1 merges):     ← UNBLOCKED
  V4 (persistence)             ← ready to start, parallel with V2/V3/V7
  V7 (board persistence)       ← ready to start, parallel with V2/V3/V4
```

**Mulch accumulation.** By Phase 8, the `.mulch/` directory should contain expertise across all domains accumulated by 10+ agent sessions. Every future session starts with `mulch prime` and gets the full reconstruction context. Current count: 157 records across 11 domains.

**Effort estimate (from adversarial evaluation + LOC analysis):**

```
Track 1:  V5(3-4h) + V6(4-5h)              =  7-9h   ✅ DONE
Track 2:  V1(6-8h) → V2(6-8h) → V3(23-28h) = 35-44h  (V1 ✅, V2 ✅, V3 next)
Track 3:  V4(8-10h) ∥ V7(16-20h)            = 16-20h (parallel, unblocked)
Phase 7b: ~2-3h (remaining dead code)
Phase 8:  ~3-4h (merge + verify)
──────────────────────────────────────────────
Total:    66-83h implementation + ~5-7h overhead = 71-90h
Done:     ~21-25h (V5 + V6 + V1 + V2)
Remaining: ~45-65h (V3 + V4 + V7 + 7b + 8)
LOC delta: net -1,460 lines (~2,060 deleted, ~600 added)
```

**Key references in docs/shaping.md:**
- Reverse breadboard: Subsystems 1-5 (affordance tables + mermaid)
- Requirements: R0-R11
- Shape B: B1-B7 with fit-check matrix
- Spikes: 9 resolved unknowns (vault unification, tile serving, history cost, export cascade, normalized persistence, tab-close safety, board roundtrip, MetadataView coverage, board type divergence)
- Adversarial evaluation: 6.5/10, 5 material gaps with adjudicated fixes
- Gap deep-dive: 5 gaps with Minimalist Surgeon vs Systems Thinker verdicts
- LOC evaluation: Growth Architect vs Deletion Engineer with verified dead code inventory
