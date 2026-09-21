import Link from "next/link";
import { StatsSection } from "@/components/home/stats-section";
import { Jargon } from "@/components/jargon";
import { WhatIsThis } from "@/components/onboarding/WhatIsThis";
import { HeroBackground } from "@/components/ui/animated-element";
import { FeatureCard } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";

// Icons
const BookIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const BeakerIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
    />
  </svg>
);

const PlayIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
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

const AcademicCapIcon = () => (
  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
    />
  </svg>
);

const LightbulbIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18a1.5 1.5 0 01-1.5-1.5v-.6a6 6 0 10-3-5.2v.35A3.75 3.75 0 009.25 15h5.5A3.75 3.75 0 0019 11.05v-.35a6 6 0 10-7 5.2v.6A1.5 1.5 0 0112 18zm-3 3h6"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.75l7.5 3v5.57c0 4.418-3.24 8.415-7.5 9.93-4.26-1.515-7.5-5.512-7.5-9.93V6.75l7.5-3z"
    />
  </svg>
);

const LockIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V8.25a4.5 4.5 0 00-9 0v2.25m-1.5 0h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-12a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5z"
    />
  </svg>
);

const GaugeIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5a8.25 8.25 0 018.25 8.25v1.5a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.5A8.25 8.25 0 0112 4.5z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l3-3" />
  </svg>
);

const SearchIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.35-4.35m1.1-4.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z"
    />
  </svg>
);

const ChecklistIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75h9M9 12h9M9 17.25h9" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 6.75l1.5 1.5 2.5-2.5M4.5 12l1.5 1.5 2.5-2.5M4.5 17.25l1.5 1.5 2.5-2.5"
    />
  </svg>
);

const AlertIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.29 3.86l-8 13.86a1.5 1.5 0 001.3 2.28h16.82a1.5 1.5 0 001.3-2.28l-8-13.86a1.5 1.5 0 00-2.62 0z"
    />
  </svg>
);

const FlowArrowIcon = () => (
  <svg
    className="size-5 text-muted-foreground/70"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z"
    />
  </svg>
);

const features = [
  {
    href: "/corpus",
    icon: <BookIcon />,
    label: "Browse",
    title: "Corpus",
    description: (
      <>
        The complete Brenner transcript collection from Web of Stories, plus curated{" "}
        <Jargon term="quote-bank">quote banks</Jargon> and{" "}
        <Jargon term="metaprompt">metaprompts</Jargon>.
      </>
    ),
    accent: "text-primary",
  },
  {
    href: "/distillations",
    icon: <SparklesIcon />,
    label: "Compare",
    title: "Distillations",
    description: (
      <>
        Three frontier model <Jargon term="distillation">distillations</Jargon> of Brenner&apos;s
        methodology. Compare perspectives from GPT-5.2, Opus 4.5, and Gemini 3.
      </>
    ),
    accent: "text-accent",
  },
  {
    href: "/method",
    icon: <BeakerIcon />,
    label: "Learn",
    title: "Method",
    description: (
      <>
        The <Jargon term="operator-library">operators</Jargon>, loop structure, and{" "}
        <Jargon term="bayesian-update">Bayesian</Jargon> framework that operationalize
        Brenner&apos;s approach to scientific discovery.
      </>
    ),
    accent: "text-primary",
  },
];

