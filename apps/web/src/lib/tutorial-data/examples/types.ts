import type { Artifact } from "@/lib/artifact-merge";

export type TutorialExampleDomain = "biology" | "computer_science" | "social_science";

export interface TutorialDomainExample {
  /** URL slug (used at /tutorial/examples/[slug]) */
  slug: string;
  /** Display title */
  title: string;
  /** Domain label for browsing */
  domain: TutorialExampleDomain;
  /** One-line topic */
  topic: string;

  /** 1 paragraph research question framing */
  researchQuestion: string;

  /** 5–10 anchors (Brenner §n or domain evidence notes) */
  excerpt: Array<{ anchor: string; note: string }>;

  /** Complete compiled artifact (lintable) */
  artifact: Artifact;

  /** Where the operators show up and why */
  operatorAnnotations: Array<{ operator: string; appliedIn: string[]; note: string }>;

  /** Commentary on why the artifact is good */
  commentary: string[];
}
