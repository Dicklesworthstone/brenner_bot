/**
 * Tutorial Domain Examples
 *
 * Worked examples showing the Brenner Loop structure applied across domains.
 *
 * @see brenner_bot-8i1c
 */

import { BIOLOGY_CELL_FATE_EXAMPLE } from "./biology-cell-fate";
import { CS_LLM_HALLUCINATION_EXAMPLE } from "./cs-llm-hallucination";
import { SOCIAL_COMMUNITY_TOXICITY_EXAMPLE } from "./social-community-toxicity";
import type { TutorialDomainExample, TutorialExampleDomain } from "./types";

export type { TutorialDomainExample, TutorialExampleDomain } from "./types";

export {
  BIOLOGY_CELL_FATE_EXAMPLE,
  CS_LLM_HALLUCINATION_EXAMPLE,
  SOCIAL_COMMUNITY_TOXICITY_EXAMPLE,
};

export const TUTORIAL_DOMAIN_EXAMPLES: TutorialDomainExample[] = [
  BIOLOGY_CELL_FATE_EXAMPLE,
  CS_LLM_HALLUCINATION_EXAMPLE,
  SOCIAL_COMMUNITY_TOXICITY_EXAMPLE,
];

export function getAllTutorialDomainExamples(): TutorialDomainExample[] {
  return TUTORIAL_DOMAIN_EXAMPLES;
}

export function getTutorialDomainExample(slug: string): TutorialDomainExample | undefined {
  return TUTORIAL_DOMAIN_EXAMPLES.find((ex) => ex.slug === slug);
}

export function getTutorialDomainExamplesByDomain(
  domain: TutorialExampleDomain,
): TutorialDomainExample[] {
  return TUTORIAL_DOMAIN_EXAMPLES.filter((ex) => ex.domain === domain);
}
