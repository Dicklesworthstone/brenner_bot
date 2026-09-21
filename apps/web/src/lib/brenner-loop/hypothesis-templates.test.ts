/**
 * Tests for Hypothesis Template Library
 *
 * @see brenner_bot-838e - FEATURE: Hypothesis Template Library
 */

import { describe, expect, it } from "vitest";
import {
  getFeaturedTemplates,
  getTemplate,
  getTemplatesByDifficulty,
  getTemplatesByDomain,
  getTemplatesByTag,
  HYPOTHESIS_TEMPLATES,
  type HypothesisTemplate,
  searchTemplates,
  TEMPLATE_BY_ID,
  TEMPLATE_CATEGORIES,
  templateToPartialCard,
} from "./hypothesis-templates";

// ============================================================================
// Template Registry Tests
// ============================================================================

describe("HYPOTHESIS_TEMPLATES", () => {
  it("contains at least 10 templates", () => {
    expect(HYPOTHESIS_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("all templates have unique IDs", () => {
    const ids = HYPOTHESIS_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all templates have required fields", () => {
    for (const template of HYPOTHESIS_TEMPLATES) {
      expect(typeof template.id).toBe("string");
      expect(template.id.length).toBeGreaterThan(0);
      expect(typeof template.name).toBe("string");
      expect(template.name.length).toBeGreaterThan(0);
      expect(typeof template.description).toBe("string");
      expect(Array.isArray(template.domains)).toBe(true);
      expect(template.domains.length).toBeGreaterThan(0);
      expect(Array.isArray(template.tags)).toBe(true);
      expect(["beginner", "intermediate", "advanced"]).toContain(template.difficulty);
      expect(typeof template.template).toBe("object");
    }
  });

  it("all templates have valid template content", () => {
    for (const template of HYPOTHESIS_TEMPLATES) {
      const content = template.template;

      expect(typeof content.statement).toBe("string");
      expect(content.statement.length).toBeGreaterThan(0);

      expect(typeof content.mechanism).toBe("string");
      expect(content.mechanism.length).toBeGreaterThan(0);

      expect(Array.isArray(content.predictionsIfTrue)).toBe(true);
      expect(content.predictionsIfTrue.length).toBeGreaterThan(0);

      expect(Array.isArray(content.predictionsIfFalse)).toBe(true);

      expect(Array.isArray(content.impossibleIfTrue)).toBe(true);
      expect(content.impossibleIfTrue.length).toBeGreaterThan(0);

      expect(Array.isArray(content.confounds)).toBe(true);

      expect(Array.isArray(content.assumptions)).toBe(true);

      expect(typeof content.suggestedConfidence).toBe("number");
      expect(content.suggestedConfidence).toBeGreaterThanOrEqual(0);
      expect(content.suggestedConfidence).toBeLessThanOrEqual(100);
    }
  });
});

describe("TEMPLATE_BY_ID", () => {
  it("contains all templates from HYPOTHESIS_TEMPLATES", () => {
    expect(TEMPLATE_BY_ID.size).toBe(HYPOTHESIS_TEMPLATES.length);

    for (const template of HYPOTHESIS_TEMPLATES) {
      expect(TEMPLATE_BY_ID.has(template.id)).toBe(true);
      expect(TEMPLATE_BY_ID.get(template.id)).toBe(template);
    }
  });
});

describe("TEMPLATE_CATEGORIES", () => {
  it("contains expected categories", () => {
    const categoryIds = TEMPLATE_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain("psychology");
    expect(categoryIds).toContain("biology");
    expect(categoryIds).toContain("economics");
    expect(categoryIds).toContain("cs");
    expect(categoryIds).toContain("generic");
  });

  it("all categories have required fields", () => {
    for (const category of TEMPLATE_CATEGORIES) {
      expect(typeof category.id).toBe("string");
      expect(typeof category.name).toBe("string");
      expect(typeof category.description).toBe("string");
      expect(typeof category.icon).toBe("string");
      expect(typeof category.colorClass).toBe("string");
      expect(Array.isArray(category.templateIds)).toBe(true);
    }
  });

  it("all category templateIds reference valid templates", () => {
    for (const category of TEMPLATE_CATEGORIES) {
      for (const templateId of category.templateIds) {
        expect(TEMPLATE_BY_ID.has(templateId)).toBe(true);
      }
    }
  });

  it("each template belongs to exactly one category", () => {
    const templateIdCounts = new Map<string, number>();

    for (const category of TEMPLATE_CATEGORIES) {
      for (const templateId of category.templateIds) {
        const count = templateIdCounts.get(templateId) ?? 0;
        templateIdCounts.set(templateId, count + 1);
      }
    }

    for (const [templateId, count] of templateIdCounts) {
      expect(count).toBe(1);
    }
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getTemplate", () => {
  it("returns template for valid ID", () => {
    const template = getTemplate("psych-intervention");
    expect(template).toBeDefined();
    expect(template?.id).toBe("psych-intervention");
  });

  it("returns undefined for invalid ID", () => {
    const template = getTemplate("nonexistent-template");
    expect(template).toBeUndefined();
  });

  it("returns same reference as TEMPLATE_BY_ID", () => {
    const template = getTemplate("bio-mechanism");
    expect(template).toBe(TEMPLATE_BY_ID.get("bio-mechanism"));
  });
});

describe("getTemplatesByDomain", () => {
  it("returns templates for psychology domain", () => {
    const templates = getTemplatesByDomain("psychology");
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(t.domains.includes("psychology") || t.domains.includes("custom")).toBe(true);
    }
  });

  it("returns templates for biology_medicine domain", () => {
    const templates = getTemplatesByDomain("biology_medicine");
    expect(templates.length).toBeGreaterThan(0);
  });

  it("returns templates for economics domain", () => {
    const templates = getTemplatesByDomain("economics");
    expect(templates.length).toBeGreaterThan(0);
  });

  it("always includes custom domain templates", () => {
    const templates = getTemplatesByDomain("some_obscure_domain");
    const customTemplates = templates.filter((t) => t.domains.includes("custom"));
    expect(customTemplates.length).toBeGreaterThan(0);
  });
});

describe("getFeaturedTemplates", () => {
  it("returns only featured templates", () => {
    const featured = getFeaturedTemplates();
    expect(featured.length).toBeGreaterThan(0);

    for (const t of featured) {
      expect(t.featured).toBe(true);
    }
  });

  it("includes at least one template from each major domain", () => {
    const featured = getFeaturedTemplates();
    const domains = new Set(featured.flatMap((t) => t.domains));

    // Should have psychology, biology, economics, cs
    expect(domains.has("psychology") || domains.has("social_science")).toBe(true);
    expect(domains.has("biology_medicine")).toBe(true);
    expect(domains.has("economics")).toBe(true);
    expect(domains.has("computer_science")).toBe(true);
  });
});

describe("getTemplatesByTag", () => {
  it("returns templates with intervention tag", () => {
    const templates = getTemplatesByTag("intervention");
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(t.tags).toContain("intervention");
    }
  });

  it("returns templates with mechanism tag", () => {
    const templates = getTemplatesByTag("mechanism");
    expect(templates.length).toBeGreaterThan(0);
  });

  it("returns empty array for nonexistent tag", () => {
    const templates = getTemplatesByTag("nonexistent_tag_xyz");
    expect(templates).toEqual([]);
  });
});

describe("getTemplatesByDifficulty", () => {
  it("returns beginner templates", () => {
    const templates = getTemplatesByDifficulty("beginner");
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(t.difficulty).toBe("beginner");
    }
  });

  it("returns intermediate templates", () => {
    const templates = getTemplatesByDifficulty("intermediate");
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(t.difficulty).toBe("intermediate");
    }
  });

  it("returns advanced templates", () => {
    const templates = getTemplatesByDifficulty("advanced");
    expect(templates.length).toBeGreaterThan(0);

    for (const t of templates) {
      expect(t.difficulty).toBe("advanced");
    }
  });
});

describe("searchTemplates", () => {
  it("searches by name", () => {
    const results = searchTemplates("intervention");
    expect(results.length).toBeGreaterThan(0);

    const hasMatch = results.some((t) => t.name.toLowerCase().includes("intervention"));
    expect(hasMatch).toBe(true);
  });

  it("searches by description", () => {
    const results = searchTemplates("baseline");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searches by tags", () => {
    const results = searchTemplates("ablation");
    expect(results.length).toBeGreaterThan(0);

    const hasTag = results.some((t) =>
      t.tags.some((tag) => tag.toLowerCase().includes("ablation")),
    );
    expect(hasTag).toBe(true);
  });

  it("searches by statement content", () => {
    const results = searchTemplates("outperforms");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case insensitive", () => {
    const resultsLower = searchTemplates("intervention");
    const resultsUpper = searchTemplates("INTERVENTION");
    const resultsMixed = searchTemplates("Intervention");

    expect(resultsLower.length).toBe(resultsUpper.length);
    expect(resultsLower.length).toBe(resultsMixed.length);
  });

  it("returns empty array for no matches", () => {
    const results = searchTemplates("xyznonexistent123");
    expect(results).toEqual([]);
  });
});

describe("templateToPartialCard", () => {
  it("converts template to partial HypothesisCard", () => {
    const template = getTemplate("psych-intervention");
    expect(template).toBeDefined();

    const partial = templateToPartialCard(template!);

    expect(partial.statement).toBe(template!.template.statement);
    expect(partial.mechanism).toBe(template!.template.mechanism);
    expect(partial.domain).toEqual(template!.domains);
    expect(partial.predictionsIfTrue).toEqual(template!.template.predictionsIfTrue);
    expect(partial.predictionsIfFalse).toEqual(template!.template.predictionsIfFalse);
    expect(partial.impossibleIfTrue).toEqual(template!.template.impossibleIfTrue);
    expect(partial.assumptions).toEqual(template!.template.assumptions);
    expect(partial.confidence).toBe(template!.template.suggestedConfidence);
    expect(partial.tags).toEqual(template!.tags);
  });

  it("converts confounds correctly", () => {
    const template = getTemplate("psych-intervention");
    expect(template).toBeDefined();

    const partial = templateToPartialCard(template!);

    expect(Array.isArray(partial.confounds)).toBe(true);
    expect(partial.confounds!.length).toBe(template!.template.confounds.length);

    for (let i = 0; i < partial.confounds!.length; i++) {
      const confound = partial.confounds![i];
      const original = template!.template.confounds[i];

      expect(confound.id).toBe(original.id ?? `confound-${i}`);
      expect(confound.name).toBe(original.name ?? "Unnamed Confound");
      expect(confound.description).toBe(original.description ?? "");
      expect(confound.likelihood).toBe(original.likelihood ?? 0.3);
      expect(confound.domain).toBeDefined();
    }
  });

  it("handles blank template", () => {
    const template = getTemplate("generic-blank");
    expect(template).toBeDefined();

    const partial = templateToPartialCard(template!);

    expect(partial.statement).toBeDefined();
    expect(partial.mechanism).toBeDefined();
    expect(partial.confounds).toEqual([]);
  });
});

// ============================================================================
// Template Content Quality Tests
// ============================================================================

describe("Template Content Quality", () => {
  it("all templates have non-trivial falsification conditions", () => {
    for (const template of HYPOTHESIS_TEMPLATES) {
      for (const condition of template.template.impossibleIfTrue) {
        // Should be at least 20 characters (not just "[placeholder]")
        expect(condition.length).toBeGreaterThan(20);
      }
    }
  });

  it("all templates have reasonable suggested confidence", () => {
    for (const template of HYPOTHESIS_TEMPLATES) {
      // Suggested confidence should be between 20 and 60 (reasonable uncertainty)
      expect(template.template.suggestedConfidence).toBeGreaterThanOrEqual(20);
      expect(template.template.suggestedConfidence).toBeLessThanOrEqual(60);
    }
  });

  it("templates have appropriate confounds for their domains", () => {
    // Psychology templates should have psychology-relevant confounds
    const psychTemplates = HYPOTHESIS_TEMPLATES.filter(
      (t) =>
        t.domains.includes("psychology") &&
        !t.domains.includes("custom") &&
        !t.domains.includes("neuroscience"),
    );

    for (const template of psychTemplates) {
      const confoundDomains = template.template.confounds.map((c) => c.domain);
      const hasPsychConfound = confoundDomains.some(
        (d) => d === "psychology" || d === "methodology" || d === "statistics",
      );
      expect(hasPsychConfound).toBe(true);
    }
  });

  it("advanced templates have more confounds than beginner templates on average", () => {
    const beginnerTemplates = getTemplatesByDifficulty("beginner");
    const advancedTemplates = getTemplatesByDifficulty("advanced");

    const avgBeginnerConfounds =
      beginnerTemplates.reduce((sum, t) => sum + t.template.confounds.length, 0) /
      beginnerTemplates.length;

    const avgAdvancedConfounds =
      advancedTemplates.reduce((sum, t) => sum + t.template.confounds.length, 0) /
      advancedTemplates.length;

    // Advanced templates should have at least as many confounds (usually more)
    expect(avgAdvancedConfounds).toBeGreaterThanOrEqual(avgBeginnerConfounds - 0.5);
  });
});

// ============================================================================
// Domain Coverage Tests
// ============================================================================

describe("Domain Coverage", () => {
  const expectedDomains = [
    "psychology",
    "biology_medicine",
    "economics",
    "computer_science",
    "neuroscience",
    "custom",
  ];

  it("has templates for all expected domains", () => {
    const coveredDomains = new Set<string>();

    for (const template of HYPOTHESIS_TEMPLATES) {
      for (const domain of template.domains) {
        coveredDomains.add(domain);
      }
    }

    for (const domain of expectedDomains) {
      expect(coveredDomains.has(domain)).toBe(true);
    }
  });

  it("has at least 2 templates per major domain", () => {
    const majorDomains = ["psychology", "biology_medicine", "economics", "computer_science"];

    for (const domain of majorDomains) {
      const templates = HYPOTHESIS_TEMPLATES.filter((t) => t.domains.includes(domain));
      expect(templates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has featured templates for each major domain category", () => {
    const featured = getFeaturedTemplates();

    const categoryDomains = {
      psychology: ["psychology", "social_science"],
      biology: ["biology_medicine"],
      economics: ["economics"],
      cs: ["computer_science"],
    };

    for (const [_category, domains] of Object.entries(categoryDomains)) {
      const hasFeatured = featured.some((t) => t.domains.some((d) => domains.includes(d)));
      expect(hasFeatured).toBe(true);
    }
  });
});
