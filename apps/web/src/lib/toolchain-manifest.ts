/**
 * Toolchain Manifest Parser
 *
 * Parses specs/toolchain.manifest.json and generates install plans
 * for the current platform.
 *
 * Consumers:
 * - brenner.ts CLI: `brenner toolchain plan`
 * - brenner doctor --json
 * - install.sh / install.ps1 (indirectly via plan output)
 *
 * @see specs/toolchain_manifest_v0.1.md for format spec
 * @see specs/release_artifact_matrix_v0.1.md for artifact naming
 */

import { z } from "zod";

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

const InstallStrategySchema = z.enum(["release_binary", "upstream_installer"]);
export type InstallStrategy = z.infer<typeof InstallStrategySchema>;

const VerifySuccessSchema = z.enum(["exit_code_zero"]);
export type VerifySuccess = z.infer<typeof VerifySuccessSchema>;

const PlatformStringSchema = z.enum([
  "linux-x64",
  "linux-arm64",
  "darwin-arm64",
  "darwin-x64",
  "win-x64",
]);
export type PlatformString = z.infer<typeof PlatformStringSchema>;

const ToolSpecSchema = z
  .object({
    version: z.string().min(1),
    install_strategy: InstallStrategySchema,
    verify_command: z.string().min(1),
    verify_success: VerifySuccessSchema,
    platforms: z.array(PlatformStringSchema).min(1),
    // Optional fields based on strategy
    release_url_template: z.string().optional(),
    checksum_url_template: z.string().optional(),
    install_url: z.string().url().optional(),
    install_args: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (spec) => {
      // release_binary requires URL templates
      if (spec.install_strategy === "release_binary") {
        return !!spec.release_url_template && !!spec.checksum_url_template;
      }
      // upstream_installer requires install_url
      if (spec.install_strategy === "upstream_installer") {
        return !!spec.install_url;
      }
      return true;
    },
    {
      message:
        "release_binary requires release_url_template and checksum_url_template; upstream_installer requires install_url",
    },
  );

export type ToolSpec = z.infer<typeof ToolSpecSchema>;

const ManifestSchema = z.object({
  manifest_version: z.string().min(1),
  min_bun_version: z.string().min(1),
  tools: z.record(z.string(), ToolSpecSchema),
});

export type ToolchainManifest = z.infer<typeof ManifestSchema>;

// -----------------------------------------------------------------------------
// Platform Detection
// -----------------------------------------------------------------------------

/**
 * Map runtime OS/arch to manifest platform string.
 *
 * Uses Bun/Node globals: process.platform, process.arch
 */
export function detectPlatformFrom(os: string, arch: string): PlatformString | null {
  // Map to manifest platform strings
  if (os === "linux" && arch === "x64") return "linux-x64";
  if (os === "linux" && arch === "arm64") return "linux-arm64";
  if (os === "darwin" && arch === "arm64") return "darwin-arm64";
  if (os === "darwin" && arch === "x64") return "darwin-x64";
  if (os === "win32" && arch === "x64") return "win-x64";

  return null;
}

export function detectPlatform(): PlatformString | null {
  return detectPlatformFrom(process.platform, process.arch);
}

/**
 * Convert platform string to OS/ARCH variables for URL template substitution.
 */
export function platformToOsArch(platform: PlatformString): { os: string; arch: string } {
  const [os = "", arch = ""] = platform.split("-");
  return { os, arch };
}

// -----------------------------------------------------------------------------
// Manifest Parsing
// -----------------------------------------------------------------------------

export type ParseResult =
  | { ok: true; manifest: ToolchainManifest }
  | { ok: false; error: string; issues?: z.ZodIssue[] };

/**
 * Parse and validate a toolchain manifest JSON string.
 */
export function parseManifest(jsonString: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON: ${msg}` };
  }

  const result = ManifestSchema.safeParse(raw);
  if (!result.success) {
    const issueMessages = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    return {
      ok: false,
      error: `Manifest validation failed:\n${issueMessages.join("\n")}`,
      issues: result.error.issues,
    };
  }

  return { ok: true, manifest: result.data };
}

// -----------------------------------------------------------------------------
// Install Plan Generation
// -----------------------------------------------------------------------------

export type InstallTarget = {
  tool: string;
  version: string;
  strategy: InstallStrategy;
  verifyCommand: string;
  notes?: string;
} & (
  | {
      strategy: "release_binary";
      binaryUrl: string;
      checksumUrl: string;
      artifactName: string;
    }
  | {
      strategy: "upstream_installer";
      installerUrl: string;
      installerArgs: string;
    }
);

export type InstallPlan = {
  platform: PlatformString;
  manifestVersion: string;
  minBunVersion: string;
  targets: InstallTarget[];
  skipped: { tool: string; reason: string }[];
};

/**
 * Substitute variables in URL template.
 *
 * Variables: ${VERSION}, ${OS}, ${ARCH}
 * Windows special case: appends .exe for binaries
 */
function substituteUrl(
  template: string,
  version: string,
  os: string,
  arch: string,
  isChecksum: boolean,
): string {
  let url = template
    .replace(/\$\{VERSION\}/g, version)
    .replace(/\$\{OS\}/g, os)
    .replace(/\$\{ARCH\}/g, arch);

  // Windows .exe handling per spec
  if (os === "win") {
    if (isChecksum) {
      // Checksum file for Windows binary: brenner-win-x64.exe.sha256
      // The template produces: brenner-win-x64.sha256
      // We need: brenner-win-x64.exe.sha256
      if (url.endsWith(".sha256")) {
        url = url.replace(/\.sha256$/, ".exe.sha256");
      }
    } else if (!url.endsWith(".exe")) {
      url += ".exe";
    }
  }

  return url;
}

/**
 * Get artifact name for a platform.
 */
function getArtifactName(toolName: string, os: string, arch: string): string {
  const base = `${toolName}-${os}-${arch}`;
  return os === "win" ? `${base}.exe` : base;
}

/**
 * Generate an install plan for the given platform.
 */
export function generateInstallPlan(
  manifest: ToolchainManifest,
  platform: PlatformString,
): InstallPlan {
  const { os, arch } = platformToOsArch(platform);
  const targets: InstallTarget[] = [];
  const skipped: { tool: string; reason: string }[] = [];

  for (const [toolName, spec] of Object.entries(manifest.tools)) {
    // Check platform support
    if (!spec.platforms.includes(platform)) {
      skipped.push({
        tool: toolName,
        reason: spec.notes ?? `Not available on ${platform}`,
      });
      continue;
    }

    const base = {
      tool: toolName,
      version: spec.version,
      verifyCommand: spec.verify_command,
      notes: spec.notes,
    };

    if (spec.install_strategy === "release_binary") {
      const releaseUrlTemplate = spec.release_url_template;
      const checksumUrlTemplate = spec.checksum_url_template;
      if (!releaseUrlTemplate || !checksumUrlTemplate) {
        throw new Error(
          `Toolchain manifest: ${toolName} uses release_binary but missing release_url_template/checksum_url_template`,
        );
      }

      const binaryUrl = substituteUrl(releaseUrlTemplate, spec.version, os, arch, false);
      const checksumUrl = substituteUrl(checksumUrlTemplate, spec.version, os, arch, true);
      targets.push({
        ...base,
        strategy: "release_binary",
        binaryUrl,
        checksumUrl,
        artifactName: getArtifactName(toolName, os, arch),
      });
    } else {
      const installerUrl = spec.install_url;
      if (!installerUrl) {
        throw new Error(
          `Toolchain manifest: ${toolName} uses upstream_installer but missing install_url`,
        );
      }
      targets.push({
        ...base,
        strategy: "upstream_installer",
        installerUrl,
        installerArgs: spec.install_args ?? "",
      });
    }
  }

  return {
    platform,
    manifestVersion: manifest.manifest_version,
    minBunVersion: manifest.min_bun_version,
    targets,
    skipped,
  };
}

// -----------------------------------------------------------------------------
// Output Formatters
// -----------------------------------------------------------------------------

/**
 * Format install plan as human-readable text.
 */
export function formatPlanHuman(plan: InstallPlan): string {
  const lines: string[] = [];

  lines.push(`Brenner Toolchain Install Plan`);
  lines.push(`==============================`);
  lines.push(``);
  lines.push(`Platform:         ${plan.platform}`);
  lines.push(`Manifest Version: ${plan.manifestVersion}`);
  lines.push(`Min Bun Version:  ${plan.minBunVersion}`);
  lines.push(``);
  lines.push(`Targets (${plan.targets.length}):`);

  for (const target of plan.targets) {
    lines.push(``);
    lines.push(`  ${target.tool} v${target.version}`);
    lines.push(`    Strategy: ${target.strategy}`);

    if (target.strategy === "release_binary") {
      lines.push(`    Binary:   ${target.binaryUrl}`);
      lines.push(`    Checksum: ${target.checksumUrl}`);
      lines.push(`    Artifact: ${target.artifactName}`);
    } else {
      lines.push(`    Installer: ${target.installerUrl}`);
      if (target.installerArgs) {
        lines.push(`    Args:      ${target.installerArgs}`);
      }
    }

    lines.push(`    Verify:   ${target.verifyCommand}`);
    if (target.notes) {
      lines.push(`    Notes:    ${target.notes}`);
    }
  }

  if (plan.skipped.length > 0) {
    lines.push(``);
    lines.push(`Skipped (${plan.skipped.length}):`);
    for (const skip of plan.skipped) {
      lines.push(`  ${skip.tool}: ${skip.reason}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format install plan as JSON (for automation).
 */
export function formatPlanJson(plan: InstallPlan): string {
  return JSON.stringify(plan, null, 2);
}
