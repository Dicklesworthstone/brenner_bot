# AGENTS.md — BrennerBot Project

## RULE 1 – ABSOLUTE (DO NOT EVER VIOLATE THIS)

You may NOT delete any file or directory unless I explicitly give the exact command **in this session**.

- This includes files you just created (tests, tmp files, scripts, etc.).
- You do not get to decide that something is "safe" to remove.
- If you think something should be removed, stop and ask. You must receive clear written approval **before** any deletion command is even proposed.

Treat "never delete files without permission" as a hard invariant.

---

## IRREVERSIBLE GIT & FILESYSTEM ACTIONS

Absolutely forbidden unless I give the **exact command and explicit approval** in the same message:

- `git reset --hard`
- `git clean -fd`
- `rm -rf`
- Any command that can delete or overwrite code/data

Rules:

1. If you are not 100% sure what a command will delete, do not propose or run it. Ask first.
2. Prefer safe tools: `git status`, `git diff`, `git stash`, copying to backups, etc.
3. After approval, restate the command verbatim, list what it will affect, and wait for confirmation.
4. When a destructive command is run, record in your response:
   - The exact user text authorizing it
   - The command run
   - When you ran it

If that audit trail is missing, then you must act as if the operation never happened.

---

## Node / JS Toolchain

- Use **bun** for everything JS/TS.
- ❌ Never use `npm`, `yarn`, or `pnpm`.
- Lockfiles: only `bun.lock`. Do not introduce any other lockfile.
- Target **latest Node.js**. No need to support old Node versions.
- **Note:** `bun install -g <pkg>` is valid syntax (alias for `bun add -g`). Do not "fix" it.

### Bun Standalone Executables (`bun build --compile`)

Bun’s “single‑file executable” means the output is one native binary file, **not** that your CLI must live in a single `.ts` source file.

From Bun’s docs, `bun build --compile` bundles your entire dependency graph (imported files + used packages) plus a copy of the Bun runtime into one executable:
- `https://bun.sh/docs/bundler/executables`

```bash
# Point at the entrypoint (example uses `./src/cli.ts`; in this repo the current entrypoint is `./brenner.ts`).

# build a self-contained executable for the current platform
bun build --compile ./src/cli.ts --outfile brenner

# cross-compile for a target platform/arch (examples)
bun build --compile --target=bun-linux-x64 ./src/cli.ts --outfile brenner
bun build --compile --target=bun-windows-x64 ./src/cli.ts --outfile brenner.exe
bun build --compile --target=bun-darwin-arm64 ./src/cli.ts --outfile brenner

# current repo entrypoint
bun build --compile ./brenner.ts --outfile brenner
```

Targets include libc + CPU variants (e.g. `bun-linux-x64-musl`, `bun-linux-x64-baseline`, `bun-linux-x64-modern`) — use `baseline` if you need compatibility with older x64 CPUs (avoids “Illegal instruction”).

---

## Project Architecture

BrennerBot is a **documents-first research project** that will grow into a web-based multi-agent “research lab”
coordinated via Agent Mail.

### A) Corpus + syntheses (current)
- **Purpose:** Canonical primary source + model writeups for extracting and operationalizing the “Brenner approach”.
- **Key artifacts:** `complete_brenner_transcript.md`, metaprompts, and the model response folders.

### B) Web app (`apps/web/`)
- **Framework:** Next.js **16.x** (App Router) + React **19**
- **Orchestration:** **no vendor AI APIs**; coordinate **Codex CLI / Claude Code / Gemini CLI** via **Agent Mail**
- **Runtime/Tooling:** Bun
- **Hosting:** Vercel
- **Purpose:** A UI to:
  - browse/search the corpus and curated quote banks
  - run structured “Brenner Loop” research sessions
  - orchestrate multi-model collaboration (Claude/Codex/Gemini)
  - produce durable artifacts (hypothesis slates, discriminative tests, assumption ledgers, memos)

