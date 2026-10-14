/**
 * Research Brief Export Module
 *
 * Provides multi-format export capabilities for Research Briefs:
 * - Markdown (.md) - Human-readable, git-friendly
 * - JSON (.json) - Programmatic use, import/export
 * - PDF (.pdf) - Print-friendly, shareable
 *
 * @see brenner_bot-nu8g.2 (Implement Multi-Format Export)
 */

import {
  renderResearchBriefTemplate,
  type ResearchBriefTemplateInput,
  type ResearchBriefMetadata,
} from "./research-brief-template";

// ============================================================================
// Types
// ============================================================================

export type ResearchBriefExportFormat = "markdown" | "json" | "pdf" | "latex";

export interface ResearchBriefExportOptions {
  /** File name without extension */
  filename?: string;
  /** Include metadata header in markdown */
  includeMetadata?: boolean;
  /** Pretty-print JSON output */
  prettyPrint?: boolean;
}

export interface ResearchBriefExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface ResearchBriefJSONExport {
  format: "brenner-research-brief-v1";
  exportedAt: string;
  brief: ResearchBriefTemplateInput;
  checksum: string;
}

// ============================================================================
// Constants
// ============================================================================

const EXPORT_VERSION = "brenner-research-brief-v1";

const MIME_TYPES: Record<ResearchBriefExportFormat, string> = {
  markdown: "text/markdown",
  json: "application/json",
  pdf: "application/pdf",
  latex: "application/x-latex",
};

const FILE_EXTENSIONS: Record<ResearchBriefExportFormat, string> = {
  markdown: ".md",
  json: ".json",
  pdf: ".pdf",
  latex: ".tex",
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Export a Research Brief to Markdown format.
 *
 * Uses the existing renderResearchBriefTemplate for consistent formatting.
 *
 * @param brief - The Research Brief input data
 * @param options - Export options
 * @returns Export result with blob, filename, and mime type
 */
export function exportToMarkdown(
  brief: ResearchBriefTemplateInput,
  options: ResearchBriefExportOptions = {}
): ResearchBriefExportResult {
  const markdown = renderResearchBriefTemplate(brief);
  const blob = new Blob([markdown], { type: MIME_TYPES.markdown });

  return {
    blob,
    filename: generateFilename(brief, "markdown", options.filename),
    mimeType: MIME_TYPES.markdown,
  };
}

/**
 * Export a Research Brief to JSON format.
 *
 * Includes format version, timestamp, and checksum for integrity verification.
 *
 * @param brief - The Research Brief input data
 * @param options - Export options
 * @returns Promise resolving to export result
 */
export async function exportToJSON(
  brief: ResearchBriefTemplateInput,
  options: ResearchBriefExportOptions = {}
): Promise<ResearchBriefExportResult> {
  const checksum = await computeChecksum(brief);
  const payload: ResearchBriefJSONExport = {
    format: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    brief,
    checksum,
  };

  const indent = options.prettyPrint !== false ? 2 : undefined;
  const json = JSON.stringify(payload, null, indent);
  const blob = new Blob([json], { type: MIME_TYPES.json });

  return {
    blob,
    filename: generateFilename(brief, "json", options.filename),
    mimeType: MIME_TYPES.json,
  };
}

/**
 * Export a Research Brief to PDF format.
 *
 * Uses the browser's print-to-PDF capability by opening a print dialog
 * with a styled HTML version of the brief.
 *
 * @param brief - The Research Brief input data
 * @param options - Export options
 * @returns Promise resolving to export result (or opening print dialog)
 */
export async function exportToPDF(
  brief: ResearchBriefTemplateInput,
  options: ResearchBriefExportOptions = {}
): Promise<ResearchBriefExportResult> {
  const html = renderPrintableHTML(brief);
  const blob = new Blob([html], { type: "text/html" });

  // For browser print-to-PDF, we return the HTML that can be opened
  // in a new window for printing. The actual PDF generation happens
  // via the browser's print dialog.
  return {
    blob,
    filename: generateFilename(brief, "pdf", options.filename),
    mimeType: MIME_TYPES.pdf,
  };
}

function escapeLaTeX(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/§/g, "\\S{}");
}

function renderLaTeXList(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return "\\emph{None recorded.}\n";
  }
  const rows = items.map((item) => `  \\item ${escapeLaTeX(item)}`).join("\n");
  return `\\begin{itemize}\n${rows}\n\\end{itemize}\n`;
}

/**
 * Export a Research Brief to LaTeX (.tex) academic format.
 *
 * @param brief - The Research Brief input data
 * @param options - Export options
 * @returns Export result with .tex blob, filename, and mime type
 */
