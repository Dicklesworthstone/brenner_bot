import { promises as fs } from "fs";
import { join } from "path";
import {
  aggregateInterventions,
  type InterventionSeverity,
  type InterventionSummary,
  type InterventionType,
  type OperatorIntervention,
  OperatorInterventionSchema,
} from "../schemas/operator-intervention";

/**
 * Operator Intervention Storage Layer
 *
 * File-based storage for operator intervention audit trail records.
 * Enables reproducibility verification and learning from human overrides.
 *
 * Storage structure:
 * .research/
 * ├── interventions/
 * │   ├── RS-20251230-interventions.json
 * │   └── ...
 * └── intervention-index.json
 *
 * @see operator-intervention.ts
 * @see brenner_bot-mqg7 (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const INTERVENTIONS_DIR = "interventions";
const INDEX_FILE = "intervention-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Session file format for interventions.
 */
export interface SessionInterventionFile {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  interventions: OperatorIntervention[];
}

/**
 * Index entry for quick lookups.
 */
export interface InterventionIndexEntry {
  id: string;
  sessionId: string;
  type: InterventionType;
  severity: InterventionSeverity;
  operatorId: string;
  timestamp: string;
  reversible: boolean;
  reversed: boolean;
}

export interface StorageWarning {
  file: string;
  message: string;
}

/**
 * Full index file format.
 */
export interface InterventionIndex {
  version: string;
  updatedAt: string;
  entries: InterventionIndexEntry[];
  warnings?: StorageWarning[];
}

/**
 * Storage configuration.
 */
export interface InterventionStorageConfig {
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

function getInterventionsDir(baseDir: string): string {
  return join(getResearchDir(baseDir), INTERVENTIONS_DIR);
}

function getIndexPath(baseDir: string): string {
  return join(getResearchDir(baseDir), INDEX_FILE);
}

function getSessionFilePath(baseDir: string, sessionId: string): string {
  // Allow '.' because bead/thread IDs often contain dots (e.g. brenner_bot-5so.10.2.2).
  // Only strip characters that are path separators or otherwise unsafe in filenames.
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(getInterventionsDir(baseDir), `${sanitized}-interventions.json`);
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
  await ensureDir(getInterventionsDir(baseDir));
}

// ============================================================================
// In-process Locking
// ============================================================================

const INTERVENTION_STORAGE_LOCKS = new Map<string, Promise<void>>();

async function withInterventionStorageLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = INTERVENTION_STORAGE_LOCKS.get(key) ?? Promise.resolve();
  const safePrev = prev.catch(() => {});

  let result: T | undefined;
  let didThrow = false;
  let error: unknown;

  const next = safePrev.then(async () => {
    try {
      result = await fn();
    } catch (err) {
      didThrow = true;
      error = err;
    }
  });

  INTERVENTION_STORAGE_LOCKS.set(key, next);

  await next;

  if (INTERVENTION_STORAGE_LOCKS.get(key) === next) {
    INTERVENTION_STORAGE_LOCKS.delete(key);
  }

  if (didThrow) {
    throw error;
  }

  return result as T;
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Operator Intervention storage manager.
 * Provides CRUD operations and indexing for intervention audit records.
 */
export class InterventionStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: InterventionStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  private lockKey(): string {
    return `intervention-storage:${this.baseDir}`;
  }

  // ============================================================================
  // Session File Operations
  // ============================================================================

