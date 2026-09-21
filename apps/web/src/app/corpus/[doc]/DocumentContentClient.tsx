"use client";

/**
 * DocumentContentClient - Client-side document viewer with TanStack Query
 *
 * This component uses the useCorpusDoc hook to fetch document content.
 * When rendered inside HydrationBoundary, it picks up server-prefetched data
 * for instant render, then caches for subsequent navigations.
 */

import { memo, useMemo } from "react";
import { DistillationViewer } from "@/components/distillation/DistillationViewer";
import { MetapromptViewer } from "@/components/metaprompt/MetapromptViewer";
import { QuoteBankViewer } from "@/components/quotebank/QuoteBankViewer";
import { parseRawResponse, RawResponseViewer } from "@/components/raw-response/RawResponseViewer";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { useCorpusDoc } from "@/hooks/queries";
import { parseDistillation } from "@/lib/distillation-parser";
import { parseMetaprompt } from "@/lib/metaprompt-parser";
import { parseQuoteBank } from "@/lib/quotebank-parser";
import { parseTranscript } from "@/lib/transcript-parser";

// ============================================================================
// TYPES
// ============================================================================

interface DocumentContentClientProps {
  docId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDocType(
  id: string,
): "transcript" | "distillation" | "quote-bank" | "raw-response" | "metaprompt" {
  if (id === "transcript") return "transcript";
  if (id === "quote-bank") return "quote-bank";
  if (id.startsWith("distillation")) return "distillation";
  if (id.startsWith("raw-")) return "raw-response";
  return "metaprompt";
}

function getReadTime(id: string): string {
  const times: Record<string, string> = {
    transcript: "2+ hours",
    "quote-bank": "45 min",
    metaprompt: "10 min",
    "initial-metaprompt": "5 min",
    "distillation-gpt-52": "30 min",
    "distillation-opus-45": "45 min",
    "distillation-gemini-3": "20 min",
  };
  return times[id] || "15 min";
}

function getWordCount(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  if (words >= 1000) {
    return `${Math.round(words / 1000)}k`;
  }
  return `${words}`;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DocumentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <Skeleton className="h-10 w-3/4" />
      {/* Meta skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      {/* Content skeletons */}
      <div className="space-y-4 mt-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function DocumentError({ error }: { error: Error }) {
  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold text-destructive mb-2">Failed to load document</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DocumentContentClient = memo(function DocumentContentClient({
  docId,
}: DocumentContentClientProps) {
  const { data, isLoading, error } = useCorpusDoc(docId);

  const docType = getDocType(docId);
  const readTime = getReadTime(docId);
  const hasData = Boolean(data);
  const content = data?.content ?? "";

  const wordCount = useMemo(() => getWordCount(content), [content]);

  const parsedTranscript = useMemo(() => {
    if (!hasData || docType !== "transcript") return null;
    return parseTranscript(content);
  }, [content, docType, hasData]);

  const parsedDistillation = useMemo(() => {
    if (!hasData || docType !== "distillation") return null;
    return parseDistillation(content, docId);
  }, [content, docId, docType, hasData]);

  const parsedQuoteBank = useMemo(() => {
    if (!hasData || docType !== "quote-bank") return null;
    return parseQuoteBank(content);
  }, [content, docType, hasData]);

  const parsedMetaprompt = useMemo(() => {
    if (!hasData || docType !== "metaprompt") return null;
    return parseMetaprompt(content);
  }, [content, docType, hasData]);

  const parsedRawResponse = useMemo(() => {
    if (!hasData || docType !== "raw-response") return null;
    return parseRawResponse(content, docId);
  }, [content, docId, docType, hasData]);

  // Loading state - show skeleton
  if (isLoading) {
    return <DocumentSkeleton />;
  }

  // Error state
  if (error) {
    return <DocumentError error={error} />;
  }

  // No data (shouldn't happen with proper hydration, but handle gracefully)
  if (!data) {
    return <DocumentSkeleton />;
  }

  switch (docType) {
    case "transcript": {
      if (!parsedTranscript) return <DocumentSkeleton />;
      return (
        <TranscriptViewer
          data={parsedTranscript}
          estimatedReadTime={readTime}
          wordCount={wordCount}
        />
      );
    }

    case "distillation": {
      if (!parsedDistillation) return <DocumentSkeleton />;
      return <DistillationViewer data={parsedDistillation} docId={docId} />;
    }

    case "quote-bank": {
      if (!parsedQuoteBank) return <DocumentSkeleton />;
      return <QuoteBankViewer data={parsedQuoteBank} />;
    }

    case "metaprompt": {
      if (!parsedMetaprompt) return <DocumentSkeleton />;
      return <MetapromptViewer data={parsedMetaprompt} />;
    }

    case "raw-response": {
      if (!parsedRawResponse) return <DocumentSkeleton />;
      return <RawResponseViewer data={parsedRawResponse} />;
    }
  }
});

DocumentContentClient.displayName = "DocumentContentClient";
