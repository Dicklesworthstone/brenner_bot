#!/usr/bin/env bun
/**
 * Bundle Size Check Script
 *
 * Checks production bundle sizes against defined budgets.
 * Run after `bun run build` to verify bundle size limits.
 *
 * Exit codes:
 * - 0: All bundles within budget
 * - 1: One or more bundles exceed budget
 *
 * @see brenner_bot-6u0z (Performance Benchmarks & Budgets)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { gzipSync } from "zlib";

// ============================================================================
// Budget Configuration (in bytes, gzipped)
// ============================================================================

interface BundleBudget {
  name: string;
  pattern: RegExp;
  maxSize: number; // bytes (gzipped)
}

const BUDGETS: BundleBudget[] = [
  {
    name: "Main bundle",
    pattern: /^main-[a-f0-9]+\.js$/,
    maxSize: 200 * 1024, // 200KB
  },
  {
    name: "Framework bundle",
    pattern: /^framework-[a-f0-9]+\.js$/,
    maxSize: 100 * 1024, // 100KB
  },
  {
    name: "Vendor chunks",
    pattern: /^[a-f0-9]+-[a-f0-9]+\.js$/, // Hash-only names are vendor chunks
    maxSize: 150 * 1024, // 150KB each
  },
];

const TOTAL_BUDGET = 500 * 1024; // 500KB total JS (gzipped)

// ============================================================================
// Helpers
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function getGzippedSize(filePath: string): number {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

function findBudget(filename: string): BundleBudget | undefined {
  return BUDGETS.find((b) => b.pattern.test(filename));
}

// ============================================================================
// Main
// ============================================================================

function checkBundleSizes(): boolean {
  const buildDir = join(process.cwd(), ".next", "static", "chunks");

  if (!existsSync(buildDir)) {
    console.error("Error: Build directory not found. Run 'bun run build' first.");
    console.error(`  Expected: ${buildDir}`);
    process.exit(1);
  }

  console.log("Bundle Size Report");
  console.log("==================\n");

  const files = readdirSync(buildDir).filter((f) => f.endsWith(".js"));
  let totalSize = 0;
  let hasViolation = false;
  const results: Array<{
    name: string;
    size: number;
    budget?: number;
    status: "pass" | "fail" | "info";
  }> = [];

  // Check each JS file
  for (const file of files) {
    const filePath = join(buildDir, file);
    const stat = statSync(filePath);

    // Skip very small files (likely just exports)
    if (stat.size < 1000) continue;

    const gzippedSize = getGzippedSize(filePath);
    totalSize += gzippedSize;

    const budget = findBudget(file);

    if (budget) {
      const exceeds = gzippedSize > budget.maxSize;
      if (exceeds) hasViolation = true;

      results.push({
        name: `${budget.name} (${file})`,
        size: gzippedSize,
        budget: budget.maxSize,
        status: exceeds ? "fail" : "pass",
      });
    } else {
      // Unbudgeted file - just track
      results.push({
        name: file,
        size: gzippedSize,
        status: "info",
      });
    }
  }

  // Sort by size descending
  results.sort((a, b) => b.size - a.size);

  // Print results
  for (const result of results) {
    const icon = result.status === "pass" ? "✓" : result.status === "fail" ? "✗" : "○";
    const color =
      result.status === "pass" ? "\x1b[32m" : result.status === "fail" ? "\x1b[31m" : "\x1b[90m";
    const reset = "\x1b[0m";

    if (result.budget) {
      const pct = ((result.size / result.budget) * 100).toFixed(0);
      console.log(
        `${color}${icon}${reset} ${result.name}: ${formatSize(result.size)} (${pct}% of ${formatSize(result.budget)} budget)`,
      );
    } else {
      console.log(`${color}${icon}${reset} ${result.name}: ${formatSize(result.size)}`);
    }
  }

  // Total check
  console.log("\n---");
  const totalExceeds = totalSize > TOTAL_BUDGET;
  if (totalExceeds) hasViolation = true;

  const totalIcon = totalExceeds ? "✗" : "✓";
  const totalColor = totalExceeds ? "\x1b[31m" : "\x1b[32m";
  const reset = "\x1b[0m";
  const totalPct = ((totalSize / TOTAL_BUDGET) * 100).toFixed(0);

  console.log(
    `${totalColor}${totalIcon}${reset} Total JS (gzipped): ${formatSize(totalSize)} (${totalPct}% of ${formatSize(TOTAL_BUDGET)} budget)`,
  );

  // Summary
  console.log("\n---");
  if (hasViolation) {
    console.log("\x1b[31m✗ Bundle size check FAILED\x1b[0m");
    console.log("  Some bundles exceed their budgets.");
    console.log("  Consider:");
    console.log("  - Dynamic imports for large dependencies");
    console.log("  - Tree-shaking unused exports");
    console.log("  - Reviewing recent changes that increased bundle size");
  } else {
    console.log("\x1b[32m✓ Bundle size check PASSED\x1b[0m");
    console.log("  All bundles are within their budgets.");
  }

  return !hasViolation;
}

// Run if executed directly (Bun-specific: import.meta.main)
if ((import.meta as { main?: boolean }).main) {
  const success = checkBundleSizes();
  process.exit(success ? 0 : 1);
}

export { checkBundleSizes };
