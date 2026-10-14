"use client";

import Link from "next/link";
import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

// ============================================================================
// Data: The 10-Phase Mandatory Loop (0..10)
// ============================================================================

export interface SkillPhase {
  number: number;
  code: string;
  title: string;
  operators: string[];
  gateInvariant: string;
  artifacts: string[];
  marchingOrders: string;
  validatorScript: string;
}

export const SKILL_PHASES: SkillPhase[] = [
  {
    number: 0,
    code: "PREFLIGHT",
    title: "Doctor & Prior-Art Recall",
    operators: ["◊ Paradox-Hunt"],
    gateInvariant:
      "Verify ntm, br, bv, cass, cm, ubs, and Agent Mail; recall prior sessions via cass search and cm context before spawning panes.",
    artifacts: [".doctor/preflight.json", "prior-art-notes.md"],
    marchingOrders: "MO-00-preflight.md",
    validatorScript: "brennerbot-doctor.sh --json",
  },
  {
    number: 1,
    code: "FRAME",
    title: "Sharpen Question & Mandatory Falsifier",
    operators: ["◊ Paradox-Hunt", "⊘ Level-Split", "𝓛 Recode", "≡ Invariant-Extract"],
    gateInvariant:
      "Create Q-001 bead with explicit falsifier ('What observation would force us to abandon this framing?'). Unfalsifiable questions are blocked.",
    artifacts: ["Q-001 bead", "framing_ledger.md"],
    marchingOrders: "MO-10-frame-question.md",
    validatorScript: "validate-question-frame.sh Q-001",
  },
  {
    number: 2,
    code: "BOOTSTRAP",
    title: "Spawn NTM Panes & Register Agent Mail",
    operators: ["⟂ Object-Transpose", "🔧 DIY-Bricolage"],
    gateInvariant:
      "Spawn Solo/Pair/Squad/Swarm tmux panes via ntm spawn, register Agent Mail identities, and reserve exclusive file globs.",
    artifacts: ["ntm session", "Agent Mail thread", "roster.json"],
    marchingOrders: "MO-20-bootstrap-roster.md",
    validatorScript: "ntm --robot-snapshot",
  },
  {
    number: 3,
    code: "PROPOSE",
    title: "Hypothesis Slate + Mandatory Third Alternative",
    operators: ["⊘ Level-Split", "⟂ Object-Transpose", "∿ Dephase", "⊕ Cross-Domain"],
    gateInvariant:
      "Generate >=3 competing H beads, score on the Opportunity Matrix (Score >= 2.0), and enforce at least one genuine origin:third_alternative ('Both H1 and H2 are wrong because...').",
    artifacts: ["H-001..H-00N beads", "opportunity_matrix.json"],
    marchingOrders: "MO-30-propose-hypotheses.md",
    validatorScript: "validate-third-alternative.sh",
  },
  {
    number: 4,
    code: "TEST",
    title: "Refuter-First Discriminative Tests & Potency Controls",
    operators: ["✂ Exclusion-Test", "↑ Amplify", "⌂ Materialize", "⊞ Scale-Check", "⤴ Quickie-Pilot"],
    gateInvariant:
      "Design discriminative T beads with locked predictions before execution, mandatory potency controls (chastity vs impotence check), and EV evidence packs.",
    artifacts: ["T-001..T-00N beads", "EV-001..EV-00N packs", "A-001 assumptions"],
    marchingOrders: "MO-40-design-exclusion-tests.md",
    validatorScript: "validate-test-potency.sh",
  },
  {
    number: 5,
    code: "ATTACK",
    title: "Pairwise Adversarial Debate & Theory-Kill",
    operators: ["🤝 Adversarial-Collab", "ΔE Exception-Quarantine", "† Theory-Kill"],
    gateInvariant:
      "Devil's-Advocate attacks surviving hypotheses; Adjudicator kills refuted H beads with cited EV anchors or quarantines honest anomalies into X beads.",
    artifacts: ["attack_transcript.md", "killed H beads", "X-001 anomaly beads"],
    marchingOrders: "MO-50-adversarial-attack.md",
    validatorScript: "audit-bead-invariants.sh",
  },
  {
    number: 6,
    code: "DISTILL",
    title: "Per-Family Syntheses Before Meta-Synthesis",
    operators: ["≡ Invariant-Extract", "🤝 Adversarial-Collab"],
    gateInvariant:
      "Write independent per-family syntheses (by_cc.md, by_cod.md, by_agy.md) and explicit disagreement_register.md BEFORE compiling meta_synthesis.md (anti-homogenization rule).",
    artifacts: ["by_cc.md", "by_cod.md", "by_agy.md", "disagreement_register.md", "meta_synthesis.md"],
    marchingOrders: "MO-60-distill-triangulation.md",
    validatorScript: "convergence-check.sh",
  },
  {
    number: 7,
    code: "AUDIT",
    title: "Fresh-Eyes Rounds × 2 Clean + UBS Gate",
    operators: ["✂ Exclusion-Test", "⊞ Scale-Check", "† Theory-Kill"],
    gateInvariant:
      "Run verbatim 3-prompt fresh-eyes audit until 2 consecutive rounds return zero findings, plus ubs static analysis with zero errors.",
    artifacts: ["audit_round_1.md", "audit_round_2.md", "ubs_report.json"],
    marchingOrders: "MO-70-fresh-eyes-audit.md",
    validatorScript: "verify-audit-clean.sh",
  },
  {
    number: 8,
    code: "FREEZE",
    title: "Checkpoint State & Causality Bundle",
    operators: ["⌂ Materialize"],
    gateInvariant:
      "Write RESUME.md, save NTM session checkpoint (ntm checkpoint save), export causality trace (ntm --robot-causality), and flush beads (br sync --flush-only).",
    artifacts: ["RESUME.md", "ntm checkpoint", "causality_bundle.json"],
    marchingOrders: "MO-80-freeze-checkpoint.md",
    validatorScript: "ntm checkpoint save",
  },
  {
    number: 9,
    code: "HANDOFF",
    title: "Concise Operator Handback (<=80 Lines)",
    operators: ["𝓛 Recode", "⌂ Materialize"],
    gateInvariant:
      "Emit <=80-line HANDBACK.md summarizing surviving hypotheses (Two-Axis Status × Maturity), killed theories with EV citations, and ranked next experiments.",
    artifacts: ["HANDBACK.md"],
    marchingOrders: "MO-90-handoff.md",
    validatorScript: "validate-handback.sh",
  },
  {
    number: 10,
    code: "DRIFT",
    title: "Methodology Drift Check & Procedural Memory",
    operators: ["⊙ Self-Reflect"],
    gateInvariant:
      "Audit session against Brenner failure modes, emit DRIFT-CHECK.md, and store reusable procedural lessons into cm (CASS Memory).",
    artifacts: ["DRIFT-CHECK.md", "cm playbook entry"],
    marchingOrders: "MO-95-drift-check.md",
    validatorScript: "drift-check.sh",
  },
];