export function exportToLaTeX(
  brief: ResearchBriefTemplateInput,
  options: ResearchBriefExportOptions = {}
): ResearchBriefExportResult {
  const sessionId = escapeLaTeX(brief.metadata?.sessionId || "Brenner-Loop-Session");
  const hypothesisId = escapeLaTeX(brief.metadata?.hypothesisId || "H1");
  const confidence =
    typeof brief.metadata?.finalConfidence === "number"
      ? `${brief.metadata.finalConfidence}\\%`
      : "N/A";
  const statement = escapeLaTeX(
    brief.hypothesisStatement?.statement || "Primary discriminative hypothesis under evaluation."
  );
  const mechanism = escapeLaTeX(
    brief.hypothesisStatement?.mechanism || "Proposed causal mechanism."
  );
  const summary = escapeLaTeX(
    brief.executiveSummary || "Structured synthesis of hypotheses, discriminative tests, and evidence."
  );
  const citations = (brief.metadata?.brennerCitations ?? []).map(escapeLaTeX).join(", ");

  const tex = [
    "\\documentclass[11pt,a4paper]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{geometry}",
    "\\usepackage{hyperref}",
    "\\geometry{margin=1in}",
    `\\title{Brenner Loop Research Brief: ${sessionId}}`,
    `\\author{Hypothesis ${hypothesisId} (Confidence: ${confidence})}`,
    `\\date{${escapeLaTeX(brief.metadata?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10))}}`,
    "\\begin{document}",
    "\\maketitle",
    "",
    "\\begin{abstract}",
    summary,
    "\\end{abstract}",
    "",
    "\\section{Hypothesis \\& Causal Mechanism}",
    `\\textbf{Statement:} ${statement}\\\\[0.5em]`,
    `\\textbf{Mechanism:} ${mechanism}`,
    "",
    "\\section{Discriminative Structure}",
    "\\subsection{Predictions if True}",
    renderLaTeXList(brief.discriminativeStructure?.predictionsIfTrue),
    "\\subsection{Predictions if False}",
    renderLaTeXList(brief.discriminativeStructure?.predictionsIfFalse),
    "\\subsection{Falsification Conditions (Impossible if True)}",
    renderLaTeXList(brief.discriminativeStructure?.falsificationConditions),
    "",
    "\\section{Evidence Summary \\& Discriminative Tests}",
    renderLaTeXList(brief.evidenceSummary?.testsRun),
    renderLaTeXList(brief.evidenceSummary?.results),
    "",
    "\\section{Recommended Next Steps}",
    renderLaTeXList(brief.recommendedNextSteps),
    citations ? `\\section*{Brenner Transcript Anchors}\n${citations}\n` : "",
    "\\end{document}",
    "",
  ].join("\n");

  const blob = new Blob([tex], { type: MIME_TYPES.latex });
  return {
    blob,
    filename: generateFilename(brief, "latex", options.filename),
    mimeType: MIME_TYPES.latex,
  };
}

/**
 * Trigger a browser download of the exported Research Brief.
 *
 * @param result - The export result from any export function
 */
