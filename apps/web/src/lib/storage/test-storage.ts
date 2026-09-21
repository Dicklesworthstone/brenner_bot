import { promises as fs } from "fs";
import { join } from "path";
import { type TestRecord, TestRecordSchema, type TestStatus } from "../schemas/test-record";
import { withFileLock } from "./file-lock";

/**
 * Test Storage Layer
 *
 * File-based storage for test records with cross-session indexing.
 * Follows the same pattern as anomaly-storage.ts and assumption-storage.ts.
 *
 * Storage structure:
 * .research/
 * ├── tests/
 * │   ├── RS-20251230-tests.json
 * │   └── ...
 * └── test-index.json
 *
 * @see brenner_bot-e4sb (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const TESTS_DIR = "tests";
const INDEX_FILE = "test-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for tests.
 */
export interface SessionTestFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  tests: TestRecord[];
}

/**
 * Index entry for quick lookups.
 */
export interface TestIndexEntry {
  id: string;
  sessionId: string;
  name: string;
  status: TestStatus;
  discriminates: string[];
  addressesPredictions: string[];
  isExecuted: boolean;
  hasPotencyCheck: boolean;
  evidencePerWeekTotal: number;
  designedBy: string | undefined;
  priority: number | undefined;
}

export interface StorageWarning {
  file: string;
  message: string;
}

/**
 * Full index file format.
 */
export interface TestIndex {
  version: string;
  updatedAt: string;
  entries: TestIndexEntry[];
  warnings?: StorageWarning[];
}

/**
 * Storage configuration.
 */
export interface TestStorageConfig {
  /** Base directory for storage (defaults to cwd) */
  baseDir?: string;
  /** Whether to auto-rebuild index on mutations (default: true) */
  autoRebuildIndex?: boolean;
}

// ============================================================================
// Path Helpers
// ============================================================================

function getResearchDir(baseDir: string): string {
  return join(baseDir, RESEARCH_DIR);
}

function getTestsDir(baseDir: string): string {
  return join(getResearchDir(baseDir), TESTS_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getTestsDir(baseDir), `${sanitized}-tests.json`);
}

// ============================================================================
// Directory Initialization
// ============================================================================

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

