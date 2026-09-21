import { promises as fs } from "fs";
import { join } from "path";
import {
  type Critique,
  CritiqueSchema,
  type CritiqueSeverity,
  type CritiqueStatus,
  type CritiqueTargetType,
} from "../schemas/critique";
import { withFileLock } from "./file-lock";

/**
 * Critique Storage Layer
 *
 * File-based storage for critique records with cross-session indexing.
 * Follows the same pattern as anomaly-storage.ts and assumption-storage.ts.
 *
 * Storage structure:
 * .research/
 * ├── critiques/
 * │   ├── RS-20251230-critiques.json
 * │   └── ...
 * └── critique-index.json
 *
 * @see brenner_bot-f5wy.2 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const CRITIQUES_DIR = "critiques";
const INDEX_FILE = "critique-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for critiques.
 */
export interface SessionCritiqueFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  critiques: Critique[];
}

/**
 * Index entry for quick lookups.
 */
export interface CritiqueIndexEntry {
  id: string;
  sessionId: string;
  targetType: CritiqueTargetType;
  targetId: string | undefined;
  status: CritiqueStatus;
  severity: CritiqueSeverity;
  hasProposedAlternative: boolean;
  raisedBy: string | undefined;
}

export interface StorageWarning {
  file: string;
  message: string;
}

/**
 * Full index file format.
 */
export interface CritiqueIndex {
  version: string;
  updatedAt: string;
  entries: CritiqueIndexEntry[];
  warnings?: StorageWarning[];
}

/**
 * Storage configuration.
 */
