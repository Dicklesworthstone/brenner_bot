/**
 * Tests for toolchain manifest parser
 *
 * @see specs/toolchain_manifest_v0.1.md
 * @see specs/release_artifact_matrix_v0.1.md
 */

import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import {
  detectPlatform,
  detectPlatformFrom,
  formatPlanHuman,
  formatPlanJson,
  generateInstallPlan,
  type PlatformString,
  parseManifest,
  platformToOsArch,
  type ToolchainManifest,
} from "./toolchain-manifest";

const VALID_MANIFEST = `{
  "manifest_version": "0.1.0",
  "min_bun_version": "1.1.0",
  "tools": {
    "test-tool": {
      "version": "1.0.0",
      "install_strategy": "release_binary",
      "release_url_template": "https://example.com/download/v\${VERSION}/test-\${OS}-\${ARCH}",
      "checksum_url_template": "https://example.com/download/v\${VERSION}/test-\${OS}-\${ARCH}.sha256",
      "verify_command": "test --version",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "darwin-arm64", "win-x64"]
    },
    "upstream-tool": {
      "version": "2.0.0",
      "install_strategy": "upstream_installer",
      "install_url": "https://example.com/install.sh",
      "install_args": "--version 2.0.0",
      "verify_command": "upstream --version",
      "verify_success": "exit_code_zero",
      "platforms": ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64"],
      "notes": "Not available on Windows"
    }
  }
}`;

describe("parseManifest", () => {
  test("parses valid manifest", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.manifest_version).toBe("0.1.0");
      expect(result.manifest.min_bun_version).toBe("1.1.0");
      expect(Object.keys(result.manifest.tools)).toHaveLength(2);
    }
  });

  test("rejects invalid JSON", () => {
    const result = parseManifest("{ invalid json }");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid JSON");
    }
  });

  test("rejects missing required fields", () => {
    const result = parseManifest('{"manifest_version": "0.1.0"}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Manifest validation failed");
    }
  });

  test("rejects invalid install_strategy", () => {
    const manifest = {
      manifest_version: "0.1.0",
      min_bun_version: "1.1.0",
      tools: {
        test: {
          version: "1.0.0",
          install_strategy: "invalid_strategy",
          verify_command: "test",
          verify_success: "exit_code_zero",
          platforms: ["linux-x64"],
        },
      },
    };
    const result = parseManifest(JSON.stringify(manifest));
    expect(result.ok).toBe(false);
  });

  test("rejects release_binary without URL templates", () => {
    const manifest = {
      manifest_version: "0.1.0",
      min_bun_version: "1.1.0",
      tools: {
        test: {
          version: "1.0.0",
          install_strategy: "release_binary",
          verify_command: "test",
          verify_success: "exit_code_zero",
          platforms: ["linux-x64"],
          // Missing release_url_template and checksum_url_template
        },
      },
    };
    const result = parseManifest(JSON.stringify(manifest));
    expect(result.ok).toBe(false);
  });

  test("rejects upstream_installer without install_url", () => {
    const manifest = {
      manifest_version: "0.1.0",
      min_bun_version: "1.1.0",
      tools: {
        test: {
          version: "1.0.0",
          install_strategy: "upstream_installer",
          verify_command: "test",
          verify_success: "exit_code_zero",
          platforms: ["linux-x64"],
          // Missing install_url
        },
      },
    };
    const result = parseManifest(JSON.stringify(manifest));
    expect(result.ok).toBe(false);
  });

  test("rejects invalid platform string", () => {
    const manifest = {
      manifest_version: "0.1.0",
      min_bun_version: "1.1.0",
      tools: {
        test: {
          version: "1.0.0",
          install_strategy: "upstream_installer",
          install_url: "https://example.com/install.sh",
          verify_command: "test",
          verify_success: "exit_code_zero",
          platforms: ["invalid-platform"],
        },
      },
    };
    const result = parseManifest(JSON.stringify(manifest));
    expect(result.ok).toBe(false);
  });
});

describe("platformToOsArch", () => {
  test.each([
    ["linux-x64", { os: "linux", arch: "x64" }],
    ["linux-arm64", { os: "linux", arch: "arm64" }],
    ["darwin-arm64", { os: "darwin", arch: "arm64" }],
    ["darwin-x64", { os: "darwin", arch: "x64" }],
    ["win-x64", { os: "win", arch: "x64" }],
  ] as [PlatformString, { os: string; arch: string }][])(
    "converts %s to %j",
    (platform, expected) => {
      expect(platformToOsArch(platform)).toEqual(expected);
    },
  );
});

describe("detectPlatform", () => {
  test("returns a valid platform string", () => {
    const platform = detectPlatform();
    // Should work on any supported dev machine
    if (platform !== null) {
      expect(["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"]).toContain(
        platform,
      );
    }
  });

  test.each([
    ["linux", "x64", "linux-x64"],
    ["linux", "arm64", "linux-arm64"],
    ["darwin", "arm64", "darwin-arm64"],
    ["darwin", "x64", "darwin-x64"],
    ["win32", "x64", "win-x64"],
    ["win32", "arm64", null],
    ["freebsd", "x64", null],
  ] as [string, string, PlatformString | null][])(
    "detectPlatformFrom(%s,%s) -> %s",
    (os, arch, expected) => {
      expect(detectPlatformFrom(os, arch)).toBe(expected);
    },
  );
});

