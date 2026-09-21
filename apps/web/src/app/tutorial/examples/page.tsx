import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllTutorialDomainExamples } from "@/lib/tutorial-data";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Domain Examples",
  description: "Worked examples showing the Brenner Loop applied across domains.",
};

const DOMAIN_LABELS: Record<string, string> = {
  biology: "Biology",
  computer_science: "Computer Science",
  social_science: "Social Science",
};

export default function TutorialExamplesPage() {
  const examples = getAllTutorialDomainExamples();

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-0">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/tutorial" className="text-sm text-primary hover:underline">
              ← Back to Tutorial
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Domain Examples</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Worked, lintable artifacts showing the Brenner Loop structure applied to biology,
              computer science, and social science.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((example) => (
          <Link key={example.slug} href={`/tutorial/examples/${example.slug}`} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">
                    {DOMAIN_LABELS[example.domain] ?? example.domain}
                  </Badge>
                  <Badge variant="outline">Worked artifact</Badge>
                </div>
                <CardTitle className="text-base">{example.title}</CardTitle>
                <CardDescription className="text-sm">{example.topic}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-5">{example.researchQuestion}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
