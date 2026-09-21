/**
 * Response Synthesis & Conflict Detection (Heuristic)
 *
 * First-pass synthesis for tribunal responses without calling any model APIs.
 * Designed to be deterministic, lightweight, and "good enough" to surface:
 * - consensus themes
 * - conflicts/tensions
 * - actionable recommendations
 *
 * @see brenner_bot-xlk2.4 (bead)
 */

export type SynthesisStrength = "strong" | "moderate" | "weak";
export type RecommendationPriority = "high" | "medium" | "low";

export interface SynthesisInputResponse {
  agent: string;
  content: string;
}

export interface ConsensusPoint {
  claim: string;
  supportingAgents: string[];
  strength: SynthesisStrength;
}

export interface ConflictPoint {
  topic: string;
  positions: Array<{ agent: string; position: string }>;
  resolution?: string;
}

export interface Recommendation {
  action: string;
  priority: RecommendationPriority;
  rationale: string;
  suggestedBy: string[];
}

export interface AppliedPrinciple {
  principle: string;
  explanation: string;
  triggeredBy: string[];
}

export interface SynthesisResult {
  synthesizedAt: string;
  agentResponses: SynthesisInputResponse[];
  consensusPoints: ConsensusPoint[];
  conflictPoints: ConflictPoint[];
  recommendations: Recommendation[];
  brennerPrinciples: AppliedPrinciple[];
}

export interface SynthesisOptions {
  similarityThreshold?: number;
  maxClaimsPerAgent?: number;
  maxRecommendationsPerAgent?: number;
  maxConsensusPoints?: number;
  maxConflictPoints?: number;
  maxRecommendations?: number;
  maxPrinciples?: number;
}

const DEFAULTS: Required<SynthesisOptions> = {
  similarityThreshold: 0.62,
  maxClaimsPerAgent: 10,
  maxRecommendationsPerAgent: 8,
  maxConsensusPoints: 8,
  maxConflictPoints: 6,
  maxRecommendations: 10,
  maxPrinciples: 6,
};

const STOPWORDS = new Set(
  [
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "because",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "may",
    "might",
    "more",
    "most",
    "must",
    "no",
    "not",
    "of",
    "on",
    "or",
    "our",
    "should",
    "so",
    "such",
    "than",
    "that",
    "the",
    "their",
    "then",
    "there",
    "these",
    "this",
    "to",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "will",
    "with",
    "without",
    "you",
    "your",
  ].sort(),
);

const NEGATION_HINTS = [
  "not",
  "no",
  "never",
  "unlikely",
  "cannot",
  "can't",
  "impossible",
  "insufficient",
  "weak",
  "fails",
  "doesn't",
  "dont",
  "doesnt",
];

