import { promises as fs } from "fs";
import { join } from "path";
import {
  type ProgramStatus,
  type ResearchProgram,
  ResearchProgramSchema,
} from "../schemas/research-program";
import { withFileLock } from "./file-lock";

/**
 * Research Program Storage Layer
 *
 * File-based storage for research program records with indexing.
 * Unlike session-based registries, programs are stored in a single file
 * since they aggregate across sessions.
 *
 * Storage structure:
 * .research/
 * └── programs/
 *     ├── programs.json           # All programs
 *     └── program-index.json      # Quick lookup index
 *
 * @see brenner_bot-2qyl (bead)
 */

// ============================================================================
// Constants
// ============================================================================

const RESEARCH_DIR = ".research";
const PROGRAMS_DIR = "programs";
const PROGRAMS_FILE = "programs.json";
const INDEX_FILE = "program-index.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Programs file format.
 */
export interface ProgramsFile {
  version: string;
  createdAt: string;
  updatedAt: string;
  programs: ResearchProgram[];
}

/**
 * Index entry for quick lookups.
 */
export interface ProgramIndexEntry {
  id: string;
  name: string;
  status: ProgramStatus;
  sessionCount: number;
  sessions: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Full index file format.
 */
export interface ProgramIndex {
  version: string;
  updatedAt: string;
  entries: ProgramIndexEntry[];
}

/**
 * Storage configuration.
 */
export interface ProgramStorageConfig {
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

function getProgramsDir(baseDir: string): string {
  return join(getResearchDir(baseDir), PROGRAMS_DIR);
}

function getProgramsFilePath(baseDir: string): string {
  return join(getProgramsDir(baseDir), PROGRAMS_FILE);
}

function getIndexPath(baseDir: string): string {
  return join(getProgramsDir(baseDir), INDEX_FILE);
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
  await ensureDir(getProgramsDir(baseDir));
}

// ============================================================================
// Storage Class
// ============================================================================

/**
 * Research Program storage manager.
 * Provides CRUD operations and indexing for programs.
 */
export class ProgramStorage {
  private baseDir: string;
  private autoRebuildIndex: boolean;

  constructor(config: ProgramStorageConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.autoRebuildIndex = config.autoRebuildIndex ?? true;
  }

  // ============================================================================
  // Programs File Operations
  // ============================================================================

