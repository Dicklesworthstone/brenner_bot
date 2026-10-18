import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Jargon } from "@/components/jargon";
import { corpusDocKeys } from "@/hooks/queries/keys";
import { CORPUS_DOCS, readCorpusDoc } from "@/lib/corpus";
import {
  getAllSections,
  getCacheStats,
  getSectionByAnchor,
  getSectionByNumber,
  searchCorpus,
} from "@/lib/corpusSearch";
import { DocumentContentClient } from "./DocumentContentClient";
import { DocumentSwipeNavClient } from "./DocumentSwipeNavClient";

export const runtime = "nodejs";

const DOC_RELATED_QUERY: Record<string, string> = {
  transcript: "molecular",
  "quote-bank": "experiment",
  "distillation-opus-45": "genetic",
  "distillation-gpt-52": "hypothesis",
  "distillation-gemini-3": "organism",
  metaprompt: "biology",
  "initial-metaprompt": "chromosome",
};

// Generate metadata for the document
export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc: docId } = await params;
  const docInfo = CORPUS_DOCS.find((d) => d.id === docId);

  return {
    title: docInfo?.title || "Document",
    description:
      docInfo?.description ||
      `Read ${docInfo?.title || "this document"} from the Brenner Bot corpus.`,
  };
}

// Icons
const ChevronRightIcon = () => (
  <svg
    className="size-4 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

function getNavLinks(currentId: string) {
  const currentIndex = CORPUS_DOCS.findIndex((d) => d.id === currentId);
  if (currentIndex < 0) return { prev: null, next: null };
  const prev = currentIndex > 0 ? CORPUS_DOCS[currentIndex - 1] : null;
  const next = currentIndex < CORPUS_DOCS.length - 1 ? CORPUS_DOCS[currentIndex + 1] : null;
  return { prev, next };
}

export default async function CorpusDocPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc: docId } = await params;
  const doc = CORPUS_DOCS.find((d) => d.id === docId);

  if (!doc) notFound();

  // Prefetch document for client hydration (enables navigation caching).
  // The transcript is ~473KB; dehydrating it into HTML can hurt mobile page load.
  const shouldHydrateDoc = docId !== "transcript";
  const queryClient = shouldHydrateDoc ? new QueryClient() : null;
  if (queryClient) {
    await queryClient.prefetchQuery({
      queryKey: corpusDocKeys.detail(docId),
      queryFn: () => readCorpusDoc(docId),
    });
  }

  const relatedQuery = DOC_RELATED_QUERY[docId] ?? "hypothesis";
  const [allSections, searchResult, openingSection, landmarkSection] = await Promise.all([
    getAllSections(),
    searchCorpus(relatedQuery, 4),
    getSectionByNumber(1),
    getSectionByAnchor("§103"),
  ]);
  const resolvedHitSections = await Promise.all(
    searchResult.hits.map((hit) => getSectionByAnchor(hit.anchor)),
  );
  const cacheStats = getCacheStats();

  const { prev, next } = getNavLinks(docId);

  const content = (
    <div className="animate-fade-in-up">
      <DocumentSwipeNavClient
        key={docId}
        prev={prev ? { id: prev.id, title: prev.title } : null}
        next={next ? { id: next.id, title: next.title } : null}
      >
        <DocumentContentClient docId={docId} />
      </DocumentSwipeNavClient>
    </div>
  );

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm text-muted-foreground mb-8 animate-fade-in"
        aria-label="Breadcrumb"
      >
        <Link
          href="/corpus"
          className="hover:text-foreground active:text-primary transition-colors link-underline touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          Corpus
        </Link>
        <ChevronRightIcon />
        <span className="text-foreground font-medium truncate">{doc?.title || "Document"}</span>
      </nav>

      {/* Document Content - hydrated from server prefetch, cached for navigation */}
      {queryClient ? (
        <HydrationBoundary state={dehydrate(queryClient)}>{content}</HydrationBoundary>
      ) : (
        content
      )}

      {/* Primary Transcript Cross-References & Section Index */}
      <section
        data-testid="corpus-related-transcript-sections"
        className="mt-16 rounded-2xl border border-border bg-card/60 p-6 space-y-5 animate-fade-in-up"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Primary Transcript Cross-References
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct anchor links into the 236-segment Web of Stories transcript related to{" "}
              <span className="font-mono text-foreground">&ldquo;{searchResult.query}&rdquo;</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground">
              {allSections.length} indexed sections
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              {searchResult.totalMatches} matches
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-muted-foreground">
              {cacheStats.cached ? "index cached" : "freshly parsed"}
            </span>
          </div>
        </div>

        {(openingSection || landmarkSection) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Landmark Anchors:</span>
            {openingSection && (
              <Link
                href={`/corpus/transcript#section-${openingSection.sectionNumber}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <span className="font-mono font-semibold text-primary">{openingSection.anchor}</span>
                <span className="truncate max-w-[220px]">{openingSection.title}</span>
              </Link>
            )}
            {landmarkSection && (
              <Link
                href={`/corpus/transcript#section-${landmarkSection.sectionNumber}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <span className="font-mono font-semibold text-primary">
                  {landmarkSection.anchor}
                </span>
                <span className="truncate max-w-[220px]">{landmarkSection.title}</span>
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {searchResult.hits.map((hit, idx) => {
            const resolvedSection = resolvedHitSections[idx];
            const sectionNum =
              resolvedSection?.sectionNumber ?? Number.parseInt(hit.anchor.replace("§", ""), 10);
            return (
              <Link
                key={hit.id}
                href={`/corpus/transcript#section-${sectionNum}`}
                className="group rounded-xl border border-border/80 bg-background/70 p-4 hover:border-primary/40 hover:bg-muted/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                      {hit.anchor}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {hit.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {hit.wordCount}w
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {hit.snippet}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Navigation */}
      <nav className="mt-20 pt-10 border-t border-border animate-fade-in-up">
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/corpus/${prev.id}`}
              className="group flex items-center gap-4 p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowLeftIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Previous
                </span>
                <div className="font-semibold group-hover:text-primary transition-colors truncate">
                  {prev.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={`/corpus/${next.id}`}
              className="group flex items-center gap-4 p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right sm:flex-row-reverse"
            >
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowRightIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Next</span>
                <div className="font-semibold group-hover:text-primary transition-colors truncate">
                  {next.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-10 text-center space-y-3">
          <Link
            href="/corpus"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeftIcon />
            Back to Corpus
          </Link>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Browse more documents exploring the{" "}
            <Jargon term="brenner-method">Brenner method</Jargon> and{" "}
            <Jargon term="operators">operator algebra</Jargon>.
          </p>
        </div>
      </nav>
    </div>
  );
}
