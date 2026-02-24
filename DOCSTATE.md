# DOCSTATE.md — Documentation State Tracker

_Updated: 2026-02-24. Single source of truth for doc health._

---

## Status Summary

| Doc | Audience | Status | Action |
|-----|----------|--------|--------|
| `README.md` | Developers | CURRENT | Fixed prev round: port, commands, architecture, framework |
| `docs/AGENTS.md` | AI coding agents | CURRENT | Rewritten prev round for Svelte 5 |
| `docs/CLAUDE.md` | Claude Code | CURRENT | Rewritten prev round for Svelte 5 |
| `docs/Architecture.md` | Developers | **REPLACED this round** | Single consolidated file replaces 4 stale React docs |
| `docs/Architecture/*.md` (4 files) | — | **STALE — superseded** | `Utils.md`, `UX.md`, `Utility.md`, `Underneath.md` — 100% pre-migration React. Superseded by `docs/Architecture.md`. Safe to delete. |
| `docs/ROADMAP.md` | Developers | **UPDATED this round** | Baseline metrics corrected: ESLint 310→240, @migration 60→85 |
| `lint.md` | — | ARTIFACT | Gitignored this round |
| `STATE.md` | Developers | CURRENT | Migration log, accurate through Dead Code + Aria round |
| `docs/feature planning/*.md` | — | PLANNING | Future planning artifacts — not user docs, leave as-is |
| `docs/deployment/*.md` | Developers | UNVERIFIED | May still be accurate; not reviewed this round |
| `docs/canopy/*.md` | Developers | UNVERIFIED | Canopy export reference; not reviewed this round |
| `docs/iiiif apis/*.md` | Developers | EXTERNAL | IIIF spec copies — read-only references, no drift risk |
| `docs/immich-api-docs/*.md` | Developers | EXTERNAL | Immich API reference — read-only, no drift risk |
| `docs/Atomic System *.md` | — | STALE | Pre-migration React atomic design docs. Superseded by FSD. Safe to delete. |
| `docs/ESLINT_ENHANCEMENTS.md` | Developers | UNVERIFIED | ESLint enhancement proposals — not reviewed this round |
| `docs/Testing Suite based on Atomic .md` | — | STALE | Pre-migration React testing doc. Safe to delete. |
| `docs/atomic-design-feature-audit.md` | — | STALE | Pre-migration audit. Safe to delete. |

---

## Gaps (no user-facing doc exists)

| Feature | Gap | Priority |
|---------|-----|----------|
| 7 views (Archive/Viewer/Boards/Metadata/Search/Map/Timeline) | No user walkthrough | High |
| Keyboard shortcuts | Not documented anywhere user-facing | High |
| Import media (folder + external IIIF) | Not documented | High |
| Export formats (IIIF bundle, static site, OCFL, BagIt) | Not documented | Medium |
| Undo/redo | Not documented | Low |
| Local-first / data privacy | Mentioned in README, not explained | Low |

_All gaps are TODO(loop) for next round when user-guide content is prioritized._

---

## What Changed This Round (2026-02-24, doc sync round)

### docs/Architecture.md — NEW (replaces 4 stale files)

- Created single consolidated architecture document for the Svelte 5 FSD codebase
- Covers: FSD structure, vault/NormalizedState internals, action system (26 types), service worker pipeline, storage (IDB + OPFS), 20 services catalog, 7-view routing, 15 widgets, validation, test infrastructure, known debt
- Does not duplicate CLAUDE.md (which covers patterns and gotchas) — Architecture.md goes deeper on system design
- Supersedes `docs/Architecture/{Utils,UX,Utility,Underneath}.md` (all 100% pre-migration React)

### docs/ROADMAP.md — UPDATED

- Baseline metrics corrected: `eslint` 310 → **240 warnings** (reduced via 6 TYPE_DEBT rounds, dead code cleanup, semantic-HTML conversion)
- Baseline `@migration` count corrected: ~60 → **85 markers** (more accurate grep; these are non-actionable stubs in ViewerView, BoardView, Sidebar, AuthDialog)
- Tracking table updated with current baseline count
- All phase statuses unchanged (all still pending) — phases are accurately described

### DOCSTATE.md — REWRITTEN

- Architecture status: STALE → REPLACED (new consolidated `docs/Architecture.md`)
- Added stale pre-migration docs to summary: `Atomic System*.md`, `Testing Suite*.md`, `atomic-design-feature-audit.md`
- lint.md: confirmed gitignored
- Updated gaps (unchanged — still waiting on user-guide round)
- Updated next-round checklist

---

## Previous Round (2026-02-24, doc fix round)

### README.md
- Removed 300-line React architecture ASCII diagram
- Fixed port: 3000 → 5173 (Vite default, no port in vite.config.ts)
- Removed commands that don't exist in package.json: `test:ui`, `test:coverage`, `test:debug`
- Replaced architecture section with accurate FSD overview
- Replaced React references with Svelte 5

### docs/AGENTS.md
- Full rewrite: React 19 → Svelte 5
- Correct FSD paths throughout
- Updated test section: "no automated tests" → 4756 passing
- Correct ESLint rules (18 custom rules, Svelte-specific)
- Added Svelte 5 critical patterns (snippet shadow, effect depth)
- Correct path alias: `@` → project root (not `src/`)

### docs/CLAUDE.md
- Full rewrite: React → Svelte 5
- Correct import paths for all key modules
- Added Svelte 5 patterns and pitfalls
- Removed React hook patterns
- Correct vault usage (vault.dispatch not actions singleton)

---

## Drift Prevention

**Rule (prev round):** Any PR that changes `vite.config.ts` server port, adds/removes package.json scripts, or renames key src/ paths must update README.md and AGENTS.md in the same commit.

**Rule (this round):** `docs/Architecture.md` is the canonical architecture doc. The 4 files in `docs/Architecture/` are superseded. Do not update them — update `docs/Architecture.md` instead. When a ROADMAP phase is completed, update both `docs/ROADMAP.md` tracking table and `STATE.md` phase metrics in the same commit.

---

## Next Round Checklist

- [ ] Delete stale pre-migration docs: `docs/Architecture/{Utils,UX,Utility,Underneath}.md`, `docs/Atomic System*.md`, `docs/Testing Suite*.md`, `docs/atomic-design-feature-audit.md`
- [ ] Write user guide: "Using Field Studio" (7 views, import, export, keyboard shortcuts)
- [ ] Verify `docs/deployment/README.md` accuracy
- [ ] Verify `docs/ESLINT_ENHANCEMENTS.md` accuracy
- [ ] Review `docs/feature planning/uiuxstatus.md` against current UI state
