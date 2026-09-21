import { isAbsolute, resolve, win32 } from "node:path";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Jargon } from "@/components/jargon";
import { SessionForm } from "@/components/sessions";
import { AgentMailClient } from "@/lib/agentMail";
import { checkOrchestrationAuth, isLabModeEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Session",
  description: "Start a new Brenner Loop research session via Agent Mail.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Icons
const PlayIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ServerIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const LockClosedIcon = () => (
  <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const ShieldExclamationIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
    />
  </svg>
);

/**
 * Locked State Component
 *
 * Shown when lab mode is disabled or authentication fails.
 * Provides clear explanation and unlock instructions for operators.
 */
function LockedState({ reason }: { reason: string }) {
  const isLabModeDisabled = reason.includes("Lab mode is disabled");
  const isAuthRequired = reason.includes("secret") || reason.includes("Cloudflare");

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      {/* Locked Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-warning/10 border border-warning/20 text-warning">
          <LockClosedIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lab Mode Locked</h1>
          <p className="mt-2 text-muted-foreground">
            Orchestration features are protected to prevent unauthorized access.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 text-warning">
            <ShieldExclamationIcon />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
      </div>

      {/* Unlock Instructions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground">How to Unlock</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Operators can enable lab mode using one of these methods:
          </p>
        </div>

        <div className="divide-y divide-border">
          {/* Method 1: Environment Variable */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                1
              </span>
              <h3 className="font-medium text-foreground">Enable Lab Mode Environment Variable</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Set{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                BRENNER_LAB_MODE=1
              </code>{" "}
              in your environment.
            </p>
            {isLabModeDisabled && (
              <div className="ml-8 p-3 rounded-lg bg-warning/5 border border-warning/20">
                <p className="text-sm text-warning font-medium">This is currently disabled</p>
              </div>
            )}
          </div>

          {/* Method 2: Cloudflare Access */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                2
              </span>
              <h3 className="font-medium text-foreground">Cloudflare Access (Production)</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Deploy behind Cloudflare Access and set{" "}
              <code className="px-1.5 py-0.5 mx-1 rounded bg-muted font-mono text-xs">
                BRENNER_TRUST_CF_ACCESS_HEADERS=1
              </code>
              . The app will then accept requests that include
              <code className="px-1.5 py-0.5 mx-1 rounded bg-muted font-mono text-xs">
                cf-access-jwt-assertion
              </code>
              headers.
            </p>
          </div>

          {/* Method 3: Shared Secret */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                3
              </span>
              <h3 className="font-medium text-foreground">Shared Secret (Local Development)</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Set{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                BRENNER_LAB_SECRET=your-secret
              </code>{" "}
              and include it via:
            </p>
            <ul className="ml-8 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>
                Header:{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  x-brenner-lab-secret: your-secret
                </code>
              </li>
              <li>
                Cookie:{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  brenner_lab_secret=your-secret
                </code>
              </li>
            </ul>
            {isAuthRequired && (
              <div className="ml-8 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  Lab mode is enabled but authentication is required
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Need help?{" "}
          <a
            href="https://github.com/Dicklesworthstone/brenner_bot/blob/main/apps/web/.env.example"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline active:text-primary/80 transition-colors touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Read the documentation
          </a>
        </p>
      </div>
    </div>
  );
}

type AgentDirectory = {
  project?: { slug?: string; human_key?: string };
  agents?: Array<{ name?: string; unread_count?: number }>;
};

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnsureProjectSlug(result: unknown): string | null {
  if (!isRecord(result)) return null;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent) && typeof structuredContent.slug === "string")
    return structuredContent.slug;

  const maybeContent = result.content;
  if (Array.isArray(maybeContent) && maybeContent.length > 0) {
    const first = maybeContent[0];
    const text = isRecord(first) && typeof first.text === "string" ? first.text : undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        return isRecord(parsed) && typeof parsed.slug === "string" ? parsed.slug : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseAgentsResult(result: unknown): AgentDirectory | null {
  if (!isRecord(result)) return null;
  const maybeContents = result.contents;
  if (Array.isArray(maybeContents) && maybeContents.length > 0) {
    const first = maybeContents[0];
    const text = isRecord(first) && typeof first.text === "string" ? first.text : undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        return isRecord(parsed) ? (parsed as AgentDirectory) : null;
      } catch {
        return null;
      }
    }
  }
  if ("agents" in result) return result as AgentDirectory;
  return null;
}

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; thread?: string }>;
}) {
  // Check lab mode first
  if (!isLabModeEnabled()) {
    return (
      <LockedState reason="Lab mode is disabled. Set BRENNER_LAB_MODE=1 to enable orchestration." />
    );
  }

  // Defense-in-depth: even with BRENNER_LAB_MODE enabled, require trusted Cloudflare Access headers
  // (BRENNER_TRUST_CF_ACCESS_HEADERS=1) or a valid shared secret before serving any orchestration UI
  // or reading Agent Mail data.
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const pageAuth = checkOrchestrationAuth(reqHeaders, reqCookies);
  if (!pageAuth.authorized) {
    return <LockedState reason={pageAuth.reason} />;
  }

  const repoRoot = repoRootFromWebCwd();
  const { sent, thread } = await searchParams;

  const senderDefault = process.env.AGENT_NAME ?? "";
  const projectKeyDefault = process.env.BRENNER_PROJECT_KEY ?? repoRoot;
  const agentMailBaseUrl = process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765";

  let agentMailError: string | null = null;
  let agentNames: string[] = [];
  try {
    const client = new AgentMailClient();
    // Treat Windows absolute paths as absolute even on non-Windows runtimes.
    const isAbsoluteProjectKey =
      isAbsolute(projectKeyDefault) || win32.isAbsolute(projectKeyDefault);
    const projectSlug = isAbsoluteProjectKey
      ? parseEnsureProjectSlug(
          await client.toolsCall("ensure_project", { human_key: projectKeyDefault }),
        )
      : projectKeyDefault;
    if (!projectSlug) throw new Error("Agent Mail: could not resolve project slug.");

    const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
    const directory = parseAgentsResult(result);
    if (directory?.agents?.length) {
      agentNames = directory.agents
        .map((a) => a.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0);
    }
  } catch (err) {
    agentMailError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
            <PlayIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Session</h1>
            <p className="text-muted-foreground">
              Start a <Jargon term="brenner-loop">Brenner Loop</Jargon> research session via{" "}
              <Jargon term="agent-mail">Agent Mail</Jargon>
            </p>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {sent === "1" && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-success mt-0.5">
            <CheckCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-success">Kickoff sent successfully!</div>
            <p className="text-sm text-muted-foreground mt-1">
              Thread{" "}
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                {thread}
              </span>{" "}
              has been initiated.
            </p>
          </div>
        </div>
      )}

      {/* Agent Mail Status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in-up stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground">
              <ServerIcon />
            </div>
            <div>
              <div className="font-semibold text-foreground">Agent Mail</div>
              <div className="text-sm text-muted-foreground font-mono">{agentMailBaseUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agentMailError ? (
              <>
                <span className="flex size-2.5 rounded-full bg-warning animate-pulse" />
                <span className="text-sm text-warning font-medium">Unreachable</span>
              </>
            ) : (
              <>
                <span className="flex size-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success font-medium">Connected</span>
              </>
            )}
          </div>
        </div>

        {agentMailError && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
            {agentMailError}
          </div>
        )}

        {agentNames.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <UsersIcon />
              <span>Known agents ({agentNames.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agentNames.slice(0, 24).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                >
                  {name}
                </span>
              ))}
              {agentNames.length > 24 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{agentNames.length - 24} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form - Uses TanStack Form for field-level validation */}
      <div className="animate-fade-in-up stagger-2">
        <SessionForm defaultSender={senderDefault} defaultProjectKey={projectKeyDefault} />
      </div>
    </div>
  );
}
