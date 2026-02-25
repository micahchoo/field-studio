# Field Studio — State Dashboard

_Ephemeral metrics snapshot. Updated after every session. For accumulated knowledge (decisions, patterns, conventions), see `mulch prime`._

## Current Metrics

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, **2 warnings** (pre-existing a11y) |
| `npm run test` | 120 files, **5055 tests passing** |
| `npm run lint` | **0 errors, 0 warnings** |

## Permanent TYPE_DEBT (external libs — suppressed via eslint-disable)

| Site | Count | Reason |
|------|-------|--------|
| `annotorious.ts` | 14 | No `@types/annotorious` |
| `waveform.ts` | 9 | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` | 2 | Framework shim |

## Last Session

_Overwrite this section each session with: what changed, what phase item was completed, any new gaps._

- **Completed: Phase 0.1 ViewBus** — ViewStateProvider protocol + ViewRegistry + ArchiveViewState exemplar
- New files: `viewProtocol.ts`, `viewRegistry.svelte.ts`, `archiveViewState.svelte.ts` + 3 test files (77 new tests)
- Modified: `ViewRouter.svelte` (registry wiring + active view sync), `ArchiveView.svelte` (reads/writes from registry)
- Archive state (filter, sort, viewMode, selection) now survives view switches via ViewRegistry
- Re-exported ViewBus types from `shared/types/index.ts`
- Selection Bus (§0.2) can now read `viewRegistry.activeSelection` as starting point
- No new TYPE_DEBT introduced
