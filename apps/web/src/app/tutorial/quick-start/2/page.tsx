"use client";

/**
 * Quick Start Step 2: Prerequisites
 *
 * Verify Git, terminal, and Bun are installed.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep, Warning } from "@/components/tutorial";
import {
  formatPlanHuman,
  generateInstallPlan,
  type PlatformString,
  parseManifest,
} from "@/lib/toolchain-manifest";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

const CANONICAL_MANIFEST_JSON = JSON.stringify({
  manifest_version: "0.1.0",
  min_bun_version: "1.1.0",
  tools: {
    brenner: {
      version: "0.1.0",
      install_strategy: "release_binary",
      release_url_template:
        "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}",
      checksum_url_template:
        "https://github.com/Dicklesworthstone/brenner_bot/releases/download/v${VERSION}/brenner-${OS}-${ARCH}.sha256",
      verify_command: "brenner doctor --json",
      verify_success: "exit_code_zero",
      platforms: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"],
    },
    ntm: {
      version: "1.8.0",
      install_strategy: "upstream_installer",
      install_url: "https://raw.githubusercontent.com/Dicklesworthstone/ntm/v1.8.0/install.sh",
      install_args: "--version=v1.8.0",
      verify_command: "ntm deps -v",
      verify_success: "exit_code_zero",
      platforms: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64"],
      notes: "Not available on Windows (requires tmux)",
    },
    cass: {
      version: "0.2.2",
      install_strategy: "upstream_installer",
      install_url:
        "https://raw.githubusercontent.com/Dicklesworthstone/coding_agent_session_search/v0.2.2/install.sh",
      install_args: "--version v0.2.2",
      verify_command: "cass health",
      verify_success: "exit_code_zero",
      platforms: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"],
    },
    cm: {
      version: "0.2.3",
      install_strategy: "upstream_installer",
      install_url:
        "https://raw.githubusercontent.com/Dicklesworthstone/cass_memory_system/v0.2.3/install.sh",
      install_args: "--version v0.2.3",
      verify_command: "cm --version",
      verify_success: "exit_code_zero",
      platforms: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"],
    },
    bun: {
      version: "1.1.38",
      install_strategy: "upstream_installer",
      install_url: "https://bun.sh/install",
      install_args: "",
      verify_command: "bun --version",
      verify_success: "exit_code_zero",
      platforms: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"],
      notes: "Required runtime for brenner CLI",
    },
  },
});

const PLATFORMS: PlatformString[] = [
  "linux-x64",
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "win-x64",
];

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "bun: command not found",
    symptoms: ["Terminal shows 'command not found' after running bun"],
    solution:
      "Bun needs to be added to your PATH. Restart your terminal after installing, or source your shell config.",
    commands: ["source ~/.bashrc", "# or: source ~/.zshrc"],
  },
  {
    problem: "Windows: commands don't work in PowerShell",
    symptoms: ["Errors running git or bun in PowerShell"],
    solution:
      "Use WSL2 (Windows Subsystem for Linux) for the best experience. BrennerBot is designed for Unix-like environments.",
    commands: ["wsl --install"],
  },
  {
    problem: "Permission denied errors",
    symptoms: ["'Permission denied' when installing bun"],
    solution: "Use the user-level install (no sudo required) or check your directory permissions.",
  },
];

const stepData: TutorialStepType = {
  id: "qs-2",
  pathId: "quick-start",
  stepNumber: 2,
  title: "Prerequisites",
  estimatedTime: "~2 min",
  whatYouLearn: ["How to verify your development environment", "Platform-specific setup tips"],
  whatYouDo: ["Check that Git is installed", "Verify terminal access", "Install Bun (if needed)"],
  requiresDesktop: true,
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep2() {
  const router = useRouter();
  const tutorial = useTutorial();
  const [selectedPlatform, setSelectedPlatform] = React.useState<PlatformString>("linux-x64");

  const toolchainPlan = React.useMemo(() => {
    const parsed = parseManifest(CANONICAL_MANIFEST_JSON);
    if (!parsed.ok) return null;
    const plan = generateInstallPlan(parsed.manifest, selectedPlatform);
    return {
      plan,
      humanText: formatPlanHuman(plan),
    };
  }, [selectedPlatform]);

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(1);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={7}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/quick-start/1");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/quick-start/3");
      }}
    >
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Before we clone the BrennerBot repository, let&apos;s make sure you have the required
          tools. This should only take a minute or two.
        </p>

        {/* Git Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Check Git
          </h2>
          <p className="text-sm text-muted-foreground">
            Git is required to clone the repository. Most systems have it pre-installed.
          </p>
          <TutorialCodeBlock code="git --version" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            You should see something like{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">
              git version 2.x.x
            </code>
            . If not, install Git from{" "}
            <a
              href="https://git-scm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              git-scm.com
            </a>
            .
          </p>
        </div>

        {/* Terminal Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            Terminal Access
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">macOS</p>
              <p className="text-xs text-muted-foreground mt-1">Use Terminal.app or iTerm2</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">Linux</p>
              <p className="text-xs text-muted-foreground mt-1">Any terminal emulator works</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">Windows</p>
              <p className="text-xs text-muted-foreground mt-1">Use WSL2 (recommended)</p>
            </div>
          </div>
        </div>

        {/* Bun Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              3
            </span>
            Check or Install Bun
          </h2>
          <p className="text-sm text-muted-foreground">
            Bun is a fast JavaScript runtime that BrennerBot uses. Check if you have it:
          </p>
          <TutorialCodeBlock code="bun --version" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            If Bun isn&apos;t installed, install it with this one-liner:
          </p>
          <TutorialCodeBlock
            code="curl -fsSL https://bun.sh/install | bash"
            language="bash"
            title="Install Bun"
          />
          <p className="text-sm text-muted-foreground">
            After installing, restart your terminal or run{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">source ~/.bashrc</code>{" "}
            (or <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">~/.zshrc</code>).
          </p>
        </div>

        {/* Verify All */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              ✓
            </span>
            Verify Everything
          </h2>
          <p className="text-sm text-muted-foreground">
            Run both commands to confirm you&apos;re ready:
          </p>
          <TutorialCodeBlock
            code={`git --version
bun --version`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Interactive Toolchain Manifest Plan */}
        {toolchainPlan && (
          <div
            data-testid="toolchain-manifest-plan"
            className="not-prose rounded-xl border border-border bg-card p-4 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Toolchain Manifest Matrix (v{toolchainPlan.plan.manifestVersion})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Preview the full stack verification commands for your OS/architecture (min Bun{" "}
                  {toolchainPlan.plan.minBunVersion})
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatform(plat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                      selectedPlatform === plat
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {toolchainPlan.plan.targets.map((target) => (
                <div
                  key={target.tool}
                  className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-foreground">
                      {target.tool} v{target.version}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{target.strategy}</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Verify: <code className="text-foreground">{target.verifyCommand}</code>
                  </div>
                </div>
              ))}
            </div>

            <details className="rounded-lg border border-border bg-muted/10 p-2.5 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                View CLI Install Plan Output (brenner toolchain plan)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                {toolchainPlan.humanText}
              </pre>
            </details>
          </div>
        )}

        <Warning>
          <strong>Windows users:</strong> We strongly recommend using WSL2 (Windows Subsystem for
          Linux). BrennerBot&apos;s CLI is designed for Unix-like environments. Run{" "}
          <code>wsl --install</code> in PowerShell as Administrator, then follow the Linux
          instructions inside WSL.
        </Warning>

        <ProTip>
          If you already have Node.js and npm, they&apos;ll work too — but Bun is significantly
          faster for our use case. The tutorial assumes Bun, but you can substitute <code>npm</code>{" "}
          commands if needed.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Ready?</strong>{" "}
            <span className="text-muted-foreground">
              If both commands show version numbers, you&apos;re all set! Click Next to clone the
              repository.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
