# Mulch + STATE.md Hybrid Setup Prompt

> Drop this prompt into a Claude Code session for any project to set up the hybrid knowledge management system. Adjust domain names and seed content to your project.

---

## The Prompt

```
I want to set up a hybrid knowledge management system for LLM-driven development on this project using mulch (structured knowledge store) + STATE.md (ephemeral metrics dashboard).

### The Split

**STATE.md** holds ephemeral, session-scoped data:
- Current CI/build/test/lint metrics (exact numbers, updated every session)
- "Last Session" section (what changed, overwritten each session)
- Permanent known debt that constrains work (e.g., external lib type suppressions)

**Mulch** holds durable, accumulated knowledge:
- `decision` — architectural choices with rationale (foundational, permanent)
- `convention` — coding standards and project rules (foundational)
- `pattern` — reusable solutions to recurring problems (foundational or tactical)
- `failure` — mistakes with resolutions so they aren't repeated (tactical, 14d shelf life)
- `reference` — key file locations, module maps, milestone summaries (foundational)
- `guide` — process documentation for LLM agents (foundational)

### Setup Steps

1. **Initialize mulch** (if not already done):
   ```bash
   mulch init
   ```

2. **Create domains** relevant to this project. Choose 3-6 domains that match your knowledge categories. Examples:
   - `architecture` — system-level decisions, data model, state management
   - `<framework>` — framework-specific patterns (e.g., svelte, react, django)
   - `<domain>` — domain-specific conventions (e.g., iiif, graphql, auth)
   - `testing` — test patterns, mocking strategies, coverage rules
   - `roadmap` — phase summaries, milestones, process guides

   ```bash
   mulch add architecture
   mulch add <framework>
   mulch add <domain>
   mulch add testing
   mulch add roadmap
   ```

3. **Create STATE.md** at project root with this template:

   ```markdown
   # <Project> — State Dashboard

   _Ephemeral metrics snapshot. Updated after every session. For accumulated knowledge (decisions, patterns, conventions), see `mulch prime`._

   ## Current Metrics

   | Check | Result |
   |-------|--------|
   | `<typecheck command>` | **result** |
   | `<test command>` | **result** |
   | `<lint command>` | **result** |

   ## Known Debt

   <!-- Only permanent constraints that affect every session. Not historical. -->

   ## Last Session

   _Overwrite this section each session with: what changed, what was completed, any new gaps._
   ```

4. **Update CLAUDE.md** (or create one) with the hybrid loop. The key changes are in ORIENT and SYNC:

   ```markdown
   ## Loop (mandatory)

   ORIENT → BUILD → TEST → RECTIFY → SYNC. No skipping.

   - **ORIENT**: Read STATE.md (metrics). Run `mulch prime` (domain knowledge) — or `mulch prime --files <paths>` when scoped to specific files. Read ROADMAP.md on phase transitions or gaps.
   - **BUILD**: Implement.
   - **TEST**: Write/update tests.
   - **RECTIFY**: Lint, type-check, fix.
   - **SYNC**: Overwrite STATE.md metrics (run all checks, record numbers). Run `mulch learn` to see what changed, then `mulch record <domain>` for any new convention, pattern, failure, or decision discovered during the session. Update ROADMAP/ARCHITECTURE only on structural changes.
   - **Exit**: zero gaps, clean types, green tests.
   ```

5. **Seed mulch with existing knowledge**. Walk through your existing documentation (architecture docs, decision logs, README, past learnings) and batch-record them. Use JSON batch files for efficiency:

   ```bash
   # Example batch file: /tmp/seed-architecture.json
   [
     {
       "type": "decision",
       "title": "<decision name>",
       "rationale": "<why this choice was made>",
       "classification": "foundational",
       "tags": ["<tag1>", "<tag2>"]
     },
     {
       "type": "convention",
       "content": "<rule or standard>",
       "classification": "foundational",
       "tags": ["<tag1>"]
     }
   ]

   mulch record architecture --batch /tmp/seed-architecture.json
   ```

6. **Validate and commit**:
   ```bash
   mulch validate
   mulch doctor
   mulch sync
   ```

### Mulch Record Type Reference

| Type | Required Fields | Use For |
|------|----------------|---------|
| `convention` | `content` | Coding standards, project rules |
| `pattern` | `name`, `description` | Reusable solutions, workarounds |
| `failure` | `description`, `resolution` | Mistakes to avoid repeating |
| `decision` | `title`, `rationale` | Architectural choices |
| `reference` | `name`, `description` | Key locations, module maps |
| `guide` | `name`, `description` | Process docs for agents |

### Classification Levels

| Level | Shelf Life | Use For |
|-------|-----------|---------|
| `foundational` | Permanent | Architecture, conventions, key patterns |
| `tactical` | 14 days | Bug fixes, workarounds, session-specific patterns |
| `observational` | 30 days | Hypotheses, unverified patterns |

### Governance Defaults (in mulch.config.yaml)

```yaml
governance:
  max_entries: 100      # per domain
  warn_entries: 150
  hard_limit: 200
classification_defaults:
  shelf_life:
    tactical: 14
    observational: 30
```

### Key Commands for Daily Use

```bash
# Session start
mulch prime                      # all domain knowledge
mulch prime --context            # only records relevant to git-changed files
mulch prime --files src/foo.ts   # only records relevant to specific files

# During work
mulch search "navPlace"          # find relevant records

# Session end
mulch learn                      # see changed files, suggest domains
mulch record <domain> --type convention --description "..."
mulch record <domain> --type failure --description "..." --resolution "..."
mulch record <domain> --type decision --title "..." --rationale "..."
mulch sync                       # validate + stage + commit .mulch/
```

### Why This Split Works

- **STATE.md** is small (< 30 lines), always current, gives the LLM instant orientation on project health
- **Mulch** is structured, queryable, has lifecycle management (expiry, pruning, governance limits), and can be filtered by relevance
- Together they prevent the two main LLM failure modes: (1) stale context from a bloated STATE.md, and (2) lost knowledge from session-scoped memory
```