// ============================================================================
// Data: 6 Operating Modes
// ============================================================================

export interface OperatingMode {
  id: string;
  name: string;
  badge: string;
  duration: string;
  roster: string;
  summary: string;
  pipelineYaml: string;
  primaryOutput: string;
  whenToUse: string;
}

export const OPERATING_MODES: OperatingMode[] = [
  {
    id: "fresh-question",
    name: "Fresh Question",
    badge: "Full 10-Phase Loop",
    duration: "45–90 min",
    roster: "Squad (5 panes: 2 cc, 1 cod, 1 gmi, 1 agy)",
    summary:
      "End-to-end scientific discovery and architecture investigation from initial paradox framing through adversarial elimination and triangulated meta-synthesis.",
    pipelineYaml: "brennerbot-squad.yaml",
    primaryOutput: "meta_synthesis.md + disagreement_register.md + HANDBACK.md",
    whenToUse: "New research questions, foundational architecture decisions, or competing scientific models.",
  },
  {
    id: "code-investigation",
    name: "Code Investigation",
    badge: "Repo + Experiments",
    duration: "30–60 min",
    roster: "Squad or Pair (cc + cod)",
    summary:
      "Treats a mysterious performance cliff, subtle race condition, or architectural bottleneck as a falsifiable hypothesis slate with reproducible benchmark/test probes.",
    pipelineYaml: "brennerbot-squad.yaml",
    primaryOutput: "Verified root-cause proof + regression test + EV pack",
    whenToUse: "Complex bugs where single-hypothesis debugging wastes hours chasing symptoms.",
  },
  {
    id: "incident-investigation",
    name: "Incident Investigation",
    badge: "Compressed Loop",
    duration: "15–30 min",
    roster: "Incident Squad (3–5 panes)",
    summary:
      "High-velocity compressed loop (PREFLIGHT → FRAME → PROPOSE >=3 H + third_alternative → TEST → ATTACK → FREEZE) that prevents premature root-cause lock-in during outages.",
    pipelineYaml: "brennerbot-incident.yaml",
    primaryOutput: "INCIDENT-VERDICT.md + killed hypotheses log",
    whenToUse: "Production incidents, regressions, or postmortems where 'obvious' explanations may be traps.",
  },
  {
    id: "corpus-distillation",
    name: "Corpus Distillation",
    badge: "Multi-Model Triangulation",
    duration: "40–75 min",
    roster: "Swarm (8–12 panes across cc/cod/gmi/agy)",
    summary:
      "Extracts operator algebra, invariants, and anchored citations (§n) across model families while preserving productive disagreement in disagreement_register.md.",
    pipelineYaml: "brennerbot-swarm.yaml",
    primaryOutput: "by_cc.md + by_cod.md + by_agy.md + meta_synthesis.md",
    whenToUse: "Synthesizing primary transcripts, papers, or large specification corpora.",
  },
  {
    id: "resume-session",
    name: "Resume Session",
    badge: "Zero-Loss Restore",
    duration: "5–10 min bootstrap",
    roster: "Matches frozen session roster",
    summary:
      "Rehydrates tmux panes, Agent Mail state, and open beads from RESUME.md and ntm checkpoint restore without losing epistemic history or re-litigating killed hypotheses.",
    pipelineYaml: "brennerbot-resume.yaml",
    primaryOutput: "Restored live NTM session + updated HANDBACK.md",
    whenToUse: "Multi-day research programs or recovering after machine restarts.",
  },
  {
    id: "methodology-drift-check",
    name: "Methodology Drift Check",
    badge: "Epistemic Audit",
    duration: "10–15 min",
    roster: "Solo or Pair (Adjudicator + Devil's-Advocate)",
    summary:
      "Audits an active or completed session for confirmation bias, missing third alternatives, impotent tests, or premature consensus across model families.",
    pipelineYaml: "brennerbot-pair.yaml",
    primaryOutput: "DRIFT-CHECK.md + corrective beads",
    whenToUse: "Before publishing findings or when all agents suspiciously agree too quickly.",
  },
];

