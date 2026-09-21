import { describe, expect, it } from "vitest";
import {
  applyPreset,
  BUILT_IN_PRESETS,
  DEFAULT_3_AGENT_PRESET,
  findPreset,
  formatRosterAsMarkdown,
  getAgentsByRole,
  getRosterEntry,
  parseRosterJson,
  type Roster,
  type RosterEntry,
  validateRoster,
  validateRosterCoverage,
} from "./roster";

describe("validateRoster", () => {
  it("accepts a valid roster", () => {
    const roster: Roster = {
      entries: [
        { agentName: "BlueLake", role: "hypothesis_generator" },
        { agentName: "PurpleMountain", role: "test_designer" },
      ],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects empty roster", () => {
    const roster: Roster = { entries: [] };
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Roster must have at least one entry");
  });

  it("rejects duplicate agents", () => {
    const roster: Roster = {
      entries: [
        { agentName: "BlueLake", role: "hypothesis_generator" },
        { agentName: "BlueLake", role: "test_designer" },
      ],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Duplicate agent in roster: BlueLake");
  });

  it("allows duplicate roles", () => {
    const roster: Roster = {
      entries: [
        { agentName: "BlueLake", role: "hypothesis_generator" },
        { agentName: "RedSky", role: "hypothesis_generator" },
      ],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid roles", () => {
    const roster: Roster = {
      entries: [{ agentName: "BlueLake", role: "researcher" as unknown as RosterEntry["role"] }],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid role for BlueLake: researcher");
  });

  it("rejects empty agent names", () => {
    const roster: Roster = {
      entries: [{ agentName: "", role: "hypothesis_generator" }],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Roster entry has empty agentName");
  });

  it("warns on deprecated heuristic mode", () => {
    const roster: Roster = {
      mode: "heuristic",
      entries: [{ agentName: "BlueLake", role: "hypothesis_generator" }],
    };
    const result = validateRoster(roster);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Heuristic roster mode is deprecated. Use explicit role mappings.",
    );
  });
});

describe("validateRosterCoverage", () => {
  it("accepts when all recipients have entries", () => {
    const roster: Roster = {
      entries: [
        { agentName: "BlueLake", role: "hypothesis_generator" },
        { agentName: "PurpleMountain", role: "test_designer" },
      ],
    };
    const result = validateRosterCoverage(roster, ["BlueLake", "PurpleMountain"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects when recipient is missing from roster", () => {
    const roster: Roster = {
      entries: [{ agentName: "BlueLake", role: "hypothesis_generator" }],
    };
    const result = validateRosterCoverage(roster, ["BlueLake", "GreenValley"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing roster entry for recipient: GreenValley");
  });

  it("allows extra roster entries", () => {
    const roster: Roster = {
      entries: [
        { agentName: "BlueLake", role: "hypothesis_generator" },
        { agentName: "PurpleMountain", role: "test_designer" },
        { agentName: "GreenValley", role: "adversarial_critic" },
      ],
    };
    const result = validateRosterCoverage(roster, ["BlueLake"]);
    expect(result.valid).toBe(true);
  });
});

describe("getRosterEntry", () => {
  const roster: Roster = {
    entries: [
      { agentName: "BlueLake", role: "hypothesis_generator", program: "codex-cli" },
      { agentName: "PurpleMountain", role: "test_designer" },
    ],
  };

  it("returns entry for existing agent", () => {
    const entry = getRosterEntry(roster, "BlueLake");
    expect(entry).toEqual({
      agentName: "BlueLake",
      role: "hypothesis_generator",
      program: "codex-cli",
    });
  });

  it("returns undefined for missing agent", () => {
    const entry = getRosterEntry(roster, "GreenValley");
    expect(entry).toBeUndefined();
  });
});

describe("getAgentsByRole", () => {
  const roster: Roster = {
    entries: [
      { agentName: "BlueLake", role: "hypothesis_generator" },
      { agentName: "RedSky", role: "hypothesis_generator" },
      { agentName: "PurpleMountain", role: "test_designer" },
    ],
  };

  it("returns all agents with the specified role", () => {
    const agents = getAgentsByRole(roster, "hypothesis_generator");
    expect(agents).toEqual(["BlueLake", "RedSky"]);
  });

  it("returns empty array when no agents have the role", () => {
    const agents = getAgentsByRole(roster, "adversarial_critic");
    expect(agents).toEqual([]);
  });
});

describe("formatRosterAsMarkdown", () => {
  it("formats roster as markdown table", () => {
    const roster: Roster = {
      mode: "role_separated",
      name: "Test Roster",
      entries: [
        {
          agentName: "BlueLake",
          role: "hypothesis_generator",
          program: "codex-cli",
          model: "GPT-5",
        },
        { agentName: "PurpleMountain", role: "test_designer" },
      ],
    };
    const md = formatRosterAsMarkdown(roster);

    expect(md).toContain("## Session Configuration");
    expect(md).toContain("**Roster Mode**: role_separated");
    expect(md).toContain("**Roster Name**: Test Roster");
    expect(md).toContain("| BlueLake | hypothesis_generator | codex-cli | GPT-5 |");
    expect(md).toContain("| PurpleMountain | test_designer | - | - |");
  });

  it("defaults mode to role_separated", () => {
    const roster: Roster = {
      entries: [{ agentName: "BlueLake", role: "hypothesis_generator" }],
    };
    const md = formatRosterAsMarkdown(roster);
    expect(md).toContain("**Roster Mode**: role_separated");
  });
});

describe("parseRosterJson", () => {
  it("parses array of entries", () => {
    const json = JSON.stringify([{ agentName: "BlueLake", role: "hypothesis_generator" }]);
    const roster = parseRosterJson(json);
    expect(roster.entries).toHaveLength(1);
    expect(roster.mode).toBe("role_separated");
  });

  it("parses full roster object", () => {
    const json = JSON.stringify({
      mode: "unified",
      entries: [{ agentName: "BlueLake", role: "hypothesis_generator" }],
    });
    const roster = parseRosterJson(json);
    expect(roster.mode).toBe("unified");
    expect(roster.entries).toHaveLength(1);
  });
});

describe("applyPreset", () => {
  it("applies preset to agent names", () => {
    const roster = applyPreset(DEFAULT_3_AGENT_PRESET, [
      "BlueLake",
      "PurpleMountain",
      "GreenValley",
    ]);

    expect(roster.entries).toHaveLength(3);
    expect(roster.entries[0]).toMatchObject({
      agentName: "BlueLake",
      role: "hypothesis_generator",
    });
    expect(roster.entries[1]).toMatchObject({
      agentName: "PurpleMountain",
      role: "test_designer",
    });
    expect(roster.entries[2]).toMatchObject({
      agentName: "GreenValley",
      role: "adversarial_critic",
    });
  });

  it("handles more agents than preset entries", () => {
    const roster = applyPreset(DEFAULT_3_AGENT_PRESET, [
      "A",
      "B",
      "C",
      "D", // Extra agent
    ]);

    expect(roster.entries).toHaveLength(4);
    // Fourth agent gets first role
    expect(roster.entries[3].role).toBe("hypothesis_generator");
  });

  it("sets roster name from preset", () => {
    const roster = applyPreset(DEFAULT_3_AGENT_PRESET, ["A"]);
    expect(roster.name).toBe("Default 3-Agent Setup");
  });
});

describe("findPreset", () => {
  it("finds built-in preset by ID", () => {
    const preset = findPreset("default-3-agent");
    expect(preset).toBeDefined();
    expect(preset?.name).toBe("Default 3-Agent Setup");
  });

  it("returns undefined for unknown preset", () => {
    const preset = findPreset("nonexistent");
    expect(preset).toBeUndefined();
  });

  it("finds custom preset when provided", () => {
    const customPreset = {
      id: "custom",
      name: "Custom Preset",
      entries: [{ role: "hypothesis_generator" as const }],
    };
    const preset = findPreset("custom", [customPreset]);
    expect(preset).toBeDefined();
    expect(preset?.name).toBe("Custom Preset");
  });
});

describe("BUILT_IN_PRESETS", () => {
  it("includes default-3-agent preset", () => {
    const ids = BUILT_IN_PRESETS.map((p) => p.id);
    expect(ids).toContain("default-3-agent");
  });

  it("includes hypothesis-critique preset", () => {
    const ids = BUILT_IN_PRESETS.map((p) => p.id);
    expect(ids).toContain("hypothesis-critique");
  });
});