describe("generateInstallPlan", () => {
  let manifest: ToolchainManifest;

  test("generates plan for linux-x64", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    manifest = result.manifest;

    const plan = generateInstallPlan(manifest, "linux-x64");

    expect(plan.platform).toBe("linux-x64");
    expect(plan.manifestVersion).toBe("0.1.0");
    expect(plan.minBunVersion).toBe("1.1.0");
    expect(plan.targets).toHaveLength(2);
    expect(plan.skipped).toHaveLength(0);

    // Check release_binary target
    const testTool = plan.targets.find((t) => t.tool === "test-tool");
    expect(testTool).toBeDefined();
    expect(testTool?.strategy).toBe("release_binary");
    if (testTool?.strategy === "release_binary") {
      expect(testTool.binaryUrl).toBe("https://example.com/download/v1.0.0/test-linux-x64");
      expect(testTool.checksumUrl).toBe(
        "https://example.com/download/v1.0.0/test-linux-x64.sha256",
      );
      expect(testTool.artifactName).toBe("test-tool-linux-x64");
    }

    // Check upstream_installer target
    const upstreamTool = plan.targets.find((t) => t.tool === "upstream-tool");
    expect(upstreamTool).toBeDefined();
    expect(upstreamTool?.strategy).toBe("upstream_installer");
    if (upstreamTool?.strategy === "upstream_installer") {
      expect(upstreamTool.installerUrl).toBe("https://example.com/install.sh");
      expect(upstreamTool.installerArgs).toBe("--version 2.0.0");
    }
  });

  test("skips tools not available on platform", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    manifest = result.manifest;

    const plan = generateInstallPlan(manifest, "win-x64");

    expect(plan.targets).toHaveLength(1);
    expect(plan.targets[0]?.tool).toBe("test-tool");

    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0]?.tool).toBe("upstream-tool");
    expect(plan.skipped[0]?.reason).toBe("Not available on Windows");
  });

  test("handles Windows .exe suffix correctly", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    manifest = result.manifest;

    const plan = generateInstallPlan(manifest, "win-x64");

    const testTool = plan.targets.find((t) => t.tool === "test-tool");
    expect(testTool?.strategy).toBe("release_binary");
    if (testTool?.strategy === "release_binary") {
      expect(testTool.binaryUrl).toBe("https://example.com/download/v1.0.0/test-win-x64.exe");
      expect(testTool.checksumUrl).toBe(
        "https://example.com/download/v1.0.0/test-win-x64.exe.sha256",
      );
      expect(testTool.artifactName).toBe("test-tool-win-x64.exe");
    }
  });

  test("handles darwin-arm64 correctly", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    manifest = result.manifest;

    const plan = generateInstallPlan(manifest, "darwin-arm64");

    expect(plan.targets).toHaveLength(2);
    expect(plan.skipped).toHaveLength(0);

    const testTool = plan.targets.find((t) => t.tool === "test-tool");
    if (testTool?.strategy === "release_binary") {
      expect(testTool.binaryUrl).toBe("https://example.com/download/v1.0.0/test-darwin-arm64");
      expect(testTool.artifactName).toBe("test-tool-darwin-arm64");
    }
  });
});

describe("formatPlanHuman", () => {
  test("produces human-readable output", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan = generateInstallPlan(result.manifest, "linux-x64");
    const output = formatPlanHuman(plan);

    expect(output).toContain("Brenner Toolchain Install Plan");
    expect(output).toContain("Platform:         linux-x64");
    expect(output).toContain("test-tool v1.0.0");
    expect(output).toContain("Strategy: release_binary");
    expect(output).toContain("upstream-tool v2.0.0");
    expect(output).toContain("Strategy: upstream_installer");
  });

  test("shows skipped tools", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan = generateInstallPlan(result.manifest, "win-x64");
    const output = formatPlanHuman(plan);

    expect(output).toContain("Skipped (1):");
    expect(output).toContain("upstream-tool: Not available on Windows");
  });
});

describe("formatPlanJson", () => {
  test("produces valid JSON", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan = generateInstallPlan(result.manifest, "linux-x64");
    const output = formatPlanJson(plan);

    const parsed = JSON.parse(output);
    expect(parsed.platform).toBe("linux-x64");
    expect(parsed.targets).toHaveLength(2);
    expect(parsed.skipped).toHaveLength(0);
  });

  test("JSON is deterministic", () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan = generateInstallPlan(result.manifest, "linux-x64");
    const output1 = formatPlanJson(plan);
    const output2 = formatPlanJson(plan);

    expect(output1).toBe(output2);
  });
});

describe("real manifest", () => {
  test("parses specs/toolchain.manifest.json", async () => {
    const manifestPath = new URL("../../../../../specs/toolchain.manifest.json", import.meta.url);
    let manifestJson: string;
    try {
      manifestJson = await readFile(manifestPath, "utf8");
    } catch {
      // Skip if file doesn't exist in test environment
      return;
    }

    const result = parseManifest(manifestJson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify it has the expected tools
    expect(result.manifest.tools.brenner).toBeDefined();
    expect(result.manifest.tools.bun).toBeDefined();

    // Generate plan for current platform
    const platform = detectPlatform();
    if (platform) {
      const plan = generateInstallPlan(result.manifest, platform);
      expect(plan.targets.length).toBeGreaterThan(0);
    }
  });
});
