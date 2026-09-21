import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createResearchProgram, ResearchProgramSchema } from "../schemas/research-program";
import { ProgramStorage } from "./program-storage";

describe("ProgramStorage", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = join(tmpdir(), `program-storage-test-${randomUUID()}`);
    await fs.mkdir(baseDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory to avoid inode exhaustion
    if (baseDir) {
      await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  const makeProgram = (
    overrides: Partial<{
      id: string;
      name: string;
      description: string;
      sessions: string[];
      status: "active" | "paused" | "completed" | "abandoned";
    }> = {},
  ) =>
    ResearchProgramSchema.parse({
      ...createResearchProgram({
        id: overrides.id ?? "RP-CELL-FATE-001",
        name: overrides.name ?? "Cell fate program",
        description: overrides.description ?? "A program for testing storage behavior.",
        sessions: overrides.sessions ?? ["RS-20251230-demo"],
      }),
      ...(overrides.status ? { status: overrides.status } : {}),
    });

  it("loads empty list when programs file does not exist", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });
    const programs = await storage.loadPrograms();
    expect(Array.isArray(programs)).toBe(true);
    expect(programs).toHaveLength(0);
  });

  it("saves and loads programs with schema validation", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: true });
    const program = makeProgram();

    await storage.savePrograms([program]);

    const loaded = await storage.loadPrograms();
    expect(loaded).toHaveLength(1);
    const [firstProgram] = loaded;
    expect(firstProgram?.id).toBe(program.id);

    const index = await storage.rebuildIndex();
    expect(index.entries).toHaveLength(1);
    const [firstEntry] = index.entries;
    expect(firstEntry?.sessionCount).toBe(1);
  });

  it("loadIndex rebuilds if program-index.json is malformed", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });
    const program = makeProgram();
    await storage.savePrograms([program]);

    const indexPath = join(baseDir, ".research", "programs", "program-index.json");
    await fs.writeFile(indexPath, "not-json");

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  it("saveProgram upserts by id and deleteProgram returns boolean", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: true });

    const p1 = makeProgram({ id: "RP-CELL-FATE-001", name: "Program 1" });
    await storage.saveProgram(p1);
    expect((await storage.getProgramById(p1.id))?.name).toBe("Program 1");

    const p1Updated = makeProgram({ id: "RP-CELL-FATE-001", name: "Program 1 updated" });
    await storage.saveProgram(p1Updated);
    expect((await storage.getProgramById(p1.id))?.name).toBe("Program 1 updated");

    const deletedMissing = await storage.deleteProgram("RP-DOES-NOT-EXIST-001");
    expect(deletedMissing).toBe(false);

    const deleted = await storage.deleteProgram(p1.id);
    expect(deleted).toBe(true);
    expect(await storage.getProgramById(p1.id)).toBeNull();
  });

  it("preserves createdAt when saving programs multiple times", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });

    await storage.savePrograms([makeProgram({ id: "RP-CELL-FATE-001", name: "One" })]);

    const programsPath = join(baseDir, ".research", "programs", "programs.json");
    const first = JSON.parse(await fs.readFile(programsPath, "utf-8")) as {
      createdAt: string;
      updatedAt: string;
    };

    await new Promise((r) => setTimeout(r, 5));
    await storage.savePrograms([makeProgram({ id: "RP-CELL-FATE-001", name: "One updated" })]);

    const second = JSON.parse(await fs.readFile(programsPath, "utf-8")) as {
      createdAt: string;
      updatedAt: string;
    };
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(second.createdAt);
  });

  it("autoRebuildIndex=false does not write program-index.json during savePrograms", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });
    await storage.savePrograms([makeProgram({ id: "RP-CELL-FATE-001", name: "One" })]);

    const indexPath = join(baseDir, ".research", "programs", "program-index.json");
    const exists = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it("loadPrograms returns empty list for malformed JSON", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });
    await fs.mkdir(join(baseDir, ".research", "programs"), { recursive: true });
    await fs.writeFile(join(baseDir, ".research", "programs", "programs.json"), "not-json");

    const loaded = await storage.loadPrograms();
    expect(loaded).toEqual([]);

    const index = await storage.rebuildIndex();
    expect(index.entries).toEqual([]);
  });

  it("supports query helpers and statistics", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });

    await storage.savePrograms([
      makeProgram({ id: "RP-CELL-FATE-001", status: "active", sessions: ["RS-S1", "RS-S2"] }),
      makeProgram({ id: "RP-CELL-FATE-002", status: "paused", sessions: ["RS-S2"] }),
    ]);

    expect((await storage.getActivePrograms()).map((p) => p.id)).toEqual(["RP-CELL-FATE-001"]);
    expect((await storage.getProgramsByStatus("paused")).map((p) => p.id)).toEqual([
      "RP-CELL-FATE-002",
    ]);
    expect((await storage.getProgramsForSession("RS-S2")).map((p) => p.id).sort()).toEqual([
      "RP-CELL-FATE-001",
      "RP-CELL-FATE-002",
    ]);
    expect(await storage.isSessionInProgram("RS-S2")).toBe(true);
    expect(await storage.isSessionInProgram("RS-S999")).toBe(false);

    const ids = await storage.listProgramIds();
    expect(ids.sort()).toEqual(["RP-CELL-FATE-001", "RP-CELL-FATE-002"]);

    const allSessions = await storage.listAllSessions();
    expect(allSessions.sort()).toEqual(["RS-S1", "RS-S2"]);

    const stats = await storage.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.byStatus.active).toBe(1);
    expect(stats.byStatus.paused).toBe(1);
    expect(stats.totalSessions).toBe(3);
    expect(stats.avgSessionsPerProgram).toBe(1.5);
  });

  it("concurrent saveProgram calls do not drop writes", async () => {
    const storage = new ProgramStorage({ baseDir, autoRebuildIndex: false });

    const programs = Array.from({ length: 10 }, (_, i) =>
      makeProgram({
        id: `RP-CONCURRENT-${String(i + 1).padStart(3, "0")}`,
        name: `Program ${i + 1}`,
      }),
    );

    await Promise.all(programs.map((p) => storage.saveProgram(p)));

    const loaded = await storage.loadPrograms();
    expect(loaded).toHaveLength(programs.length);

    const loadedIds = loaded.map((p) => p.id).sort();
    const expectedIds = programs.map((p) => p.id).sort();
    expect(loadedIds).toEqual(expectedIds);
  });
});