  /**
   * Load interventions for a specific session.
   */
  async loadSessionInterventions(sessionId: string): Promise<OperatorIntervention[]> {
    const filePath = getSessionFilePath(this.baseDir, sessionId);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      let data: SessionInterventionFile;
      try {
        data = JSON.parse(content) as SessionInterventionFile;
      } catch {
        console.warn(
          `[InterventionStorage] Corrupted JSON in ${filePath}; returning empty interventions.`,
        );
        return [];
      }

      if (!Array.isArray(data.interventions)) {
        console.warn(
          `[InterventionStorage] Malformed session file ${filePath}; returning empty interventions.`,
        );
        return [];
      }

      const parsed: OperatorIntervention[] = [];
      for (const raw of data.interventions) {
        try {
          parsed.push(OperatorInterventionSchema.parse(raw));
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
   * Save interventions for a specific session.
   */
  async saveSessionInterventions(
    sessionId: string,
    interventions: OperatorIntervention[],
  ): Promise<void> {
    await withInterventionStorageLock(this.lockKey(), async () => {
      await this.saveSessionInterventionsUnlocked(sessionId, interventions);
    });
  }

  private async saveSessionInterventionsUnlocked(
    sessionId: string,
    interventions: OperatorIntervention[],
  ): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getSessionFilePath(this.baseDir, sessionId);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as SessionInterventionFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: SessionInterventionFile = {
      sessionId,
      createdAt,
      updatedAt: now,
      interventions,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.updateIndexForSessionUnlocked(sessionId, interventions);
    }
  }

  private async updateIndexForSessionUnlocked(
    sessionId: string,
    interventions: OperatorIntervention[],
  ): Promise<void> {
    const indexPath = getIndexPath(this.baseDir);
    let index: InterventionIndex;

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(content) as InterventionIndex;
    } catch {
      await this.rebuildIndexUnlocked();
      return;
    }

    const otherEntries = index.entries.filter((e) => e.sessionId !== sessionId);

    const newEntries: InterventionIndexEntry[] = interventions.map((i) => ({
      id: i.id,
      sessionId: i.session_id,
      type: i.type,
      severity: i.severity,
      operatorId: i.operator_id,
      timestamp: i.timestamp,
      reversible: i.reversible,
      reversed: Boolean(i.reversed_at),
    }));

    index.entries = [...otherEntries, ...newEntries];
    index.updatedAt = new Date().toISOString();

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  // ============================================================================
  // Individual Intervention Operations
  // ============================================================================

  /**
   * Get a specific intervention by ID.
   * ID format: INT-{sessionId}-{seq} or INT{n}
   */
  async getInterventionById(id: string): Promise<OperatorIntervention | null> {
    // Extract session ID from intervention ID (INT-{sessionId}-{seq})
    const match = id.match(/^INT-(.+)-\d+$/);
    if (match) {
      const sessionId = match[1];
      const interventions = await this.loadSessionInterventions(sessionId);
      return interventions.find((i) => i.id === id) ?? null;
    }

    // Fallback: simple ID or unknown session
    const simpleMatch = id.match(/^INT\d+$/);
    if (simpleMatch) {
      const allInterventions = await this.getAllInterventions();
      return allInterventions.find((i) => i.id === id) ?? null;
    }

    return null;
  }

  /**
   * Create or update an intervention.
   */
  async saveIntervention(intervention: OperatorIntervention): Promise<void> {
    await withInterventionStorageLock(this.lockKey(), async () => {
      const interventions = await this.loadSessionInterventions(intervention.session_id);
      const existingIndex = interventions.findIndex((i) => i.id === intervention.id);

      if (existingIndex >= 0) {
        interventions[existingIndex] = intervention;
      } else {
        interventions.push(intervention);
      }

      await this.saveSessionInterventionsUnlocked(intervention.session_id, interventions);
    });
  }

  /**
   * Delete an intervention by ID.
   */
  async deleteIntervention(id: string): Promise<boolean> {
    return await withInterventionStorageLock(this.lockKey(), async () => {
      // Optimization: Try to extract session ID from ID
      const match = id.match(/^INT-(.+)-\d+$/);
      if (match) {
        const sessionId = match[1];
        const interventions = await this.loadSessionInterventions(sessionId);
        const newInterventions = interventions.filter((i) => i.id !== id);

        if (newInterventions.length === interventions.length) {
          return false;
        }

        await this.saveSessionInterventionsUnlocked(sessionId, newInterventions);
        return true;
      }

      // Fallback
      const intervention = await this.getInterventionById(id);
      if (!intervention) {
        return false;
      }

      const interventions = await this.loadSessionInterventions(intervention.session_id);
      const newInterventions = interventions.filter((i) => i.id !== id);

      if (newInterventions.length === interventions.length) {
        return false;
      }

      await this.saveSessionInterventionsUnlocked(intervention.session_id, newInterventions);
      return true;
    });
  }

  /**
   * Get the next sequence number for a session.
   */
  async getNextSequence(sessionId: string): Promise<number> {
    const interventions = await this.loadSessionInterventions(sessionId);
    return interventions.length + 1;
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the cross-session index.
   */
  async rebuildIndex(): Promise<InterventionIndex> {
    return await withInterventionStorageLock(this.lockKey(), async () => {
      return await this.rebuildIndexUnlocked();
    });
  }

  private async rebuildIndexUnlocked(): Promise<InterventionIndex> {
    const entries: InterventionIndexEntry[] = [];
    const warnings: StorageWarning[] = [];
    const interventionsDir = getInterventionsDir(this.baseDir);

    try {
      const files = await fs.readdir(interventionsDir);

      for (const file of files) {
        if (!file.endsWith("-interventions.json")) continue;

        const filePath = join(interventionsDir, file);
        const content = await fs.readFile(filePath, "utf-8");

        let data: SessionInterventionFile;
        try {
          data = JSON.parse(content) as SessionInterventionFile;
        } catch {
          warnings.push({ file: filePath, message: "Skipping malformed JSON session file." });
          continue;
        }

        if (!Array.isArray(data.interventions)) {
          warnings.push({
            file: filePath,
            message: "Skipping malformed session file (missing interventions[]).",
          });
          continue;
        }

        let invalidCount = 0;
        for (const intervention of data.interventions) {
          try {
            const parsed = OperatorInterventionSchema.parse(intervention);
            entries.push({
              id: parsed.id,
              sessionId: parsed.session_id,
              type: parsed.type,
              severity: parsed.severity,
              operatorId: parsed.operator_id,
              timestamp: parsed.timestamp,
              reversible: parsed.reversible,
              reversed: Boolean(parsed.reversed_at),
            });
          } catch {
            invalidCount += 1;
          }
        }

        if (invalidCount > 0) {
          warnings.push({
            file: filePath,
            message: `Skipped ${invalidCount} invalid interventions.`,
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const index: InterventionIndex = {
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
  async loadIndex(): Promise<InterventionIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(content) as InterventionIndex;
      if (!parsed || !Array.isArray(parsed.entries)) {
        throw new Error("Malformed intervention index");
      }
      return parsed;
    } catch {
      return await this.rebuildIndex();
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all interventions by severity.
   */
  async getInterventionsBySeverity(
    severity: InterventionSeverity,
  ): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.severity === severity);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.severity === severity));
    }

    return results;
  }

  /**
   * Get all interventions by type.
   */
  async getInterventionsByType(type: InterventionType): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.type === type);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.type === type));
    }

    return results;
  }

