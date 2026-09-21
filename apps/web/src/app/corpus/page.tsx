"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Jargon } from "@/components/jargon";
import { AnimatedElement, HeroBackground } from "@/components/ui/animated-element";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

interface CorpusDoc {
  id: string;
  title: string;
  description: string;
  filename: string;
}

type CategoryKey = "primary" | "distillations" | "raw-responses" | "prompts";

// ============================================================================
// CONSTANTS
// ============================================================================

const CORPUS_DOCS: CorpusDoc[] = [
  {
    id: "transcript",
    title: "Complete Brenner Transcript",
    description: "236 interview segments from Sydney Brenner's Web of Stories collection",
    filename: "complete_brenner_transcript.md",
  },
  {
    id: "quote-bank",
    title: "Quote Bank",
    description: "Curated verbatim quotes indexed by operator and motif",
    filename: "quote_bank_restored_primitives.md",
  },
  {
    id: "distillation-opus-45",
    title: "Opus 4.5 Distillation",
    description: "Two Axioms framework with operator algebra and failure modes",
    filename: "final_distillation_of_brenner_method_by_opus45.md",
  },
  {
    id: "distillation-gpt-52",
    title: "GPT-5.2 Distillation",
    description: "Objective function, scoring rubrics, and 12 guardrails",
    filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
  },
  {
    id: "distillation-gemini-3",
    title: "Gemini 3 Distillation",
    description: "The Brenner Kernel: instruction set and debugging protocols",
    filename: "final_distillation_of_brenner_method_by_gemini3.md",
  },
  {
    id: "metaprompt",
    title: "Metaprompt Template",
    description: "Structured prompts for applying the Brenner method",
    filename: "metaprompt_by_gpt_52.md",
  },
  {
    id: "initial-metaprompt",
    title: "Initial Metaprompt",
    description: "The original seed prompt that started the project",
    filename: "initial_metaprompt.md",
  },
  // Raw Model Responses - GPT
  {
    id: "raw-gpt-batch-1",
    title: "GPT-5.2 Response (Batch 1)",
    description: "First batch of extended reasoning responses from GPT-5.2 Pro",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_1.md",
  },
  {
    id: "raw-gpt-batch-2",
    title: "GPT-5.2 Response (Batch 2)",
    description: "Second batch of extended reasoning responses from GPT-5.2 Pro",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_2.md",
  },
  {
    id: "raw-gpt-batch-3",
    title: "GPT-5.2 Response (Batch 3)",
    description: "Third batch of extended reasoning responses from GPT-5.2 Pro",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_3.md",
  },
  {
    id: "raw-gpt-truncated",
    title: "GPT-5.2 Response (Previously Truncated)",
    description: "Previously truncated GPT-5.2 responses, now complete",
    filename:
      "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_previously_truncated_batch.md",
  },
  // Raw Model Responses - Opus
  {
    id: "raw-opus-batch-1",
    title: "Opus 4.5 Response (Batch 1)",
    description: "First batch of responses from Claude Opus 4.5",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_1.md",
  },
  {
    id: "raw-opus-batch-2",
    title: "Opus 4.5 Response (Batch 2)",
    description: "Second batch of responses from Claude Opus 4.5",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_2.md",
  },
  {
    id: "raw-opus-batch-3",
    title: "Opus 4.5 Response (Batch 3)",
    description: "Third batch of responses from Claude Opus 4.5",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_3.md",
  },
  // Raw Model Responses - Gemini
  {
    id: "raw-gemini-batch-1",
    title: "Gemini 3 Response (Batch 1)",
    description: "First batch of deep think responses from Gemini 3",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_1.md",
  },
  {
    id: "raw-gemini-batch-2",
    title: "Gemini 3 Response (Batch 2)",
    description: "Second batch of deep think responses from Gemini 3",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_2.md",
  },
  {
    id: "raw-gemini-batch-3",
    title: "Gemini 3 Response (Batch 3)",
    description: "Third batch of deep think responses from Gemini 3",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_3.md",
  },
];

// ============================================================================
// ICONS
// ============================================================================

