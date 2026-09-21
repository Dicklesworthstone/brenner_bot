/**
 * Domain Templates Module
 *
 * Provides domain-specific configuration for the Brenner Loop system.
 * Different research fields have different common confounds, effect size norms,
 * and research designs - this module encapsulates that domain knowledge.
 *
 * @example
 * ```typescript
 * import { getDomainTemplate, listDomainOptions } from "@/lib/brenner-loop/domains";
 *
 * // Get all domains for selection UI
 * const options = listDomainOptions();
 *
 * // Get full template for a domain
 * const psych = getDomainTemplate("psychology");
 * console.log(psych.confoundLibrary);
 * ```
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 */

// Re-export templates and utilities
export {
  biologyMedicineTemplate,
  computerScienceTemplate,
  customDomainTemplate,
  DOMAIN_TEMPLATES,
  economicsTemplate,
  epidemiologyTemplate,
  getDomainConfounds,
  getDomainQuoteTags,
  getDomainTemplate,
  listDomainOptions,
  neuroscienceTemplate,
  physicsTemplate,
  psychologyTemplate,
} from "./templates";
// Re-export types
export type {
  CommonLevelSplits,
  ConfoundLookupResult,
  DomainConfound,
  DomainId,
  DomainOption,
  DomainTemplate,
  EffectSizeNorms,
  GlossaryEntry,
  LiteratureSource,
  ResearchDesign,
  SessionDomainContext,
} from "./types";
