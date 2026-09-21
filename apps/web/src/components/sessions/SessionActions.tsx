"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSystemError, nowMs, trackSystemEvent, trackSystemLatency } from "@/lib/analytics";
import { enqueueOfflineAction, useOfflineQueue } from "@/lib/offline";

type SessionActionsProps = {
  threadId: string;
  projectKey: string;
  defaultSender?: string;
  defaultRecipients?: string[];
  hasCompiledArtifact?: boolean;
};

type ApiSuccess =
  | {
      success: true;
      action: "compile";
      threadId: string;
      version: number;
      compiledAt: string;
      artifactMarkdown: string;
      lint: { valid: boolean; summary: { errors: number; warnings: number; info: number } };
      merge: { applied: number; skipped: number };
      deltaStats: {
        deltaMessageCount: number;
        totalBlocks: number;
        validBlocks: number;
        invalidBlocks: number;
        currentRoundDeltaCount: number;
      };
    }
  | {
      success: true;
      action: "publish";
      threadId: string;
      version: number;
      compiledAt: string;
      messageId?: number;
    }
  | {
      success: true;
      action: "request_critique";
      threadId: string;
      version: number;
      messageId?: number;
    }
  | {
      success: true;
      action: "post_delta";
      threadId: string;
      messageId?: number;
    };

type ApiError = {
  success: false;
  error: string;
  code: string;
  details?: unknown;
};

type ExperimentResultV01 = {
  schema_version: "experiment_result_v0.1";
  result_id: string;
  thread_id: string;
  test_id: string;
  created_at: string;
  cwd: string;
  argv: string[] | null;
  timeout_seconds: number | null;
  timed_out: boolean;
  exit_code: number;
  duration_ms: number | null;
  stdout: string;
  stderr: string;
  git?: { sha: string; branch: string | null; dirty: boolean };
};

type ExperimentRunResponse =
  | { success: true; result: ExperimentResultV01; resultFile: string }
  | { success: false; error: string; code: string };

function parseRecipients(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  );
}

