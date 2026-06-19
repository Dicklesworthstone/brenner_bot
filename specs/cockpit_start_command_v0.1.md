# BrennerBot Cockpit Start Command Design v0.1

> **Status**: Draft specification
> **Purpose**: Define the CLI surface for `brenner cockpit start` - a one-command workflow for multi-agent session initialization
> **Depends on**: `cockpit_runbook_v0.1.md`, `agent_roster_schema_v0.1.md`
>
> **Implementation status (2025-12-31)**: `./brenner.ts cockpit start` is implemented, but the shipped flag surface differs from parts of this draft. Current behavior is documented in `./brenner.ts --help` and `specs/cockpit_runbook_v0.1.md`. In particular: `--role-map` is required; orchestration is controlled via `--skip-ntm`, `--skip-broadcast`, `--ntm-args`, and `--broadcast-message`; roster presets/files are not implemented.

---

## Overview

The `cockpit start` command consolidates multiple manual steps into a single operator action:

1. **(Optional)** Spawn an `ntm` session with agent panes
2. Send role-separated kickoff messages via Agent Mail
3. **(Optional)** Broadcast "check mail" to all agent panes

**Design principle**: Reduce friction while remaining humans-in-the-loop. No automatic driving of external CLIs.

---

## Command Surface

### Basic Syntax

```bash
brenner cockpit start [options]
```

### Required Arguments

| Flag | Description | Example |
|------|-------------|---------|
| `--thread-id <id>` | Session join key (also becomes ntm session name) | `RS-20251231-cell-fate` |
| `--excerpt-file <path>` | Path to grounding material (transcript excerpts) | `excerpt.md` |

### Role Assignment (one of these is required unless `--unified`)

| Flag | Description | Example |
|------|-------------|---------|
| `--role-map <mapping>` | Explicit agent→role mapping | `"BlueLake=hypothesis_generator,..."` |
| `--roster-preset <name>` | Use a saved roster preset | `default-3-agent` |
| `--roster-file <path>` | Load roster from JSON file | `roster.json` |

### Optional Arguments

| Flag | Default | Description |
|------|---------|-------------|
| `--project-key <path>` | `$PWD` | Absolute path to project workspace |
| `--sender <name>` | `$AGENT_NAME` or `Operator` | Agent Mail sender identity |
| `--to <names>` | (from roster) | Comma-separated recipient list |
| `--question <text>` | (none) | Research question for kickoff |
| `--context <text>` | (none) | Domain context for kickoff |
| `--hypotheses <text>` | (none) | Seed hypotheses to consider |
| `--constraints <text>` | (none) | Experimental constraints |
| `--template <path>` | (default) | Metaprompt template path |
| `--with-memory` | false | Inject procedural memory from `cm` |
| `--unified` | false | Send same prompt to all (no role differentiation) |

### Orchestration Options

| Flag | Default | Description |
|------|---------|-------------|
| `--spawn` | false | Also spawn ntm session before sending |
| `--broadcast` | false | Also broadcast "check mail" after sending |
| `--ntm-recipe <name>` | (none) | ntm recipe for spawn (e.g., `balanced`) |
| `--ntm-layout <spec>` | (from roster) | Pane layout override (e.g., `--cc=1 --cod=1 --agy=1`) |

### Safety & Debugging

| Flag | Default | Description |
|------|---------|-------------|
| `--dry-run` | false | Show what would happen without executing |
| `--json` | false | Output structured JSON instead of human-readable |
| `--ack-required` | false | Require recipients to acknowledge kickoff |

---

## Behavior by Mode

### Default Mode (kickoff only)

```bash
brenner cockpit start \
  --thread-id RS-20251231-cell-fate \
  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,GreenValley=adversarial_critic" \
  --excerpt-file excerpt.md \
  --question "How does protein folding relate to cell fate decisions?"
```

**Actions**:
1. Validate roster mapping covers all recipients
2. Compose role-specific kickoff prompts (reuses `composeKickoffMessages`)
3. Send messages via Agent Mail
4. Print summary: "Sent 3 kickoff messages to thread RS-20251231-cell-fate"

**What it does NOT do**:
- Spawn ntm session (use `--spawn`)
- Broadcast to panes (use `--broadcast`)

### Full Orchestration Mode

```bash
brenner cockpit start \
  --thread-id RS-20251231-cell-fate \
  --roster-preset default-3-agent \
  --excerpt-file excerpt.md \
  --question "..." \
  --spawn \
  --broadcast
```

**Actions**:
1. Spawn ntm session named `RS-20251231-cell-fate` with panes from roster
2. Compose and send role-specific kickoff messages
3. Broadcast "Please check your Agent Mail inbox for thread: RS-20251231-cell-fate"
4. Print next steps:
   ```
   ✓ Spawned ntm session: RS-20251231-cell-fate
   ✓ Sent 3 kickoff messages
   ✓ Broadcast "check mail" to all panes

   Next commands:
     ntm attach RS-20251231-cell-fate         # Attach to session
     brenner session status --thread-id ...   # Watch for responses
     brenner session compile --thread-id ...  # Compile artifact
   ```

