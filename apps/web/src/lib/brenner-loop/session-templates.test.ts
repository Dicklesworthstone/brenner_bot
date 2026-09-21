/**
 * Tests for Session Templates
 *
 * @see brenner_bot-reew.7 - FEATURE: Session Templates
 */

import { describe, expect, it } from "vitest";
import {
  AGENT_ROLE_INFO,
  createTemplateSettings,
  customizeTemplateSettings,
  getActivePhases,
  getAgentRoleDescription,
  getAgentRoleName,
  getEffectiveAgents,
  getEffectivePhases,
  getFeaturedSessionTemplates,
  getPhaseOrderForTemplate,
  getSessionTemplate,
  getSortedSessionTemplates,
  getTemplateForTimeConstraint,
  getTemplatesByDepth,
  isPhaseEnabled,
  isPhaseOptional,
  isPhaseRequired,
  isPhaseSkipped,
  SESSION_TEMPLATES,
  type SessionTemplate,
  TEMPLATE_BY_ID,
  validateTemplate,
} from "./session-templates";

// ============================================================================
// Template Registry Tests
// ============================================================================

describe("SESSION_TEMPLATES", () => {
  it("contains at least 5 templates", () => {
    expect(SESSION_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("all templates have unique IDs", () => {
    const ids = SESSION_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all templates have required fields", () => {
    for (const template of SESSION_TEMPLATES) {
      expect(typeof template.id).toBe("string");
      expect(template.id.length).toBeGreaterThan(0);
      expect(typeof template.name).toBe("string");
      expect(template.name.length).toBeGreaterThan(0);
      expect(typeof template.description).toBe("string");
      expect(typeof template.icon).toBe("string");
      expect(typeof template.colorClass).toBe("string");
      expect(Array.isArray(template.requiredPhases)).toBe(true);
      expect(Array.isArray(template.optionalPhases)).toBe(true);
      expect(Array.isArray(template.skippedPhases)).toBe(true);
      expect(Array.isArray(template.defaultAgents)).toBe(true);
      expect(["quick", "standard", "deep"]).toContain(template.defaultDepth);
      expect(typeof template.expectedDuration).toBe("string");
      expect(Array.isArray(template.bestFor)).toBe(true);
      expect(typeof template.tagline).toBe("string");
      expect(typeof template.allowCustomization).toBe("boolean");
      expect(typeof template.displayOrder).toBe("number");
    }
  });

  it("all templates pass validation", () => {
    for (const template of SESSION_TEMPLATES) {
      const errors = validateTemplate(template);
      expect(errors).toEqual([]);
    }
  });

  it("intake phase is always required", () => {
    for (const template of SESSION_TEMPLATES) {
      expect(template.requiredPhases).toContain("intake");
    }
  });

  it("sharpening phase is always required", () => {
    for (const template of SESSION_TEMPLATES) {
      expect(template.requiredPhases).toContain("sharpening");
    }
  });

  it("no phase appears in multiple categories", () => {
    for (const template of SESSION_TEMPLATES) {
      const allPhases = [
        ...template.requiredPhases,
        ...template.optionalPhases,
        ...template.skippedPhases,
      ];
      const uniquePhases = new Set(allPhases);
      expect(uniquePhases.size).toBe(allPhases.length);
    }
  });
});

describe("TEMPLATE_BY_ID", () => {
  it("contains all templates", () => {
    expect(TEMPLATE_BY_ID.size).toBe(SESSION_TEMPLATES.length);
    for (const template of SESSION_TEMPLATES) {
      expect(TEMPLATE_BY_ID.has(template.id)).toBe(true);
      expect(TEMPLATE_BY_ID.get(template.id)).toBe(template);
    }
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getSessionTemplate", () => {
  it("returns template for valid ID", () => {
    const template = getSessionTemplate("quick-check");
    expect(template).toBeDefined();
    expect(template?.id).toBe("quick-check");
  });

  it("returns undefined for invalid ID", () => {
    const template = getSessionTemplate("nonexistent");
    expect(template).toBeUndefined();
  });

  it("returns same reference as TEMPLATE_BY_ID", () => {
    const template = getSessionTemplate("full-analysis");
    expect(template).toBe(TEMPLATE_BY_ID.get("full-analysis"));
  });
});

describe("getFeaturedSessionTemplates", () => {
  it("returns only featured templates", () => {
    const featured = getFeaturedSessionTemplates();
    expect(featured.length).toBeGreaterThan(0);

    for (const t of featured) {
      expect(t.featured).toBe(true);
    }
  });

  it("returns templates sorted by display order", () => {
    const featured = getFeaturedSessionTemplates();
    for (let i = 1; i < featured.length; i++) {
      expect(featured[i].displayOrder).toBeGreaterThanOrEqual(featured[i - 1].displayOrder);
    }
  });
});

describe("getSortedSessionTemplates", () => {
  it("returns all templates sorted by display order", () => {
    const sorted = getSortedSessionTemplates();
    expect(sorted.length).toBe(SESSION_TEMPLATES.length);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].displayOrder).toBeGreaterThanOrEqual(sorted[i - 1].displayOrder);
    }
  });
});

describe("getTemplatesByDepth", () => {
  it("returns templates with quick depth", () => {
    const templates = getTemplatesByDepth("quick");
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.defaultDepth).toBe("quick");
    }
  });

  it("returns templates with standard depth", () => {
    const templates = getTemplatesByDepth("standard");
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.defaultDepth).toBe("standard");
    }
  });

  it("returns templates with deep depth", () => {
    const templates = getTemplatesByDepth("deep");
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.defaultDepth).toBe("deep");
    }
  });
});

