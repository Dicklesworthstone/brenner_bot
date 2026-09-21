import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CORPUS_DOCS } from "../src/lib/corpus";

const EXTRA_CORPUS_FILES = [
  "specs/operator_library_v0.1.md",
  "specs/role_prompts_v0.1.md",
] as const;

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const repoRoot = resolve(process.cwd(), "../..");
  const outputDir = resolve(process.cwd(), "public/_corpus");

  await mkdir(outputDir, { recursive: true });

  async function copyOne(relativePath: string): Promise<void> {
    const sourcePath = resolve(repoRoot, relativePath);
    const outputPath = resolve(outputDir, relativePath);

    // Ensure the parent directory exists (for files in subdirectories)
    const parentDir = dirname(outputPath);
    await mkdir(parentDir, { recursive: true });

    // Try to copy from repo root
    if (!(await fileExists(sourcePath))) {
      console.warn(`[copy-corpus] WARNING: Source not found: ${relativePath}`);
      return;
    }

    // If output exists and content is identical, skip (prevents stale corpus copies)
    if (await fileExists(outputPath)) {
      const [sourceStats, outputStats] = await Promise.all([stat(sourcePath), stat(outputPath)]);
      if (sourceStats.size === outputStats.size) {
        const [sourceBuf, outputBuf] = await Promise.all([
          readFile(sourcePath),
          readFile(outputPath),
        ]);
        if (sourceBuf.equals(outputBuf)) {
          console.log(
            `[copy-corpus] Skipping ${relativePath} - unchanged (${Math.round(outputStats.size / 1024)}KB)`,
          );
          return;
        }
      }
    }

    await copyFile(sourcePath, outputPath);
    const stats = await stat(outputPath);
    console.log(`[copy-corpus] Updated ${relativePath} (${Math.round(stats.size / 1024)}KB)`);
  }

  for (const doc of CORPUS_DOCS) {
    await copyOne(doc.filename);
  }

  for (const relativePath of EXTRA_CORPUS_FILES) {
    await copyOne(relativePath);
  }
}

await main();