const POSITIVE_HINTS = [
  "plausible",
  "likely",
  "supported",
  "supports",
  "strong",
  "feasible",
  "robust",
  "consistent",
  "evidence",
];

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[`*_>#]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function intersectionCount(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let count = 0;
  for (const token of a) if (b.has(token)) count++;
  return count;
}

function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  const minSize = Math.min(a.size, b.size);
  if (minSize === 0) return 0;
  return intersectionCount(a, b) / minSize;
}

function bigrams(tokens: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    grams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return grams;
}

function prefixMatchLen(a: string[], b: string[], max = 4): number {
  const limit = Math.min(max, a.length, b.length);
  let matched = 0;
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) break;
    matched++;
  }
  return matched;
}

function stripCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function extractBullets(markdown: string): string[] {
  const withoutCode = stripCodeBlocks(markdown);
  const lines = withoutCode.split(/\r?\n/);
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    const match =
      trimmed.match(/^[-*]\s+(.*)$/) ??
      trimmed.match(/^\d+[.)]\s+(.*)$/) ??
      trimmed.match(/^•\s+(.*)$/);
    if (!match?.[1]) continue;
    const content = match[1].trim();
    if (content.length < 18) continue;
    if (content.length > 360) continue;
    bullets.push(content);
  }
  return bullets;
}

function extractSentences(markdown: string): string[] {
  const withoutCode = stripCodeBlocks(markdown);
  const collapsed = withoutCode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("|"))
    .join(" ");
  if (!collapsed) return [];

  const parts = collapsed
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 22 && p.length <= 320);

  return parts;
}

function looksLikeRecommendation(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (
    /(^|\b)(recommend|should|need to|must|consider|try|design|run|measure|test|collect|control|preregister|pre register|randomi[sz]e|replicate)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // Imperative-ish starts (rough heuristic).
  if (
    /^(run|design|measure|collect|control|compare|add|include|remove|estimate|quantify|pre-?register|replicate)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}

function inferPriority(text: string): RecommendationPriority {
  const normalized = normalizeText(text);
  if (!normalized) return "low";
  if (/\b(must|critical|first|immediately|urgent|highest priority)\b/i.test(text)) return "high";
  if (/\b(should|recommend|need to|next|important)\b/i.test(text)) return "medium";
  return "low";
}

function polarityScore(text: string): number {
  const normalized = normalizeText(text);
  let score = 0;
  for (const hint of NEGATION_HINTS) {
    if (normalized.includes(hint)) score -= 1;
  }
  for (const hint of POSITIVE_HINTS) {
    if (normalized.includes(hint)) score += 1;
  }
  return score;
}

type CandidateKind = "claim" | "recommendation";

interface Candidate {
  kind: CandidateKind;
  agent: string;
  text: string;
  tokensArr: string[];
  tokens: Set<string>;
  grams: Set<string>;
  polarity: number;
}

interface Cluster {
  kind: CandidateKind;
  candidates: Candidate[];
  agents: Set<string>;
  representative: string;
  repTokens: Set<string>;
  repGrams: Set<string>;
  repPrefix: string[];
}

function chooseRepresentativeText(texts: string[]): string {
  if (texts.length === 0) return "";
  return [...texts].sort((a, b) => a.length - b.length || a.localeCompare(b))[0]!;
}

function clusterCandidates(candidates: Candidate[], similarityThreshold: number): Cluster[] {
  const clusters: Cluster[] = [];

  const similarity = (cluster: Cluster, candidate: Candidate): number => {
    const tokenJaccard = jaccard(cluster.repTokens, candidate.tokens);
    const tokenOverlap = overlapCoefficient(cluster.repTokens, candidate.tokens);
    const tokenIntersection = intersectionCount(cluster.repTokens, candidate.tokens);
    const gramHit = intersectionCount(cluster.repGrams, candidate.grams) >= 1;
    const prefixLen = prefixMatchLen(cluster.repPrefix, candidate.tokensArr, 4);

    let score = Math.max(tokenJaccard, tokenOverlap * 0.9);
    if (prefixLen >= 3) score = Math.max(score, 0.9);
    if (gramHit && tokenIntersection >= 2) score = Math.max(score, 0.75);
    return score;
  };

  for (const candidate of candidates) {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i]!;
      if (cluster.kind !== candidate.kind) continue;
      const score = similarity(cluster, candidate);
      if (score >= similarityThreshold && score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      const repPrefix = candidate.tokensArr.slice(0, 4);
      clusters.push({
        kind: candidate.kind,
        candidates: [candidate],
        agents: new Set([candidate.agent]),
        representative: candidate.text,
        repTokens: new Set(candidate.tokens),
        repGrams: new Set(candidate.grams),
        repPrefix,
      });
      continue;
    }

    const cluster = clusters[bestIdx]!;
    cluster.candidates.push(candidate);
    cluster.agents.add(candidate.agent);
    for (const token of candidate.tokens) cluster.repTokens.add(token);
    for (const gram of candidate.grams) cluster.repGrams.add(gram);
    cluster.representative = chooseRepresentativeText(cluster.candidates.map((c) => c.text));
    cluster.repPrefix = tokenize(cluster.representative).slice(0, 4);
  }

  return clusters;
}

function strengthFromSupport(n: number): SynthesisStrength {
  if (n >= 3) return "strong";
  if (n === 2) return "moderate";
  return "weak";
}

function truncate(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

const PRINCIPLES: Array<{
  principle: string;
  explanation: string;
  patterns: RegExp[];
}> = [
  {
    principle: "Exclusion (⊘): prefer tests that can rule out",
    explanation: "Push toward discriminative tests that would make the hypothesis impossible.",
    patterns: [/\b(falsif|exclude|exclusion|rule out|discriminat|likelihood ratio)\b/i],
  },
  {
    principle: "Third alternative: both could be wrong",
    explanation: "Force a candidate space where the leading stories can simultaneously fail.",
    patterns: [/\b(third alternative|both could be wrong)\b/i],
  },
  {
    principle: "Scale check (⊙): do your sums",
    explanation: "Check plausibility via orders of magnitude, units, and measurement constraints.",
    patterns: [/\b(scale|order of magnitude|units|plausib|do your sums)\b/i],
  },
  {
    principle: "Level split (Σ): separate levels",
    explanation: "Avoid conflating program vs interpreter / mechanism vs manifestation levels.",
    patterns: [/\b(level split|conflat|program|interpreter)\b/i],
  },
  {
    principle: "Object transpose (⟳): change the object/system",
    explanation: "Swap to a cleaner experimental object or reframe the system to sharpen tests.",
    patterns: [/\b(object transpose|change the object|different system|model organism)\b/i],
  },
];

function extractPrinciples(
  responses: SynthesisInputResponse[],
  maxPrinciples: number,
): AppliedPrinciple[] {
  const found: AppliedPrinciple[] = [];

  for (const p of PRINCIPLES) {
    const triggeredBy: string[] = [];
    for (const response of responses) {
      if (p.patterns.some((pattern) => pattern.test(response.content))) {
        triggeredBy.push(response.agent);
      }
    }
    if (triggeredBy.length === 0) continue;
    found.push({
      principle: p.principle,
      explanation: p.explanation,
      triggeredBy,
    });
  }

  return found.slice(0, maxPrinciples);
}

export function synthesizeResponses(
  agentResponses: SynthesisInputResponse[],
  options?: SynthesisOptions,
): SynthesisResult {
  const config = { ...DEFAULTS, ...(options ?? {}) };

  const candidates: Candidate[] = [];

  for (const response of agentResponses) {
    const bullets = extractBullets(response.content);
    const sentences = extractSentences(response.content);

    const claimCandidates: string[] = [];
    const recommendationCandidates: string[] = [];

    for (const text of bullets) {
      (looksLikeRecommendation(text) ? recommendationCandidates : claimCandidates).push(text);
    }

    // Sentences are lower-signal; only include those that look like recommendations
    // to avoid dumping unstructured prose into consensus clustering.
    for (const text of sentences) {
      if (looksLikeRecommendation(text)) recommendationCandidates.push(text);
    }

    const claims = claimCandidates.slice(0, config.maxClaimsPerAgent);
    const recs = recommendationCandidates.slice(0, config.maxRecommendationsPerAgent);

    for (const claim of claims) {
      const tokensArr = tokenize(claim);
      const tokenSet = new Set(tokensArr);
      if (tokenSet.size === 0) continue;
      candidates.push({
        kind: "claim",
        agent: response.agent,
        text: claim,
        tokensArr,
        tokens: tokenSet,
        grams: bigrams(tokensArr),
        polarity: polarityScore(claim),
      });
    }

    for (const rec of recs) {
      const tokensArr = tokenize(rec);
      const tokenSet = new Set(tokensArr);
      if (tokenSet.size === 0) continue;
      candidates.push({
        kind: "recommendation",
        agent: response.agent,
        text: rec,
        tokensArr,
        tokens: tokenSet,
        grams: bigrams(tokensArr),
        polarity: polarityScore(rec),
      });
    }
  }

  const clusters = clusterCandidates(candidates, config.similarityThreshold);

  const consensusPoints = clusters
    .filter((c) => c.kind === "claim" && c.agents.size >= 2)
    .sort(
      (a, b) => b.agents.size - a.agents.size || a.representative.localeCompare(b.representative),
    )
    .slice(0, config.maxConsensusPoints)
    .map(
      (cluster): ConsensusPoint => ({
        claim: truncate(cluster.representative, 220),
        supportingAgents: [...cluster.agents].sort(),
        strength: strengthFromSupport(cluster.agents.size),
      }),
    );

  const conflictPoints = clusters
    .filter((c) => c.kind === "claim" && c.agents.size >= 2)
    .map((cluster) => {
      const perAgent = new Map<string, Candidate>();
      for (const candidate of cluster.candidates) {
        if (!perAgent.has(candidate.agent)) perAgent.set(candidate.agent, candidate);
      }
      const polarities = [...perAgent.values()].map((c) => c.polarity);
      const hasPositive = polarities.some((p) => p > 0);
      const hasNegative = polarities.some((p) => p < 0);

      if (!hasPositive || !hasNegative) return null;

      const positions = [...perAgent.values()]
        .sort((a, b) => a.agent.localeCompare(b.agent))
        .slice(0, 4)
        .map((c) => ({ agent: c.agent, position: truncate(c.text, 260) }));

      return {
        topic: truncate(cluster.representative, 140),
        positions,
      } satisfies ConflictPoint;
    })
    .filter((x): x is ConflictPoint => Boolean(x))
    .slice(0, config.maxConflictPoints);

  const recommendations = clusters
    .filter((c) => c.kind === "recommendation" && c.agents.size >= 1)
    .sort(
      (a, b) => b.agents.size - a.agents.size || a.representative.localeCompare(b.representative),
    )
    .slice(0, config.maxRecommendations)
    .map((cluster): Recommendation => {
      const action = truncate(cluster.representative, 240);
      const priority = inferPriority(action);
      const suggestedBy = [...cluster.agents].sort();
      const rationale =
        suggestedBy.length > 1
          ? `Suggested by ${suggestedBy.join(", ")}`
          : `Suggested by ${suggestedBy[0] ?? "agent"}`;

      return { action, priority, rationale, suggestedBy };
    });

  const brennerPrinciples = extractPrinciples(agentResponses, config.maxPrinciples);

  return {
    synthesizedAt: new Date().toISOString(),
    agentResponses,
    consensusPoints,
    conflictPoints,
    recommendations,
    brennerPrinciples,
  };
}
