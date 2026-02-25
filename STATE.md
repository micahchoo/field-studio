# Field Studio — State Dashboard

_Ephemeral metrics snapshot. Updated after every session. For accumulated knowledge (decisions, patterns, conventions), see `mulch prime`._

## Current Metrics

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx svelte-check` | 0 errors, **2 warnings** (pre-existing a11y) |
| `npm run test` | 117 files, **4978 tests passing** |
| `npm run lint` | **0 errors, 0 warnings** |

## Permanent TYPE_DEBT (external libs — suppressed via eslint-disable)

| Site | Count | Reason |
|------|-------|--------|
| `annotorious.ts` | 14 | No `@types/annotorious` |
| `waveform.ts` | 9 | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` | 2 | Framework shim |

## Last Session

_Overwrite this section each session with: what changed, what phase item was completed, any new gaps._

- Evaluated Vision.md and ROADMAP.md alignment
- Resolved 8 gaps across Vision.md, ROADMAP.md, DESIGN_DECISIONS.md
- Added blinker principles for LLM-driven development to ROADMAP.md
- Migrated accumulated knowledge from STATE.md to mulch