  /**
   * Load all programs.
   */
  async loadPrograms(): Promise<ResearchProgram[]> {
    const filePath = getProgramsFilePath(this.baseDir);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      let data: ProgramsFile;
      try {
        data = JSON.parse(content) as ProgramsFile;
      } catch {
        console.warn(`[ProgramStorage] Corrupted JSON in ${filePath}; returning empty programs.`);
        return [];
      }

      if (!Array.isArray(data.programs)) {
        console.warn(
          `[ProgramStorage] Malformed programs file ${filePath}; returning empty programs.`,
        );
        return [];
      }

      const parsed: ResearchProgram[] = [];
      for (const raw of data.programs) {
        try {
          parsed.push(ResearchProgramSchema.parse(raw));
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
   * Save all programs.
   */
  async savePrograms(programs: ResearchProgram[]): Promise<void> {
    await withFileLock(this.baseDir, "programs", async () => {
      await this.saveProgramsUnlocked(programs);
    });
  }

  private async saveProgramsUnlocked(programs: ResearchProgram[]): Promise<void> {
    await ensureStorageStructure(this.baseDir);

    const filePath = getProgramsFilePath(this.baseDir);
    const now = new Date().toISOString();

    // Check if file exists for createdAt
    let createdAt = now;
    try {
      const existing = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(existing) as ProgramsFile;
      createdAt = data.createdAt;
    } catch {
      // New file
    }

    const data: ProgramsFile = {
      version: "1.0.0",
      createdAt,
      updatedAt: now,
      programs,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    if (this.autoRebuildIndex) {
      await this.rebuildIndexUnlocked();
    }
  }

  // ============================================================================
  // Individual Program Operations
  // ============================================================================

  /**
   * Get a specific program by ID.
   */
  async getProgramById(id: string): Promise<ResearchProgram | null> {
    const programs = await this.loadPrograms();
    return programs.find((p) => p.id === id) ?? null;
  }

  /**
   * Create or update a program.
   */
  async saveProgram(program: ResearchProgram): Promise<void> {
    await withFileLock(this.baseDir, "programs", async () => {
      const programs = await this.loadPrograms();
      const existingIndex = programs.findIndex((p) => p.id === program.id);

      if (existingIndex >= 0) {
        programs[existingIndex] = program;
      } else {
        programs.push(program);
      }

      await this.saveProgramsUnlocked(programs);
    });
  }

  /**
   * Delete a program by ID.
   */
  async deleteProgram(id: string): Promise<boolean> {
    return await withFileLock(this.baseDir, "programs", async () => {
      const programs = await this.loadPrograms();
      const newPrograms = programs.filter((p) => p.id !== id);

      if (newPrograms.length === programs.length) {
        return false;
      }

      await this.saveProgramsUnlocked(newPrograms);
      return true;
    });
  }

  // ============================================================================
  // Index Operations
  // ============================================================================

  /**
   * Rebuild the program index.
   */
  async rebuildIndex(): Promise<ProgramIndex> {
    return await withFileLock(this.baseDir, "programs", async () => {
      return await this.rebuildIndexUnlocked();
    });
  }

  private async rebuildIndexUnlocked(): Promise<ProgramIndex> {
    const programs = await this.loadPrograms();

    const entries: ProgramIndexEntry[] = programs.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      sessionCount: p.sessions.length,
      sessions: p.sessions,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const index: ProgramIndex = {
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
      entries,
    };

    await ensureStorageStructure(this.baseDir);
    await fs.writeFile(getIndexPath(this.baseDir), JSON.stringify(index, null, 2));

    return index;
  }

  /**
   * Load the index (or rebuild if missing).
   */
  async loadIndex(): Promise<ProgramIndex> {
    const indexPath = getIndexPath(this.baseDir);

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(content) as ProgramIndex;
      if (!parsed || !Array.isArray(parsed.entries)) {
        throw new Error("Malformed program index");
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
   * Get all programs by status.
   */
  async getProgramsByStatus(status: ProgramStatus): Promise<ResearchProgram[]> {
    const programs = await this.loadPrograms();
    return programs.filter((p) => p.status === status);
  }

  /**
   * Get all active programs.
   */
  async getActivePrograms(): Promise<ResearchProgram[]> {
    return this.getProgramsByStatus("active");
  }

  /**
   * Get programs that contain a specific session.
   */
  async getProgramsForSession(sessionId: string): Promise<ResearchProgram[]> {
    const programs = await this.loadPrograms();
    return programs.filter((p) => p.sessions.includes(sessionId));
  }

  /**
   * Check if a session is in any program.
   */
  async isSessionInProgram(sessionId: string): Promise<boolean> {
    const programs = await this.getProgramsForSession(sessionId);
    return programs.length > 0;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get program statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ProgramStatus, number>;
    totalSessions: number;
    avgSessionsPerProgram: number;
  }> {
    const programs = await this.loadPrograms();

    const byStatus: Record<ProgramStatus, number> = {
      active: 0,
      paused: 0,
      completed: 0,
      abandoned: 0,
    };

    let totalSessions = 0;

    for (const program of programs) {
      byStatus[program.status]++;
      totalSessions += program.sessions.length;
    }

    return {
      total: programs.length,
      byStatus,
      totalSessions,
      avgSessionsPerProgram: programs.length > 0 ? totalSessions / programs.length : 0,
    };
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  /**
   * List all program IDs.
   */
  async listProgramIds(): Promise<string[]> {
    const programs = await this.loadPrograms();
    return programs.map((p) => p.id);
  }

  /**
   * List all session IDs across all programs.
   */
  async listAllSessions(): Promise<string[]> {
    const programs = await this.loadPrograms();
    const allSessions = new Set<string>();
    for (const program of programs) {
      for (const session of program.sessions) {
        allSessions.add(session);
      }
    }
    return Array.from(allSessions);
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default storage instance using current working directory.
 */
export const programStorage = new ProgramStorage();
