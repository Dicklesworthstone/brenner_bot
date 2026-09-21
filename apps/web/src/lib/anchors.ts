/**
 * Anchor / deep-link helpers
 *
 * Canonicalizes how we generate DOM ids + URL hashes across:
 * - viewer components
 * - build-time search index generation
 * - server-side globalSearch URLs
 */

export function slugifyHeadingForAnchor(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function makeTranscriptSectionDomId(sectionNumber: number): string {
  return `section-${sectionNumber}`;
}

/**
 * Quote-bank quote sections use `§N` (or `§N-M`) as stable references, but DOM ids must be URL-friendly.
 * We canonicalize to `section-N` (or `section-N-M`) for hashes/ids.
 */
export function quoteBankDomIdFromSectionId(sectionId: string): string {
  const trimmed = sectionId.trim();
  if (!trimmed.startsWith("§")) {
    throw new Error(`Invalid quote-bank section id (expected "§..."): "${sectionId}"`);
  }
  return `section-${trimmed.slice(1)}`;
}

export function quoteBankSectionIdFromDomId(domId: string): string {
  const trimmed = domId.trim();
  if (!trimmed.startsWith("section-")) {
    throw new Error(`Invalid quote-bank dom id (expected "section-..."): "${domId}"`);
  }
  return `§${trimmed.slice("section-".length)}`;
}

export function makeDistillationSectionDomId(args: {
  title: string;
  partNumber?: number;
  index?: number;
}): string {
  const slug = slugifyHeadingForAnchor(args.title);
  const safeSlug = slug || `section-${args.index ?? 0}`;
  return args.partNumber ? `part-${args.partNumber}-${safeSlug}` : safeSlug;
}