describe("getTemplateForTimeConstraint", () => {
  it("returns quick-check for 30 minutes or less", () => {
    expect(getTemplateForTimeConstraint(15).id).toBe("quick-check");
    expect(getTemplateForTimeConstraint(30).id).toBe("quick-check");
  });

  it("returns literature-review for 31-90 minutes", () => {
    expect(getTemplateForTimeConstraint(31).id).toBe("literature-review");
    expect(getTemplateForTimeConstraint(60).id).toBe("literature-review");
    expect(getTemplateForTimeConstraint(90).id).toBe("literature-review");
  });

  it("returns design-focus for 91-150 minutes", () => {
    expect(getTemplateForTimeConstraint(91).id).toBe("design-focus");
    expect(getTemplateForTimeConstraint(120).id).toBe("design-focus");
    expect(getTemplateForTimeConstraint(150).id).toBe("design-focus");
  });

  it("returns full-analysis for more than 150 minutes", () => {
    expect(getTemplateForTimeConstraint(151).id).toBe("full-analysis");
    expect(getTemplateForTimeConstraint(240).id).toBe("full-analysis");
  });
});

// ============================================================================
// Phase Helper Tests
// ============================================================================

describe("isPhaseRequired", () => {
  it("returns true for required phases", () => {
    const template = getSessionTemplate("full-analysis")!;
    expect(isPhaseRequired(template, "intake")).toBe(true);
    expect(isPhaseRequired(template, "sharpening")).toBe(true);
  });

  it("returns false for optional phases", () => {
    const template = getSessionTemplate("full-analysis")!;
    expect(isPhaseRequired(template, "evidence_gathering")).toBe(false);
  });
});

describe("isPhaseOptional", () => {
  it("returns true for optional phases", () => {
    const template = getSessionTemplate("full-analysis")!;
    expect(isPhaseOptional(template, "evidence_gathering")).toBe(true);
  });

  it("returns false for required phases", () => {
    const template = getSessionTemplate("full-analysis")!;
    expect(isPhaseOptional(template, "intake")).toBe(false);
  });
});

describe("isPhaseSkipped", () => {
  it("returns true for skipped phases", () => {
    const template = getSessionTemplate("quick-check")!;
    expect(isPhaseSkipped(template, "level_split")).toBe(true);
  });

  it("returns false for non-skipped phases", () => {
    const template = getSessionTemplate("quick-check")!;
    expect(isPhaseSkipped(template, "intake")).toBe(false);
  });
});

describe("isPhaseEnabled", () => {
  it("returns true for required and optional phases", () => {
    const template = getSessionTemplate("full-analysis")!;
    expect(isPhaseEnabled(template, "intake")).toBe(true);
    expect(isPhaseEnabled(template, "evidence_gathering")).toBe(true);
  });

  it("returns false for skipped phases", () => {
    const template = getSessionTemplate("quick-check")!;
    expect(isPhaseEnabled(template, "level_split")).toBe(false);
  });
});

describe("getActivePhases", () => {
  it("returns required and optional phases", () => {
    const template = getSessionTemplate("quick-check")!;
    const active = getActivePhases(template);

    expect(active).toContain("intake");
    expect(active).toContain("sharpening");
    expect(active).toContain("exclusion_test");
    expect(active).not.toContain("level_split");
  });
});

describe("getPhaseOrderForTemplate", () => {
  it("returns phases in correct order with status", () => {
    const template = getSessionTemplate("quick-check")!;
    const phases = getPhaseOrderForTemplate(template);

    expect(phases.length).toBe(11); // All 11 phases

    // Check first few phases
    expect(phases[0]).toEqual({ phase: "intake", status: "required" });
    expect(phases[1]).toEqual({ phase: "sharpening", status: "required" });

    // Check a skipped phase
    const levelSplit = phases.find((p) => p.phase === "level_split");
    expect(levelSplit?.status).toBe("skipped");

    // Check required phase
    const exclusionTest = phases.find((p) => p.phase === "exclusion_test");
    expect(exclusionTest?.status).toBe("required");
  });
});