  /**
   * Get all interventions by operator.
   */
  async getInterventionsByOperator(operatorId: string): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.operatorId === operatorId);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => i.operator_id === operatorId));
    }

    return results;
  }

  /**
   * Get all major+ interventions (major or critical severity).
   */
  async getMajorInterventions(): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.severity === "major" || e.severity === "critical",
    );

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(
        ...interventions.filter((i) => i.severity === "major" || i.severity === "critical"),
      );
    }

    return results;
  }

  /**
   * Get all reversed interventions.
   */
  async getReversedInterventions(): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter((e) => e.reversed);

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(...interventions.filter((i) => Boolean(i.reversed_at)));
    }

    return results;
  }

  // ============================================================================
  // Aggregation Operations
  // ============================================================================

  /**
   * Get intervention summary for a session.
   */
  async getSessionSummary(sessionId: string): Promise<InterventionSummary> {
    const interventions = await this.loadSessionInterventions(sessionId);
    return aggregateInterventions(interventions);
  }

  /**
   * Get intervention summary for all sessions (program-level).
   */
  async getProgramSummary(): Promise<InterventionSummary> {
    const allInterventions = await this.getAllInterventions();
    return aggregateInterventions(allInterventions);
  }

  /**
   * Check if a session is "clean" (no major+ interventions).
   */
  async isCleanSession(sessionId: string): Promise<boolean> {
    const summary = await this.getSessionSummary(sessionId);
    return !summary.has_major_interventions;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get intervention statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    bySeverity: Record<InterventionSeverity, number>;
    byType: Record<InterventionType, number>;
    reversed: number;
    sessionsWithInterventions: number;
    operators: string[];
  }> {
    const index = await this.loadIndex();

    const bySeverity: Record<InterventionSeverity, number> = {
      minor: 0,
      moderate: 0,
      major: 0,
      critical: 0,
    };

    const byType: Record<InterventionType, number> = {
      artifact_edit: 0,
      delta_exclusion: 0,
      delta_injection: 0,
      decision_override: 0,
      session_control: 0,
      role_reassignment: 0,
    };

    let reversed = 0;
    const operators = new Set<string>();

    for (const entry of index.entries) {
      bySeverity[entry.severity]++;
      byType[entry.type]++;
      if (entry.reversed) {
        reversed++;
      }
      operators.add(entry.operatorId);
    }

    const sessionsWithInterventions = new Set(index.entries.map((e) => e.sessionId)).size;

    return {
      total: index.entries.length,
      bySeverity,
      byType,
      reversed,
      sessionsWithInterventions,
      operators: Array.from(operators).sort(),
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all interventions across all sessions.
   */
  async getAllInterventions(): Promise<OperatorIntervention[]> {
    const interventionsDir = getInterventionsDir(this.baseDir);
    const results: OperatorIntervention[] = [];

    try {
      const files = await fs.readdir(interventionsDir);

      for (const file of files) {
        if (!file.endsWith("-interventions.json")) continue;
        const sessionId = file.replace(/-interventions\.json$/, "");
        results.push(...(await this.loadSessionInterventions(sessionId)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    return results;
  }

  /**
   * List all session IDs that have interventions.
   */
  async listSessions(): Promise<string[]> {
    const interventionsDir = getInterventionsDir(this.baseDir);

    try {
      const files = await fs.readdir(interventionsDir);
      return files
        .filter((f) => f.endsWith("-interventions.json"))
        .map((f) => {
          const match = f.match(/^(.+)-interventions\.json$/);
          return match ? match[1] : null;
        })
        .filter((s): s is string => s !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get interventions within a time range.
   */
  async getInterventionsInRange(
    startTime: string,
    endTime: string,
  ): Promise<OperatorIntervention[]> {
    const index = await this.loadIndex();
    const matching = index.entries.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime,
    );

    const results: OperatorIntervention[] = [];
    const sessionIds = [...new Set(matching.map((e) => e.sessionId))];

    for (const sessionId of sessionIds) {
      const interventions = await this.loadSessionInterventions(sessionId);
      results.push(
        ...interventions.filter((i) => i.timestamp >= startTime && i.timestamp <= endTime),
      );
    }

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const interventionStorage = new InterventionStorage();
