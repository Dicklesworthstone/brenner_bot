import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Document category type.
 *
 * SYNC NOTE: This type is also defined in globalSearchTypes.ts for client-side use.
 * If you modify this type, you must update globalSearchTypes.ts to match.
 * The duplication exists because this file uses Node.js APIs and cannot be
 * imported in client components.
 */
export type DocCategory =
  | "transcript"
  | "quote-bank"
  | "distillation"
  | "metaprompt"
  | "raw-response";

export type CorpusDoc = {
  id: string;
  title: string;
  filename: string;
  description?: string;
  category: DocCategory;
  model?: "gpt" | "opus" | "gemini";
};

export const CORPUS_DOCS: CorpusDoc[] = [
  // Primary Sources
  {
    id: "transcript",
    title: "Complete Transcript Collection",
    filename: "complete_brenner_transcript.md",
    description:
      "The full Web of Stories interview transcript with Sydney Brenner - 236 segments of wisdom.",
    category: "transcript",
  },
  {
    id: "quote-bank",
    title: "Quote Bank",
    filename: "quote_bank_restored_primitives.md",
    description: "Curated verbatim quotes organized by theme for quick reference.",
    category: "quote-bank",
  },
  // Metaprompts
  {
    id: "metaprompt",
    title: "Metaprompt (v0.2)",
    filename: "metaprompt_by_gpt_52.md",
    description: "A structured prompt for applying the Brenner method to new domains.",
    category: "metaprompt",
  },
  {
    id: "initial-metaprompt",
    title: "Initial Metaprompt",
    filename: "initial_metaprompt.md",
    description: "The original metaprompt that started the distillation process.",
    category: "metaprompt",
  },
  // Final Distillations
  {
    id: "distillation-gpt-52",
    title: "Final Distillation (GPT-5.2)",
    filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
    description: "GPT-5.2's analysis emphasizing optimization and systematic search.",
    category: "distillation",
    model: "gpt",
  },
  {
    id: "distillation-opus-45",
    title: "Final Distillation (Opus 4.5)",
    filename: "final_distillation_of_brenner_method_by_opus45.md",
    description: "Claude Opus 4.5's analysis framing the method through epistemic axioms.",
    category: "distillation",
    model: "opus",
  },
  {
    id: "distillation-gemini-3",
    title: "Final Distillation (Gemini 3)",
    filename: "final_distillation_of_brenner_method_by_gemini3.md",
    description: "Gemini 3's minimal kernel distillation of core cognitive operations.",
    category: "distillation",
    model: "gemini",
  },
  // Raw Model Responses - GPT
  {
    id: "raw-gpt-batch-1",
    title: "GPT-5.2 Response (Batch 1)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_1.md",
    description: "First batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-batch-2",
    title: "GPT-5.2 Response (Batch 2)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_2.md",
    description: "Second batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-batch-3",
    title: "GPT-5.2 Response (Batch 3)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_3.md",
    description: "Third batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-truncated",
    title: "GPT-5.2 Response (Previously Truncated)",
    filename:
      "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_previously_truncated_batch.md",
    description: "Previously truncated GPT-5.2 responses, now complete.",
    category: "raw-response",
    model: "gpt",
  },
  // Raw Model Responses - Opus
  {
    id: "raw-opus-batch-1",
    title: "Opus 4.5 Response (Batch 1)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_1.md",
    description: "First batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  {
    id: "raw-opus-batch-2",
    title: "Opus 4.5 Response (Batch 2)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_2.md",
    description: "Second batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  {
    id: "raw-opus-batch-3",
    title: "Opus 4.5 Response (Batch 3)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_3.md",
    description: "Third batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  // Raw Model Responses - Gemini
  {
    id: "raw-gemini-batch-1",
    title: "Gemini 3 Response (Batch 1)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_1.md",
    description: "First batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
  {
    id: "raw-gemini-batch-2",
    title: "Gemini 3 Response (Batch 2)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_2.md",
    description: "Second batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
  {
    id: "raw-gemini-batch-3",
    title: "Gemini 3 Response (Batch 3)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_3.md",
    description: "Third batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to read a corpus file from the filesystem.
 * Returns null if file is not accessible (e.g., in Vercel serverless).
 */
async function tryReadFromFilesystem(filename: string): Promise<string | null> {
  const cwd = process.cwd();

  // Candidates for where the corpus files might be
  const candidates = [
    // 1. In public/_corpus relative to CWD (standard Next.js local dev / Vercel lambda if public is copied)
    resolve(cwd, "public/_corpus", filename),
    // 2. In apps/web/public/_corpus (CLI running from repo root)
    resolve(cwd, "apps/web/public/_corpus", filename),
    // 3. In ../../public/_corpus (CLI running from inside apps/web)
    resolve(cwd, "../../public/_corpus", filename),
    // 4. Repo root fallback (original source files)
    resolve(cwd, filename),
    resolve(cwd, "apps/web", filename),
    resolve(cwd, "../..", filename),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return readFile(candidate, "utf8");
    }
  }

  return null;
}

let hasWarnedHttpFallback = false;

/**
 * Fetch a corpus file via HTTP from the public URL.
 * Used when filesystem access is not available (Vercel serverless).
 */
async function fetchFromPublicUrl(filename: string): Promise<string> {
  const baseUrl = getTrustedPublicBaseUrl();
  const safeFilename = filename.replace(/^\//, "");
  const url = new URL(`/_corpus/${safeFilename}`, baseUrl);

  // Warn about self-fetch in production (performance/reliability risk)
  if (process.env.VERCEL === "1" && !hasWarnedHttpFallback) {
    hasWarnedHttpFallback = true;
    console.warn(
      `[Corpus] Warning: Falling back to HTTP fetch for ${safeFilename}. This suggests filesystem access failed.`,
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch corpus file: ${safeFilename} (${response.status})`);
  }

  return response.text();
}

function getTrustedPublicBaseUrl(): string {
  const explicitBaseUrl = process.env.BRENNER_PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl, "BRENNER_PUBLIC_BASE_URL");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  return "https://brennerbot.org";
}

function normalizeBaseUrl(value: string, envName: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export async function listCorpusDocs(): Promise<CorpusDoc[]> {
  return CORPUS_DOCS;
}

export async function readCorpusDoc(id: string): Promise<{ doc: CorpusDoc; content: string }> {
  const doc = CORPUS_DOCS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown doc: ${id}`);

  // Try filesystem first (works in dev and during build)
  let content = await tryReadFromFilesystem(doc.filename);

  // Fall back to HTTP fetch (works in Vercel serverless)
  if (content === null) {
    content = await fetchFromPublicUrl(doc.filename);
  }

  return { doc, content };
}

export const __private = {
  fileExists,
  tryReadFromFilesystem,
  fetchFromPublicUrl,
  getTrustedPublicBaseUrl,
  normalizeBaseUrl,
};
