import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CrosswalkTable } from "@/components/distillation/CrosswalkTable";
import { Jargon } from "@/components/jargon";
import { readCorpusDoc } from "@/lib/corpus";

export const metadata: Metadata = {
  title: "Distillations",
  description: "Compare three frontier model analyses of Sydney Brenner's scientific methodology.",
};

export const runtime = "nodejs";

// Icons
const SparklesIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="size-4 transition-transform group-hover:translate-x-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="size-4 text-success shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ClockIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

interface Distillation {
  model: string;
  modelShort: string;
  docId: string;
  color: "opus" | "gpt" | "gemini";
  description: string;
  keyInsight: string;
  readTime: string;
  excerpt?: string;
  wordCount?: number;
}

const distillations: Distillation[] = [
  {
    model: "Claude Opus 4.5",
    modelShort: "Opus",
    docId: "distillation-opus-45",
    color: "opus",
    description:
      "Frames the method through two foundational axioms and epistemic modesty. Emphasizes the interplay between theoretical constraints and experimental validation.",
    keyInsight: "Two Axioms Framework",
    readTime: "45 min",
  },
  {
    model: "GPT-5.2",
    modelShort: "GPT",
    docId: "distillation-gpt-52",
    color: "gpt",
    description:
      "Emphasizes the objective function and optimization lens. Views Brenner's approach as a systematic search through hypothesis space.",
    keyInsight: "Optimization Lens",
    readTime: "30 min",
  },
  {
    model: "Gemini 3",
    modelShort: "Gemini",
    docId: "distillation-gemini-3",
    color: "gemini",
    description:
      "Identifies a minimal Brenner Kernel of essential cognitive moves. Distills the method to its most fundamental operations.",
    keyInsight: "Minimal Kernel",
    readTime: "20 min",
  },
];

/**
 * Strip inline markdown formatting for clean plaintext display.
 * Handles: bold (**), italic (*), code (`), links [text](url)
 */