const BookOpenIcon = ({ className = "size-5" }: { className?: string }) => (
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
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const DocumentIcon = ({ className = "size-5" }: { className?: string }) => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const SparklesIcon = ({ className = "size-5" }: { className?: string }) => (
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const SearchIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChatBubbleIcon = ({ className = "size-5" }: { className?: string }) => (
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
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
    />
  </svg>
);

const ArrowRightIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const ClockIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ChevronDownIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XMarkIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const categories: Record<
  CategoryKey,
  { title: string; description: string; icon: ReactNode; color: string }
> = {
  primary: {
    title: "Primary Sources",
    description: "The original transcript and curated quotes",
    icon: <BookOpenIcon className="size-4 sm:size-5" />,
    color: "from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10",
  },
  distillations: {
    title: "Model Distillations",
    description: "Three frontier model analyses of Brenner's methodology",
    icon: <SparklesIcon className="size-4 sm:size-5" />,
    color: "from-purple-500/20 to-pink-500/20 dark:from-purple-500/10 dark:to-pink-500/10",
  },
  "raw-responses": {
    title: "Raw Model Responses",
    description: "Complete reasoning traces from each model's analysis sessions",
    icon: <ChatBubbleIcon className="size-4 sm:size-5" />,
    color: "from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10",
  },
  prompts: {
    title: "Metaprompts",
    description: "Structured prompts for applying the Brenner method",
    icon: <DocumentIcon className="size-4 sm:size-5" />,
    color: "from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getCategory(id: string): CategoryKey {
  if (id.startsWith("distillation")) return "distillations";
  if (id === "transcript" || id === "quote-bank") return "primary";
  if (id.startsWith("raw-")) return "raw-responses";
  return "prompts";
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
  if (times[id]) return times[id];
  // Raw response batches
  if (id.startsWith("raw-gpt")) return "40-50 min";
  if (id.startsWith("raw-opus")) return "12-15 min";
  if (id.startsWith("raw-gemini")) return "6-8 min";
  return "15 min";
}

function getModelBadge(id: string): { label: string; colorClass: string } | null {
  // Distillations
  if (id === "distillation-opus-45")
    return {
      label: "Claude Opus 4.5",
      colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    };
  if (id === "distillation-gpt-52")
    return {
      label: "GPT-5.2 Pro",
      colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    };
  if (id === "distillation-gemini-3")
    return { label: "Gemini 3", colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
  // Raw responses
  if (id.startsWith("raw-gpt"))
    return {
      label: "GPT-5.2 Pro",
      colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    };
  if (id.startsWith("raw-opus"))
    return {
      label: "Claude Opus 4.5",
      colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    };
  if (id.startsWith("raw-gemini"))
    return { label: "Gemini 3", colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
  return null;
}

// ============================================================================
// DOCUMENT CARD COMPONENT
// ============================================================================

interface DocCardProps {
  doc: CorpusDoc;
  index: number;
}

function DocCard({ doc, index }: DocCardProps) {
  const badge = getModelBadge(doc.id);
  const readTime = getReadTime(doc.id);
  const isRawResponse = doc.id.startsWith("raw-");

  return (
    <AnimatedElement
      animation="reveal-up"
      delay={index * 60}
      threshold={0.05}
      rootMargin="0px 0px -20px 0px"
      className="h-full"
    >
      <Link
        href={`/corpus/${doc.id}`}
        className="group block touch-manipulation h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card
          hover
          className="h-full relative overflow-hidden active:scale-[0.98] transition-transform flex flex-col"
        >
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-primary/3 transition-all duration-500 pointer-events-none" />

          <CardHeader className="p-4 sm:p-5 lg:p-6 relative flex-1">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                {/* Title with hover animation */}
                <CardTitle className="text-base sm:text-lg lg:text-xl group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {doc.title}
                </CardTitle>

                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>

                {/* Meta info row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                  {/* Model badge */}
                  {badge && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${badge.colorClass}`}
                    >
                      {badge.label}
                    </span>
                  )}

                  {/* Read time */}
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <ClockIcon className="size-3" />
                    {readTime}
                  </span>

                  {/* Filename - hidden on mobile and for raw responses (ugly paths) */}
                  {!isRawResponse && (
                    <CardDescription className="hidden lg:block font-mono text-[10px] truncate max-w-[180px]">
                      {doc.filename}
                    </CardDescription>
                  )}
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex items-center justify-center size-8 sm:size-10 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-active:bg-primary/10 group-active:text-primary transition-all duration-200 shrink-0 group-hover:translate-x-0.5 group-active:translate-x-0.5">
                <ArrowRightIcon className="size-4 sm:size-5 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </AnimatedElement>
  );
}

// ============================================================================
// RAW RESPONSES SECTION - Premium grouped design
// ============================================================================

type ModelKey = "gpt" | "opus" | "gemini";

const modelConfig: Record<
  ModelKey,
  {
    name: string;
    fullName: string;
    color: string;
    bgColor: string;
    borderColor: string;
    iconBg: string;
  }
> = {
  gpt: {
    name: "GPT-5.2",
    fullName: "GPT-5.2 Pro",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20",
  },
  opus: {
    name: "Opus 4.5",
    fullName: "Claude Opus 4.5",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500/20 to-amber-600/20",
  },
  gemini: {
    name: "Gemini 3",
    fullName: "Gemini 3 Deep Think",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500/20 to-blue-600/20",
  },
};

function getModelFromId(id: string): ModelKey | null {
  if (id.includes("gpt")) return "gpt";
  if (id.includes("opus")) return "opus";
  if (id.includes("gemini")) return "gemini";
  return null;
}

function getBatchLabel(id: string): string {
  if (id.includes("batch-1")) return "Batch 1";
  if (id.includes("batch-2")) return "Batch 2";
  if (id.includes("batch-3")) return "Batch 3";
  if (id.includes("truncated")) return "Extended";
  return "Response";
}

function getBatchDescription(id: string): string {
  if (id.includes("truncated")) return "Previously truncated responses, now complete";
  const batch = getBatchLabel(id);
  return `${batch} of reasoning traces`;
}

// Model icon components
const GPTIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const ClaudeIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
);

const GeminiIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ModelIcon = ({ model, className = "size-5" }: { model: ModelKey; className?: string }) => {
  if (model === "gpt") return <GPTIcon className={className} />;
  if (model === "opus") return <ClaudeIcon className={className} />;
  if (model === "gemini") return <GeminiIcon className={className} />;
  return null;
};

interface RawResponsesSectionProps {
  docs: CorpusDoc[];
  isExpanded: boolean;
  onToggle: () => void;
  sectionIndex: number;
}

function RawResponsesSection({
  docs,
  isExpanded,
  onToggle,
  sectionIndex,
}: RawResponsesSectionProps) {
  const [activeModel, setActiveModel] = useState<ModelKey>("gpt");
  const category = categories["raw-responses"];

  // Group docs by model
  const groupedByModel = useMemo(() => {
    const groups: Record<ModelKey, CorpusDoc[]> = { gpt: [], opus: [], gemini: [] };
    docs.forEach((doc) => {
      const model = getModelFromId(doc.id);
      if (model) groups[model].push(doc);
    });
    return groups;
  }, [docs]);

  if (docs.length === 0) return null;

  const modelKeys: ModelKey[] = ["gpt", "opus", "gemini"];

  return (
    <AnimatedElement
      animation="reveal-up"
      delay={sectionIndex * 100}
      className="space-y-4 sm:space-y-5"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left group lg:cursor-default"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center justify-center size-8 sm:size-10 rounded-xl bg-gradient-to-br ${category.color} text-foreground transition-transform group-hover:scale-105 lg:group-hover:scale-100`}
          >
            {category.icon}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">{category.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {category.description}
            </p>
          </div>
        </div>
        <div
          className={`lg:hidden flex items-center justify-center size-8 rounded-full bg-muted/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </div>
      </button>

      {/* Content - Collapsible on mobile */}
      <div
        className={`transition-all duration-300 ease-out lg:block ${isExpanded ? "block" : "hidden lg:block"}`}
      >
        {/* Desktop: Premium tabbed interface */}
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/80 overflow-hidden shadow-sm">
            {/* Tab bar */}
            <div className="flex border-b border-border/50 bg-muted/30">
              {modelKeys.map((model) => {
                const config = modelConfig[model];
                const isActive = activeModel === model;
                const count = groupedByModel[model].length;

                return (
                  <button
                    key={model}
                    onClick={() => setActiveModel(model)}
                    className={`flex-1 relative px-6 py-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                      isActive
                        ? `${config.color} bg-background`
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ModelIcon model={model} className="size-4" />
                      <span>{config.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs ${
                          isActive ? config.bgColor : "bg-muted"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    {/* Active indicator line */}
                    {isActive && (
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                          model === "gpt"
                            ? "bg-emerald-500"
                            : model === "opus"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-4">
              <div className="space-y-2">
                {groupedByModel[activeModel].map((doc, index) => {
                  const config = modelConfig[activeModel];
                  return (
                    <Link
                      key={doc.id}
                      href={`/corpus/${doc.id}`}
                      className={`group flex items-center gap-4 p-4 rounded-xl border ${config.borderColor} ${config.bgColor} hover:shadow-md active:scale-[0.98] transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                    >
                      {/* Batch number indicator */}
                      <div
                        className={`flex items-center justify-center size-10 rounded-lg ${config.iconBg} ${config.color} font-semibold text-lg shrink-0`}
                      >
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${config.color} group-hover:underline`}>
                            {getBatchLabel(doc.id)}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {getReadTime(doc.id)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {getBatchDescription(doc.id)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon
                        className={`size-4 ${config.color} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0`}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Stacked accordion style */}
        <div className="lg:hidden space-y-3">
          {modelKeys.map((model) => {
            const config = modelConfig[model];
            const modelDocs = groupedByModel[model];
            if (modelDocs.length === 0) return null;

            return (
              <div
                key={model}
                className={`rounded-xl border ${config.borderColor} overflow-hidden`}
              >
                {/* Model header */}
                <div className={`flex items-center gap-3 px-4 py-3 ${config.bgColor}`}>
                  <div
                    className={`flex items-center justify-center size-8 rounded-lg ${config.iconBg} ${config.color}`}
                  >
                    <ModelIcon model={model} className="size-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${config.color}`}>{config.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {modelDocs.length} response batches
                    </p>
                  </div>
                </div>

                {/* Batch list */}
                <div className="divide-y divide-border/50">
                  {modelDocs.map((doc, index) => (
                    <Link
                      key={doc.id}
                      href={`/corpus/${doc.id}`}
                      className="group flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/50 transition-all active:bg-muted active:scale-[0.98] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      {/* Batch number */}
                      <span
                        className={`flex items-center justify-center size-7 rounded-md ${config.bgColor} ${config.color} text-sm font-medium`}
                      >
                        {index + 1}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {getBatchLabel(doc.id)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {getReadTime(doc.id)}
                        </span>
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedElement>
  );
}

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

interface CategorySectionProps {
  categoryKey: CategoryKey;
  docs: CorpusDoc[];
  isExpanded: boolean;
  onToggle: () => void;
  sectionIndex: number;
}

function CategorySection({
  categoryKey,
  docs,
  isExpanded,
  onToggle,
  sectionIndex,
}: CategorySectionProps) {
  const category = categories[categoryKey];

  if (docs.length === 0) return null;

  // Use specialized component for raw responses
  if (categoryKey === "raw-responses") {
    return (
      <RawResponsesSection
        docs={docs}
        isExpanded={isExpanded}
        onToggle={onToggle}
        sectionIndex={sectionIndex}
      />
    );
  }

  return (
    <AnimatedElement
      animation="reveal-up"
      delay={sectionIndex * 100}
      className="space-y-3 sm:space-y-4"
    >
      {/* Category Header - Clickable on mobile */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left group lg:cursor-default"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center justify-center size-8 sm:size-10 rounded-xl bg-gradient-to-br ${category.color} text-foreground transition-transform group-hover:scale-105 lg:group-hover:scale-100`}
          >
            {category.icon}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">{category.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {category.description}
            </p>
          </div>
        </div>

        {/* Mobile toggle indicator */}
        <div
          className={`lg:hidden flex items-center justify-center size-8 rounded-full bg-muted/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </div>
      </button>

      {/* Cards Grid - Collapsible on mobile */}
      <div
        className={`transition-all duration-300 ease-out lg:block ${isExpanded ? "block" : "hidden lg:block"}`}
      >
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 items-stretch">
          {docs.map((doc, index) => (
            <DocCard key={doc.id} doc={doc} index={index} />
          ))}
        </div>
      </div>
    </AnimatedElement>
  );
}

// ============================================================================
// SEARCH BAR COMPONENT
// ============================================================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  return (
    <div className="relative group">
      {/* Search input with glassmorphism */}
      <div className="relative flex items-center">
        <div className="absolute left-4 text-muted-foreground transition-colors group-focus-within:text-primary">
          <SearchIcon className="size-4 sm:size-5" />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter by title..."
          className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-10 sm:pr-12 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm text-sm sm:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 sm:right-4 p-1 rounded-full hover:bg-muted active:bg-muted/80 active:scale-90 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XMarkIcon className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Result count or search hint */}
      <div className="absolute -bottom-6 left-4 text-xs text-muted-foreground animate-fade-in">
        {value ? (
          <span>
            {resultCount} {resultCount === 1 ? "result" : "results"} found
          </span>
        ) : (
          <span>
            Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘K</kbd> for
            full-text search
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY PILLS COMPONENT
// ============================================================================

interface CategoryPillsProps {
  activeCategory: CategoryKey | "all";
  onChange: (category: CategoryKey | "all") => void;
  counts: Record<CategoryKey | "all", number>;
}

function CategoryPills({ activeCategory, onChange, counts }: CategoryPillsProps) {
  const allCategories: (CategoryKey | "all")[] = [
    "all",
    "primary",
    "distillations",
    "raw-responses",
    "prompts",
  ];

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide px-4 sm:px-0">
        {allCategories.map((cat) => {
          const isActive = activeCategory === cat;
          const label = cat === "all" ? "All" : categories[cat].title;
          const count = counts[cat];

          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80"
              }`}
            >
              <span>{label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${
                  isActive ? "bg-primary-foreground/20" : "bg-background/50"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {/* Fade hint on mobile */}
      <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CorpusIndexPage() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");
  const [expandedSections, setExpandedSections] = useState<Record<CategoryKey, boolean>>({
    primary: true,
    distillations: true,
    "raw-responses": true,
    prompts: true,
  });

  // Filter docs based on search and category
  const filteredDocs = useMemo(() => {
    let docs = CORPUS_DOCS;

    // Category filter
    if (activeCategory !== "all") {
      docs = docs.filter((doc) => getCategory(doc.id) === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      docs = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description.toLowerCase().includes(query) ||
          doc.filename.toLowerCase().includes(query),
      );
    }

    return docs;
  }, [searchQuery, activeCategory]);

  // Group filtered docs by category
  const groupedDocs = useMemo(() => {
    return filteredDocs.reduce(
      (acc, doc) => {
        const cat = getCategory(doc.id);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(doc);
        return acc;
      },
      {} as Record<CategoryKey, CorpusDoc[]>,
    );
  }, [filteredDocs]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey | "all", number> = {
      all: CORPUS_DOCS.length,
      primary: 0,
      distillations: 0,
      "raw-responses": 0,
      prompts: 0,
    };

    CORPUS_DOCS.forEach((doc) => {
      const cat = getCategory(doc.id);
      counts[cat]++;
    });

    return counts;
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((key: CategoryKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      {/* Hero Section */}
      <HeroBackground
        showOrbs
        showGrid
        className="rounded-2xl sm:rounded-3xl -mx-4 px-4 sm:mx-0 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10"
      >
        <AnimatedElement animation="reveal-up" className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center size-12 sm:size-14 lg:size-16 rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/5">
              <BookOpenIcon className="size-6 sm:size-7 lg:size-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Corpus</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-0.5">
                The complete Brenner document collection
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredDocs.length}
            />

            {/* Category Pills */}
            <div className="pt-2">
              <CategoryPills
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                counts={categoryCounts}
              />
            </div>
          </div>
        </AnimatedElement>
      </HeroBackground>

      {/* Document Categories */}
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        {(Object.keys(categories) as CategoryKey[]).map((categoryKey, index) => (
          <CategorySection
            key={categoryKey}
            categoryKey={categoryKey}
            docs={groupedDocs[categoryKey] || []}
            isExpanded={expandedSections[categoryKey]}
            onToggle={() => toggleSection(categoryKey)}
            sectionIndex={index}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredDocs.length === 0 && (
        <AnimatedElement animation="fade-in-scale" className="text-center py-12 sm:py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 sm:size-20 rounded-full bg-muted/50 flex items-center justify-center">
              <SearchIcon className="size-8 sm:size-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold">No documents found</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Clear filters
            </button>
          </div>
        </AnimatedElement>
      )}

      {/* Reading Tips - Only show when not searching */}
      {!searchQuery && activeCategory === "all" && (
        <AnimatedElement animation="reveal-up" delay={300}>
          <section className="rounded-2xl sm:rounded-3xl border border-border/50 bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 p-5 sm:p-6 lg:p-8 space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <span className="size-6 sm:size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <SparklesIcon className="size-3.5 sm:size-4 text-primary" />
              </span>
              Reading Tips
            </h3>
            <ul className="text-sm sm:text-base text-muted-foreground space-y-2.5 sm:space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  1
                </span>
                <span>
                  Start with a{" "}
                  <Jargon term="distillation">
                    <strong className="text-foreground">Distillation</strong>
                  </Jargon>{" "}
                  for a structured overview of Brenner&apos;s methodology.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  2
                </span>
                <span>
                  Use the{" "}
                  <Jargon term="quote-bank">
                    <strong className="text-foreground">Quote Bank</strong>
                  </Jargon>{" "}
                  to find specific Brenner quotes on topics of interest.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  3
                </span>
                <span>
                  Dive into the full{" "}
                  <Jargon term="corpus">
                    <strong className="text-foreground">Transcript</strong>
                  </Jargon>{" "}
                  for context and nuance around specific ideas.
                </span>
              </li>
            </ul>
          </section>
        </AnimatedElement>
      )}
    </div>
  );
}
