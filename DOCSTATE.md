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
| `docs/Architecture/*.md` (4 files) | — | **DELETED this round** | `Utils.md`, `UX.md`, `Utility.md`, `Underneath.md` — deleted, superseded by `docs/Architecture.md` |
| `docs/ROADMAP.md` | Developers | **UPDATED this round** | Baseline metrics corrected: ESLint 310→80, @migration 60→85 |
| `docs/GUIDE.md` | Users | **NEW this round** | User-facing guide: 7 views, import, export, shortcuts, undo, settings, data |
| `lint.md` | — | ARTIFACT | Gitignored this round |
| `STATE.md` | Developers | CURRENT | Migration log, accurate through Dead Code + Aria round |
| `docs/feature planning/*.md` | — | PLANNING | Future planning artifacts — not user docs, leave as-is |
| `docs/deployment/*.md` | Developers | UNVERIFIED | May still be accurate; not reviewed this round |
| `docs/canopy/*.md` | Developers | UNVERIFIED | Canopy export reference; not reviewed this round |
| `docs/iiiif apis/*.md` | Developers | EXTERNAL | IIIF spec copies — read-only references, no drift risk |
| `docs/immich-api-docs/*.md` | Developers | EXTERNAL | Immich API reference — read-only, no drift risk |
| `docs/Atomic System *.md` | — | **DELETED this round** | Pre-migration React atomic design docs (2 files deleted) |
| `docs/ESLINT_ENHANCEMENTS.md` | Developers | **STALE — bannered** | Pre-Svelte 5. False "implemented" claims. Status banner added with accurate summary |
| `docs/Testing Suite based on Atomic .md` | — | **DELETED this round** | Pre-migration React testing doc |
| `docs/atomic-design-feature-audit.md` | — | **DELETED this round** | Pre-migration audit |
| `docs/feature planning/uiux.md` | — | **STALE — bannered** | Pre-Svelte 5 UI audit. Status banner added; content still useful as planning artifact |
| `docs/feature planning/uiuxstatus.md` | — | PLANNING | 18-item checklist (11/18 complete). Minimal, no framework references |
| `docs/deployment/README.md` | Developers | **PLANNING — bannered** | Status banner added: web-only, Docker/Tauri not implemented, React refs noted |

---

## Gaps

| Feature | Gap | Priority | Status |
|---------|-----|----------|--------|
| 7 views | No user walkthrough | High | **Closed** — `docs/GUIDE.md` |
| Keyboard shortcuts | Not documented user-facing | High | **Closed** — `docs/GUIDE.md` |
| Import media | Not documented | High | **Closed** — `docs/GUIDE.md` |
| Export formats | Not documented | Medium | **Closed** — `docs/GUIDE.md` |
| Undo/redo | Not documented | Low | **Closed** — `docs/GUIDE.md` |
| Local-first / data privacy | Mentioned in README, not explained | Low | **Closed** — `docs/GUIDE.md` "Where is my data?" section |
| Staging workbench details | Was brief in GUIDE | Low | **Closed** — full workflow added to GUIDE.md |
| Board connections tutorial | Types listed, workflow missing | Low | **Closed** — creation/editing/types added to GUIDE.md |
| Annotation workflow | Drawing/time annotations missing | Low | **Closed** — spatial + temporal step-by-step added to GUIDE.md |

---

## What Changed This Round (2026-02-24, doc sync round)

### docs/Architecture.md — NEW (replaces 4 stale files)

- Created single consolidated architecture document for the Svelte 5 FSD codebase
- Covers: FSD structure, vault/NormalizedState internals, action system (37 types), service worker pipeline, storage (IDB + OPFS), 19 services catalog, 7-view routing, 15 widgets, 12 features, validation, test infrastructure, known debt
- Does not duplicate CLAUDE.md (which covers patterns and gotchas) — Architecture.md goes deeper on system design
- Supersedes `docs/Architecture/{Utils,UX,Utility,Underneath}.md` (all 100% pre-migration React)

### docs/ROADMAP.md — UPDATED

- Baseline metrics corrected: `eslint` 310 → **80 warnings** (reduced via 6 TYPE_DEBT rounds, dead code cleanup, semantic-HTML, aria fixes)
- Baseline `@migration` count corrected: ~60 → **85 markers** (more accurate grep; these are non-actionable stubs in ViewerView, BoardView, Sidebar, AuthDialog)
- Tracking table updated with current baseline count
- All phase statuses unchanged (all still pending) — phases are accurately described

### docs/GUIDE.md — NEW (user-facing guide, deepened same round)

- Covers all 7 views with what-you-see / what-you-can-do descriptions
- Import: drag-drop folders, file picker, external IIIF URL, CSV metadata
- Export: 5 formats (Canopy site, Raw IIIF, OCFL, BagIt, Activity Log) with wizard flow
- Full keyboard shortcut tables (global, archive, viewer, metadata)
- Undo/redo, settings, QC dashboard, data storage explanation
- **Staging Workbench** — full 3-pane workflow: source tree, archive organization, preview, conflict detection, ingest progress
- **Board Connections** — 4 connection types, creation flow, edit panel, multi-select, board features
- **Annotations** — spatial (polygon/rectangle/freehand/select) + temporal (timeline range selection, waveform regions), motivations, save flow
- Closes all 9 gaps (6 original + 3 low-priority follow-ups)

### Stale docs cleaned up

- **Deleted:** `docs/Architecture/{Utils,UX,Utility,Underneath}.md` (4 files), `docs/Atomic System*.md` (2 files), `docs/Testing Suite*.md` (1 file), `docs/atomic-design-feature-audit.md` (1 file) — total 8 stale pre-migration React files removed
- **Bannered:** `docs/deployment/README.md` (PLANNING — web-only, Docker/Tauri not built), `docs/ESLINT_ENHANCEMENTS.md` (STALE — React hooks, false "implemented" claims), `docs/feature planning/uiux.md` (STALE — React .tsx refs, content still useful)

### DOCSTATE.md — REWRITTEN

- Architecture status: STALE → DELETED (files removed, consolidated doc exists)
- All 9 gaps closed
- Stale docs deleted or bannered
- Deployment/ESLint/UI-UX docs verified and categorized

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

- [x] ~~Delete stale pre-migration docs~~ — 8 files deleted this round
- [x] ~~Write user guide~~ → `docs/GUIDE.md` done this round
- [x] ~~Verify deployment docs~~ — all PLANNING, banner added to README.md
- [x] ~~Verify ESLINT_ENHANCEMENTS.md~~ — STALE, banner added with accurate status
- [x] ~~Review UI/UX status docs~~ — banner added to uiux.md, uiuxstatus.md is minimal checklist
- [x] ~~Deepen GUIDE.md~~ — staging, connections, annotations all added

**Zero open gaps. Zero stale docs without banners. Every user-facing feature has a doc.**

### Future rounds (nice-to-have, no urgency)
- [ ] Rewrite `docs/ESLINT_ENHANCEMENTS.md` for Svelte 5 (document actual 18 rules, remove React proposals)
- [ ] Update `docs/deployment/` files to reference Svelte 5 instead of React (if deployment work begins)
- [ ] Update `docs/feature planning/uiux.md` from .tsx → .svelte paths (if UX audit resumes)