// ============================================================================
// Settings Tests
// ============================================================================

describe("createTemplateSettings", () => {
  it("creates settings with template ID and timestamp", () => {
    const settings = createTemplateSettings("quick-check");

    expect(settings.templateId).toBe("quick-check");
    expect(settings.appliedAt).toBeDefined();
    expect(new Date(settings.appliedAt).getTime()).not.toBeNaN();
  });
});

describe("customizeTemplateSettings", () => {
  it("adds customized phases", () => {
    const settings = createTemplateSettings("quick-check");
    const customized = customizeTemplateSettings(settings, {
      required: ["intake", "sharpening"],
      optional: ["exclusion_test"],
      skipped: [],
    });

    expect(customized.customizedPhases).toBeDefined();
    expect(customized.customizedPhases?.required).toContain("intake");
    expect(customized.customizedPhases?.optional).toContain("exclusion_test");
  });

  it("adds customized agents", () => {
    const settings = createTemplateSettings("quick-check");
    const customized = customizeTemplateSettings(settings, undefined, [
      "devils_advocate",
      "experiment_designer",
    ]);

    expect(customized.customizedAgents).toBeDefined();
    expect(customized.customizedAgents).toContain("devils_advocate");
    expect(customized.customizedAgents).toContain("experiment_designer");
  });
});

describe("getEffectivePhases", () => {
  it("returns template phases when no customization", () => {
    const template = getSessionTemplate("quick-check")!;
    const effective = getEffectivePhases(template);

    expect(effective.required).toEqual(template.requiredPhases);
    expect(effective.optional).toEqual(template.optionalPhases);
    expect(effective.skipped).toEqual(template.skippedPhases);
  });

  it("returns customized phases when settings have them", () => {
    const template = getSessionTemplate("quick-check")!;
    const settings = customizeTemplateSettings(createTemplateSettings("quick-check"), {
      required: ["intake", "sharpening", "level_split"],
      optional: ["exclusion_test"],
      skipped: [],
    });

    const effective = getEffectivePhases(template, settings);

    expect(effective.required).toContain("level_split");
    expect(effective.optional).toContain("exclusion_test");
  });
});