function stripInlineMarkdown(text: string): string {
  return (
    text
      // Remove bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Remove italic: *text* or _text_ (careful not to match list items)
      .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1")
      .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1")
      // Remove inline code: `text`
      .replace(/`([^`]+?)`/g, "$1")
      // Convert links [text](url) to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Clean up any double spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getExcerpt(content: string, maxLength: number = 300): string {
  // Skip any YAML frontmatter or headers at the start
  const lines = content.split("\n");
  let startIdx = 0;

  // Skip frontmatter
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "---") {
        startIdx = i + 1;
        break;
      }
    }
  }

  // Find first meaningful paragraph (skip headers, horizontal rules, empty lines)
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]?.trim() || "";
    // Skip headers, horizontal rules, and short lines
    if (line && !line.startsWith("#") && !line.match(/^[-*_]{3,}$/) && line.length > 50) {
      // Strip markdown formatting for clean display
      const cleanLine = stripInlineMarkdown(line);
      const excerpt = cleanLine.slice(0, maxLength);
      return excerpt.length < cleanLine.length ? excerpt + "…" : excerpt;
    }
  }

  return stripInlineMarkdown(content.slice(0, maxLength)) + "…";
}

function getWordCount(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

const convergences: ReactNode[] = [
  <>
    Parallel exploration of multiple <Jargon term="hypothesis">hypotheses</Jargon> simultaneously
  </>,
  <>
    <Jargon term="discriminative-test">Discriminative tests</Jargon> that can{" "}
    <Jargon term="falsification">falsify</Jargon> competing theories
  </>,
  <>
    <Jargon term="bayesian-update">Bayesian updating</Jargon> based on experimental{" "}
    <Jargon term="evidence">evidence</Jargon>
  </>,
  <>Empirical constraint takes precedence over theoretical elegance</>,
  <>Choosing the right problem is more important than solving any problem</>,
  <>Building intuition through hands-on experimentation</>,
];

const colorClasses = {
  opus: {
    badge: "model-badge-opus",
    border: "border-[var(--opus)]/20 hover:border-[var(--opus)]/50",
    bg: "bg-[var(--opus-subtle)]",
    text: "text-[var(--opus-foreground)]",
    accent: "text-[var(--opus)]",
    glow: "hover:shadow-[0_4px_40px_var(--opus)/0.2]",
    gradient: "from-[var(--opus)]/5 via-transparent to-transparent",
    ring: "group-hover:ring-[var(--opus)]/20",
  },
  gpt: {
    badge: "model-badge-gpt",
    border: "border-[var(--gpt)]/20 hover:border-[var(--gpt)]/50",
    bg: "bg-[var(--gpt-subtle)]",
    text: "text-[var(--gpt-foreground)]",
    accent: "text-[var(--gpt)]",
    glow: "hover:shadow-[0_4px_40px_var(--gpt)/0.2]",
    gradient: "from-[var(--gpt)]/5 via-transparent to-transparent",
    ring: "group-hover:ring-[var(--gpt)]/20",
  },
  gemini: {
    badge: "model-badge-gemini",
    border: "border-[var(--gemini)]/20 hover:border-[var(--gemini)]/50",
    bg: "bg-[var(--gemini-subtle)]",
    text: "text-[var(--gemini-foreground)]",
    accent: "text-[var(--gemini)]",
    glow: "hover:shadow-[0_4px_40px_var(--gemini)/0.2]",
    gradient: "from-[var(--gemini)]/5 via-transparent to-transparent",
    ring: "group-hover:ring-[var(--gemini)]/20",
  },
};

export default async function DistillationsPage() {
  // Load excerpts from each distillation
  const distillationsWithContent = await Promise.all(
    distillations.map(async (d) => {
      try {
        const { content } = await readCorpusDoc(d.docId);
        return {
          ...d,
          excerpt: getExcerpt(content, 250),
          wordCount: getWordCount(content),
        };
      } catch {
        return d;
      }
    }),
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-accent/10 text-accent">
            <SparklesIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Distillations</h1>
            <p className="text-muted-foreground">Three frontier models, one methodology</p>
          </div>
        </div>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          Each model analyzed the same Brenner transcript and distilled its own interpretation of
          the scientific methodology. Compare their perspectives to build a richer understanding.
        </p>
      </header>

      {/* Model Cards - Side by side on desktop, stacked on mobile */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Compare Models</h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {distillationsWithContent.map((d, index) => {
            const colors = colorClasses[d.color];
            return (
              <Link
                key={d.model}
                href={`/corpus/${d.docId}`}
                className={`group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] ${colors.border} ${colors.glow} animate-fade-in-up stagger-${index + 1} ring-1 ring-transparent ${colors.ring} touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* Content container */}
                <div className="relative p-6 flex flex-col h-full">
                  {/* Model Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform duration-200 group-hover:scale-105 ${colors.badge}`}
                    >
                      {d.modelShort}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClockIcon />
                        {d.readTime}
                      </span>
                      {d.wordCount && (
                        <span className="flex items-center gap-1">
                          <DocumentIcon />
                          {Math.round(d.wordCount / 1000)}k
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Model Name */}
                  <h3 className="text-xl font-semibold text-foreground mb-2 transition-colors duration-200 group-hover:text-primary">
                    {d.model}
                  </h3>

                  {/* Key Insight Badge */}
                  <div
                    className={`inline-flex self-start items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium mb-3 transition-all duration-200 group-hover:shadow-sm ${colors.bg} ${colors.text}`}
                  >
                    <svg
                      className="size-3 transition-transform duration-200 group-hover:rotate-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    {d.keyInsight}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                    {d.description}
                  </p>

                  {/* Excerpt Preview */}
                  {d.excerpt && (
                    <div className="rounded-lg bg-muted/40 p-3 mb-4 border border-border/30 transition-colors duration-200 group-hover:bg-muted/60 group-hover:border-border/50">
                      <p className="text-xs text-muted-foreground italic line-clamp-3">
                        &ldquo;{d.excerpt}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Read Link */}
                  <div
                    className={`flex items-center gap-2 text-sm font-medium mt-auto pt-2 transition-colors duration-200 ${colors.accent}`}
                  >
                    <span>Read full distillation</span>
                    <ArrowRightIcon />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Convergences Section */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-6 lg:p-8 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center size-8 rounded-lg bg-success/10 text-success">
            <CheckIcon />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Where All Models Converge</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Despite different analytical frameworks, all three models identify these as core
          invariants of the Brenner method:
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {convergences.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-foreground">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Crosswalk Comparison Table */}
      <section className="space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Concept Crosswalk</h2>
            <p className="text-sm text-muted-foreground">
              See how each model interprets the same core concepts. Click any cell to read more.
            </p>
          </div>
        </div>
        <CrosswalkTable />
      </section>

      {/* Reading Guide */}
      <section className="rounded-xl border border-border bg-muted/30 p-6 space-y-3 animate-fade-in-up">
        <h3 className="font-semibold">Reading Guide</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">1.</span>
            <span>
              Start with <strong>Gemini 3</strong> for the most concise overview of core operations.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">2.</span>
            <span>
              Read <strong>GPT-5.2</strong> to understand the systematic search perspective.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">3.</span>
            <span>
              Finish with <strong>Opus 4.5</strong> for the deepest philosophical grounding.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