export function downloadResearchBrief(result: ResearchBriefExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open a print dialog for PDF export.
 *
 * Creates a new window with styled HTML content and triggers print.
 *
 * @param brief - The Research Brief input data
 */
export function printResearchBrief(brief: ResearchBriefTemplateInput): void {
  const html = renderPrintableHTML(brief);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure content is rendered before printing
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Import a Research Brief from a JSON file.
 *
 * Validates format and optionally verifies checksum.
 *
 * @param file - The JSON file to import
 * @returns Promise resolving to the imported brief and any warnings
 */
export async function importResearchBrief(file: File): Promise<{
  brief: ResearchBriefTemplateInput;
  warnings: string[];
}> {
  const warnings: string[] = [];

  if (!file) {
    throw new Error("No file provided for import.");
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Import failed: file is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Import failed: malformed export payload.");
  }

  // Check format version
  const format = typeof parsed.format === "string" ? parsed.format : "";
  if (format !== EXPORT_VERSION) {
    warnings.push(
      `Unexpected format "${format || "missing"}"; attempting to import as v1.`
    );
  }

  // Extract brief
  if (!isRecord(parsed.brief)) {
    throw new Error("Import failed: missing or invalid brief payload.");
  }

  const brief = parsed.brief as ResearchBriefTemplateInput;

  // Verify checksum if present
  const checksum = typeof parsed.checksum === "string" ? parsed.checksum : null;
  if (checksum) {
    const computed = await computeChecksum(brief);
    if (computed !== checksum) {
      warnings.push("Checksum mismatch; brief data may be modified.");
    }
  } else {
    warnings.push("Checksum missing; integrity could not be verified.");
  }

  return { brief, warnings };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a filename for the export based on brief metadata.
 */
function generateFilename(
  brief: ResearchBriefTemplateInput,
  format: ResearchBriefExportFormat,
  customName?: string
): string {
  if (customName) {
    return `${customName}${FILE_EXTENSIONS[format]}`;
  }

  const sessionId = brief.metadata?.sessionId || "unknown";
  const date = new Date().toISOString().split("T")[0];
  return `research-brief-${sessionId}-${date}${FILE_EXTENSIONS[format]}`;
}

/**
 * Compute SHA-256 checksum for integrity verification.
 */
async function computeChecksum(brief: ResearchBriefTemplateInput): Promise<string> {
  const payload = stableStringify(brief);

  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(payload);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return bufferToHex(hash);
  }

  // Fallback for Node.js
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(payload).digest("hex");
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Stable JSON stringification with sorted keys.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (isRecord(value)) {
    const sortedEntries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const result: Record<string, unknown> = {};
    for (const [key, entry] of sortedEntries) {
      result[key] = sortKeysDeep(entry);
    }
    return result;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Render a print-friendly HTML version of the Research Brief.
 */
function renderPrintableHTML(brief: ResearchBriefTemplateInput): string {
  const markdown = renderResearchBriefTemplate(brief);
  const metadata = brief.metadata || ({} as Partial<ResearchBriefMetadata>);

  // Convert markdown to simple HTML (basic conversion)
  const bodyHtml = markdownToSimpleHTML(markdown);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Brief - ${metadata.sessionId || "Brenner Loop"}</title>
  <style>
    :root {
      --text-primary: #1a1a2e;
      --text-secondary: #4a4a6a;
      --border-color: #e0e0e8;
      --bg-highlight: #f8f8fc;
      --accent: #8b5cf6;
    }

    @media print {
      @page {
        margin: 1in;
        size: letter;
      }
      body {
        font-size: 11pt;
      }
      h1 { font-size: 18pt; }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent);
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 1.5rem 0 1rem;
      color: var(--text-primary);
    }

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 1rem 0 0.5rem;
    }

    p {
      margin-bottom: 0.75rem;
    }

    ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 1rem;
    }

    li {
      margin-bottom: 0.25rem;
    }

    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
      color: var(--text-secondary);
    }

    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 1.5rem 0;
    }

    pre {
      background: var(--bg-highlight);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      margin-bottom: 1rem;
    }

    code {
      font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
      font-size: 0.9em;
      background: var(--bg-highlight);
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }

    .metadata {
      background: var(--bg-highlight);
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .metadata dt {
      font-weight: 600;
      display: inline;
    }

    .metadata dd {
      display: inline;
      margin-right: 1.5rem;
    }

    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  ${bodyHtml}
  <div class="footer">
    Generated by Brenner Loop • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
}

/**
 * Convert markdown to simple HTML (basic conversion for print).
 *
 * This is a simplified converter that handles the most common markdown
 * elements found in Research Briefs. For full markdown support, consider
 * using a library like marked or remark.
 */
function markdownToSimpleHTML(markdown: string): string {
  let html = markdown;

  // Skip YAML frontmatter
  html = html.replace(/^---[\s\S]*?---\n*/, "");

  // Escape HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // Bold and italic (order matters: bold first, then italic)
  // Use non-greedy .+? for bold to allow nested italic markers inside
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // For italic, use lookahead/lookbehind to avoid matching ** as two single *
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Unordered lists - mark with data-lt for type tracking
  html = html.replace(/^(\s*)- (.*?)$/gm, (_, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li data-level="${level}" data-lt="ul">${content}</li>`;
  });

  // Ordered lists - mark with data-lt for type tracking
  html = html.replace(/^\d+\. (.*?)$/gm, '<li data-lt="ol">$1</li>');

  // Wrap consecutive list items, splitting on type changes
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
    const items = match.trim().split("\n").filter(Boolean);
    let result = "";
    let currentType: string | null = null;
    let group: string[] = [];

    for (const item of items) {
      const typeMatch = item.match(/data-lt="(ul|ol)"/);
      const type = typeMatch ? typeMatch[1] : "ul";

      if (currentType && type !== currentType) {
        // Flush the current group with its wrapper
        result += `<${currentType}>\n${group.join("\n")}\n</${currentType}>\n`;
        group = [];
      }
      currentType = type;
      group.push(item);
    }

    // Flush remaining group
    if (group.length > 0 && currentType) {
      result += `<${currentType}>\n${group.join("\n")}\n</${currentType}>\n`;
    }

    return result;
  });

  // Clean up data attributes
  html = html.replace(/ data-level="\d+"/g, "");
  html = html.replace(/ data-lt="[uo]l"/g, "");

  // Horizontal rules (must be before paragraph wrapping)
  html = html.replace(/^---$/gm, "<hr>");

  // Paragraphs (lines not already wrapped)
  // Negative lookahead excludes h1-h3, hr, ul, ol, li tags
  html = html.replace(/^(?!<[hulo])(.*?)$/gm, (_, content) => {
    if (content.trim() === "") return "";
    return `<p>${content}</p>`;
  });

  // Remove empty paragraphs
  html = html.replace(/<p><\/p>\n?/g, "");

  return html;
}
