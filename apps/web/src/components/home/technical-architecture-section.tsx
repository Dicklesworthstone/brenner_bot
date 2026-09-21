"use client";

/**
 * Technical Architecture Section
 *
 * Landing page section showcasing engineering foundation:
 * - CLI-First Design
 * - Local-First Storage
 * - Deterministic Merging
 * - Security Model
 * - Join-Key Contract
 * - CLI Command Showcase
 *
 * @see brenner_bot-f8vs.7
 */

import { CopyButton } from "@/components/ui/copy-button";

// Icons
const TerminalIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const ServerStackIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
    />
  </svg>
);

const ArrowsRightLeftIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const LinkIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const BoltIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

const CpuChipIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
    />
  </svg>
);

// Architecture feature data
const archFeatures = [
  {
    title: "CLI-First Design",
    tagline: "Your Terminal, Your Subscriptions, Your Control",
    description:
      "BrennerBot doesn't call AI APIs from code. CLI tools run in your terminal under your existing subscriptions. You see everything, control everything.",
    icon: <TerminalIcon />,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-700 dark:text-violet-300",
    benefits: [
      "No API keys to manage or leak",
      "No rate limits beyond your subscription",
      "Full session context preserved",
      "Real-time visibility into agent work",
    ],
  },
  {
    title: "Local-First Storage",
    tagline: "Your Data Stays With You",
    description:
      "Hypotheses, evidence, and session artifacts are stored locally. The system works offline and syncs when you're ready.",
    icon: <ServerStackIcon />,
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-700 dark:text-sky-300",
    benefits: [
      "IndexedDB for structured data",
      "File locks for concurrent access",
      "Background sync when online",
      "Full offline capability",
    ],
  },
  {
    title: "Deterministic Merging",
    tagline: "Reproducible by Design",
    description:
      "When multiple agents produce outputs, they merge deterministically. Two runs with the same inputs produce identical outputs.",
    icon: <ArrowsRightLeftIcon />,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    benefits: [
      "Timestamp ordering",
      "Last-write-wins for conflicts",
      "Killed items preserved in history",
      "Conflicts logged for audit",
    ],
  },
  {
    title: "Security Model",
    tagline: "Fail-Closed, Not Fail-Open",
    description:
      "Lab Mode is protected by default. Unauthorized requests get 404 (no information leakage), not 401.",
    icon: <ShieldCheckIcon />,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-700 dark:text-amber-300",
    benefits: [
      "Environment check (BRENNER_LAB_MODE)",
      "Cloudflare Access or lab secret",
      "Timing-safe secret comparison",
      "Content policy enforcement",
    ],
  },
];

const joinKeyConnections = [
  { from: "Thread ID", to: "Agent Mail thread" },
  { from: "Thread ID", to: "ntm session" },
  { from: "Thread ID", to: "Artifact file path" },
  { from: "Thread ID", to: "Beads issue ID" },
];

const cliCommands = [
  {
    comment: "Search the corpus",
    command: 'brenner corpus search "exclusion test"',
  },
  {
    comment: "Start a session",
    command:
      'brenner session start --thread-id RS-20260106 \\\n  --question "How do cells determine position?"',
  },
  {
    comment: "Watch session status",
    command: "brenner session status --thread-id RS-20260106 --watch",
  },
  {
    comment: "Compile artifacts",
    command: "brenner session compile --thread-id RS-20260106",
  },
];

const perfStats = [
  { label: "CLI startup", value: "< 50ms", icon: <BoltIcon /> },
  { label: "Artifact compile", value: "< 50ms", icon: <BoltIcon /> },
  { label: "Test suite", value: "4300+ tests", icon: <CpuChipIcon /> },
  { label: "Page load", value: "< 2s", icon: <BoltIcon /> },
];

/**
 * Technical Architecture Section
 */
export function TechnicalArchitectureSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-violet-500/5 via-background to-sky-500/5 p-6 sm:p-10 lg:p-12 shadow-lg">
      {/* Decorative orbs */}
      <div className="absolute top-0 left-0 -mt-10 -ml-10 size-40 sm:size-56 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 -mb-10 -mr-10 size-32 sm:size-44 bg-sky-500/10 rounded-full blur-3xl" />

      <div className="relative space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-medium">
            <CpuChipIcon />
            <span>Technical Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
            Built for Serious Work: Architecture That Respects Your Research
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            CLI-first design. Local-first storage. Deterministic outputs. Every architectural
            decision prioritizes reproducibility, control, and auditability.
          </p>
        </div>

        {/* Architecture Features Grid */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {archFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-4">
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor} shadow-inner`}
                  >
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {feature.tagline}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap gap-2">
                  {feature.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Join-Key Contract */}
        <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <LinkIcon />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">The Join-Key Contract</h4>
                <p className="text-sm text-muted-foreground">Thread ID is the universal join key</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {joinKeyConnections.map((conn, index) => (
              <div
                key={conn.to}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
              >
                {index === 0 && (
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    {conn.from}
                  </span>
                )}
                {index === 0 && (
                  <svg
                    className="size-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                )}
                <span className="text-sm text-foreground">{conn.to}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Command Showcase */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-border/70 bg-zinc-950 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-rose-500/80" />
                  <span className="size-3 rounded-full bg-amber-500/80" />
                  <span className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs text-zinc-500 ml-2">brenner-cli</span>
              </div>
              <CopyButton
                text={cliCommands.map((c) => `# ${c.comment}\n${c.command}`).join("\n\n")}
                variant="ghost"
                size="sm"
                label="Copy all commands"
                showPreview={false}
              />
            </div>
            <div className="space-y-4 font-mono text-sm overflow-x-auto">
              {cliCommands.map((cmd) => (
                <div key={cmd.comment}>
                  <p className="text-zinc-500"># {cmd.comment}</p>
                  <p className="text-emerald-400 whitespace-pre">{cmd.command}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
              <h4 className="text-base font-semibold text-foreground mb-4">Performance</h4>
              <div className="space-y-3">
                {perfStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">{stat.icon}</span>
                      {stat.label}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Key Principle
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                &quot;Same inputs, same outputs. Every merge is deterministic. Every action is
                auditable. Every session is reproducible.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
