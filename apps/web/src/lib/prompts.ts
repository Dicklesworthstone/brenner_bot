import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { OperatorSelection as SessionOperatorSelection } from "./schemas/session";
import { getTriangulatedBrennerKernelMarkdown } from "./session-kickoff";

export type OperatorSelection = SessionOperatorSelection;

export type ComposePromptInput = {
  templatePathFromRepoRoot: string;
  excerpt: string;
  theme?: string;
  domain?: string;
  question?: string;
  /** Optional: custom operator selection per role (for prompt builder) */
  operatorSelection?: OperatorSelection;
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveTemplatePath(filename: string): Promise<string> {
  // First try local working directory (CLI / repo-root execution)
  const cwdPath = resolve(process.cwd(), filename);
  if (await fileExists(cwdPath)) {
    return cwdPath;
  }

  // First try public/_corpus/ (Vercel deployment)
  const publicPath = resolve(process.cwd(), "public/_corpus", filename);
  if (await fileExists(publicPath)) {
    return publicPath;
  }

  // Fall back to repo root (local dev)
  const repoRootPath = resolve(process.cwd(), "../..", filename);
  if (await fileExists(repoRootPath)) {
    return repoRootPath;
  }

  throw new Error(`Template file not found: ${filename}`);
}

const ROLE_LABELS: Record<keyof OperatorSelection, string> = {
  hypothesis_generator: "Hypothesis Generator (Codex / GPT)",
  test_designer: "Test Designer (Opus / Claude)",
  adversarial_critic: "Adversarial Critic (Gemini)",
  devils_advocate: "Devil's Advocate",
  experiment_designer: "Experiment Designer",
  statistician: "Statistician",
  brenner_channeler: "Brenner Channeler",
  synthesis: "Synthesis",
};

export async function composePrompt(input: ComposePromptInput): Promise<string> {
  const templatePath = await resolveTemplatePath(input.templatePathFromRepoRoot);
  const template = await readFile(templatePath, "utf8");

  const chunks: string[] = [];
  chunks.push(template.trimEnd());
  chunks.push("");
  chunks.push("---");
  chunks.push("");

  const kernel = getTriangulatedBrennerKernelMarkdown();
  if (kernel) {
    chunks.push("## TRIANGULATED BRENNER KERNEL (single)");
    chunks.push(kernel);
    chunks.push("");
  }

  // Include operator selection if provided (from prompt builder UI)
  if (input.operatorSelection) {
    chunks.push("## ROLE OPERATOR ASSIGNMENTS");
    chunks.push("");
    for (const [role, operators] of Object.entries(input.operatorSelection)) {
      const label = ROLE_LABELS[role as keyof OperatorSelection];
      if (operators.length > 0) {
        chunks.push(`**${label}**: ${operators.join(", ")}`);
      }
    }
    chunks.push("");
  }

  chunks.push("## TRANSCRIPT EXCERPT(S)");
  chunks.push((input.excerpt ?? "").trim());
  chunks.push("");
  if (input.theme) {
    chunks.push("## FOCUS THEME");
    chunks.push(input.theme.trim());
    chunks.push("");
  }
  if (input.domain) {
    chunks.push("## TARGET RESEARCH DOMAIN");
    chunks.push(input.domain.trim());
    chunks.push("");
  }
  if (input.question) {
    chunks.push("## CURRENT RESEARCH QUESTION");
    chunks.push(input.question.trim());
    chunks.push("");
  }
  return chunks.join("\n");
}
