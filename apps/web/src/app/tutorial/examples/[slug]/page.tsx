import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lintArtifact, renderArtifactMarkdown } from "@/lib/artifact-merge";
import {
  detectLevelConflation,
  type Hypothesis,
  validateThirdAlternative,
  warnMissingMechanism,
} from "@/lib/schemas/hypothesis";
import { BRENNER_QUOTES, scoreSession } from "@/lib/schemas/scorecard";
import { getAllTutorialDomainExamples, getTutorialDomainExample } from "@/lib/tutorial-data";

export const runtime = "nodejs";

const DOMAIN_LABELS: Record<string, string> = {
  biology: "Biology",
  computer_science: "Computer Science",
  social_science: "Social Science",
};

const DIMENSION_LABELS: Record<string, string> = {
  paradoxGrounding: "Paradox Grounding",
  hypothesisKillRate: "Hypothesis Kill Rate",
  testDiscriminability: "Test Discriminability",
  assumptionTracking: "Assumption Tracking",
  thirdAlternativeDiscovery: "Third Alternative Discovery",
  experimentalFeasibility: "Experimental Feasibility",
  adversarialPressure: "Adversarial Pressure",
};

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllTutorialDomainExamples().map((example) => ({
    slug: example.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const example = getTutorialDomainExample(slug);
  if (!example) {
    return { title: "Example Not Found" };
  }
  return {
    title: example.title,
    description: example.topic,
  };
}

function MarkdownBody({ body }: { body: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

export default async function TutorialExamplePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await Promise.resolve(params);
  const example = getTutorialDomainExample(slug);
  if (!example) notFound();

  const lint = lintArtifact(example.artifact);
  const artifactMarkdown = renderArtifactMarkdown(example.artifact);
  const scorecard = scoreSession({
    sessionId: example.artifact.metadata.session_id,
    artifact: example.artifact,
    researchQuestion: example.researchQuestion,
  });

  const nowIso = example.artifact.metadata.created_at || "2026-01-01T00:00:00Z";
  const schemaHypotheses: Hypothesis[] = (example.artifact.sections.hypothesis_slate ?? []).map(
    (h) => ({
      id: h.id,
      statement: h.claim,
      mechanism: h.mechanism,
      origin: h.third_alternative ? "third_alternative" : "proposed",
      category: h.third_alternative ? "third_alternative" : "mechanistic",
      confidence: "medium",
      sessionId: example.artifact.metadata.session_id,
      state: "active",
      isInference: (h.anchors ?? []).includes("inference"),
      unresolvedCritiqueCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
  );

  const thirdAltCheck = validateThirdAlternative(schemaHypotheses);
  const missingMechanismWarnings = schemaHypotheses
    .map((h) => warnMissingMechanism(h))
    .filter((warning): warning is string => warning !== null);
  const levelConflationFlags = schemaHypotheses.flatMap((h) =>
    detectLevelConflation(`${h.statement} ${h.mechanism ?? ""}`),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-0">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href="/tutorial/examples" className="text-sm text-primary hover:underline">
              ← Back to Examples
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{example.title}</h1>
            <p className="text-sm text-muted-foreground">{example.topic}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{DOMAIN_LABELS[example.domain] ?? example.domain}</Badge>
            <Badge variant="outline" data-testid="example-scorecard-grade">
              Grade {scorecard.grade} • {scorecard.totalScore}/{scorecard.maxScore}
            </Badge>
            {lint.valid ? (
              <Badge variant="outline" className="border-success/40 text-success">
                lint: ok
              </Badge>
            ) : (
              <Badge variant="destructive">lint: errors</Badge>
            )}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Research Question</CardTitle>
          <CardDescription>
            One-paragraph framing (what we’re actually trying to explain).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          {example.researchQuestion}
        </CardContent>
      </Card>

      <Card data-testid="example-brenner-scorecard">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>7-Dimension Brenner Scorecard & Epistemic Diagnostics</CardTitle>
              <CardDescription>
                Automated rubric evaluation and level-separation / third-alternative guardrails.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Score: {scorecard.totalScore}/{scorecard.maxScore} ({scorecard.grade})
              </Badge>
              <Badge variant={thirdAltCheck.present ? "outline" : "destructive"}>
                3rd Alternative: Q{thirdAltCheck.quality}/3
              </Badge>
              <Badge variant={levelConflationFlags.length === 0 ? "outline" : "destructive"}>
                {levelConflationFlags.length === 0
                  ? "Level Separation: Clean"
                  : `${levelConflationFlags.length} Conflation Flag(s)`}
              </Badge>
              {missingMechanismWarnings.length === 0 && (
                <Badge variant="outline">Mechanisms: Complete</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(scorecard.dimensions).map(([key, dim]) => {
              const quote = BRENNER_QUOTES[key as keyof typeof BRENNER_QUOTES];
              return (
                <div
                  key={key}
                  data-testid={`example-dimension-${key}`}
                  className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {DIMENSION_LABELS[key] ?? dim.dimension}
                    </span>
                    <span className="font-mono text-xs text-primary">
                      {dim.points}/{dim.maxPoints}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${dim.percentage}%` }}
                    />
                  </div>
                  {quote && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                      {quote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground" data-testid="example-third-alt-summary">
            {thirdAltCheck.message}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excerpt Anchors</CardTitle>
          <CardDescription>
            Grounding references (Brenner §n anchors or domain evidence notes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {example.excerpt.map((item) => {
              const sectionMatch = /^§(\d+)/.exec(item.anchor.trim());
              return (
                <li key={`${item.anchor}-${item.note}`} className="flex items-start gap-3">
                  {sectionMatch ? (
                    <Link
                      href={`/corpus/transcript#section-${sectionMatch[1]}`}
                      data-testid={`excerpt-anchor-link-${item.anchor}`}
                      className="font-mono text-xs px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                    >
                      {item.anchor}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs px-2 py-1 rounded-md border border-border bg-muted/30 shrink-0">
                      {item.anchor}
                    </span>
                  )}
                  <span className="text-muted-foreground">{item.note}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operator Annotations</CardTitle>
          <CardDescription>Where the Brenner operators appear in this artifact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {example.operatorAnnotations.map((ann) => (
            <div
              key={ann.operator}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{ann.operator}</div>
                <div className="flex flex-wrap gap-2">
                  {ann.appliedIn.map((loc) => (
                    <Badge key={loc} variant="secondary">
                      {loc}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{ann.note}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complete Artifact</CardTitle>
          <CardDescription>
            Rendered from the compiled artifact structure (this should lint cleanly).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownBody body={artifactMarkdown} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commentary</CardTitle>
          <CardDescription>
            Why this artifact is “good” (and what to copy into your own work).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {example.commentary.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!lint.valid && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Lint Report</CardTitle>
            <CardDescription>
              Fixes needed before this can be treated as a canonical example.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lint.violations.map((v) => (
              <div key={v.id} className="rounded-lg border border-border bg-card p-3">
                <div className="font-mono text-xs text-muted-foreground">
                  {v.id} • {v.severity}
                </div>
                <div className="text-foreground">{v.message}</div>
                {v.fix && <div className="text-muted-foreground mt-1">Fix: {v.fix}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
