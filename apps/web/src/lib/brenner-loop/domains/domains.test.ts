/**
 * Tests for Domain Templates Module
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 */

import { describe, expect, it } from "vitest";
import {
  biologyMedicineTemplate,
  computerScienceTemplate,
  DOMAIN_TEMPLATES,
  economicsTemplate,
  epidemiologyTemplate,
  getDomainConfounds,
  getDomainQuoteTags,
  getDomainTemplate,
  listDomainOptions,
  neuroscienceTemplate,
  psychologyTemplate,
} from "./index";
import type { DomainConfound, DomainId } from "./types";

// ============================================================================
// Template Registry Tests
// ============================================================================

describe("DOMAIN_TEMPLATES", () => {
  it("contains all expected domain templates", () => {
    const expectedDomains: DomainId[] = [
      "psychology",
      "epidemiology",
      "economics",
      "biology_medicine",
      "computer_science",
      "neuroscience",
      "physics",
      "custom",
    ];

    for (const domain of expectedDomains) {
      expect(DOMAIN_TEMPLATES[domain]).toBeDefined();
    }
  });

  it("each template has required fields", () => {
    for (const [id, template] of Object.entries(DOMAIN_TEMPLATES)) {
      expect(template.id).toBe(id);
      expect(typeof template.name).toBe("string");
      expect(typeof template.description).toBe("string");
      expect(typeof template.icon).toBe("string");
      expect(typeof template.colorClass).toBe("string");
      expect(Array.isArray(template.confoundLibrary)).toBe(true);
      expect(Array.isArray(template.researchDesigns)).toBe(true);
      expect(template.effectSizeNorms).toBeDefined();
      expect(Array.isArray(template.literatureSources)).toBe(true);
      expect(template.commonLevelSplits).toBeDefined();
      expect(Array.isArray(template.glossary)).toBe(true);
      expect(Array.isArray(template.relevantBrennerSections)).toBe(true);
      expect(Array.isArray(template.relevantQuoteTags)).toBe(true);
    }
  });
});

describe("getDomainTemplate", () => {
  it("returns correct template for each domain", () => {
    expect(getDomainTemplate("psychology")).toBe(psychologyTemplate);
    expect(getDomainTemplate("epidemiology")).toBe(epidemiologyTemplate);
    expect(getDomainTemplate("economics")).toBe(economicsTemplate);
    expect(getDomainTemplate("biology_medicine")).toBe(biologyMedicineTemplate);
    expect(getDomainTemplate("computer_science")).toBe(computerScienceTemplate);
    expect(getDomainTemplate("neuroscience")).toBe(neuroscienceTemplate);
  });

  it("returns custom template for unknown domains", () => {
    // @ts-expect-error - testing invalid input
    const result = getDomainTemplate("unknown_domain");
    expect(result.id).toBe("custom");
  });
});

describe("listDomainOptions", () => {
  it("returns array of domain options", () => {
    const options = listDomainOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
  });

  it("each option has required fields", () => {
    const options = listDomainOptions();
    for (const option of options) {
      expect(typeof option.id).toBe("string");
      expect(typeof option.name).toBe("string");
      expect(typeof option.description).toBe("string");
      expect(typeof option.icon).toBe("string");
      expect(typeof option.colorClass).toBe("string");
    }
  });

  it("excludes custom and incomplete templates", () => {
    const options = listDomainOptions();
    const ids = options.map((o) => o.id);
    expect(ids).not.toContain("custom");
    expect(ids).not.toContain("physics"); // Currently placeholder
  });
});

// ============================================================================
// Confound Library Tests
// ============================================================================

