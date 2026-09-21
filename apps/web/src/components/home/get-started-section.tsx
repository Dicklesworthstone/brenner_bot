"use client";

/**
 * Get Started & CTA Section
 *
 * Landing page section for converting interest into action:
 * - One-command installation
 * - User paths (Researchers, Developers, Curious)
 * - Quick start preview
 * - Social proof
 * - Final CTA
 *
 * @see brenner_bot-f8vs.8
 */

import Link from "next/link";
import { CopyButton } from "@/components/ui/copy-button";

// Icons
const RocketLaunchIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
    />
  </svg>
);

const BeakerIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
    />
  </svg>
);

const CodeBracketIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
    />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const TerminalIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const installCommand = `curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/main/install.sh | bash`;

const installOptions = [
  { flag: "--easy-mode", desc: "Minimal prompts" },
  { flag: "--verify", desc: "Checksum verification" },
  { flag: "--system", desc: "System-wide install" },
];

const userPaths = [
  {
    title: "For Researchers",
    subtitle: "Run your first Brenner session",
    icon: <BeakerIcon />,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    steps: [
      "Install the CLI",
      "Build an excerpt from the corpus",
      "Start a session with your research question",
      "Review the compiled artifact",
    ],
    cta: "Start Researching",
    ctaHref: "/docs/getting-started",
  },
  {
    title: "For Developers",
    subtitle: "Contribute to the project",
    icon: <CodeBracketIcon />,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-700 dark:text-violet-300",
    steps: [
      "Clone the repository",
      "Run the test suite (4300+ tests)",
      "Check the Beads roadmap",
      "Submit a PR",
    ],
    cta: "View on GitHub",
    ctaHref: "https://github.com/Dicklesworthstone/brenner_bot",
  },
  {
    title: "For the Curious",
    subtitle: "Understand the method first",
    icon: <BookOpenIcon />,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-700 dark:text-amber-300",
    steps: [
      "Read the Brenner method overview",
      "Explore the transcripts",
      "Try the jargon dictionary",
      "Watch a demo session",
    ],
    cta: "Learn the Method",
    ctaHref: "/docs/method",
  },
];

const quickStartCommands = [
  { comment: "Verify installation", command: "brenner doctor --skip-ntm --skip-cass --skip-cm" },
  { comment: "Search the corpus", command: 'brenner corpus search "discriminative test"' },
  {
    comment: "Build an excerpt",
    command: "brenner excerpt build --sections 58,78,161 > excerpt.md",
  },
  {
    comment: "Start a session",
    command: `brenner session start \\
  --thread-id RS-$(date +%Y%m%d)-first \\
  --excerpt-file excerpt.md \\
  --question "What makes a good discriminative test?"`,
  },
];

const socialProof = [
  { label: "MIT License", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { label: "4300+ Tests", color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  { label: "100% Open Source", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
];

/**
 * Get Started & CTA Section
 */
export function GetStartedSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 sm:p-10 lg:p-12 shadow-lg">
      {/* Decorative orbs */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 size-48 sm:size-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 size-40 sm:size-52 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative space-y-10 sm:space-y-12">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
            <RocketLaunchIcon />
            <span>Get Started</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
            Ready to Transform Your Research?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            One command to install. Multiple paths to get started. 100% free and open source.
          </p>
        </div>

        {/* Installation Block */}
        <div className="rounded-2xl border border-border/70 bg-zinc-950 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-3 rounded-full bg-rose-500/80" />
                <span className="size-3 rounded-full bg-amber-500/80" />
                <span className="size-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-sm text-zinc-400 ml-2">One Command to Get Started</span>
            </div>
            <CopyButton
              text={installCommand}
              variant="ghost"
              size="sm"
              label="Copy command"
              showPreview={false}
            />
          </div>
          <div className="font-mono text-sm sm:text-base overflow-x-auto">
            <code className="text-emerald-400 whitespace-pre">{installCommand}</code>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {installOptions.map((opt) => (
              <span
                key={opt.flag}
                className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-400"
              >
                <code className="text-emerald-400 mr-1.5">{opt.flag}</code>
                <span>{opt.desc}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Or{" "}
            <a
              href="https://github.com/Dicklesworthstone/brenner_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              install from source
            </a>
          </p>
        </div>

        {/* User Paths */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {userPaths.map((path) => (
            <div
              key={path.title}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-4">
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${path.iconBg} ${path.iconColor} shadow-inner`}
                  >
                    {path.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {path.subtitle}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">{path.title}</h3>
                  </div>
                </div>

                {/* Steps */}
                <ol className="space-y-2">
                  {path.steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                {/* CTA */}
                {path.ctaHref.startsWith("http") ? (
                  <a
                    href={path.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline group-hover:gap-3 transition-all"
                  >
                    {path.cta}
                    <ArrowRightIcon />
                  </a>
                ) : (
                  <Link
                    href={path.ctaHref}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline group-hover:gap-3 transition-all"
                  >
                    {path.cta}
                    <ArrowRightIcon />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start Preview */}
        <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <TerminalIcon />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">Quick Start Preview</h4>
              <p className="text-sm text-muted-foreground">Your first session in 4 steps</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-zinc-950 p-4 overflow-x-auto">
            <div className="space-y-4 font-mono text-sm">
              {quickStartCommands.map((cmd, i) => (
                <div key={cmd.comment} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-zinc-500"># {cmd.comment}</p>
                    <p className="text-emerald-400 whitespace-pre">{cmd.command}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {socialProof.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${item.color}`}
            >
              <CheckCircleIcon />
              {item.label}
            </span>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <RocketLaunchIcon />
            Get Started Now
          </Link>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Read the Docs
            </Link>
            <span className="text-border">|</span>
            <a
              href="https://github.com/Dicklesworthstone/brenner_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              View Source
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground max-w-xl mx-auto">
          Brenner Bot is 100% free and open source. No hidden costs, no data collection, no vendor
          lock-in. Just rigorous research tools.
        </p>
      </div>
    </section>
  );
}