async function ensureStorageStructure(baseDir: string): Promise<void> {
  await ensureDir(getTestsDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Test storage manager.
 * Provides CRUD operations and indexing for test records.
 */
export class TestStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: TestStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load tests for a specific session.
   */
  async loadSessionTests(sessionId: string): Promise<TestRecord[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      let data: SessionTestFile;
      try {
        data = JSON.parse(content) as SessionTestFile;
      } catch {
        console.warn(`[TestStorage] Corrupted JSON in ${filePath}; returning empty tests.`);
        return [];
      }

      if (!Array.isArray(data.tests)) {
        console.warn(`[TestStorage] Malformed session file ${filePath}; returning empty tests.`);
        return [];
      }

      const parsed: TestRecord[] = [];
      for (const raw of data.tests) {
        try {
          parsed.push(TestRecordSchema.parse(raw));
        } catch {
          // Skip invalid entries
        }
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save tests for a specific session.
   */
  async saveSessionTests(sessionId: string, tests: TestRecord[]): Promise<void> {
    await withFileLock(this.baseDir, "tests", async () => {
      await this.saveSessionTestsUnlocked(sessionId, tests);
    });
  }

  private async saveSessionTestsUnlocked(sessionId: string, tests: TestRecord[]): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionTestFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionTestFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      tests,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.updateIndexForSessionUnlocked(sessionId, tests);
    }
  }

  private async updateIndexForSessionUnlocked(
    sessionId: string,
    tests: TestRecord[],
  ): Promise<void> {
    const indexPath = getIndexPath(this.baseDir);
    let index: TestIndex;

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(content) as TestIndex;
    } catch {
      await this.rebuildIndexUnlocked();
      return;
    }

    const otherEntries = index.entries.filter((e) => e.sessionId !== sessionId);

    const newEntries: TestIndexEntry[] = tests.map((t) => {
      const total =
        t.evidencePerWeekScore.likelihoodRatio +
        t.evidencePerWeekScore.cost +
        t.evidencePerWeekScore.speed +
        t.evidencePerWeekScore.ambiguity;

      return {
        id: t.id,
        sessionId: t.designedInSession,
        name: t.name,
        status: t.status,
        discriminates: t.discriminates,
        addressesPredictions: t.addressesPredictions ?? [],
        isExecuted: !!t.execution,
        hasPotencyCheck: (t.potencyCheck?.positiveControl ?? "").trim().length >= 10,
        evidencePerWeekTotal: total,
        designedBy: t.designedBy,
        priority: t.priority,
      };
    });

    index.entries = [...otherEntries, ...newEntries];
    index.updatedAt = new Date().toISOString();

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  // ============================================================================
  // Individual Test Operations
  // ============================================================================

  /**
   * Get a specific test by ID.
   */
  async getTestById(id: string): Promise<TestRecord | null> {
    // Extract session ID from test ID (T-{sessionId}-{seq})
    const match = id.match(/^T-(.+)-\d+$/);
    if (match) {
      const sessionId = match[1];
      const tests = await this.loadSessionTests(sessionId);
      return tests.find((t) => t.id === id) ?? null;
    }

    // Fallback: simple ID or unknown session
    const simpleMatch = id.match(/^T\d+$/);
    if (simpleMatch) {
      const allTests = await this.getAllTests();
      return allTests.find((t) => t.id === id) ?? null;
    }

    return null;
  }

  /**
   * Create or update a test.
   */
  async saveTest(test: TestRecord): Promise<void> {
    await withFileLock(this.baseDir, "tests", async () => {
      const tests = await this.loadSessionTests(test.designedInSession);
      const existingIndex = tests.findIndex((t) => t.id === test.id);

      if (existingIndex >= 0) {
        tests[existingIndex] = test;
      } else {
        tests.push(test);
      }

      await this.saveSessionTestsUnlocked(test.designedInSession, tests);
    });
  }

  /**
   * Delete a test by ID.
   */
  async deleteTest(id: string): Promise<boolean> {
    return await withFileLock(this.baseDir, "tests", async () => {
      // Optimization: Try to extract session ID from ID
      const match = id.match(/^T-(.+)-\d+$/);
      if (match) {
        const sessionId = match[1];
        const tests = await this.loadSessionTests(sessionId);
        const newTests = tests.filter((t) => t.id !== id);

        if (newTests.length === tests.length) {
          return false;
        }

        await this.saveSessionTestsUnlocked(sessionId, newTests);
        return true;
      }

      // Fallback
      const test = await this.getTestById(id);
      if (!test) {
        return false;
      }

      const tests = await this.loadSessionTests(test.designedInSession);
      const newTests = tests.filter((t) => t.id !== id);

      if (newTests.length === tests.length) {
        return false;
      }

      await this.saveSessionTestsUnlocked(test.designedInSession, newTests);
      return true;
    });
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<TestIndex> {
    return await withFileLock(this.baseDir, "tests", async () => {
      return await this.rebuildIndexUnlocked();
    });
  }

  private async rebuildIndexUnlocked(): Promise<TestIndex> {
    const entries: TestIndexEntry[] = [];
    const warnings: StorageWarning[] = [];
    const testsDir = getTestsDir(this.baseDir);

    try {
      const files = await fs.readdir(testsDir);

      for (const file of files) {
        if (!file.endsWith("-tests.json")) continue;

        const filePath = join(testsDir, file);
        const content = await fs.readFile(filePath, "utf-8");

        let data: SessionTestFile;
        try {
          data = JSON.parse(content) as SessionTestFile;
        } catch {
          warnings.push({ file: filePath, message: "Skipping malformed JSON session file." });
          continue;
        }

        if (!Array.isArray(data.tests)) {
          warnings.push({
            file: filePath,
            message: "Skipping malformed session file (missing tests[]).",
          });
          continue;
        }

        let invalidCount = 0;
        for (const test of data.tests) {
          try {
            const parsed = TestRecordSchema.parse(test);
            const total =
              parsed.evidencePerWeekScore.likelihoodRatio +
              parsed.evidencePerWeekScore.cost +
              parsed.evidencePerWeekScore.speed +
              parsed.evidencePerWeekScore.ambiguity;

            entries.push({
              id: parsed.id,
              sessionId: parsed.designedInSession,
              name: parsed.name,
              status: parsed.status,
              discriminates: parsed.discriminates,
              addressesPredictions: parsed.addressesPredictions ?? [],
              isExecuted: !!parsed.execution,
              hasPotencyCheck: (parsed.potencyCheck?.positiveControl ?? "").trim().length >= 10,
              evidencePerWeekTotal: total,
              designedBy: parsed.designedBy,
              priority: parsed.priority,
            });
          } catch {
            invalidCount += 1;
          }
        }

        if (invalidCount > 0) {
          warnings.push({ file: filePath, message: `Skipped ${invalidCount} invalid tests.` });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: TestIndex = {
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
      entries,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    await ensureStorageStructure(this.baseDir);
    await fs.writeFile(getIndexPath(this.baseDir), JSON.stringify(index, null, 2));

    return index;
  }

  /**
   * Load the index (or rebuild if missing).
   */
  async loadIndex(): Promise<TestIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(content) as TestIndex;
      if (!parsed || !Array.isArray(parsed.entries)) {
        throw new Error("Malformed test index");
      }
      return parsed;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations - By Status
  // ============================================================================

  /**
   * Get all tests by status.
   */
  async getTestsByStatus(status: TestStatus): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.status === status);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(...tests.filter((t) => t.status === status));
    }

    return results;
  }

  /**
   * Get all designed (not yet started) tests.
   */
  async getDesignedTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("designed");
  }

  /**
   * Get all ready tests.
   */
  async getReadyTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("ready");
  }

  /**
   * Get all in-progress tests.
   */
  async getInProgressTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("in_progress");
  }

  /**
   * Get all completed tests.
   */
  async getCompletedTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("completed");
  }

  /**
   * Get all blocked tests.
   */
  async getBlockedTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("blocked");
  }

  /**
   * Get all abandoned tests.
   */
  async getAbandonedTests(): Promise<TestRecord[]> {
    return this.getTestsByStatus("abandoned");
  }

  /**
   * Get all tests designed but not yet executed.
   */
  async getDesignedButNotExecutedTests(): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => !e.isExecuted && e.status !== "completed" && e.status !== "abandoned",
    );

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(
        ...tests.filter(
          (t) => !t.execution && t.status !== "completed" && t.status !== "abandoned",
        ),
      );
    }

    return results;
  }

  // ============================================================================
  // Query Operations - By Hypothesis
  // ============================================================================

  /**
   * Get all tests that discriminate a specific hypothesis.
   */
  async getTestsForHypothesis(hypothesisId: string): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.discriminates.includes(hypothesisId));

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(...tests.filter((t) => t.discriminates.includes(hypothesisId)));
    }

    return results;
  }

  /**
   * Get all tests that address a specific prediction.
   */
  async getTestsForPrediction(predictionId: string): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.addressesPredictions.includes(predictionId));

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(...tests.filter((t) => t.addressesPredictions?.includes(predictionId)));
    }

    return results;
  }

  // ============================================================================
  // Query Operations - By Quality
  // ============================================================================

  /**
   * Get tests missing potency checks (critical quality issue).
   */
  async getTestsMissingPotencyCheck(): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => !e.hasPotencyCheck);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(
        ...tests.filter((t) => (t.potencyCheck?.positiveControl ?? "").trim().length < 10),
      );
    }

    return results;
  }

  /**
   * Get tests with high evidence-per-week scores (>=9 out of 12).
   */
  async getHighQualityTests(): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.evidencePerWeekTotal >= 9);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(
        ...tests.filter((t) => {
          const total =
            t.evidencePerWeekScore.likelihoodRatio +
            t.evidencePerWeekScore.cost +
            t.evidencePerWeekScore.speed +
            t.evidencePerWeekScore.ambiguity;
          return total >= 9;
        }),
      );
    }

    return results;
  }

  /**
   * Get tests with low evidence-per-week scores (<=4 out of 12).
   */
  async getLowQualityTests(): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.evidencePerWeekTotal <= 4);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(
        ...tests.filter((t) => {
          const total =
            t.evidencePerWeekScore.likelihoodRatio +
            t.evidencePerWeekScore.cost +
            t.evidencePerWeekScore.speed +
            t.evidencePerWeekScore.ambiguity;
          return total <= 4;
        }),
      );
    }

    return results;
  }

  // ============================================================================
  // Query Operations - Execution
  // ============================================================================

  /**
   * Get all executed tests.
   */
  async getExecutedTests(): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.isExecuted);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(...tests.filter((t) => !!t.execution));
    }

    return results;
  }

  /**
   * Get tests where execution matched a specific hypothesis.
   */
  async getTestsMatchingHypothesis(hypothesisId: string): Promise<TestRecord[]> {
    const executed = await this.getExecutedTests();
    return executed.filter((t) => t.execution?.matchedHypothesisId === hypothesisId);
  }

  /**
   * Get tests where potency check failed.
   */
  async getTestsWithFailedPotency(): Promise<TestRecord[]> {
    const executed = await this.getExecutedTests();
    return executed.filter((t) => t.execution?.potencyCheckPassed === false);
  }

  // ============================================================================
  // Query Operations - By Designer
  // ============================================================================

  /**
   * Get tests designed by a specific agent.
   */
  async getTestsByDesigner(designerName: string): Promise<TestRecord[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.designedBy === designerName);

    const results: TestRecord[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const tests = await this.loadSessionTests(sessionId);
      results.push(...tests.filter((t) => t.designedBy === designerName));
    }

    return results;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get test statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<TestStatus, number>;
    executed: number;
    potencyCheckCoverage: number;
    avgEvidencePerWeekScore: number;
    sessionsWithTests: number;
  }> {
    const index = await this.loadIndex();

    const byStatus: Record<TestStatus, number> = {
      designed: 0,
      ready: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      abandoned: 0,
    };

    let totalScore = 0;
    let withPotency = 0;

    for (const entry of index.entries) {
      byStatus[entry.status]++;
      totalScore += entry.evidencePerWeekTotal;
      if (entry.hasPotencyCheck) {
        withPotency++;
      }
    }

    const total = index.entries.length;
    const sessionsWithTests = new Set(index.entries.map((e) => e.sessionId)).size;
    const executed = index.entries.filter((e) => e.isExecuted).length;

    return {
      total,
      byStatus,
      executed,
      potencyCheckCoverage: total > 0 ? withPotency / total : 0,
      avgEvidencePerWeekScore: total > 0 ? totalScore / total : 0,
      sessionsWithTests,
    };
  }

  /**
   * Get coverage statistics for hypotheses.
   * Returns how many tests target each hypothesis.
   */
  async getHypothesisCoverage(): Promise<Map<string, number>> {
    const index = await this.loadIndex();
    const coverage = new Map<string, number>();

    for (const entry of index.entries) {
      for (const hId of entry.discriminates) {
        coverage.set(hId, (coverage.get(hId) ?? 0) + 1);
      }
    }

    return coverage;
  }

  /**
   * Get uncovered hypotheses (hypotheses with no tests targeting them).
   * Requires a list of all hypothesis IDs to compare against.
   */
  async getUncoveredHypotheses(allHypothesisIds: string[]): Promise<string[]> {
    const coverage = await this.getHypothesisCoverage();
    return allHypothesisIds.filter((hId) => !coverage.has(hId));
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all tests across all sessions.
   */
  async getAllTests(): Promise<TestRecord[]> {
    const testsDir = getTestsDir(this.baseDir);
    const results: TestRecord[] = [];

    try {
      const files = await fs.readdir(testsDir);

      for (const file of files) {
        if (!file.endsWith("-tests.json")) continue;
        const sessionId = file.replace(/-tests\.json$/, "");
        results.push(...(await this.loadSessionTests(sessionId)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have tests.
   */
  async listSessions(): Promise<string[]> {
    const testsDir = getTestsDir(this.baseDir);

    try {
      const files = await fs.readdir(testsDir);
      return files
        .filter((f) => f.endsWith("-tests.json"))
        .map((f) => {
          // Extract session ID from filename
          const match = f.match(/^(.+)-tests\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get tests sorted by priority (lower = higher priority).
   * Filters out tests without priority set.
   */
  async getTestsByPriority(): Promise<TestRecord[]> {
    const all = await this.getAllTests();
    return all
      .filter((t) => t.priority !== undefined)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  }

  /**
   * Get the next test to execute based on priority and status.
   * Returns the highest priority test that is ready to run.
   */
  async getNextTestToExecute(): Promise<TestRecord | null> {
    const ready = await this.getReadyTests();
    if (ready.length === 0) {
      return null;
    }

    // Sort by priority (lower = higher priority), then by creation time
    const sorted = ready.sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });

    return sorted[0];
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const testStorage = new TestStorage();