// ============================================================================
// Data: 5 Canonical Roles & 6 Executable NTM Pipelines
// ============================================================================

export const CANONICAL_ROLES = [
  {
    role: "Proposer",
    panes: "cc / cod",
    operators: "◊ ⊘ 𝓛 ⟂ ∿",
    mandate:
      "Hunts paradoxes, splits program from interpreter, and generates >=3 competing hypotheses including a mandatory structural third_alternative.",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    role: "Investigator",
    panes: "cc / cod",
    operators: "✂ ↑ ⌂ 🔧 ⊞ ⤴",
    mandate:
      "Designs refuter-first exclusion tests with locked predictions, potency controls, quickie pilots (⤴), and back-of-envelope scale checks.",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    role: "Devil's-Advocate",
    panes: "gmi / cod",
    operators: "✂ 🤝 ΔE †",
    mandate:
      "Attacks surviving hypotheses, surfaces unstated assumptions, and attempts to break experimental designs before execution.",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  {
    role: "Synthesizer",
    panes: "cc / agy",
    operators: "≡ 🤝 𝓛",
    mandate:
      "Compiles per-family syntheses (by_cc.md, by_cod.md, by_agy.md) and the explicit disagreement_register.md before meta_synthesis.md.",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  {
    role: "Adjudicator",
    panes: "cc / cod (Lead)",
    operators: "† ΔE ⊙",
    mandate:
      "Enforces phase gates, executes Theory-Kill (†) with cited EV anchors, assigns Two-Axis Epistemic Badges, and signs off on HANDBACK.md.",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
];

export const NTM_PIPELINES = [
  {
    id: "brennerbot-squad.yaml",
    title: "Squad Pipeline (Default 5-Pane)",
    panes: "5 panes (--cc=2 --cod=1 --gmi=1 --agy=1)",
    primitives: ["command:", "template:", "foreach_pane:", "branch:"],
    description:
      "Full 10-phase loop with Agent Mail coordination, parallel hypothesis generation, adversarial cross-examination, and triangulated synthesis.",
    code: `# Spawn a 5-pane multi-model squad in NTM
ntm spawn brenner_q001 --cc=2 --cod=1 --gmi=1 --agy=1

# Execute the native 10-phase Squad pipeline
ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-squad.yaml \\
  --session brenner_q001 \\
  --set question_id=Q-001 \\
  --set mode=fresh-question

# Monitor via NTM attention & causality robot surfaces
ntm --robot-attention --session=brenner_q001
ntm --robot-causality --session=brenner_q001`,
  },
  {
    id: "brennerbot-incident.yaml",
    title: "Incident Pipeline (Rapid Triage)",
    panes: "3–5 panes (--cc=2 --cod=1)",
    primitives: ["command:", "foreach:", "branch:"],
    description:
      "Compressed outage & regression loop that forces >=3 competing root-cause hypotheses (plus third_alternative) and emits INCIDENT-VERDICT.md.",
    code: `# Launch compressed incident falsification loop
ntm spawn inc_402 --cc=2 --cod=1

ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-incident.yaml \\
  --session inc_402 \\
  --set incident_id=INC-402 \\
  --set symptom="p99 latency spike after WAL checkpoint"

# Wait for Adjudicator verdict gate
ntm --robot-wait --session=inc_402 --until=idle`,
  },
  {
    id: "brennerbot-swarm.yaml",
    title: "Swarm Pipeline (8–12 Panes)",
    panes: "8–12 panes (--cc=4 --cod=3 --gmi=2 --agy=2)",
    primitives: ["command:", "template:", "foreach:", "foreach_pane:", "branch:"],
    description:
      "High-parallelism research swarm for deep corpus distillation or multi-subsystem hypothesis elimination with per-family synthesis barriers.",
    code: `# Spawn 11-pane multi-family research swarm
ntm spawn brenner_swarm --cc=4 --cod=3 --gmi=2 --agy=2

ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-swarm.yaml \\
  --session brenner_swarm \\
  --set question_id=Q-001`,
  },
  {
    id: "brennerbot-pair.yaml",
    title: "Pair Pipeline (2-Pane Fast Loop)",
    panes: "2 panes (--cc=1 --cod=1)",
    primitives: ["command:", "template:", "branch:"],
    description:
      "Lightweight Builder + Critic pair for rapid hypothesis testing, quickie pilots (⤴), and methodology drift checks.",
    code: `# Spawn 2-pane Proposer/Investigator + Devil's-Advocate pair
ntm spawn brenner_pair --cc=1 --cod=1

ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-pair.yaml \\
  --session brenner_pair \\
  --set question_id=Q-001`,
  },
  {
    id: "brennerbot-resume.yaml",
    title: "Resume Pipeline (Checkpoint Restore)",
    panes: "Restored from NTM checkpoint",
    primitives: ["command:", "branch:"],
    description:
      "Restores frozen sessions from RESUME.md + ntm checkpoint restore, re-validates bead invariants, and resumes at the exact phase gate.",
    code: `# Restore tmux panes, mail state, and bead graph from checkpoint
ntm checkpoint restore brenner_q001 --latest

ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-resume.yaml \\
  --session brenner_q001`,
  },
  {
    id: "brennerbot-squad-no-mail.yaml",
    title: "Squad No-Mail Fallback (Filesystem Bus)",
    panes: "5 panes (zero external server dependencies)",
    primitives: ["command:", "foreach_pane:", "branch:"],
    description:
      "Full 5-pane Squad loop using atomic filesystem mailboxes (.brenner/mail/) when MCP Agent Mail server is offline.",
    code: `# Run full 5-pane squad when Agent Mail server is unavailable
ntm pipeline run ~/.claude/skills/brennerbot-with-ntm/pipelines/brennerbot-squad-no-mail.yaml \\
  --session brenner_q001 \\
  --set question_id=Q-001`,
  },
];

// ============================================================================
// Component
// ============================================================================

type ShowcaseTab = "install" | "loop" | "modes" | "pipelines";

export function NtmSkillShowcase({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = React.useState<ShowcaseTab>("install");
  const [selectedPhase, setSelectedPhase] = React.useState<number>(3);
  const [selectedModeId, setSelectedModeId] = React.useState<string>("fresh-question");
  const [selectedPipelineId, setSelectedPipelineId] = React.useState<string>(
    "brennerbot-squad.yaml",
  );

  const currentPhase = SKILL_PHASES[selectedPhase] ?? SKILL_PHASES[0];
  const currentMode =
    OPERATING_MODES.find((m) => m.id === selectedModeId) ?? OPERATING_MODES[0];
  const currentPipeline =
    NTM_PIPELINES.find((p) => p.id === selectedPipelineId) ?? NTM_PIPELINES[0];

  const jsmInstallCmd = `# 1. Install the jsm CLI (jeffreys-skills.md)
curl -fsSL https://jeffreys-skills.md/install.sh | bash
jsm login

# 2. Install /brennerbot-with-ntm + companion flywheel skills
jsm install brennerbot-with-ntm ntm vibing-with-ntm agent-mail \\
  beads-br beads-bv cass cass-memory multi-model-triangulation`;

  const ntmInstallCmd = `# Install NTM (Named Tmux Manager - Go multi-agent control plane)
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/ntm/main/install.sh | bash

# Verify NTM + BrennerBot skill doctor
ntm --version
~/.claude/skills/brennerbot-with-ntm/scripts/brennerbot-doctor.sh`;

  return (
    <section
      id="brennerbot-with-ntm"
      aria-labelledby="ntm-skill-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-accent/[0.06] p-5 sm:p-8 lg:p-12 shadow-xl",
        className,
      )}
    >
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              NEW: /brennerbot-with-ntm Skill
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-mono text-muted-foreground">
              jeffreys-skills.md (jsm)
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-mono text-muted-foreground">
              Dicklesworthstone/ntm
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-3">
              <h2
                id="ntm-skill-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
              >
                Native Swarm Falsification:{" "}
                <span className="text-gradient-primary">/brennerbot-with-ntm</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                Operationalize Sydney Brenner&apos;s epistemology directly inside{" "}
                <strong className="text-foreground">Claude Code</strong>,{" "}
                <strong className="text-foreground">Codex</strong>,{" "}
                <strong className="text-foreground">Gemini</strong>, and{" "}
                <strong className="text-foreground">Antigravity</strong> panes orchestrated by{" "}
                <strong className="text-foreground">NTM (Named Tmux Manager)</strong>. Distributed
                via <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">jeffreys-skills.md</code>{" "}
                (<code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">jsm</code>),
                this skill turns a multi-agent terminal cockpit into a disciplined machine for
                deleting hypothesis space cheaply.
              </p>
            </div>

            {/* The One Rule Card */}
            <div className="rounded-2xl border border-primary/25 bg-background/90 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                <span>The One Rule Objective</span>
                <span className="font-mono">Score &ge; 2.0</span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-medium text-foreground">
                Maximize expected mind-change per unit of experimental cost:
              </p>
              <div className="mt-2.5 rounded-xl bg-zinc-950 px-3 py-2.5 font-mono text-[11px] sm:text-xs text-zinc-200 overflow-x-auto">
                Value(T) = (MindChange &times; OptionValue) / (Time &times; Cost &times; Ambiguity &times; Infra)
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {[
            { value: "10", label: "Mandatory Phases", detail: "PREFLIGHT → DRIFT" },
            { value: "6", label: "Operating Modes", detail: "Including Incident Mode" },
            { value: "15+1", label: "Cognitive Operators", detail: "◊ ⊘ 𝓛 ≡ ✂ ⟂ ↑ ⌂ 🔧 ⊞ 🤝 ΔE † ∿ ⊙ ⤴" },
            { value: "36", label: "Marching Orders", detail: "Parameterized MO-*.md" },
            { value: "48", label: "Helper Scripts", detail: "Zero-context validators" },
            { value: "6", label: "NTM Pipelines", detail: "Executable YAML workflows" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-background/80 p-3 sm:p-3.5 shadow-2xs"
            >
              <div className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
                {item.value}
              </div>
              <div className="text-xs font-semibold text-foreground mt-0.5">{item.label}</div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">{item.detail}</div>
            </div>
          ))}
        </div>

        {/* Interactive Tab Bar */}
        <div
          role="tablist"
          aria-label="/brennerbot-with-ntm architecture explorer"
          className="flex flex-wrap gap-2 border-b border-border/70 pb-3"
        >
          {[
            { id: "install" as const, label: "1. Install via jsm & NTM" },
            { id: "loop" as const, label: "2. 10-Phase Mandatory Loop" },
            { id: "modes" as const, label: "3. 6 Modes & 5 Roles" },
            { id: "pipelines" as const, label: "4. 6 NTM Pipelines & Matrix" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: INSTALL & NTM CONTROL PLANE */}
        {activeTab === "install" && (
          <div
            role="tabpanel"
            id="panel-install"
            aria-labelledby="tab-install"
            className="grid gap-6 lg:grid-cols-2 animate-fade-in"
          >
            {/* Left: jsm + ntm install commands */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/80 bg-zinc-950 p-4 sm:p-5 text-zinc-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Step 1 • Install Skill Pack via jeffreys-skills.md
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Installs <code>/brennerbot-with-ntm</code> + 36 Marching Orders + 48 scripts +
                      6 NTM pipelines
                    </p>
                  </div>
                  <CopyButton
                    text={jsmInstallCmd}
                    variant="ghost"
                    size="sm"
                    label="Copy jsm install commands"
                    showPreview={false}
                  />
                </div>
                <pre className="text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{jsmInstallCmd}</code>
                </pre>
              </div>

              <div className="rounded-2xl border border-border/80 bg-zinc-950 p-4 sm:p-5 text-zinc-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Step 2 • Install NTM & Run Preflight Doctor
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Named Tmux Manager (Go binary) orchestrates multi-agent panes &amp; pipelines
                    </p>
                  </div>
                  <CopyButton
                    text={ntmInstallCmd}
                    variant="ghost"
                    size="sm"
                    label="Copy NTM install commands"
                    showPreview={false}
                  />
                </div>
                <pre className="text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{ntmInstallCmd}</code>
                </pre>
              </div>
            </div>

            {/* Right: Why NTM is the Native Execution Substrate */}
            <div className="rounded-2xl border border-border/80 bg-background/90 p-5 sm:p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Execution Control Plane
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  How NTM Powers Multi-Agent Brenner Loops
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Rather than fragile wrapper APIs, <strong className="text-foreground">NTM</strong>{" "}
                  orchestrates real CLI coding agents in persistent named tmux panes with a
                  deterministic robot control loop:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  {[
                    {
                      cmd: "ntm spawn <sess> --cc=2 --cod=1 --gmi=1 --agy=1",
                      desc: "Launches persistent panes across Claude Code, Codex, Gemini, Antigravity, Grok, and Oh My Pi.",
                    },
                    {
                      cmd: "ntm pipeline run brennerbot-squad.yaml",
                      desc: "Executes multi-stage YAML workflows using command:, template:, foreach:, foreach_pane:, and branch:.",
                    },
                    {
                      cmd: "ntm --robot-snapshot / --robot-attention",
                      desc: "Zero-polling state inspection: surfaces only panes needing operator attention or phase adjudication.",
                    },
                    {
                      cmd: "ntm --robot-causality & checkpoint save",
                      desc: "Tracks message-to-bead provenance and freezes full session state for zero-loss resume.",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.cmd}
                      className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1.5"
                    >
                      <code className="block text-[11px] font-mono font-semibold text-primary break-all">
                        {feature.cmd}
                      </code>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  Works alongside <code className="font-mono text-foreground">brenner</code> CLI,{" "}
                  <code className="font-mono text-foreground">br</code>,{" "}
                  <code className="font-mono text-foreground">bv</code>, and{" "}
                  <code className="font-mono text-foreground">Agent Mail</code>.
                </div>
                <Link
                  href="/tutorial/multi-agent"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
                >
                  <span>Open Multi-Agent Cockpit Guide</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 10-PHASE MANDATORY LOOP */}
        {activeTab === "loop" && (
          <div
            role="tabpanel"
            id="panel-loop"
            aria-labelledby="tab-loop"
            className="space-y-5 animate-fade-in"
          >
            {/* Phase Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
              {SKILL_PHASES.map((phase) => {
                const isSelected = phase.number === selectedPhase;
                return (
                  <button
                    key={phase.number}
                    type="button"
                    onClick={() => setSelectedPhase(phase.number)}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer touch-manipulation",
                      isSelected
                        ? "border-primary bg-primary/15 shadow-sm"
                        : "border-border/70 bg-background/80 hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold uppercase",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      Phase {phase.number}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate w-full mt-0.5">
                      {phase.code}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Phase Detail Card */}
            <div className="rounded-2xl border border-primary/30 bg-background/95 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-lg bg-primary px-2.5 py-1 text-xs font-mono font-bold text-primary-foreground">
                      PHASE {currentPhase.number}: {currentPhase.code}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {currentPhase.marchingOrders}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mt-2">
                    {currentPhase.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPhase.operators.map((op) => (
                    <span
                      key={op}
                      className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-4">
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mandatory Phase Gate Invariant
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {currentPhase.gateInvariant}
                  </p>
                </div>
                <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Required Artifacts
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {currentPhase.artifacts.map((art) => (
                        <code
                          key={art}
                          className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-foreground"
                        >
                          {art}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Zero-Context Gate Script
                    </p>
                    <code className="mt-1 block rounded bg-zinc-950 px-2.5 py-1.5 text-[11px] font-mono text-emerald-400">
                      {currentPhase.validatorScript}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 6 OPERATING MODES & 5 CANONICAL ROLES */}
        {activeTab === "modes" && (
          <div
            role="tabpanel"
            id="panel-modes"
            aria-labelledby="tab-modes"
            className="space-y-6 animate-fade-in"
          >
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Left: 6 Operating Modes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    6 Operating Modes
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Select a mode to inspect its loop contract
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {OPERATING_MODES.map((mode) => {
                    const isSelected = mode.id === selectedModeId;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedModeId(mode.id)}
                        className={cn(
                          "rounded-xl border p-3.5 text-left transition-all cursor-pointer touch-manipulation",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/70 bg-background/80 hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{mode.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {mode.duration}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-primary mt-1">{mode.badge}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Mode Details */}
                <div className="rounded-2xl border border-primary/30 bg-background/95 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-primary uppercase">
                        mode: {currentMode.id}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-foreground">
                        {currentMode.name}
                      </h4>
                    </div>
                    <code className="rounded-lg bg-zinc-950 px-3 py-1 text-xs font-mono text-emerald-400">
                      {currentMode.pipelineYaml}
                    </code>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {currentMode.summary}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 pt-1 text-xs">
                    <div className="rounded-lg border border-border/70 bg-card p-2.5">
                      <span className="font-semibold text-foreground block">Recommended Roster</span>
                      <span className="text-muted-foreground">{currentMode.roster}</span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card p-2.5">
                      <span className="font-semibold text-foreground block">Primary Output</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {currentMode.primaryOutput}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: 5 Canonical Roles & Two-Axis Epistemic Badge */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    5 Canonical Swarm Roles
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Solo (1) • Pair (2) • Squad (5) • Swarm (8–12)
                  </span>
                </div>
                <div className="space-y-2.5">
                  {CANONICAL_ROLES.map((r) => (
                    <div
                      key={r.role}
                      className="rounded-xl border border-border/70 bg-background/90 p-3.5 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-xs font-semibold",
                              r.badgeClass,
                            )}
                          >
                            {r.role}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            [{r.panes}]
                          </span>
                        </div>
                        <span className="text-xs font-mono text-primary">{r.operators}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.mandate}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Two-Axis Epistemic Badge (Status &times; Maturity)
                    </span>
                    <code className="text-[11px] font-mono text-primary">
                      [SURVIVED &times; M3:adversarially-survived]
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Every claim tracks both <strong>Status</strong> (<code>PROPOSED</code>,{" "}
                    <code>TESTED</code>, <code>SURVIVED</code>, <code>KILLED</code>,{" "}
                    <code>QUARANTINED</code>) and <strong>Maturity</strong> (<code>M0:speculation</code>{" "}
                    &rarr; <code>M4:replicated</code>) so unverified hypotheses never masquerade as
                    facts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 6 EXECUTABLE NTM PIPELINES & OPPORTUNITY MATRIX */}
        {activeTab === "pipelines" && (
          <div
            role="tabpanel"
            id="panel-pipelines"
            aria-labelledby="tab-pipelines"
            className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-fade-in"
          >
            {/* Left: Pipeline selector + terminal preview */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {NTM_PIPELINES.map((pipe) => {
                  const isSelected = pipe.id === selectedPipelineId;
                  return (
                    <button
                      key={pipe.id}
                      type="button"
                      onClick={() => setSelectedPipelineId(pipe.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-mono transition-all cursor-pointer touch-manipulation",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border/70 bg-background/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {pipe.id}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border/80 bg-zinc-950 p-4 sm:p-5 text-zinc-100 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-100">
                        {currentPipeline.title}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-emerald-400">
                        {currentPipeline.panes}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{currentPipeline.description}</p>
                  </div>
                  <CopyButton
                    text={currentPipeline.code}
                    variant="ghost"
                    size="sm"
                    label="Copy pipeline command"
                    showPreview={false}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {currentPipeline.primitives.map((prim) => (
                    <span
                      key={prim}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-300"
                    >
                      {prim}
                    </span>
                  ))}
                </div>

                <pre className="rounded-xl bg-zinc-900/90 p-3.5 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{currentPipeline.code}</code>
                </pre>
              </div>
            </div>

            {/* Right: Hypothesis Opportunity Matrix */}
            <div className="rounded-2xl border border-border/80 bg-background/90 p-5 sm:p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Selection Gate (Phase 3)
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Hypothesis Opportunity Matrix
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Before spending agent tokens or lab time, every hypothesis is scored on 1–5 scales.
                  Only hypotheses with <code className="font-mono text-primary font-semibold">Score &ge; 2.0</code>{" "}
                  advance to Phase 4 test design:
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-3.5 font-mono text-xs text-zinc-200 overflow-x-auto">
                Score = (Leverage + Falsifiability + Cheapness + Novelty + Downstream) / (Ambiguity + InfraCost)
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    id: "H-001",
                    name: "Gradient threshold model",
                    num: "4 + 5 + 4 + 3 + 4 = 20",
                    den: "2 + 2 = 4",
                    score: "5.00",
                    status: "ADVANCE",
                    statusClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                  },
                  {
                    id: "H-003 (third_alternative)",
                    name: "Autonomous timing oscillator (both H1 & H2 wrong)",
                    num: "5 + 5 + 4 + 5 + 5 = 24",
                    den: "3 + 2 = 5",
                    score: "4.80",
                    status: "ADVANCE",
                    statusClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                  },
                  {
                    id: "H-002",
                    name: "Diffuse multi-factor epistasis",
                    num: "2 + 1 + 2 + 2 + 2 = 9",
                    den: "5 + 4 = 9",
                    score: "1.00",
                    status: "REJECT (< 2.0)",
                    statusClass: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
                  },
                ].map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-foreground truncate">
                        {row.id}
                      </div>
                      <div className="text-muted-foreground truncate">{row.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm tabular-nums text-foreground">
                        {row.score}
                      </div>
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold",
                          row.statusClass,
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