### C) Prompt templates + protocols (planned; keep file sprawl minimal)
- **Purpose:** Versioned prompt templates and rubrics that implement Brenner-style workflows.

### D) Agent Mail integration (external)
- **Purpose:** Coordination substrate (threads, inbox/outbox, acknowledgements, file reservations).
- **Repo:** `https://github.com/Dicklesworthstone/mcp_agent_mail`

---

## Repo Layout

```
brenner_bot/
├── README.md
├── AGENTS.md
├── brenner.ts                     # CLI entrypoint (7500+ lines)
├── install.sh / install.ps1      # Installer scripts
├── complete_brenner_transcript.md
├── initial_metaprompt.md
├── metaprompt_by_gpt_52.md
├── gpt_pro_extended_reasoning_responses/
├── gemini_3_deep_think_responses/
├── opus_45_responses/
├── specs/                         # Protocol specifications
├── apps/
│   └── web/                       # Next.js 16.x (App Router) + React 19
│       ├── src/app/               # App Router pages
│       ├── src/components/        # UI components
│       ├── src/lib/               # Shared libraries
│       └── package.json
└── .beads/                        # Issue tracking (br)
```

---

## Generated Files — NEVER Edit Manually

**Current state:** There are **no checked-in generated source files** in this repo.

If/when we add generated artifacts (e.g., corpus indexes, derived quote banks, compiled prompt catalogs):

- **Rule:** Never hand-edit generated outputs.
- **Convention:** Put generated outputs in a clearly labeled directory (e.g., `generated/`) and document the generator command adjacent to it.

---

## Code Editing Discipline

- Do **not** run scripts that bulk-modify code (codemods, invented one-off scripts, giant `sed`/regex refactors).
- Large mechanical changes: break into smaller, explicit edits and review diffs.
- Subtle/complex changes: edit by hand, file-by-file, with careful reasoning.

---

## Backwards Compatibility & File Sprawl

We optimize for a clean architecture now, not backwards compatibility.

- No "compat shims" or "v2" file clones.
- When changing behavior, migrate callers and remove old code.
- New files are only for genuinely new domains that don't fit existing modules.
- The bar for adding files is very high.

---

## Console Output

- Prefer **structured, minimal logs** (avoid spammy debug output).
- Treat user-facing UX as UI-first; logs are for operators/debugging.

---

## Tooling assumptions (recommended)

This section is a **developer toolbelt** reference (not an installer guarantee).

### Shell & Terminal UX
- **zsh** + **oh-my-zsh** + **powerlevel10k**
- **lsd** (or eza fallback) — Modern ls
- **atuin** — Shell history with Ctrl-R
- **fzf** — Fuzzy finder
- **zoxide** — Better cd
- **direnv** — Directory-specific env vars

### Languages & Package Managers
- **bun** — JS/TS runtime + package manager
- **uv** — Fast Python tooling
- **rust/cargo** — Rust toolchain
- **go** — Go toolchain

### Dev Tools
- **tmux** — Terminal multiplexer
- **ripgrep** (`rg`) — Fast search
- **ast-grep** (`sg`) — Structural search/replace
- **lazygit** — Git TUI
- **bat** — Better cat

### Coding Agents
- **Claude Code** — Anthropic's coding agent
- **Codex CLI** — OpenAI's coding agent
- **Gemini CLI** — Google's coding agent

### Cloud & Database
- **PostgreSQL 18** — Database
- **HashiCorp Vault** — Secrets management
- **Wrangler** — Cloudflare CLI
- **Supabase CLI** — Supabase management
- **Vercel CLI** — Vercel deployment

