"use client";

/**
 * Quality Assurance & Research Hygiene Section
 *
 * Landing page section showcasing research guardrails:
 * - Coach Mode with progressive scaffolding
 * - Prediction Lock to prevent hindsight bias
 * - Calibration Tracking for accuracy over time
 * - Confound Detection by research domain
 * - Artifact Linting with 50+ hygiene rules
 *
 * @see brenner_bot-f8vs.4
 */

// Icons
const ShieldCheckIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
    />
  </svg>
);

const LockClosedIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const DocumentCheckIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// Feature data
const researchDomains = [
  { name: "Psychology", abbrev: "PSY" },
  { name: "Epidemiology", abbrev: "EPI" },
  { name: "Economics", abbrev: "ECO" },
  { name: "Biology", abbrev: "BIO" },
  { name: "Sociology", abbrev: "SOC" },
  { name: "Neuroscience", abbrev: "NEU" },
  { name: "CS", abbrev: "CS" },
  { name: "General", abbrev: "GEN" },
];

const qaFeatures = [
  {
    title: "Coach Mode",
    tagline: "Learn the Method While You Work",
    description:
      "Progressive scaffolding based on experience level. Inline explanations with Brenner quotes catch mistakes before they compound.",
    icon: <AcademicCapIcon />,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    highlights: [
      "Three levels: beginner, intermediate, advanced",
      "Auto-promotes based on tracked progress",
      "Specific feedback, not generic warnings",
    ],
  },
  {
    title: "Prediction Lock",
    tagline: "Prevent Hindsight Bias",
    description:
      "Predictions must be locked before test results arrive. You cannot 'predict' outcomes you already know.",
    icon: <LockClosedIcon />,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-700 dark:text-amber-300",
    highlights: [
      "Cryptographic commitment timestamps",
      "Cannot edit after lock engages",
      "Calibration tracks locked predictions only",
    ],
  },
  {
    title: "Calibration Tracking",
    tagline: "Know Your Accuracy",
    description:
      "Brier scores for probabilistic accuracy. Overconfidence bias detection keeps you honest over time.",
    icon: <ChartBarIcon />,
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-700 dark:text-sky-300",
    highlights: [
      "Domain-specific calibration curves",
      "Overconfidence alerts when warranted",
      "Historical accuracy visualization",
    ],
  },
  {
    title: "Confound Detection",
    tagline: "See What You Might Miss",
    description:
      "Eight research domains with domain-specific confounds. Automatic detection based on hypothesis text triggers prompting questions.",
    icon: <ExclamationTriangleIcon />,
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-700 dark:text-rose-300",
    highlights: [
      "Selection bias, reverse causation, omitted variables",
      "Domain-aware prompting questions",
      "Links to methodological literature",
    ],
  },
];

const linterCategories = [
  {
    name: "Hypothesis Hygiene",
    count: 12,
    examples: ["Third alternative required", "Unfalsifiable language flagged"],
  },
  {
    name: "Test Design",
    count: 15,
    examples: ["Potency control required", "Sample size power analysis"],
  },
  {
    name: "Evidence Chain",
    count: 10,
    examples: ["Citation anchors must resolve", "Source credibility check"],
  },
  {
    name: "Structural",
    count: 8,
    examples: ["Missing fields detected", "Orphan references flagged"],
  },
  {
    name: "Reasoning",
    count: 7,
    examples: ["Circular logic detection", "Base rate neglect warning"],
  },
];

/**
 * Quality Assurance & Research Hygiene Section
 */
export function QualityAssuranceSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/5 via-background to-amber-500/5 p-6 sm:p-10 lg:p-12 shadow-lg">
      {/* Decorative orbs */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 sm:size-56 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-32 sm:size-44 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium">
            <ShieldCheckIcon />
            <span>Research Hygiene</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
            Built-In Guardrails for Rigorous Science
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Catch mistakes before they become problems. Lock predictions to prevent hindsight bias.
            Track calibration over time. Detect confounds automatically.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {qaFeatures.map((feature) => (
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

                {/* Highlights */}
                <ul className="space-y-1.5">
                  {feature.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2 text-xs text-foreground/80"
                    >
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckIcon />
                      </span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Research Domains */}
        <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                Domain-Specific Confound Detection
              </h4>
              <p className="text-sm text-muted-foreground">
                Each domain has unique methodological pitfalls
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">8 domains</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {researchDomains.map((domain) => (
              <span
                key={domain.abbrev}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default"
              >
                <span className="size-1.5 rounded-full bg-primary/60" />
                {domain.name}
              </span>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-xs text-muted-foreground italic">
              Example: &quot;Selection bias detected in hypothesis H2 — how will you ensure random
              sampling?&quot;
            </p>
          </div>
        </div>

        {/* Artifact Linting */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <DocumentCheckIcon />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Artifact Linting</h4>
                <p className="text-sm text-muted-foreground">50+ rules for research hygiene</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every hypothesis, test, and evidence item passes through automated hygiene checks.
              Structural integrity, citation resolution, and reasoning validity—all verified before
              you ship.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Pass
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                Warning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" />
                Error
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Linter Categories</span>
              <span>52 rules</span>
            </div>
            <div className="space-y-2">
              {linterCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
                    {category.count}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{category.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.examples.join(" • ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-border/70 bg-background/80 p-5 sm:p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 text-center">
            Without Guardrails vs. With BrennerBot
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-400 font-medium">
                Without Guardrails
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-rose-500/60" />
                  Predictions adjusted after seeing results
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-rose-500/60" />
                  Confounds discovered in peer review
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-rose-500/60" />
                  Vague hypotheses survive unchallenged
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-rose-500/60" />
                  Overconfidence goes unchecked
                </li>
              </ul>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-medium">
                With BrennerBot
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-500/60" />
                  Predictions locked before execution
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-500/60" />
                  Confounds flagged during design
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-500/60" />
                  Unfalsifiable language caught early
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-500/60" />
                  Calibration tracked and displayed
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