function parseCommandInput(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
        return parsed;
      }
    } catch {
      // Fall through to shell parsing
    }
  }

  const args: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaping = false;

  for (const ch of trimmed) {
    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }

    if (!inSingle && ch === "\\") {
      escaping = true;
      continue;
    }

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
        continue;
      }
      current += ch;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (escaping) {
    throw new Error("Unterminated escape sequence in command input");
  }

  if (inSingle || inDouble) {
    throw new Error("Unterminated quote in command input");
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

async function postAction(body: Record<string, unknown>): Promise<ApiSuccess> {
  const action = typeof body.action === "string" ? body.action : "unknown";
  const start = nowMs();
  let res: Response | null = null;
  let payload: ApiSuccess | ApiError | null = null;
  let errorInfo: ReturnType<typeof normalizeSystemError> | null = null;

  try {
    res = await fetch("/api/sessions/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    payload = (await res.json()) as ApiSuccess | ApiError;
    if (!res.ok || !payload.success) {
      const err = payload as ApiError;
      errorInfo = normalizeSystemError(err?.error || "Request failed");
      throw new Error(err?.error || "Request failed");
    }

    return payload as ApiSuccess;
  } catch (err) {
    if (!errorInfo) errorInfo = normalizeSystemError(err);
    trackSystemEvent("session_action_error", {
      action,
      status_code: res?.status ?? undefined,
      error_code: payload && !payload.success ? (payload as ApiError).code : undefined,
      ...errorInfo,
    });
    throw err;
  } finally {
    trackSystemLatency("session_action", nowMs() - start, {
      action,
      status_code: res?.status ?? undefined,
      success: !errorInfo,
    });
  }
}

async function postExperiment(
  body: Record<string, unknown>,
): Promise<Extract<ExperimentRunResponse, { success: true }>> {
  const start = nowMs();
  let res: Response | null = null;
  let payload: ExperimentRunResponse | null = null;
  let errorInfo: ReturnType<typeof normalizeSystemError> | null = null;

  try {
    res = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    payload = (await res.json()) as ExperimentRunResponse;
    if (!res.ok || !payload.success) {
      const err = payload as Extract<ExperimentRunResponse, { success: false }>;
      errorInfo = normalizeSystemError(err?.error || "Request failed");
      throw new Error(err?.error || "Request failed");
    }

    return payload as Extract<ExperimentRunResponse, { success: true }>;
  } catch (err) {
    if (!errorInfo) errorInfo = normalizeSystemError(err);
    trackSystemEvent("experiment_error", {
      status_code: res?.status ?? undefined,
      error_code:
        payload && !payload.success
          ? (payload as Extract<ExperimentRunResponse, { success: false }>).code
          : undefined,
      ...errorInfo,
    });
    throw err;
  } finally {
    trackSystemLatency("experiment_run", nowMs() - start, {
      status_code: res?.status ?? undefined,
      success: !errorInfo,
    });
  }
}

function truncateText(s: string, maxChars: number): { preview: string; truncated: boolean } {
  if (s.length <= maxChars) return { preview: s, truncated: false };
  return {
    preview: `${s.slice(0, maxChars)}\n…(truncated; ${s.length} chars total)…\n`,
    truncated: true,
  };
}

function generateDeltaFromExperiment(params: {
  threadId: string;
  testId: string;
  result: ExperimentResultV01;
  resultFile: string;
}): { subject: string; bodyMd: string } {
  const stdoutPreview = truncateText(params.result.stdout ?? "", 2000).preview;
  const stderrPreview = truncateText(params.result.stderr ?? "", 2000).preview;

  const delta = {
    operation: "EDIT",
    section: "research_thread",
    target_id: null,
    payload: {
      context: `Experiment ${params.testId} executed (exit=${params.result.exit_code}, timed_out=${params.result.timed_out}). See experiment payload for provenance + output preview.`,
      experiment: {
        schema_version: params.result.schema_version,
        result_id: params.result.result_id,
        thread_id: params.threadId,
        test_id: params.testId,
        created_at: params.result.created_at,
        cwd: params.result.cwd,
        argv: params.result.argv,
        timeout_seconds: params.result.timeout_seconds,
        timed_out: params.result.timed_out,
        exit_code: params.result.exit_code,
        duration_ms: params.result.duration_ms,
        result_file: params.resultFile,
        stdout_preview: stdoutPreview,
        stderr_preview: stderrPreview,
        ...(params.result.git ? { git: params.result.git } : {}),
      },
    },
    rationale:
      "Record experiment result provenance as a research_thread delta for compilation/audit.",
  };

  const subject = `DELTA[human]: [${params.threadId}] ${params.testId} experiment result`;
  const bodyMd = [
    `# Experiment Result: ${params.testId}`,
    "",
    `- Thread: \`${params.threadId}\``,
    `- Result ID: \`${params.result.result_id}\``,
    `- Created: \`${params.result.created_at}\``,
    `- CWD: \`${params.result.cwd}\``,
    `- Exit: \`${params.result.exit_code}\``,
    params.result.duration_ms !== null ? `- Duration: \`${params.result.duration_ms}ms\`` : null,
    params.result.timed_out ? "- Timed out: `true`" : "- Timed out: `false`",
    `- Result file: \`${params.resultFile}\``,
    "",
    "```delta",
    JSON.stringify(delta, null, 2),
    "```",
    "",
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");

  return { subject, bodyMd };
}

export function SessionActions({
  threadId,
  projectKey,
  defaultSender = "",
  defaultRecipients = [],
  hasCompiledArtifact = false,
}: SessionActionsProps) {
  const router = useRouter();

  const [sender, setSender] = React.useState(defaultSender);
  const [recipientsText, setRecipientsText] = React.useState(defaultRecipients.join(", "));

  const [busy, setBusy] = React.useState<
    null | "compile" | "publish" | "request_critique" | "experiment_run" | "post_delta"
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [compilePreview, setCompilePreview] = React.useState<Extract<
    ApiSuccess,
    { action: "compile" }
  > | null>(null);
  const [lastOk, setLastOk] = React.useState<string | null>(null);

  const [experimentTestId, setExperimentTestId] = React.useState<string>("");
  const [experimentCommand, setExperimentCommand] = React.useState<string>("");
  const [experimentTimeoutSeconds, setExperimentTimeoutSeconds] = React.useState<string>("900");
  const [experimentCwd, setExperimentCwd] = React.useState<string>("");
  const [experimentResult, setExperimentResult] = React.useState<ExperimentResultV01 | null>(null);
  const [experimentResultFile, setExperimentResultFile] = React.useState<string | null>(null);

  const [deltaSubject, setDeltaSubject] = React.useState<string>("");
  const [deltaBodyMd, setDeltaBodyMd] = React.useState<string>("");
  const { isOnline } = useOfflineQueue();

  const recipients = parseRecipients(recipientsText);
  const canSend = sender.trim().length > 0 && recipients.length > 0;

  const run = async (action: "compile" | "publish" | "request_critique") => {
    setBusy(action);
    setError(null);
    setLastOk(null);

    try {
      const payload: Record<string, unknown> = { action, threadId };
      payload.projectKey = projectKey;

      if (action !== "compile") {
        payload.sender = sender.trim();
        payload.recipients = recipients;
      }

      if (!isOnline) {
        enqueueOfflineAction("session-action", payload);
        trackSystemEvent("session_action_queued", { action });
        setLastOk(`Queued ${action.replace("_", " ")} for offline delivery`);
        return;
      }

      const result = await postAction(payload);
      if (result.action === "compile") {
        setCompilePreview(result);
        setLastOk(`Compiled v${result.version} (preview)`);
      } else if (result.action === "publish") {
        setLastOk(`Published COMPILED v${result.version}`);
        setCompilePreview(null);
        router.refresh();
      } else if (result.action === "request_critique") {
        setLastOk(`Requested critique for v${result.version}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const runExperiment = async () => {
    setBusy("experiment_run");
    setError(null);
    setLastOk(null);
    setExperimentResult(null);
    setExperimentResultFile(null);
    setDeltaSubject("");
    setDeltaBodyMd("");

    try {
      const testId = experimentTestId.trim();
      if (!testId) {
        throw new Error("Missing test ID");
      }

      const argv = parseCommandInput(experimentCommand);
      if (argv.length === 0) {
        throw new Error("Missing command");
      }

      const timeoutSecondsRaw = experimentTimeoutSeconds.trim();
      const timeoutSeconds = timeoutSecondsRaw ? Number(timeoutSecondsRaw) : 900;
      if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
        throw new Error("Invalid timeout");
      }

      const payload: Record<string, unknown> = {
        projectKey,
        threadId,
        testId,
        command: argv,
        timeout: timeoutSeconds,
      };

      const cwd = experimentCwd.trim();
      if (cwd) payload.cwd = cwd;

      if (!isOnline) {
        throw new Error("Offline: experiments require a live server connection.");
      }

      const result = await postExperiment(payload);
      setExperimentResult(result.result);
      setExperimentResultFile(result.resultFile);
      setLastOk(`Experiment ${testId} finished (exit ${result.result.exit_code})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const generateDelta = () => {
    if (!experimentResult || !experimentResultFile) {
      setError("No experiment result available to convert into a DELTA.");
      return;
    }

    const testId = experimentResult.test_id || experimentTestId.trim() || "T?";
    const generated = generateDeltaFromExperiment({
      threadId,
      testId,
      result: experimentResult,
      resultFile: experimentResultFile,
    });
    setDeltaSubject(generated.subject);
    setDeltaBodyMd(generated.bodyMd);
    setError(null);
    setLastOk("Generated DELTA draft from latest experiment result");
  };

  const postDelta = async () => {
    setBusy("post_delta");
    setError(null);
    setLastOk(null);

    try {
      if (!canSend) {
        throw new Error("Configure sender and at least one recipient first");
      }

      const subject = deltaSubject.trim();
      const bodyMd = deltaBodyMd.trim();
      if (!bodyMd) {
        throw new Error("Missing DELTA body");
      }

      const payload = {
        action: "post_delta",
        threadId,
        projectKey,
        sender: sender.trim(),
        recipients,
        subject,
        bodyMd,
      };

      if (!isOnline) {
        enqueueOfflineAction("session-action", payload);
        trackSystemEvent("session_action_queued", { action: "post_delta" });
        setLastOk("Queued DELTA for offline delivery");
        return;
      }

      const result = await postAction(payload);

      if (result.action !== "post_delta") {
        throw new Error("Unexpected response");
      }

      setLastOk(
        `Posted DELTA message${typeof result.messageId === "number" ? ` (id ${result.messageId})` : ""}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Actions</div>
          <div className="text-sm font-medium text-foreground">
            Compile → publish → request critique
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void run("compile")}
          >
            {busy === "compile" ? "Compiling…" : "Compile"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null || !canSend}
            onClick={() => void run("publish")}
          >
            {busy === "publish" ? "Publishing…" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null || !canSend || !hasCompiledArtifact}
            onClick={() => void run("request_critique")}
          >
            {busy === "request_critique" ? "Requesting…" : "Request Critique"}
          </Button>
        </div>
      </div>

      {!isOnline && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Offline mode: actions will be queued and sent once connectivity is restored.
        </div>
      )}

      <Collapsible className="group rounded-xl border border-border bg-muted/30 overflow-hidden">
        <CollapsibleTrigger className="p-4 text-sm text-muted-foreground group-data-[state=open]:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-all duration-150">
          <span>Configure sender/recipients</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Operator"
              hint="Used for publish + critique requests"
            />
            <Input
              label="Recipients"
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder="Claude,Codex,Gemini"
              hint="Comma-separated agent names"
            />
          </div>
          {!hasCompiledArtifact && (
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              Request Critique is disabled until a <span className="font-mono">COMPILED:</span>{" "}
              message exists in the thread.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="group rounded-xl border border-border bg-muted/30 overflow-hidden">
        <CollapsibleTrigger className="p-4 text-sm text-muted-foreground group-data-[state=open]:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-all duration-150">
          <span>Experiment panel</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Test ID"
                value={experimentTestId}
                onChange={(e) => setExperimentTestId(e.target.value)}
                placeholder="T1"
                hint="Example: T1, T-RS20251230-001"
              />
              <Input
                label="Timeout (seconds)"
                type="number"
                value={experimentTimeoutSeconds}
                onChange={(e) => setExperimentTimeoutSeconds(e.target.value)}
                placeholder="900"
                min={1}
                max={3600}
                hint="1–3600 (API enforces max 3600)"
              />
            </div>

            <Input
              label="Command"
              value={experimentCommand}
              onChange={(e) => setExperimentCommand(e.target.value)}
              placeholder="bun run test src/my.test.ts"
              hint='Shell-like parsing (supports quotes) or paste JSON array: ["bun","run","test","..."]'
            />

            <Input
              label="CWD (relative to project)"
              value={experimentCwd}
              onChange={(e) => setExperimentCwd(e.target.value)}
              placeholder="apps/web"
              hint="Optional; defaults to project root"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void runExperiment()}
              >
                {busy === "experiment_run" ? "Running…" : "Run Experiment"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy !== null || !experimentResult || !experimentResultFile}
                onClick={generateDelta}
              >
                Generate DELTA Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null || !canSend || deltaBodyMd.trim().length === 0}
                onClick={() => void postDelta()}
              >
                {busy === "post_delta" ? "Posting…" : "Post DELTA"}
              </Button>
            </div>

            {experimentResult && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">
                    Result: <span className="font-mono">{experimentResult.test_id}</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    exit {experimentResult.exit_code}
                    {experimentResult.timed_out ? " (timed out)" : ""}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium text-foreground/80">Command:</span>{" "}
                    <span className="font-mono">
                      {Array.isArray(experimentResult.argv)
                        ? experimentResult.argv.join(" ")
                        : "(unknown)"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground/80">CWD:</span>{" "}
                    <span className="font-mono">{experimentResult.cwd}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground/80">Created:</span>{" "}
                    <span className="font-mono">{experimentResult.created_at}</span>
                  </div>
                  {experimentResult.duration_ms !== null && (
                    <div>
                      <span className="font-medium text-foreground/80">Duration:</span>{" "}
                      <span className="font-mono">{experimentResult.duration_ms}ms</span>
                    </div>
                  )}
                  {experimentResultFile && (
                    <div>
                      <span className="font-medium text-foreground/80">Result file:</span>{" "}
                      <span className="font-mono break-all">{experimentResultFile}</span>
                    </div>
                  )}
                </div>

                <details className="rounded-lg border border-border bg-muted/30 p-3 transition-all">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation rounded-md -mx-1 px-1 py-0.5 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Show stdout
                  </summary>
                  <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto max-h-[320px]">
                    {truncateText(experimentResult.stdout ?? "", 15000).preview}
                  </pre>
                </details>

                <details className="rounded-lg border border-border bg-muted/30 p-3 transition-all">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation rounded-md -mx-1 px-1 py-0.5 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Show stderr
                  </summary>
                  <pre className="mt-2 text-xs font-mono whitespace-pre-wrap rounded-md border border-border bg-background p-3 overflow-auto max-h-[320px]">
                    {truncateText(experimentResult.stderr ?? "", 15000).preview}
                  </pre>
                </details>
              </div>
            )}

            <div className="grid gap-4">
              <Input
                label="DELTA subject"
                value={deltaSubject}
                onChange={(e) => setDeltaSubject(e.target.value)}
                placeholder={`DELTA[human]: [${threadId}] experiment deltas`}
                hint="Must start with DELTA[...]: (server will normalize if needed)."
              />
              <Textarea
                label="DELTA body (markdown)"
                value={deltaBodyMd}
                onChange={(e) => setDeltaBodyMd(e.target.value)}
                placeholder="```delta\n{ ... }\n```"
                hint="Include one or more fenced ```delta blocks. Sender/recipients are taken from the config above."
                autoResize
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {lastOk && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
          {lastOk}
        </div>
      )}

      <AnimatePresence>
        {compilePreview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <Collapsible
              defaultOpen
              className="group rounded-xl border border-border bg-background overflow-hidden"
            >
              <CollapsibleTrigger className="p-4 text-sm font-medium hover:bg-muted/50 active:bg-muted/70 transition-all duration-150">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  <span>Preview: compiled v{compilePreview.version}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    (lint: {compilePreview.lint.summary.errors}e/
                    {compilePreview.lint.summary.warnings}w)
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <div className="text-xs text-muted-foreground font-mono">
                    {compilePreview.deltaStats.deltaMessageCount} delta messages (
                    {compilePreview.deltaStats.currentRoundDeltaCount} in current round) •{" "}
                    {compilePreview.deltaStats.validBlocks}/{compilePreview.deltaStats.totalBlocks}{" "}
                    valid blocks • applied {compilePreview.merge.applied}, skipped{" "}
                    {compilePreview.merge.skipped}
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 overflow-auto max-h-[420px]">
                    {compilePreview.artifactMarkdown}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
