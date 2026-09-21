import type { Metadata } from "next";
import Link from "next/link";
import { Jargon } from "@/components/jargon";
import { BayesianCrosswalk } from "@/components/method/BayesianCrosswalk";
import { BrennerLoopDiagram } from "@/components/method/BrennerLoopDiagram";

export const metadata: Metadata = {
  title: "Method",
  description:
    "The Brenner Loop: operators, structure, and Bayesian framework for scientific discovery.",
};

// Icons
const BeakerIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
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

const BookIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

// Operator data
const operators = [
  {
    name: "Generate Hypotheses",
    short: "GEN",
    description: "Produce multiple competing explanations for an observation",
    color: "primary",
    examples: [
      "What could cause this phenotype?",
      "List three mechanisms",
      "Brainstorm alternatives",
    ],
  },
  {
    name: "Design Discriminative Test",
    short: "TEST",
    description: "Create an experiment that differentiates between competing hypotheses",
    color: "accent",
    examples: ["Knockout experiment", "Conditional mutant", "Rescue assay"],
  },
  {
    name: "Execute & Observe",
    short: "RUN",
    description: "Perform the experiment and record results without interpretation bias",
    color: "success",
    examples: ["Run the experiment", "Collect data", "Document anomalies"],
  },
  {
    name: "Update Beliefs",
    short: "UPD",
    description: "Revise probability estimates based on experimental outcomes",
    color: "warning",
    examples: ["Increase P(H1)", "Eliminate H3", "New prior distribution"],
  },
  {
    name: "Iterate or Terminate",
    short: "LOOP",
    description: "Decide whether to continue investigation or declare a finding",
    color: "destructive",
    examples: ["Run another test", "Publish result", "Pivot to new question"],
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary" },
  accent: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
  success: { bg: "bg-success/10", border: "border-success/30", text: "text-success" },
  warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning" },
  destructive: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
  },
};

export default function MethodPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
            <BeakerIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">The Brenner Method</h1>
            <p className="text-muted-foreground">A framework for scientific discovery</p>
          </div>
        </div>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          Sydney Brenner developed a distinctive approach to biological research over five decades.
          This page operationalizes his methodology into a repeatable framework of{" "}
          <Jargon term="operator-library">operators</Jargon> and loops.
        </p>
      </header>

      {/* Visual Loop Diagram */}
      <section className="space-y-8 animate-fade-in-up stagger-1">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <RefreshIcon />
            Interactive Diagram
          </div>
          <h2 className="text-2xl font-bold tracking-tight">The Brenner Loop</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Hover over each stage to explore the iterative discovery process. The cycle continues
            until a clear answer emerges.
          </p>
        </div>

        {/* Interactive Pentagon Diagram */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-muted/20 via-background to-muted/10 p-6 lg:p-10">
          <BrennerLoopDiagram />
        </div>
      </section>

      {/* Operators */}
      <section className="space-y-6 animate-fade-in-up">
        <h2 className="text-xl font-semibold">Operators</h2>
        <p className="text-muted-foreground max-w-2xl">
          These are the cognitive primitives that compose the Brenner Loop. Each operator can be
          invoked independently or chained together in sequences.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((op, index) => {
            const colors = colorClasses[op.color];
            return (
              <div
                key={op.name}
                className={`rounded-xl border bg-card p-5 transition-all hover:shadow-md ${colors.border} animate-fade-in-up stagger-${index + 1}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold ${colors.bg} ${colors.text}`}
                  >
                    {op.short}
                  </span>
                  <h3 className="font-semibold text-foreground">{op.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{op.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {op.examples.map((ex) => (
                    <span
                      key={ex}
                      className="inline-flex px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Principles */}
      <section className="space-y-6 animate-fade-in-up">
        <h2 className="text-xl font-semibold">Core Principles</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Empirical Constraint",
              description:
                "Theory follows experiment, not the other way around. Let data constrain your models rather than seeking data to confirm your theories.",
            },
            {
              title: "Epistemic Humility",
              description: (
                <>
                  Hold all <Jargon term="hypothesis">hypotheses</Jargon> loosely. Be prepared to
                  abandon any idea, no matter how elegant, when{" "}
                  <Jargon term="evidence">evidence</Jargon> contradicts it.
                </>
              ),
            },
            {
              title: "Problem Selection",
              description:
                "Choosing the right problem is more important than solving any problem. Spend time finding tractable, significant questions.",
            },
            {
              title: "Hands-On Intuition",
              description:
                "Build intuition through direct experimentation. Understanding comes from doing, not just from reading or theorizing.",
            },
          ].map((principle, index) => (
            <div
              key={principle.title}
              className={`rounded-xl border border-border bg-gradient-to-br from-muted/20 to-transparent p-5 animate-fade-in-up stagger-${index + 1}`}
            >
              <h3 className="font-semibold text-foreground mb-2">{principle.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bayesian Crosswalk */}
      <section className="animate-fade-in-up">
        <BayesianCrosswalk />
      </section>

      {/* Quick Links */}
      <section className="space-y-4 animate-fade-in-up">
        <h2 className="text-xl font-semibold">Go Deeper</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/corpus"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] touch-manipulation"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                <BookIcon />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Read</span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Corpus
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Primary sources with the original transcripts and quotes.
            </p>
            <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
              <span>Browse corpus</span>
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            href="/distillations"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] touch-manipulation"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-10 rounded-lg bg-accent/10 text-accent">
                <SparklesIcon />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Compare</span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Distillations
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Three frontier model analyses of the methodology.
            </p>
            <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
              <span>Compare models</span>
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            href="/tutorial/examples"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] touch-manipulation"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-10 rounded-lg bg-success/10 text-success">
                <BeakerIcon />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Study</span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Worked Examples
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Canonical, lintable artifacts across domains (biology, CS, social science).
            </p>
            <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
              <span>Browse examples</span>
              <ArrowRightIcon />
            </div>
          </Link>
        </div>
      </section>

      {/* Planned Features */}
      <section className="rounded-xl border border-border bg-muted/30 p-6 space-y-3 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-warning/10 text-warning border border-warning/30">
            PLANNED
          </span>
          <h3 className="font-semibold">Coming Soon</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">-</span>
            <span>Interactive operator palette for composing Brenner Loop sessions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">-</span>
            <span>Example walkthroughs from historical Brenner experiments</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
