import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";

type AxeImpact = "minor" | "moderate" | "serious" | "critical";

type AxeResults = {
  url?: string;
  violations: Array<{
    id: string;
    impact?: AxeImpact;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      target: string[];
      html?: string;
      failureSummary?: string;
    }>;
  }>;
};

export async function checkAccessibility(
  page: Page,
  testInfo: TestInfo,
  options: {
    disableRules?: string[];
    withRules?: string[];
    include?: string[];
    exclude?: string[];
    tag?: string[];
  } = {},
): Promise<AxeResults> {
  const builder = new AxeBuilder({ page });

  if (options.disableRules?.length) builder.disableRules(options.disableRules);
  if (options.withRules?.length) builder.withRules(options.withRules);
  if (options.include?.length) {
    for (const selector of options.include) builder.include(selector);
  }
  if (options.exclude?.length) {
    for (const selector of options.exclude) builder.exclude(selector);
  }
  if (options.tag?.length) builder.withTags(options.tag);

  const results = (await builder.analyze()) as AxeResults;

  await testInfo.attach("a11y-results.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  return results;
}

export function filterViolationsByImpact(
  results: AxeResults,
  impacts: AxeImpact[],
): AxeResults["violations"] {
  const wanted = new Set(impacts);
  return results.violations.filter((v) => (v.impact ? wanted.has(v.impact) : false));
}

export function formatViolations(violations: AxeResults["violations"]): string {
  return violations
    .map((v) => {
      const impact = v.impact ?? "unknown";
      const targets = v.nodes
        .map((n) => `- ${n.target.join(" ")}${n.failureSummary ? `\n  ${n.failureSummary}` : ""}`)
        .join("\n");
      return `[${impact}] ${v.id}: ${v.description}\nHelp: ${v.helpUrl}\n${targets}`;
    })
    .join("\n\n");
}