describe("getEffectiveAgents", () => {
  it("returns template agents when no customization", () => {
    const template = getSessionTemplate("quick-check")!;
    const effective = getEffectiveAgents(template);

    expect(effective).toEqual(template.defaultAgents);
  });

  it("returns customized agents when settings have them", () => {
    const template = getSessionTemplate("quick-check")!;
    const settings = customizeTemplateSettings(createTemplateSettings("quick-check"), undefined, [
      "experiment_designer",
      "statistician",
    ]);

    const effective = getEffectiveAgents(template, settings);

    expect(effective).toContain("experiment_designer");
    expect(effective).toContain("statistician");
    expect(effective).not.toContain("devils_advocate");
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("validateTemplate", () => {
  it("returns empty array for valid templates", () => {
    for (const template of SESSION_TEMPLATES) {
      const errors = validateTemplate(template);
      expect(errors).toEqual([]);
    }
  });

  it("returns error when intake is not required", () => {
    const badTemplate: SessionTemplate = {
      ...SESSION_TEMPLATES[0],
      id: "bad-template",
      requiredPhases: ["sharpening"],
    };

    const errors = validateTemplate(badTemplate);
    expect(errors.some((e) => e.includes("Intake"))).toBe(true);
  });

  it("returns error when sharpening is not required", () => {
    const badTemplate: SessionTemplate = {
      ...SESSION_TEMPLATES[0],
      id: "bad-template",
      requiredPhases: ["intake"],
    };

    const errors = validateTemplate(badTemplate);
    expect(errors.some((e) => e.includes("Sharpening"))).toBe(true);
  });

  it("returns error for duplicate phases", () => {
    const badTemplate: SessionTemplate = {
      ...SESSION_TEMPLATES[0],
      id: "bad-template",
      requiredPhases: ["intake", "sharpening", "exclusion_test"],
      optionalPhases: ["exclusion_test"], // Duplicate!
      skippedPhases: [],
    };

    const errors = validateTemplate(badTemplate);
    expect(errors.some((e) => e.includes("exclusion_test"))).toBe(true);
  });
});

// ============================================================================
// Agent Role Helper Tests
// ============================================================================

describe("AGENT_ROLE_INFO", () => {
  it("has info for all expected roles", () => {
    expect(AGENT_ROLE_INFO.devils_advocate).toBeDefined();
    expect(AGENT_ROLE_INFO.experiment_designer).toBeDefined();
    expect(AGENT_ROLE_INFO.statistician).toBeDefined();
    expect(AGENT_ROLE_INFO.brenner_channeler).toBeDefined();
    expect(AGENT_ROLE_INFO.synthesis).toBeDefined();
  });

  it("all roles have name, description, and icon", () => {
    for (const role of Object.keys(AGENT_ROLE_INFO) as Array<keyof typeof AGENT_ROLE_INFO>) {
      const info = AGENT_ROLE_INFO[role];
      expect(typeof info.name).toBe("string");
      expect(info.name.length).toBeGreaterThan(0);
      expect(typeof info.description).toBe("string");
      expect(info.description.length).toBeGreaterThan(0);
      expect(typeof info.icon).toBe("string");
    }
  });
});

describe("getAgentRoleName", () => {
  it("returns human-readable name", () => {
    expect(getAgentRoleName("devils_advocate")).toBe("Devil's Advocate");
    expect(getAgentRoleName("experiment_designer")).toBe("Experiment Designer");
    expect(getAgentRoleName("statistician")).toBe("Statistician");
  });
});

describe("getAgentRoleDescription", () => {
  it("returns description", () => {
    const desc = getAgentRoleDescription("devils_advocate");
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Template-Specific Tests
// ============================================================================

describe("Template: Quick Check", () => {
  const template = getSessionTemplate("quick-check")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("has quick depth", () => {
    expect(template.defaultDepth).toBe("quick");
  });

  it("only uses devils_advocate by default", () => {
    expect(template.defaultAgents).toEqual(["devils_advocate"]);
  });

  it("skips most operator phases", () => {
    expect(template.skippedPhases).toContain("level_split");
    expect(template.skippedPhases).toContain("object_transpose");
    expect(template.skippedPhases).toContain("scale_check");
  });
});

describe("Template: Full Analysis", () => {
  const template = getSessionTemplate("full-analysis")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("has deep depth", () => {
    expect(template.defaultDepth).toBe("deep");
  });

  it("uses multiple agents", () => {
    expect(template.defaultAgents.length).toBeGreaterThan(1);
  });

  it("requires all operator phases", () => {
    expect(template.requiredPhases).toContain("level_split");
    expect(template.requiredPhases).toContain("exclusion_test");
    expect(template.requiredPhases).toContain("object_transpose");
    expect(template.requiredPhases).toContain("scale_check");
  });

  it("has no skipped phases", () => {
    expect(template.skippedPhases.length).toBe(0);
  });
});

describe("Template: Literature Review", () => {
  const template = getSessionTemplate("literature-review")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("does not dispatch agents by default", () => {
    expect(template.defaultAgents).toEqual([]);
  });

  it("requires evidence gathering (literature is a form of evidence)", () => {
    expect(template.requiredPhases).toContain("evidence_gathering");
  });
});

describe("Template: Design Focus", () => {
  const template = getSessionTemplate("design-focus")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("uses experiment_designer and statistician", () => {
    expect(template.defaultAgents).toContain("experiment_designer");
    expect(template.defaultAgents).toContain("statistician");
  });

  it("requires agent_dispatch", () => {
    expect(template.requiredPhases).toContain("agent_dispatch");
  });

  it("requires level_split", () => {
    expect(template.requiredPhases).toContain("level_split");
  });
});

describe("Template: Adversarial Deep Dive", () => {
  const template = getSessionTemplate("adversarial-deep-dive")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("has deep depth", () => {
    expect(template.defaultDepth).toBe("deep");
  });

  it("uses all tribunal agents", () => {
    expect(template.defaultAgents).toContain("devils_advocate");
    expect(template.defaultAgents).toContain("synthesis");
    expect(template.defaultAgents.length).toBe(5);
  });

  it("requires all operator phases", () => {
    expect(template.requiredPhases).toContain("level_split");
    expect(template.requiredPhases).toContain("exclusion_test");
    expect(template.requiredPhases).toContain("object_transpose");
    expect(template.requiredPhases).toContain("scale_check");
  });
});

describe("Template: Custom", () => {
  const template = getSessionTemplate("custom")!;

  it("exists", () => {
    expect(template).toBeDefined();
  });

  it("has high display order (last)", () => {
    expect(template.displayOrder).toBe(99);
  });

  it("is not featured", () => {
    expect(template.featured).toBeFalsy();
  });

  it("has no default agents", () => {
    expect(template.defaultAgents.length).toBe(0);
  });

  it("has most phases as optional", () => {
    expect(template.optionalPhases.length).toBeGreaterThan(template.requiredPhases.length);
  });
});