### Dicklesworthstone Stack (all 8 tools)
1. **ntm** — Named Tmux Manager (agent cockpit)
2. **mcp_agent_mail** — Agent coordination via mail-like messaging
3. **ultimate_bug_scanner** (`ubs`) — Bug scanning with guardrails
4. **beads_viewer** (`bv`) — Task management TUI
5. **coding_agent_session_search** (`cass`) — Unified agent history search
6. **cass_memory_system** (`cm`) — Procedural memory for agents
7. **coding_agent_account_manager** (`caam`) — Agent auth switching
8. **simultaneous_launch_button** (`slb`) — Two-person rule for dangerous commands

---

## MCP Agent Mail — Multi-Agent Coordination

Agent Mail is available as an MCP server for coordinating work across agents.

### CRITICAL: How Agents Access Agent Mail

**Coding agents (Claude Code, Codex, Gemini CLI) access Agent Mail NATIVELY via MCP tools.**

- You do NOT need to implement HTTP wrappers, client classes, or JSON-RPC handling
- MCP tools are available directly in your environment (e.g., `macro_start_session`, `send_message`, `fetch_inbox`)
- If MCP tools aren't available, flag it to the user — they may need to start the Agent Mail server

**The `AgentMailClient` class in `brenner.ts` and `apps/web/src/lib/agentMail.ts` is for:**
- The `brenner` CLI tool (for human operators interacting from command line)
- The web app (which runs in browser/server and can't use MCP natively)

**DO NOT** create HTTP wrappers or unify "client code" for agent-to-Agent-Mail communication — this is already handled by your MCP runtime.

What Agent Mail gives:
- Identities, inbox/outbox, searchable threads.
- Advisory file reservations (leases) to avoid agents clobbering each other.
- Persistent artifacts in git (human-auditable).

Core patterns:

1. **Same repo**
   - Register identity:
     - `ensure_project` then `register_agent` with the repo's absolute path as `project_key`.
   - Reserve files before editing:
     - `file_reservation_paths(project_key, agent_name, ["src/**"], ttl_seconds=3600, exclusive=true)`.
   - Communicate:
     - `send_message(..., thread_id="FEAT-123")`.
     - `fetch_inbox`, then `acknowledge_message`.
   - Fast reads:
     - `resource://inbox/{Agent}?project=<abs-path>&limit=20`.
     - `resource://thread/{id}?project=<abs-path>&include_bodies=true`.

2. **Macros vs granular:**
   - Prefer macros when speed is more important than fine-grained control:
     - `macro_start_session`, `macro_prepare_thread`, `macro_file_reservation_cycle`, `macro_contact_handshake`.
   - Use granular tools when you need explicit behavior.

Common pitfalls:
- "from_agent not registered" → call `register_agent` with correct `project_key`.
- `FILE_RESERVATION_CONFLICT` → adjust patterns, wait for expiry, or use non-exclusive reservation.

---

## Website Development (apps/web)

```bash
cd apps/web
bun install           # Install dependencies
bun run dev           # Dev server
bun run build         # Production build
bun run lint          # ESLint check
bun run lint:ox       # Oxlint check (faster)
```

Key patterns:
- App Router: all pages in `app/` directory
- UI components: shadcn/ui + Tailwind CSS
- React 19 + Next.js 16.x; prefer Server Components where appropriate.
- Orchestration: use Agent Mail + operator-run CLI agents (Codex/Claude/Gemini); do not wire up vendor AI APIs.

---

## Web App Quality Gates (apps/web)

```bash
cd apps/web
bun run test         # unit tests (vitest + happy-dom)
bun run build        # production build sanity check
bun run lint         # ESLint check
bun run lint:all     # ESLint + Oxlint
```

**⚠️ CRITICAL:** Always use `bun run test`, never `bun test`. The latter runs Bun's native test runner without the DOM environment (happy-dom) configured in vitest.config.ts, causing all React component tests to fail with "document is not defined".

---

## Corpus Files and Vercel Deployment

`apps/web/public/_corpus/` contains markdown files served by the web app. These files must be committed to git (not gitignored) or Vercel deployments will fail.

**Rules:**
1. Never add `public/_corpus/` to `.gitignore`
2. After `bun run build`, commit any new/changed corpus files
3. The directory uses underscore (`_corpus`) to avoid conflict with the `/corpus` route

**Verify before deploying:**
```bash
git ls-files apps/web/public/_corpus/ | wc -l  # Should show 17+ files
```

**If deployments fail:** Check that corpus files are tracked (`git ls-files`) and that `src/lib/corpus.ts` uses `/_corpus/` (with underscore) in the fetch URL.

---

## ⚠️ CRITICAL: Vercel Deployment Safety Rules

**The production site (brennerbot.org) is publicly shared. Breaking it is UNACCEPTABLE.**

### Never Do These Things

1. **Never modify `vercel.json` without explicit user approval**
   - The Vercel dashboard has "Root Directory" set to `apps/web`
   - `vercel.json` overrides can conflict with dashboard settings in unpredictable ways
   - If you think vercel.json needs changes, STOP and ask first

2. **Never assume a 401/404 is "expected" on the public site**
   - If the main page returns anything other than 200, the site is BROKEN
   - This requires IMMEDIATE emergency action
   - Do not rationalize errors - fix them

3. **Never delete or modify middleware/proxy files without understanding the full impact**
   - Next.js 16 uses `proxy.ts` (not `middleware.ts`) for edge middleware
   - Any middleware must have a `matcher` config that excludes public routes
   - Public routes (/, /corpus, /distillations, etc.) must NEVER be protected

### Safe Deployment Practices

1. **Before any deployment-related change:**
   ```bash
   vercel ls --limit 5   # Check current deployments
   vercel inspect <url>  # Verify production status
   ```

2. **If something breaks:**
   - User can rollback via Vercel dashboard instantly
   - Do NOT make additional changes that might make things worse
   - Wait for explicit instructions

3. **The working deployment pattern:**
   - Vercel dashboard: Root Directory = `apps/web`
   - Dashboard detects Next.js automatically
   - `bun install` and `bun run build` run from `apps/web`
   - No vercel.json overrides needed for basic operation

### Route Protection Architecture

If route protection is needed (for admin areas, sessions, etc.):
- Matcher must be EXPLICITLY scoped to protected paths only
- Example: `matcher: ["/admin/:path*", "/sessions/:path*"]`
- NEVER use catch-all patterns that might affect public pages
- Test on preview deployments BEFORE merging to main

---

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   br sync --flush-only
   git add .beads/
   git commit -m "Update beads"
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


---

## Issue Tracking with br (beads_rust)

All issue tracking goes through **br**. No other TODO systems.

**Note:** `br` is non-invasive—it never executes git commands directly. You must run git commands manually after `br sync --flush-only`.

Key invariants:

- `.beads/` is authoritative state and **must always be committed** with code changes.
- Do not edit `.beads/*.jsonl` directly; only via `br`.

### Basics

Check ready work:

```bash
br ready --json
```

Create issues:

```bash
br create "Issue title" -t bug|feature|task -p 0-4 --json
br create "Issue title" -p 1 --deps discovered-from:br-123 --json
```

Update:

```bash
br update br-42 --status in_progress --json
br update br-42 --priority 1 --json
```

Complete:

```bash
br close br-42 --reason "Completed" --json
```

Types:

- `bug`, `feature`, `task`, `epic`, `chore`

Priorities:

- `0` critical (security, data loss, broken builds)
- `1` high
- `2` medium (default)
- `3` low
- `4` backlog

Agent workflow:

1. `br ready` to find unblocked work.
2. Claim: `br update <id> --status in_progress`.
3. Implement + test.
4. If you discover new work, create a new bead with `discovered-from:<parent-id>`.
5. Close when done.
6. Run `br sync --flush-only`, then `git add .beads/ && git commit` in the same commit as code changes.

Sync:

- Run `br sync --flush-only` to export to `.beads/issues.jsonl`.
- Then run `git add .beads/ && git commit -m "Update beads"` to commit changes.

Never:

- Use markdown TODO lists.
- Use other trackers.
- Duplicate tracking.

---

### Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). For agent-to-agent coordination (messaging, work claiming, file reservations), use MCP Agent Mail, which should be available to you as an an MCP server (if it's not, then flag to the user; they might need to start Agent Mail using the `am` alias or by running `cd "<directory_where_they_installed_agent_mail>/mcp_agent_mail" && bash scripts/run_server_with_token.sh)' if the alias isn't available or isn't working.

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command

#### Other bv Commands

**Planning:**
| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with `unblocks` lists |
| `--robot-priority` | Priority misalignment detection with confidence |

**Graph Analysis:**
| Command | Returns |
|---------|---------|
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS (hubs/authorities), eigenvector, critical path, cycles, k-core, articulation points, slack |
| `--robot-label-health` | Per-label health: `health_level` (healthy\|warning\|critical), `velocity_score`, `staleness`, `blocked_count` |
| `--robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| `--robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity |

**History & Change Tracking:**
| Command | Returns |
|---------|---------|
| `--robot-history` | Bead-to-commit correlations: `stats`, `histories` (per-bead events/commits/milestones), `commit_index` |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |

**Other Commands:**
| Command | Returns |
|---------|---------|
| `--robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| `--robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |
| `--export-graph <file.html>` | Self-contained interactive HTML visualization |

#### Scoping & Filtering

bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
bv --robot-triage --robot-triage-by-track    # Group by parallel work streams
bv --robot-triage --robot-triage-by-label    # Group by domain

#### Understanding Robot Output

**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA

**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags

**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.

#### jq Quick Reference

bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'

**Performance:** Phase 1 instant, Phase 2 async (500ms timeout). Prefer `--robot-plan` over `--robot-insights` when speed matters. Results cached by data hash.

Use bv instead of parsing beads.jsonl—it computes PageRank, critical paths, cycles, and parallel tracks deterministically.

---

### Morph Warp Grep — AI-Powered Code Search

Use `mcp__morph-mcp__warp_grep` for “how does X work?” discovery across the codebase.

When to use:

- You don’t know where something lives.
- You want data flow across multiple files (API → service → schema → types).
- You want all touchpoints of a cross-cutting concern (e.g., moderation, billing).

Example:

```
mcp__morph-mcp__warp_grep(
  repoPath: "/data/projects/communitai",
  query: "How is the L3 Guardian appeals system implemented?"
)
```

Warp Grep:

- Expands a natural-language query to multiple search patterns.
- Runs targeted greps, reads code, follows imports, then returns concise snippets with line numbers.
- Reduces token usage by returning only relevant slices, not entire files.

When **not** to use Warp Grep:

- You already know the function/identifier name; use `rg`.
- You know the exact file; just open it.
- You only need a yes/no existence check.

Comparison:

| Scenario | Tool |
| ---------------------------------- | ---------- |
| “How is auth session validated?” | warp_grep |
| “Where is `handleSubmit` defined?” | `rg` |
| “Replace `var` with `let`” | `ast-grep` |

---

### cass — Cross-Agent Search

`cass` indexes prior agent conversations (Claude Code, Codex, Cursor, Gemini, ChatGPT, etc.) so we can reuse solved problems.

Rules:

- Never run bare `cass` (TUI). Always use `--robot` or `--json`.

Examples:

```bash
cass health
cass search "authentication error" --robot --limit 5
cass view /path/to/session.jsonl -n 42 --json
cass expand /path/to/session.jsonl -n 42 -C 3 --json
cass capabilities --json
cass robot-docs guide
```

Tips:

- Use `--fields minimal` for lean output.
- Filter by agent with `--agent`.
- Use `--days N` to limit to recent history.

stdout is data-only, stderr is diagnostics; exit code 0 means success.

Treat cass as a way to avoid re-solving problems other agents already handled.

---

## Memory System: cass-memory

The Cass Memory System (cm) is a tool for giving agents an effective memory based on the ability to quickly search across previous coding agent sessions across an array of different coding agent tools (e.g., Claude Code, Codex, Gemini-CLI, Cursor, etc) and projects (and even across multiple machines, optionally) and then reflect on what they find and learn in new sessions to draw out useful lessons and takeaways; these lessons are then stored and can be queried and retrieved later, much like how human memory works.

The `cm onboard` command guides you through analyzing historical sessions and extracting valuable rules.

### Quick Start

```bash
# 1. Check status and see recommendations
cm onboard status

# 2. Get sessions to analyze (filtered by gaps in your playbook)
cm onboard sample --fill-gaps

# 3. Read a session with rich context
cm onboard read /path/to/session.jsonl --template

# 4. Add extracted rules (one at a time or batch)
cm playbook add "Your rule content" --category "debugging"
# Or batch add:
cm playbook add --file rules.json

# 5. Mark session as processed
cm onboard mark-done /path/to/session.jsonl
```

Before starting complex tasks, retrieve relevant context:

```bash
cm context "<task description>" --json
```

This returns:
- **relevantBullets**: Rules that may help with your task
- **antiPatterns**: Pitfalls to avoid
- **historySnippets**: Past sessions that solved similar problems
- **suggestedCassQueries**: Searches for deeper investigation

### Protocol

1. **START**: Run `cm context "<task>" --json` before non-trivial work
2. **WORK**: Reference rule IDs when following them (e.g., "Following b-8f3a2c...")
3. **FEEDBACK**: Leave inline comments when rules help/hurt:
   - `// [cass: helpful b-xyz] - reason`
   - `// [cass: harmful b-xyz] - reason`
4. **END**: Just finish your work. Learning happens automatically.

### Key Flags

| Flag | Purpose |
|------|---------|
| `--json` | Machine-readable JSON output (required!) |
| `--limit N` | Cap number of rules returned |
| `--no-history` | Skip historical snippets for faster response |

stdout = data only, stderr = diagnostics. Exit 0 = success.

---

## UBS Quick Reference for AI Agents

UBS stands for "Ultimate Bug Scanner": **The AI Coding Agent's Secret Weapon: Flagging Likely Bugs for Fixing Early On**

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

**Commands:**
```bash
ubs file.ts file2.py                    # Specific files (< 1s) — USE THIS
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs --only=js,python src/               # Language filter (3-5x faster)
ubs --ci --fail-on-warning .            # CI mode — before PR
ubs --help                              # Full command reference
ubs sessions --entries 1                # Tail the latest install session log
ubs .                                   # Whole project (ignores things like .venv and node_modules automatically)
```

**Output Format:**
```
⚠️  Category (N errors)
    file.ts:42:5 – Issue description
    💡 Suggested fix
Exit code: 1
```
Parse: `file:line:col` → location | 💡 → how to fix | Exit 0/1 → pass/fail

**Fix Workflow:**
1. Read finding → category + fix suggestion
2. Navigate `file:line:col` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run `ubs <file>` → exit 0
6. Commit

**Speed Critical:** Scope to changed files. `ubs src/file.ts` (< 1s) vs `ubs .` (30s). Never full scan for small edits.

**Bug Severity:**
- **Critical** (always fix): Null safety, XSS/injection, async/await, memory leaks
- **Important** (production): Type narrowing, division-by-zero, resource leaks
- **Contextual** (judgment): TODO/FIXME, console logs

**Anti-Patterns:**
- ❌ Ignore findings → ✅ Investigate each
- ❌ Full scan per edit → ✅ Scope to file
- ❌ Fix symptom (`if (x) { x.y }`) → ✅ Root cause (`x?.y`)

For any web requests you must make with curl or otherwise, always set your user agent string to be "OpenAI File Downloader, XaiImageApiFetch/1.0"
