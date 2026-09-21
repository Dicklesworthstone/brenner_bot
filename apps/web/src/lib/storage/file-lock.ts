import { mkdir, rmdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const LOCK_STALE_MS = 30_000; // 30 seconds
const LOCK_RETRY_DELAY_MS = 50;
const MAX_RETRIES = 200; // ~15s total with jitter

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureLockDir(lockPath: string) {
  try {
    await mkdir(dirname(lockPath), { recursive: true });
  } catch {
    // Ignore error if dir exists
  }
}

/**
 * Acquire a file-system lock using atomic mkdir.
 */
async function acquireLock(lockPath: string): Promise<void> {
  await ensureLockDir(lockPath);

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await mkdir(lockPath);
      return; // Lock acquired
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      // Lock exists, check if stale
      try {
        const stats = await stat(lockPath);
        const age = Date.now() - stats.mtimeMs;
        if (age > LOCK_STALE_MS) {
          try {
            await rmdir(lockPath);
            // Retry immediately
            continue;
          } catch {
            // Race to delete stale lock, another process might have taken it
          }
        }
      } catch {
        // Lock might have been deleted just now
      }

      // Wait with jitter to avoid thundering herd
      const jitter = Math.floor(Math.random() * LOCK_RETRY_DELAY_MS);
      await sleep(LOCK_RETRY_DELAY_MS + jitter);
    }
  }

  throw new Error(`Failed to acquire lock at ${lockPath} after ${MAX_RETRIES} attempts`);
}

async function releaseLock(lockPath: string): Promise<void> {
  try {
    await rmdir(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`[FileLock] Failed to release lock ${lockPath}:`, error);
    }
  }
}

/**
 * Execute a function with a file-system lock.
 * This ensures exclusive access across processes (CLI, Server, Workers).
 *
 * @param baseDir - Project base directory
 * @param resourceName - Name of the resource to lock (e.g. "tests", "hypotheses")
 * @param fn - Async function to execute
 */
export async function withFileLock<T>(
  baseDir: string,
  resourceName: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Store locks in .research/.locks/
  const lockPath = join(baseDir, ".research", ".locks", `${resourceName}.lock`);

  await acquireLock(lockPath);
  try {
    return await fn();
  } finally {
    await releaseLock(lockPath);
  }
}