const agentProfiles = [
  {
    title: "Hypothesis Generator",
    engine: "Powered by GPT",
    role: "Hunt paradoxes, propose hypotheses",
    personality: "Creative, divergent thinking",
    quote: "What if both established models are wrong?",
    icon: <LightbulbIcon />,
    accent: "from-amber-500/20 via-amber-500/5 to-background",
    iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  {
    title: "Test Designer",
    engine: "Powered by Claude",
    role: "Design discriminative tests with potency controls",
    personality: "Rigorous, detail-oriented",
    quote: "This test will eliminate half our hypotheses in one observation.",
    icon: <BeakerIcon />,
    accent: "from-emerald-500/20 via-emerald-500/5 to-background",
    iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  {
    title: "Adversarial Critic",
    engine: "Powered by Gemini",
    role: "Attack framing, check scale constraints",
    personality: "Skeptical, thorough",
    quote: "Have you considered that the entire premise might be wrong?",
    icon: <ShieldIcon />,
    accent: "from-sky-500/20 via-sky-500/5 to-background",
    iconClass: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  },
];

const debateFormats = [
  {
    title: "Oxford Style",
    description: "Proposition vs opposition with a judge",
    bestFor: "Testing hypothesis strength",
  },
  {
    title: "Socratic",
    description: "Probing questions to surface hidden assumptions",
    bestFor: "Finding weak links fast",
  },
  {
    title: "Steelman Contest",
    description: "Build the strongest case, then dismantle it",
    bestFor: "Exploring the hypothesis space",
  },
];

const flowSteps = [
  {
    title: "Kickoff",
    body: "Threaded prompt goes to each agent role",
  },
  {
    title: "Deltas",
    body: "Structured responses return with citations",
  },
  {
    title: "Merge",
    body: "Deterministic compiler reconciles evidence",
  },
  {
    title: "Human",
    body: "You decide what ships and what dies",
  },
];

const workflowPhases = [
  { title: "Intake", description: "Frame the research question" },
  { title: "Sharpening", description: "Refine hypotheses and scope" },
  { title: "Level-Split", description: "Separate program from interpreter" },
  { title: "Exclusion-Test", description: "Design discriminative tests" },
  { title: "Object-Transpose", description: "Choose the optimal system" },
  { title: "Scale-Check", description: "Validate against physics" },
  { title: "Agent-Dispatch", description: "Convene the tribunal" },
  { title: "Synthesis", description: "Merge agent outputs" },
  { title: "Evidence", description: "Gather external signals" },
  { title: "Revision", description: "Update hypotheses" },
  { title: "Complete", description: "Publish artifacts" },
];

const workflowCallouts = [
  {
    title: "Undo / Redo",
    description: "Every action is reversible. Explore without fear.",
  },
  {
    title: "Session Replay",
    description: "Reproduce any session exactly for audit and learning.",
  },
  {
    title: "Error Recovery",
    description: "Graceful checkpoints when things go wrong.",
  },
];

const hygieneFeatures = [
  {
    title: "Coach Mode",
    description: "Guided checkpoints, inline explanations, and Brenner quotes as you work.",
    highlights: ["Beginner → Expert", "Contextual feedback"],
    icon: <AcademicCapIcon />,
    accent: "text-emerald-600",
  },
  {
    title: "Prediction Lock",
    description: "Lock outcomes before results arrive to eliminate hindsight bias.",
    highlights: ["Immutable predictions", "Audit trail"],
    icon: <LockIcon />,
    accent: "text-primary",
  },
  {
    title: "Calibration Tracking",
    description: "Brier score, overconfidence bias, and domain-level accuracy trends.",
    highlights: ["Confidence scorecard", "Bias alerts"],
    icon: <GaugeIcon />,
    accent: "text-sky-600",
  },
  {
    title: "Confound Detection",
    description: "Domain-specific confounds flagged with targeted prompting questions.",
    highlights: ["8 research domains", "Automatic prompts"],
    icon: <SearchIcon />,
    accent: "text-amber-600",
  },
  {
    title: "Artifact Linting",
    description: "50+ rules enforcing third alternatives, potency controls, and citation hygiene.",
    highlights: ["Structural checks", "Citation validation"],
    icon: <ChecklistIcon />,
    accent: "text-purple-600",
  },
];

const predictionLockSteps = [
  "Design test",
  "Enter predictions",
  "Lock outcomes",
  "Run experiment",
  "Compare results",
];

const confoundDomains = [
  "Psychology",
  "Epidemiology",
  "Economics",
  "Biology",
  "Sociology",
  "Neuroscience",
  "Computer Science",
  "General",
];

const hygieneComparisonRows = [
  {
    without: "Predictions revised after results are known",
    with: "Predictions locked before execution",
  },
  {
    without: "Confounds discovered in peer review",
    with: "Confounds flagged during design",
  },
  {
    without: "Vague hypotheses survive unchanged",
    with: "Unfalsifiable language is blocked",
  },
  {
    without: "Overconfidence goes untracked",
    with: "Calibration metrics stay visible",
  },
];

const discoveryFeatures = [
  {
    title: "Hypothesis Similarity Search",
    description: "Find related work across sessions with offline embeddings and clusters.",
    highlights: ["Client-side only", "Duplicate detection"],
    icon: <SearchIcon />,
    accent: "text-emerald-600",
  },
  {
    title: "What-If Scenarios",
    description: "Simulate outcomes before running tests and prioritize high-impact experiments.",
    highlights: ["Info gain ranked", "Scenario builder"],
    icon: <SparklesIcon />,
    accent: "text-primary",
  },
  {
    title: "Robustness Scoring",
    description: "Evidence-weighted survival scores reveal fragile vs battle-tested ideas.",
    highlights: ["Support vs challenge", "Robustness meter"],
    icon: <GaugeIcon />,
    accent: "text-sky-600",
  },
  {
    title: "Anomaly Detection",
    description: "Track contradictions and spawn new hypotheses instead of burying them.",
    highlights: ["Anomaly register", "Paradigm alerts"],
    icon: <AlertIcon />,
    accent: "text-amber-600",
  },
];

const similarityMatches = [
  {
    title: "Morphogen gradient (RS-20251230)",
    score: 0.82,
    breakdown: "Statement 0.8 / Mechanism 0.6 / Domain 0.9",
  },
  {
    title: "Timing gate model (RS-20250112)",
    score: 0.71,
    breakdown: "Statement 0.7 / Mechanism 0.5 / Domain 0.8",
  },
  {
    title: "Signal relay chain (RS-20241018)",
    score: 0.64,
    breakdown: "Statement 0.6 / Mechanism 0.4 / Domain 0.9",
  },
];

const whatIfOutcomes = [
  { label: "If supports", value: 78, tone: "bg-emerald-500/40" },
  { label: "If challenges", value: 35, tone: "bg-amber-500/40" },
];

const robustnessCards = [
  { title: "H1: Morphogen gradient", score: 72, detail: "3 supporting / 1 challenging (survived)" },
  { title: "H2: Timing mechanism", score: 35, detail: "1 supporting / 2 inconclusive" },
];

const anomalyItems = [
  {
    id: "X-001",
    title: "Oscillating fate markers",
    status: "Active",
    note: "Conflicts with H1 + H2",
  },
  {
    id: "X-014",
    title: "Late-stage inversion",
    status: "Deferred",
    note: "Waiting on potency control",
  },
];

// Operator Framework data
const coreOperators = [
  {
    symbol: "⊘",
    name: "Level-Split",
    tagline: "Separate program from interpreter",
    description:
      "Message vs machine, genotype vs phenotype. Includes the 'chastity vs impotence' diagnostic.",
    template: "What is the information? What is the mechanism?",
  },
  {
    symbol: "✂",
    name: "Exclusion-Test",
    tagline: "Design tests that eliminate, not confirm",
    description:
      "Forbidden patterns: what cannot occur if H is true. Rated by discriminative power.",
    template: "If H1 is true, we should NEVER see...",
  },
  {
    symbol: "⟂",
    name: "Object-Transpose",
    tagline: "Change the system until the test is easy",
    description:
      "Choose organism or model strategically. The experimental object is a design variable.",
    template: "What system would make this test cheap and unambiguous?",
  },
  {
    symbol: "⊞",
    name: "Scale-Check",
    tagline: "Stay imprisoned in physics",
    description:
      "Validate against physical constraints. Calculate timescales, length scales, energy scales.",
    template: "Is this physically possible at the relevant scale?",
  },
];

const extendedOperators = [
  { symbol: "↑", name: "Amplify", description: "Use selection, dominance, regime switches" },
  { symbol: "◊", name: "Paradox-hunt", description: "Use contradictions as beacons" },
  { symbol: "⊕", name: "Cross-domain", description: "Import tools from other fields" },
  { symbol: "∿", name: "Dephase", description: "Work out of phase with fashion" },
  { symbol: "†", name: "Theory-kill", description: "Drop hypotheses when the world says no" },
  { symbol: "⌂", name: "Materialize", description: "What would I see if this were true?" },
];

const plainEnglishSteps = [
  { step: 1, title: "Split the levels", description: "Separate the 'what' from the 'how'" },
  {
    step: 2,
    title: "Design killing tests",
    description: "Find experiments that eliminate possibilities",
  },
  {
    step: 3,
    title: "Choose your system",
    description: "Pick the easiest organism/model to test with",
  },
  { step: 4, title: "Check the physics", description: "Make sure it's physically possible" },
];

export default function Home() {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  const labModeEnabled = labModeValue === "1" || labModeValue === "true";

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-24 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0">
      {/* Hero Section */}
      <HeroBackground
        showOrbs
        showGrid
        className="rounded-2xl sm:rounded-3xl"
        primaryOrbClass="bg-primary/25 dark:bg-primary/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-20 px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium animate-fade-in">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                </span>
                BrennerBot Lab Mode
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  Research Orchestration
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight animate-fade-in-up stagger-1">
                  <span className="text-gradient-primary">BrennerBot</span>: Three AI Minds. One
                  Rigorous Method. Zero Blind Spots.
                </h1>
              </div>

              <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed animate-fade-in-up stagger-2">
                Coordinate Claude, GPT, and Gemini in structured debates. Run 11-phase research
                sessions that produce hypothesis slates, discriminative tests, and evidence trails.
                Prevent hindsight bias, unfalsifiable claims, and sloppy reasoning in one command.
              </p>

              <div className="grid gap-4 sm:gap-5 sm:grid-cols-[1.1fr_0.9fr] items-start">
                <div
                  id="install"
                  className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Quick Install</span>
                    <CopyButton
                      text="curl -fsSL https://brennerbot.org/install.sh | bash"
                      variant="ghost"
                      size="sm"
                      label="Copy install command"
                      showPreview={false}
                    />
                  </div>
                  <code className="mt-3 block rounded-xl bg-muted/60 px-3 py-2 text-xs sm:text-sm font-mono text-foreground">
                    curl -fsSL https://brennerbot.org/install.sh | bash
                  </code>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Options: <span className="text-foreground">--easy-mode</span>,{" "}
                    <span className="text-foreground">--verify</span>,{" "}
                    <span className="text-foreground">--system</span>
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/tutorial"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
                  >
                    Get Started
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href="/method"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
                  >
                    Read the Method
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href="/distillations"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
                  >
                    View Distillations
                    <ArrowRightIcon />
                  </Link>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-background px-3 py-1">
                      Locked predictions
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-3 py-1">
                      Structured debates
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-3 py-1">
                      Auditable artifacts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-6 -left-4 size-20 rounded-full bg-primary/20 blur-2xl" />
              <div className="absolute -bottom-8 right-2 size-24 rounded-full bg-accent/20 blur-2xl" />
              <div className="relative rounded-3xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-lg">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Agent Constellation</span>
                  <span>11-phase loop</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium">
                      <span className="text-foreground">Hypothesis Generator</span>
                      <span className="text-muted-foreground">GPT</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium">
                      <span className="text-foreground">Test Designer</span>
                      <span className="text-muted-foreground">Claude</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium">
                      <span className="text-foreground">Adversarial Critic</span>
                      <span className="text-muted-foreground">Gemini</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <FlowArrowIcon />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Unified Artifact
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      Hypothesis slate / Discriminative tests / Evidence ledger
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                    Threaded Agent Mail → deterministic merge → human approval gate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </HeroBackground>

      {/* What Is This? - First-time visitor onboarding */}
      <WhatIsThis className="px-4 sm:px-0" />

      {/* Tutorial CTA - Primary discovery mechanism for tutorials */}
      <section className="px-4 sm:px-0 animate-fade-in-up">
        <Link
          href="/tutorial"
          className="block group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
        >
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-success/30 hover:border-success/50 bg-gradient-to-br from-success/5 via-success/10 to-primary/5 shadow-lg hover:shadow-xl transition-all active:scale-[0.99]">
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 sm:size-32 bg-success/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 size-20 sm:size-24 bg-primary/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center justify-center size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-success text-success-foreground shadow-lg">
                <AcademicCapIcon />
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                  Ready to Apply the Method?
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Three learning paths from quick start to multi-agent orchestration. Apply
                  Brenner&apos;s scientific method to your own research questions.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    ~30 min Quick Start
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    Agent-Assisted
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground bg-background/50">
                    Multi-Agent Cockpit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-success font-medium text-sm sm:text-base">
                <span>Start Tutorial</span>
                <ArrowRightIcon />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Features Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3 px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            What&apos;s Inside
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            A research toolkit for applying Brenner&apos;s epistemology to your own scientific
            questions.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
            >
              <FeatureCard
                className={`h-full animate-fade-in-up stagger-${index + 1} active:scale-[0.98] transition-transform`}
              >
                <div className="relative z-10 p-5 sm:p-6 space-y-3 sm:space-y-4">
                  <div
                    className={`inline-flex items-center justify-center size-10 sm:size-12 rounded-xl bg-muted ${feature.accent}`}
                  >
                    {feature.icon}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <span className={`text-xs sm:text-sm font-medium ${feature.accent}`}>
                      {feature.label}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary opacity-70 sm:opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200">
                    <span>Learn more</span>
                    <ArrowRightIcon />
                  </div>
                </div>
              </FeatureCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Brenner Loop Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3 px-4 sm:px-0">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Core Workflow</p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            From Question to Conclusion: The Brenner Loop
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Research sessions follow a rigorous, reproducible path. Every step is tracked,
            auditable, and reversible.
          </p>
        </div>

        <div className="sm:hidden px-4">
          <div className="relative border-l border-border/70 pl-4 space-y-5">
            {workflowPhases.map((phase, index) => (
              <div key={phase.title} className="relative">
                <span className="absolute -left-[9px] top-1 size-3 rounded-full border border-border bg-background" />
                <p className="text-sm font-semibold text-foreground">
                  {index + 1}. {phase.title}
                </p>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="flex gap-4 overflow-x-auto px-4 sm:px-0 pb-3">
            {workflowPhases.map((phase, index) => {
              const isActive = index === 3;
              return (
                <div
                  key={phase.title}
                  className={`min-w-[170px] rounded-2xl border ${isActive ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card"} p-4 shadow-sm`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} text-xs font-semibold`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Phase
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{phase.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{phase.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 px-4 sm:px-0 md:grid-cols-3">
          {workflowCallouts.map((callout) => (
            <div
              key={callout.title}
              className="rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-foreground">{callout.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{callout.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Lab CTA - Always visible */}
      <section className="animate-fade-in-up px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-gradient-to-br from-muted/30 via-card to-muted/20 p-6 sm:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 size-32 sm:size-40 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 size-24 sm:size-32 bg-accent/5 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
                  />
                </svg>
                Research Lab
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Apply the Method to Your Research
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                The <Jargon term="brenner-loop">Brenner Loop</Jargon> is an interactive research
                framework that helps you develop{" "}
                <Jargon term="discriminative-test">discriminative tests</Jargon> using four
                cognitive operators. Run structured sessions and track your evolving understanding.
              </p>
            </div>

            {/* Operator preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { symbol: "⊘", name: "Level-Split" },
                { symbol: "✂", name: "Exclusion-Test" },
                { symbol: "⟂", name: "Object-Transpose" },
                { symbol: "⊞", name: "Scale-Check" },
              ].map((op) => (
                <div
                  key={op.symbol}
                  className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-background/60 border border-border/50"
                >
                  <span className="text-xl sm:text-2xl font-bold text-primary">{op.symbol}</span>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">
                    {op.name}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/sessions"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                Explore Sessions
                <ArrowRightIcon />
              </Link>
              <Link
                href="/operators"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                View Operators
                <ArrowRightIcon />
              </Link>
              <Link
                href="/tutorial"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
              >
                Start Tutorial
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Agent Orchestration Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 sm:p-10 lg:p-12 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 sm:size-56 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-32 sm:size-44 bg-accent/15 rounded-full blur-3xl" />

        <div className="relative space-y-8 sm:space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Multi-Agent Orchestration
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Your Research Team: AI Agents That Debate, Challenge, and Synthesize
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Each agent has a precise mandate. Together they sharpen hypotheses, design lethal
              tests, and merge evidence into auditable artifacts - without surrendering control.
            </p>
            <p className="text-base sm:text-lg text-foreground/90 max-w-3xl mx-auto italic mt-4">
              &quot;What if you could have Claude, GPT, and Gemini debate your hypothesis -
              challenging each other until only the strongest ideas survive?&quot;
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:gap-6 sm:overflow-visible sm:grid-cols-2 lg:grid-cols-3">
            {agentProfiles.map((agent) => (
              <div
                key={agent.title}
                className="group relative min-w-[260px] snap-start overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl sm:min-w-0"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.accent}`} />
                <div className="relative p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl ${agent.iconClass} shadow-inner`}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {agent.engine}
                      </p>
                      <h3 className="text-lg font-semibold text-foreground">{agent.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground font-medium">{agent.role}</p>
                    <p className="text-xs text-muted-foreground">{agent.personality}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Signature stance
                    </p>
                    <p className="text-sm text-foreground italic">&quot;{agent.quote}&quot;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:gap-6 sm:overflow-visible sm:grid-cols-3">
            {debateFormats.map((format) => (
              <div
                key={format.title}
                className="min-w-[240px] snap-start rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5 shadow-sm sm:min-w-0"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">{format.title}</h4>
                  <span className="text-xs font-medium text-muted-foreground">Debate Mode</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{format.description}</p>
                <div className="mt-4 inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                  Best for: {format.bestFor}
                </div>
              </div>
            ))}
          </div>

          {/* CLI Example */}
          <div className="rounded-2xl border border-border/70 bg-zinc-950 p-4 sm:p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TerminalIcon className="size-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Terminal
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">brenner-cli</span>
            </div>
            <pre className="text-xs sm:text-sm font-mono text-zinc-300 whitespace-pre-wrap sm:whitespace-pre">
              <code>{`# Start a debate session
brenner session start --thread-id RS-20260105 \\
  --format oxford \\
  --question "Does the morphogen gradient model explain cell fate?"

# Watch agents debate in real-time
brenner session status --thread-id RS-20260105 --watch

# See the merged artifact
brenner session compile --thread-id RS-20260105`}</code>
            </pre>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-foreground">
                  Coordination Visualization
                </h4>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Deterministic Merge
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    Thread ID: RS-20260106-001
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1">
                    <span className="size-2 rounded-full bg-accent animate-pulse" />
                    Ack tracking enabled
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-background text-sm font-semibold text-foreground">
                          {index + 1}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.body}</p>
                        </div>
                      </div>
                      {index < flowSteps.length - 1 && (
                        <div className="flex items-center justify-center sm:ml-auto">
                          <div className="hidden sm:block">
                            <FlowArrowIcon />
                          </div>
                          <div className="sm:hidden rotate-90">
                            <FlowArrowIcon />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Coordination Without Chaos
                </p>
                <h4 className="text-lg font-semibold text-foreground">
                  Agent Mail keeps every exchange auditable
                </h4>
                <p className="text-sm text-muted-foreground">
                  Every message lands in a thread, every response is acknowledged, and every delta
                  is preserved. You stay in the loop with human approval gates at every step.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
                Built on <Jargon term="agent-mail">Agent Mail</Jargon> with thread IDs, ack
                receipts, and merge-safe deltas.
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Kickoff sent</span>
                  <span className="text-success font-medium">3 agents live</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deltas merged</span>
                  <span className="text-primary font-medium">1 artifact ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Human approval</span>
                  <span className="text-foreground font-medium">Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Hygiene Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-foreground/5 via-background to-muted/40 p-6 sm:p-10 lg:p-12 shadow-lg">
        <div className="absolute top-0 left-0 -mt-8 -ml-10 size-40 sm:size-56 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 -mb-10 -mr-12 size-36 sm:size-48 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative space-y-8 sm:space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Research Hygiene
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Built-In Guardrails for Rigorous Science
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              The system blocks common failure modes: hindsight bias, unfalsifiable hypotheses,
              ignored confounds, and overconfidence. Rigor is enforced before you waste a week.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {hygieneFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl bg-muted ${feature.accent}`}
                    >
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {feature.highlights.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">
                    Prediction Lock Timeline
                  </h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    No hindsight
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {predictionLockSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`flex size-8 items-center justify-center rounded-full border text-xs font-semibold ${
                          index === 2
                            ? "border-primary/40 bg-primary text-primary-foreground"
                            : "border-border/70 bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground">{step}</p>
                      {index === 2 && (
                        <span className="ml-auto text-[11px] uppercase tracking-[0.2em] text-primary">
                          Locked
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">Confound Detection</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    8 domains
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {confoundDomains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                    Selection bias detected - how will you ensure random sampling?
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                    Reverse causation possible - can you establish temporal order?
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">Calibration + Linting</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Scorecard
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Calibration curve (last 10 tests)
                    </p>
                    <div className="flex items-end gap-1 h-14">
                      {[40, 55, 62, 70, 78, 66, 74, 81, 88, 92].map((value, index) => (
                        <div
                          key={`${value}-${index}`}
                          className="flex-1 rounded-sm bg-primary/30"
                          style={{ height: `${value}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Third alternative present</span>
                      <span className="text-success font-medium">Pass</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Potency control defined</span>
                      <span className="text-success font-medium">Pass</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Citation anchors</span>
                      <span className="text-amber-600 font-medium">Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 overflow-hidden">
            <div className="grid gap-0 md:grid-cols-2">
              <div className="p-4 sm:p-5 bg-muted/40">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Without Guardrails
                </p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {hygieneComparisonRows.map((row) => (
                    <div key={row.without} className="flex items-start gap-2">
                      <span className="mt-1 size-2 rounded-full bg-muted-foreground/40" />
                      <span>{row.without}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-primary/5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  With BrennerBot
                </p>
                <div className="mt-3 space-y-3 text-sm text-foreground">
                  {hygieneComparisonRows.map((row) => (
                    <div key={row.with} className="flex items-start gap-2">
                      <span className="mt-1 size-2 rounded-full bg-primary" />
                      <span>{row.with}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery & Intelligence Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 p-6 sm:p-10 lg:p-12 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 sm:size-52 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-36 sm:size-48 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative space-y-8 sm:space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Discovery & Intelligence
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Intelligence Built In: Search, Simulate, Score
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Connect to prior work instantly, model evidence impact before you test, and track
              which hypotheses survive pressure. This is research intelligence, not a chat log.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {discoveryFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl bg-muted ${feature.accent}`}
                    >
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {feature.highlights.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">Similarity Search</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Offline
                  </span>
                </div>
                <div className="mt-4 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
                  Query: &quot;morphogen gradient cell fate&quot;
                </div>
                <div className="mt-4 space-y-3">
                  {similarityMatches.map((match) => {
                    const scorePercent = Math.round(match.score * 100);
                    return (
                      <div
                        key={match.title}
                        className="rounded-lg border border-border/70 bg-background px-3 py-2"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{match.title}</span>
                          <span className="text-primary font-medium">{scorePercent}%</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-muted">
                          <div
                            className="h-1 rounded-full bg-primary/60"
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{match.breakdown}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Runs entirely client-side - your hypotheses never leave your machine.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">What-If Scenario</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Info gain
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Starting confidence</span>
                    <span className="text-foreground font-medium">60%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary/50" style={{ width: "60%" }} />
                  </div>
                  {whatIfOutcomes.map((outcome) => (
                    <div key={outcome.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{outcome.label}</span>
                        <span className="text-foreground font-medium">{outcome.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${outcome.tone}`}
                          style={{ width: `${outcome.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
                    Expected information gain:{" "}
                    <span className="text-primary font-medium">0.42</span>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                    Best next test: Perturb gradient + checkpoint timing
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-foreground">Robustness</h4>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Survival score
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {robustnessCards.map((card) => (
                      <div key={card.title} className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{card.title}</span>
                          <span className="text-foreground font-medium">{card.score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-emerald-500/50"
                            style={{ width: `${card.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{card.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-foreground">Anomaly Register</h4>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Quarantine
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                    {anomalyItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/70 bg-card px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-medium">{item.id}</span>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-amber-600">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-foreground">{item.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operator Framework Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-violet-500/5 via-background to-primary/5 p-6 sm:p-10 lg:p-12 shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 size-44 sm:size-64 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-36 sm:size-52 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative space-y-8 sm:space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Deep Dive
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              The Operator Algebra: Brenner&apos;s Methods as Executable Code
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Sydney Brenner&apos;s breakthrough wasn&apos;t just his discoveries - it was his
              method. We&apos;ve encoded his cognitive patterns as composable operators that you can
              apply systematically.
            </p>
          </div>

          {/* Plain English Version */}
          <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              The Brenner Method in 4 Steps
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plainEnglishSteps.map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground italic">
              Want the precise notation? See the operators below.
            </p>
          </div>

          {/* Core Operators Grid */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coreOperators.map((op) => (
              <div
                key={op.symbol}
                className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-primary">{op.symbol}</span>
                  <h4 className="text-base font-semibold text-foreground">{op.name}</h4>
                </div>
                <p className="text-sm font-medium text-foreground mb-2">&quot;{op.tagline}&quot;</p>
                <p className="text-xs text-muted-foreground mb-3">{op.description}</p>
                <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Template
                  </p>
                  <p className="text-xs text-foreground italic">&quot;{op.template}&quot;</p>
                </div>
              </div>
            ))}
          </div>

          {/* Composition Formula */}
          <details className="group rounded-2xl border border-border/70 bg-zinc-950 overflow-hidden">
            <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  The Core Composition
                </span>
              </div>
              <span className="text-zinc-500 group-open:rotate-180 transition-transform">
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-4 sm:px-5 pb-5 space-y-4">
              <div className="rounded-lg bg-zinc-900 p-4 overflow-x-auto">
                <code className="text-sm sm:text-base font-mono text-zinc-300 whitespace-nowrap">
                  (⌂ ∘ ✂ ∘ ≡ ∘ ⊘) powered by (↑ ∘ ⟂ ∘ 🔧) constrained by (⊞) kept honest by (ΔE ∘ †)
                </code>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>- Start from a paradox (◊), split levels (⊘), extract invariants (≡)</p>
                <p>- Design exclusion tests (✂), materialize as decision procedure (⌂)</p>
                <p>
                  - Power by amplification (↑) in well-chosen system (⟂) you build yourself (🔧)
                </p>
                <p>
                  - Constrain by physics (⊞), keep honest with exception handling (ΔE) and theory
                  killing (†)
                </p>
              </div>
            </div>
          </details>

          {/* Extended Operators */}
          <details className="group rounded-2xl border border-border/70 bg-background/80 overflow-hidden">
            <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">Extended Operators</span>
                <span className="text-xs text-muted-foreground">6 more patterns</span>
              </div>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-4 sm:px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {extendedOperators.map((op) => (
                  <div
                    key={op.symbol}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
                  >
                    <span className="text-xl font-bold text-primary">{op.symbol}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{op.name}</p>
                      <p className="text-xs text-muted-foreground">{op.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Code Example */}
          <div className="rounded-2xl border border-border/70 bg-zinc-950 p-4 sm:p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TerminalIcon className="size-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  TypeScript
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">brenner-loop/operators</span>
            </div>
            <pre className="text-xs sm:text-sm font-mono text-zinc-300 whitespace-pre-wrap sm:whitespace-pre">
              <code>{`import { pipe } from "@/lib/brenner-loop/operators/framework";

const brennerPipeline = pipe(
  levelSplit,        // Separate levels
  invariantExtract,  // Find what survives
  exclusionTest,     // Design killing experiments
  materialize,       // Compile to decision procedure
);

const result = brennerPipeline(hypothesis, context);`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Lab Mode Card */}
      {labModeEnabled && (
        <section className="animate-fade-in-up px-4 sm:px-0">
          <Link
            href="/sessions/new"
            className="touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl block"
          >
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-5 sm:p-8 shadow-lg hover:shadow-xl hover:border-primary/50 active:scale-[0.99] transition-all group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 sm:size-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 size-20 sm:size-24 bg-accent/10 rounded-full blur-3xl" />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center justify-center size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <PlayIcon />
                </div>
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-primary">
                      Lab Mode Active
                    </span>
                    <span className="flex size-2 rounded-full bg-success animate-pulse" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                    Start a Research Session
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Compose a <Jargon term="kickoff">kickoff</Jargon> prompt and send it to your
                    agent constellation via <Jargon term="agent-mail">Agent Mail</Jargon>.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-medium text-sm sm:text-base">
                  <span>Launch</span>
                  <ArrowRightIcon />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Stats/Info Section */}
      <StatsSection />

      {/* Quote Section */}
      <section className="py-6 sm:py-8 px-4 sm:px-0">
        <blockquote className="relative max-w-3xl mx-auto text-center">
          <div className="absolute -top-2 sm:-top-4 left-1/2 -translate-x-1/2 text-5xl sm:text-6xl text-primary/20 font-serif select-none">
            &ldquo;
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl text-foreground leading-relaxed italic pt-6 sm:pt-8">
            I think many fields of science could do a great deal better if they went back to the
            <span className="text-primary font-medium"> classical approach</span> of studying a
            problem, rather than following the latest fashion.
          </p>
          <footer className="mt-4 sm:mt-6 text-muted-foreground">
            <cite className="not-italic font-medium block sm:inline">Sydney Brenner</cite>
            <span className="hidden sm:inline mx-2">-</span>
            <span className="text-xs sm:text-sm block sm:inline mt-1 sm:mt-0">
              Nobel Laureate in Physiology or Medicine, 2002
            </span>
          </footer>
        </blockquote>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="sm:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40">
        <Link
          href="/tutorial"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.99] touch-manipulation"
        >
          Start the Tutorial
          <ArrowRightIcon />
        </Link>
      </div>
    </div>
  );
}