### Dry-Run Mode

```bash
brenner cockpit start \
  --thread-id RS-20251231-cell-fate \
  --roster-preset default-3-agent \
  --excerpt-file excerpt.md \
  --spawn --broadcast \
  --dry-run
```

**Output**:
```
DRY RUN: cockpit start

Would execute:
  1. ntm spawn RS-20251231-cell-fate --cc=1 --cod=1 --agy=1
  2. Send kickoff to BlueLake (hypothesis_generator)
  3. Send kickoff to PurpleMountain (test_designer)
  4. Send kickoff to GreenValley (adversarial_critic)
  5. ntm send RS-20251231-cell-fate --all "Please check your Agent Mail inbox..."

Roster:
  BlueLake        → hypothesis_generator (codex-cli)
  PurpleMountain  → test_designer (claude-code)
  GreenValley     → adversarial_critic (gemini-cli)
```

---

## Design Decisions

### D1: Default behavior is kickoff-only

**Rationale**: Many operators already have an ntm session running. Making `--spawn` opt-in avoids "session already exists" errors.

**Alternative considered**: Default to full orchestration. Rejected because it adds unexpected side effects.

### D2: Roster is required unless `--unified`

**Rationale**: Real Agent Mail identities (adjective+noun) don't contain role hints. Requiring explicit roster prevents "everyone gets the same prompt" mistakes.

**Alternative considered**: Fall back to heuristic matching. Rejected because it fails silently for real identities.

### D3: `--dry-run` shows commands, does not execute

**Rationale**: Operators want to preview the full orchestration before committing. Dry-run is essential for debugging.

### D4: ntm integration is optional

**Rationale**: The command should work even if ntm is not installed. Only `--spawn` and `--broadcast` require ntm.

---

## Mapping from Roster to ntm Panes

When `--spawn` is used, the command maps roster entries to ntm agent flags:

| Roster Program | ntm Flag |
|----------------|----------|
| `codex-cli` | `--cod=N` |
| `claude-code` | `--cc=N` |
| `antigravity` / `agy` | `--agy=N` |
| `gemini-cli` (legacy, retired 2026-06-18) | `--gmi=N` |
| (unknown) | (skip or warn) |

Example: A roster with 1 codex + 1 claude + 1 antigravity becomes:
```bash
ntm spawn RS-... --cc=1 --cod=1 --agy=1
```

If `--ntm-layout` is provided, it overrides this automatic mapping.

---

## Error Handling

### Missing Roster

```
Error: No roster provided. Use one of:
  --role-map "Agent1=role1,Agent2=role2,..."
  --roster-preset <name>
  --roster-file <path>
  --unified (for same-prompt mode)
```

### Roster Incomplete

```
Error: Roster missing entry for recipient: GreenValley
Provided recipients: BlueLake, PurpleMountain, GreenValley
Roster entries: BlueLake, PurpleMountain
```

### Session Already Exists (with `--spawn`)

```
Error: ntm session 'RS-20251231-cell-fate' already exists.
Use 'ntm attach RS-20251231-cell-fate' to attach, or choose a different --thread-id.
```

### ntm Not Installed (with `--spawn` or `--broadcast`)

```
Error: ntm is required for --spawn and --broadcast.
Install from: https://github.com/Dicklesworthstone/ntm
Or run without orchestration flags (kickoff-only mode).
```

---

## Examples

### Example 1: Quick Start (preset roster)

```bash
brenner cockpit start \
  --thread-id RS-20251231-rrp-perf \
  --roster-preset default-3-agent \
  --excerpt-file excerpts/rrp-perf.md \
  --question "Does RRP improve decoder latency without quality loss?"
```

### Example 2: Full Orchestration with Explicit Roster

```bash
brenner cockpit start \
  --thread-id RS-20251231-rrp-perf \
  --role-map "BlueLake=hypothesis_generator,RedForest=test_designer,GreenValley=adversarial_critic" \
  --excerpt-file excerpts/rrp-perf.md \
  --question "Does RRP improve decoder latency without quality loss?" \
  --spawn --broadcast \
  --ack-required
```

### Example 3: Dry Run to Preview

```bash
brenner cockpit start \
  --thread-id RS-20251231-rrp-perf \
  --roster-file roster.json \
  --excerpt-file excerpt.md \
  --spawn --broadcast \
  --dry-run
```

### Example 4: Unified Mode (no role separation)

```bash
brenner cockpit start \
  --thread-id RS-20251231-simple \
  --to BlueLake,RedForest \
  --unified \
  --excerpt-file excerpt.md
```

---

## Acceptance Criteria

- [x] CLI flags documented with examples
- [ ] Dry-run mode implemented
- [ ] Roster-to-ntm mapping implemented
- [ ] Error messages are actionable

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2025-12-31 | Initial design: command surface, behavior modes, error handling |