describe("getDomainConfounds", () => {
  it("returns all confounds for a domain", () => {
    const confounds = getDomainConfounds("psychology");
    expect(confounds.length).toBeGreaterThan(0);
    expect(confounds.length).toBe(psychologyTemplate.confoundLibrary.length);
  });

  it("filters by minimum likelihood", () => {
    const allConfounds = getDomainConfounds("psychology", 0);
    const highConfounds = getDomainConfounds("psychology", 0.4);

    expect(highConfounds.length).toBeLessThanOrEqual(allConfounds.length);
    for (const c of highConfounds) {
      expect(c.baseLikelihood).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("returns empty array for custom domain", () => {
    const confounds = getDomainConfounds("custom");
    expect(confounds).toEqual([]);
  });
});

// ============================================================================
// Individual Template Tests
// ============================================================================

describe("psychologyTemplate", () => {
  it("has psychology-specific confounds", () => {
    const confoundIds = psychologyTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("selection_bias");
    expect(confoundIds).toContain("demand_characteristics");
    expect(confoundIds).toContain("social_desirability");
    expect(confoundIds).toContain("experimenter_expectancy");
  });

  it("uses Cohen's d for effect sizes", () => {
    expect(psychologyTemplate.effectSizeNorms.metric).toBe("Cohen's d");
    expect(psychologyTemplate.effectSizeNorms.small).toBe(0.2);
    expect(psychologyTemplate.effectSizeNorms.medium).toBe(0.5);
    expect(psychologyTemplate.effectSizeNorms.large).toBe(0.8);
  });

  it("includes RCT in research designs", () => {
    const designIds = psychologyTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("rct");
  });
});

describe("epidemiologyTemplate", () => {
  it("has epidemiology-specific confounds", () => {
    const confoundIds = epidemiologyTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("healthy_user_bias");
    expect(confoundIds).toContain("confounding_by_indication");
    expect(confoundIds).toContain("immortal_time_bias");
    expect(confoundIds).toContain("surveillance_bias");
  });

  it("uses Odds Ratio for effect sizes", () => {
    expect(epidemiologyTemplate.effectSizeNorms.metric).toBe("Odds Ratio / Relative Risk");
    expect(epidemiologyTemplate.effectSizeNorms.large).toBe(2.0);
  });

  it("includes Mendelian randomization in research designs", () => {
    const designIds = epidemiologyTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("mendelian_randomization");
  });
});

describe("economicsTemplate", () => {
  it("has economics-specific confounds", () => {
    const confoundIds = economicsTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("omitted_variable");
    expect(confoundIds).toContain("simultaneity");
    expect(confoundIds).toContain("selection_into_treatment");
  });

  it("includes RDD and diff-in-diff in research designs", () => {
    const designIds = economicsTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("rdd");
    expect(designIds).toContain("diff_in_diff");
    expect(designIds).toContain("iv");
  });
});

describe("biologyMedicineTemplate", () => {
  it("has biology-specific confounds", () => {
    const confoundIds = biologyMedicineTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("batch_effects");
    expect(confoundIds).toContain("cell_line_drift");
    expect(confoundIds).toContain("off_target_effects");
    expect(confoundIds).toContain("antibody_nonspecificity");
  });

  it("uses Fold Change for effect sizes", () => {
    expect(biologyMedicineTemplate.effectSizeNorms.metric).toBe("Fold Change / Log2 Ratio");
  });

  it("includes rescue experiment in research designs", () => {
    const designIds = biologyMedicineTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("rescue_experiment");
    expect(designIds).toContain("perturbation_screen");
  });
});

describe("computerScienceTemplate", () => {
  it("has CS-specific confounds", () => {
    const confoundIds = computerScienceTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("data_leakage");
    expect(confoundIds).toContain("benchmark_overfitting");
    expect(confoundIds).toContain("compute_confound");
    expect(confoundIds).toContain("implementation_differences");
  });

  it("includes ablation study in research designs", () => {
    const designIds = computerScienceTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("ablation");
    expect(designIds).toContain("benchmark_suite");
  });
});

describe("neuroscienceTemplate", () => {
  it("has neuroscience-specific confounds", () => {
    const confoundIds = neuroscienceTemplate.confoundLibrary.map((c) => c.id);
    expect(confoundIds).toContain("motion_artifacts");
    expect(confoundIds).toContain("reverse_inference");
    expect(confoundIds).toContain("low_power");
    expect(confoundIds).toContain("double_dipping");
  });

  it("includes TMS in research designs", () => {
    const designIds = neuroscienceTemplate.researchDesigns.map((d) => d.id);
    expect(designIds).toContain("tms_causal");
    expect(designIds).toContain("multivariate_decoding");
  });
});

// ============================================================================
// Confound Structure Tests
// ============================================================================

describe("DomainConfound structure", () => {
  const allConfounds: DomainConfound[] = Object.values(DOMAIN_TEMPLATES).flatMap(
    (t) => t.confoundLibrary,
  );

  it("all confounds have valid structure", () => {
    for (const confound of allConfounds) {
      expect(typeof confound.id).toBe("string");
      expect(confound.id.length).toBeGreaterThan(0);
      expect(typeof confound.name).toBe("string");
      expect(confound.name.length).toBeGreaterThan(0);
      expect(typeof confound.description).toBe("string");
      expect(typeof confound.whenToCheck).toBe("string");
      expect(Array.isArray(confound.mitigationStrategies)).toBe(true);
      expect(confound.mitigationStrategies.length).toBeGreaterThan(0);
      expect(typeof confound.baseLikelihood).toBe("number");
      expect(confound.baseLikelihood).toBeGreaterThanOrEqual(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });

  it("confound IDs are unique within each domain", () => {
    for (const template of Object.values(DOMAIN_TEMPLATES)) {
      const ids = template.confoundLibrary.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });
});

// ============================================================================
// Research Design Structure Tests
// ============================================================================

describe("ResearchDesign structure", () => {
  const allDesigns = Object.values(DOMAIN_TEMPLATES).flatMap((t) => t.researchDesigns);

  it("all designs have valid structure", () => {
    for (const design of allDesigns) {
      expect(typeof design.id).toBe("string");
      expect(typeof design.name).toBe("string");
      expect(typeof design.description).toBe("string");
      expect(typeof design.discriminativePower).toBe("number");
      expect(design.discriminativePower).toBeGreaterThanOrEqual(1);
      expect(design.discriminativePower).toBeLessThanOrEqual(10);
      expect(["high", "medium", "low"]).toContain(design.feasibility);
      expect(typeof design.exampleUse).toBe("string");
      expect(Array.isArray(design.addressesConfounds)).toBe(true);
      expect(Array.isArray(design.vulnerableTo)).toBe(true);
    }
  });
});

// ============================================================================
// Quote Tag Integration Tests
// ============================================================================

describe("getDomainQuoteTags", () => {
  it("returns relevant tags for each domain", () => {
    const psychTags = getDomainQuoteTags("psychology");
    expect(psychTags).toContain("falsification");
    expect(psychTags).toContain("confounds");

    const epiTags = getDomainQuoteTags("epidemiology");
    expect(epiTags).toContain("measurement");
    expect(epiTags).toContain("mechanism");
  });

  it("all tags are non-empty strings", () => {
    for (const domain of Object.keys(DOMAIN_TEMPLATES) as DomainId[]) {
      const tags = getDomainQuoteTags(domain);
      for (const tag of tags) {
        expect(typeof tag).toBe("string");
        expect(tag.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// Effect Size Norms Tests
// ============================================================================

describe("EffectSizeNorms", () => {
  it("all templates have valid effect size norms", () => {
    for (const template of Object.values(DOMAIN_TEMPLATES)) {
      const norms = template.effectSizeNorms;
      expect(typeof norms.metric).toBe("string");
      expect(typeof norms.small).toBe("number");
      expect(typeof norms.medium).toBe("number");
      expect(typeof norms.large).toBe("number");
      expect(typeof norms.typicalDescription).toBe("string");

      // Small < medium < large (for most metrics)
      // Note: For OR, values are > 1, so this still holds
      expect(norms.small).toBeLessThan(norms.medium);
      expect(norms.medium).toBeLessThan(norms.large);
    }
  });
});

// ============================================================================
// Literature Source Tests
// ============================================================================

describe("LiteratureSource", () => {
  const allSources = Object.values(DOMAIN_TEMPLATES)
    .filter((t) => t.id !== "custom" && t.id !== "physics")
    .flatMap((t) => t.literatureSources);

  it("all sources have valid structure", () => {
    for (const source of allSources) {
      expect(typeof source.name).toBe("string");
      expect(typeof source.url).toBe("string");
      expect(source.url.startsWith("http")).toBe(true);
      expect(typeof source.searchTips).toBe("string");
      expect(["primary", "secondary"]).toContain(source.priority);
    }
  });

  it("each domain has at least one primary source", () => {
    for (const template of Object.values(DOMAIN_TEMPLATES)) {
      if (template.id === "custom" || template.id === "physics") continue;
      const primarySources = template.literatureSources.filter((s) => s.priority === "primary");
      expect(primarySources.length).toBeGreaterThan(0);
    }
  });
});