export interface CritiqueStorageConfig {
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

function getCritiquesDir(baseDir: string): string {
  return join(getResearchDir(baseDir), CRITIQUES_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getCritiquesDir(baseDir), `${sanitized}-critiques.json`);
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
  await ensureDir(getCritiquesDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Critique storage manager.
 * Provides CRUD operations and indexing for critiques.
 */
export class CritiqueStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: CritiqueStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load critiques for a specific session.
   */
  async loadSessionCritiques(sessionId: string): Promise<Critique[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      let data: SessionCritiqueFile;
      try {
        data = JSON.parse(content) as SessionCritiqueFile;
      } catch {
        console.warn(`[CritiqueStorage] Corrupted JSON in ${filePath}; returning empty critiques.`);
        return [];
      }

      if (!Array.isArray(data.critiques)) {
        console.warn(
          `[CritiqueStorage] Malformed session file ${filePath}; returning empty critiques.`,
        );
        return [];
      }

      const parsed: Critique[] = [];
      for (const raw of data.critiques) {
        try {
          parsed.push(CritiqueSchema.parse(raw));
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
   * Save critiques for a specific session.
   */
  async saveSessionCritiques(sessionId: string, critiques: Critique[]): Promise<void> {
    await withFileLock(this.baseDir, "critiques", async () => {
      await this.saveSessionCritiquesUnlocked(sessionId, critiques);
    });
  }

  private async saveSessionCritiquesUnlocked(
    sessionId: string,
    critiques: Critique[],
  ): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionCritiqueFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionCritiqueFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      critiques,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.updateIndexForSessionUnlocked(sessionId, critiques);
    }
  }

  private async updateIndexForSessionUnlocked(
    sessionId: string,
    critiques: Critique[],
  ): Promise<void> {
    const indexPath = getIndexPath(this.baseDir);
    let index: CritiqueIndex;

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(content) as CritiqueIndex;
    } catch {
      await this.rebuildIndexUnlocked();
      return;
    }

    const otherEntries = index.entries.filter((e) => e.sessionId !== sessionId);

    const newEntries: CritiqueIndexEntry[] = critiques.map((c) => ({
      id: c.id,
      sessionId: c.sessionId,
      targetType: c.targetType,
      targetId: c.targetId,
      status: c.status,
      severity: c.severity,
      hasProposedAlternative: !!c.proposedAlternative,
      raisedBy: c.raisedBy,
    }));

    index.entries = [...otherEntries, ...newEntries];
    index.updatedAt = new Date().toISOString();

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  // ============================================================================
  // Individual Critique Operations
  // ============================================================================

  /**
   * Get a specific critique by ID.
   */
  async getCritiqueById(id: string): Promise<Critique | null> {
    // Extract session ID from critique ID (C-{sessionId}-{seq})
    const match = id.match(/^C-(.+)-\d+$/);
    if (match) {
      const sessionId = match[1];
      const critiques = await this.loadSessionCritiques(sessionId);
      return critiques.find((c) => c.id === id) ?? null;
    }

    // Fallback: simple ID or unknown session
    const simpleMatch = id.match(/^C\d+$/);
    if (simpleMatch) {
      const allCritiques = await this.getAllCritiques();
      return allCritiques.find((c) => c.id === id) ?? null;
    }

    return null;
  }

  /**
   * Create or update a critique.
   */
  async saveCritique(critique: Critique): Promise<void> {
    await withFileLock(this.baseDir, "critiques", async () => {
      const critiques = await this.loadSessionCritiques(critique.sessionId);
      const existingIndex = critiques.findIndex((c) => c.id === critique.id);

      if (existingIndex >= 0) {
        critiques[existingIndex] = critique;
      } else {
        critiques.push(critique);
      }

      await this.saveSessionCritiquesUnlocked(critique.sessionId, critiques);
    });
  }

  /**
   * Delete a critique by ID.
   */
  async deleteCritique(id: string): Promise<boolean> {
    return await withFileLock(this.baseDir, "critiques", async () => {
      // Optimization: Try to extract session ID from ID
      const match = id.match(/^C-(.+)-\d+$/);
      if (match) {
        const sessionId = match[1];
        const critiques = await this.loadSessionCritiques(sessionId);
        const newCritiques = critiques.filter((c) => c.id !== id);

        if (newCritiques.length === critiques.length) {
          return false;
        }

        await this.saveSessionCritiquesUnlocked(sessionId, newCritiques);
        return true;
      }

      // Fallback
      const critique = await this.getCritiqueById(id);
      if (!critique) {
        return false;
      }

      const critiques = await this.loadSessionCritiques(critique.sessionId);
      const newCritiques = critiques.filter((c) => c.id !== id);

      if (newCritiques.length === critiques.length) {
        return false;
      }

      await this.saveSessionCritiquesUnlocked(critique.sessionId, newCritiques);
      return true;
    });
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<CritiqueIndex> {
    return await withFileLock(this.baseDir, "critiques", async () => {
      return await this.rebuildIndexUnlocked();
    });
  }

  private async rebuildIndexUnlocked(): Promise<CritiqueIndex> {
    const entries: CritiqueIndexEntry[] = [];
    const warnings: StorageWarning[] = [];
    const critiquesDir = getCritiquesDir(this.baseDir);

    try {
      const files = await fs.readdir(critiquesDir);

      for (const file of files) {
        if (!file.endsWith("-critiques.json")) continue;

        const filePath = join(critiquesDir, file);
        const content = await fs.readFile(filePath, "utf-8");

        let data: SessionCritiqueFile;
        try {
          data = JSON.parse(content) as SessionCritiqueFile;
        } catch {
          warnings.push({ file: filePath, message: "Skipping malformed JSON session file." });
          continue;
        }

        if (!Array.isArray(data.critiques)) {
          warnings.push({
            file: filePath,
            message: "Skipping malformed session file (missing critiques[]).",
          });
          continue;
        }

        let invalidCount = 0;
        for (const critique of data.critiques) {
          try {
            const parsed = CritiqueSchema.parse(critique);
            entries.push({
              id: parsed.id,
              sessionId: parsed.sessionId,
              targetType: parsed.targetType,
              targetId: parsed.targetId,
              status: parsed.status,
              severity: parsed.severity,
              hasProposedAlternative: !!parsed.proposedAlternative,
              raisedBy: parsed.raisedBy,
            });
          } catch {
            invalidCount += 1;
          }
        }

        if (invalidCount > 0) {
          warnings.push({ file: filePath, message: `Skipped ${invalidCount} invalid critiques.` });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: CritiqueIndex = {
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
  async loadIndex(): Promise<CritiqueIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(content) as CritiqueIndex;
      if (!parsed || !Array.isArray(parsed.entries)) {
        throw new Error("Malformed critique index");
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
   * Get all critiques by status.
   */
  async getCritiquesByStatus(status: CritiqueStatus): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.status === status);

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(...critiques.filter((c) => c.status === status));
    }

    return results;
  }

  /**
   * Get all active (unaddressed) critiques.
   */
  async getActiveCritiques(): Promise<Critique[]> {
    return this.getCritiquesByStatus("active");
  }

  /**
   * Get all addressed critiques.
   */
  async getAddressedCritiques(): Promise<Critique[]> {
    return this.getCritiquesByStatus("addressed");
  }

  /**
   * Get all dismissed critiques.
   */
  async getDismissedCritiques(): Promise<Critique[]> {
    return this.getCritiquesByStatus("dismissed");
  }

  /**
   * Get all accepted critiques.
   */
  async getAcceptedCritiques(): Promise<Critique[]> {
    return this.getCritiquesByStatus("accepted");
  }

  // ============================================================================
  // Query Operations - By Severity
  // ============================================================================

  /**
   * Get all critiques by severity.
   */
  async getCritiquesBySeverity(severity: CritiqueSeverity): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.severity === severity);

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(...critiques.filter((c) => c.severity === severity));
    }

    return results;
  }

  /**
   * Get all critical critiques.
   */
  async getCriticalCritiques(): Promise<Critique[]> {
    return this.getCritiquesBySeverity("critical");
  }

  /**
   * Get all serious critiques.
   */
  async getSeriousCritiques(): Promise<Critique[]> {
    return this.getCritiquesBySeverity("serious");
  }

  // ============================================================================
  // Query Operations - By Target
  // ============================================================================

  /**
   * Get all critiques targeting a specific entity.
   */
  async getCritiquesForTarget(
    targetType: CritiqueTargetType,
    targetId?: string,
  ): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => {
      if (e.targetType !== targetType) return false;
      if (targetId !== undefined && e.targetId !== targetId) return false;
      return true;
    });

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(
        ...critiques.filter((c) => {
          if (c.targetType !== targetType) return false;
          if (targetId !== undefined && c.targetId !== targetId) return false;
          return true;
        }),
      );
    }

    return results;
  }

  /**
   * Get all critiques targeting a specific hypothesis.
   */
  async getCritiquesForHypothesis(hypothesisId: string): Promise<Critique[]> {
    return this.getCritiquesForTarget("hypothesis", hypothesisId);
  }

  /**
   * Get all critiques targeting a specific test.
   */
  async getCritiquesForTest(testId: string): Promise<Critique[]> {
    return this.getCritiquesForTarget("test", testId);
  }

  /**
   * Get all critiques targeting a specific assumption.
   */
  async getCritiquesForAssumption(assumptionId: string): Promise<Critique[]> {
    return this.getCritiquesForTarget("assumption", assumptionId);
  }

  /**
   * Get all framing critiques.
   */
  async getFramingCritiques(): Promise<Critique[]> {
    return this.getCritiquesForTarget("framing");
  }

  /**
   * Get all methodology critiques.
   */
  async getMethodologyCritiques(): Promise<Critique[]> {
    return this.getCritiquesForTarget("methodology");
  }

  // ============================================================================
  // Query Operations - Combined Filters
  // ============================================================================

  /**
   * Get active critiques for a specific target (unaddressed critiques).
   */
  async getActiveCritiquesForTarget(
    targetType: CritiqueTargetType,
    targetId?: string,
  ): Promise<Critique[]> {
    const all = await this.getCritiquesForTarget(targetType, targetId);
    return all.filter((c) => c.status === "active");
  }

  /**
   * Get serious or critical active critiques (blocking critiques).
   */
  async getBlockingCritiques(): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.status === "active" && (e.severity === "serious" || e.severity === "critical"),
    );

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(
        ...critiques.filter(
          (c) => c.status === "active" && (c.severity === "serious" || c.severity === "critical"),
        ),
      );
    }

    return results;
  }

  /**
   * Get critiques with proposed alternatives.
   */
  async getCritiquesWithAlternatives(): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.hasProposedAlternative);

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(...critiques.filter((c) => !!c.proposedAlternative));
    }

    return results;
  }

  /**
   * Get critiques raised by a specific agent.
   */
  async getCritiquesByAgent(agentName: string): Promise<Critique[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.raisedBy === agentName);

    const results: Critique[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const critiques = await this.loadSessionCritiques(sessionId);
      results.push(...critiques.filter((c) => c.raisedBy === agentName));
    }

    return results;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get critique statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<CritiqueStatus, number>;
    bySeverity: Record<CritiqueSeverity, number>;
    byTargetType: Record<CritiqueTargetType, number>;
    withAlternatives: number;
    sessionsWithCritiques: number;
  }> {
    const index = await this.loadIndex();

    const byStatus: Record<CritiqueStatus, number> = {
      active: 0,
      addressed: 0,
      dismissed: 0,
      accepted: 0,
    };

    const bySeverity: Record<CritiqueSeverity, number> = {
      minor: 0,
      moderate: 0,
      serious: 0,
      critical: 0,
    };

    const byTargetType: Record<CritiqueTargetType, number> = {
      hypothesis: 0,
      test: 0,
      assumption: 0,
      framing: 0,
      methodology: 0,
    };

    for (const entry of index.entries) {
      byStatus[entry.status]++;
      bySeverity[entry.severity]++;
      byTargetType[entry.targetType]++;
    }

    const sessionsWithCritiques = new Set(index.entries.map((e) => e.sessionId)).size;
    const withAlternatives = index.entries.filter((e) => e.hasProposedAlternative).length;

    return {
      total: index.entries.length,
      byStatus,
      bySeverity,
      byTargetType,
      withAlternatives,
      sessionsWithCritiques,
    };
  }

  /**
   * Get count of unaddressed critiques for a specific target.
   */
  async getUnaddressedCount(
    targetType: CritiqueTargetType,
    targetId?: string,
  ): Promise<{
    total: number;
    bySeverity: Record<CritiqueSeverity, number>;
  }> {
    const active = await this.getActiveCritiquesForTarget(targetType, targetId);

    const bySeverity: Record<CritiqueSeverity, number> = {
      minor: 0,
      moderate: 0,
      serious: 0,
      critical: 0,
    };

    for (const critique of active) {
      bySeverity[critique.severity]++;
    }

    return {
      total: active.length,
      bySeverity,
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all critiques across all sessions.
   */
  async getAllCritiques(): Promise<Critique[]> {
    const critiquesDir = getCritiquesDir(this.baseDir);
    const results: Critique[] = [];

    try {
      const files = await fs.readdir(critiquesDir);

      for (const file of files) {
        if (!file.endsWith("-critiques.json")) continue;
        const sessionId = file.replace(/-critiques\.json$/, "");
        results.push(...(await this.loadSessionCritiques(sessionId)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have critiques.
   */
  async listSessions(): Promise<string[]> {
    const critiquesDir = getCritiquesDir(this.baseDir);

    try {
      const files = await fs.readdir(critiquesDir);
      return files
        .filter((f) => f.endsWith("-critiques.json"))
        .map((f) => {
          // Extract session ID from filename
          const match = f.match(/^(.+)-critiques\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get targets with the most unaddressed critiques.
   * Returns a list sorted by number of unaddressed critiques.
   */
  async getTargetsUnderAttack(): Promise<
    Array<{
      targetType: CritiqueTargetType;
      targetId: string | undefined;
      unaddressedCount: number;
      criticalCount: number;
      seriousCount: number;
    }>
  > {
    const index = await this.loadIndex();
    const activeCritiques = index.entries.filter((e) => e.status === "active");

    // Group by target
    const targetMap = new Map<
      string,
      {
        targetType: CritiqueTargetType;
        targetId: string | undefined;
        unaddressedCount: number;
        criticalCount: number;
        seriousCount: number;
      }
    >();

    for (const entry of activeCritiques) {
      const key = `${entry.targetType}:${entry.targetId ?? ""}`;
      const existing = targetMap.get(key) ?? {
        targetType: entry.targetType,
        targetId: entry.targetId,
        unaddressedCount: 0,
        criticalCount: 0,
        seriousCount: 0,
      };

      existing.unaddressedCount++;
      if (entry.severity === "critical") existing.criticalCount++;
      if (entry.severity === "serious") existing.seriousCount++;

      targetMap.set(key, existing);
    }

    // Sort by unaddressed count descending
    return Array.from(targetMap.values()).sort((a, b) => b.unaddressedCount - a.unaddressedCount);
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const critiqueStorage = new CritiqueStorage();
