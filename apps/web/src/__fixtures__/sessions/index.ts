/**
 * Session Fixtures
 *
 * Realistic session fixtures for testing session management,
 * artifact compilation, and multi-agent coordination.
 *
 * Philosophy: NO mocks - use data that mirrors real session structure.
 */

import type {
  Artifact,
  AssumptionItem,
  CritiqueItem,
  HypothesisItem,
  PredictionItem,
  ResearchThreadItem,
  TestItem,
} from "../../lib/artifact-merge";

// ============================================================================
// Types
// ============================================================================

export type SessionStatus = "pending" | "active" | "completed" | "error" | "cancelled";

export interface SessionParticipant {
  agent: string;
  model: string;
  role?: "generator" | "tester" | "critic";
  joined_at?: string;
}

export interface SessionExcerpt {
  anchor: string;
  text: string;
  source: "transcript" | "quote-bank" | "distillation";
}

export interface Session {
  id: string;
  thread_id: string;
  status: SessionStatus;
  research_question: string;
  excerpts: SessionExcerpt[];
  created_at: string;
  updated_at: string;
  participants: SessionParticipant[];
  artifact?: Artifact;
  error_message?: string;
}

// ============================================================================
// Research Thread Fixtures
// ============================================================================

export const sampleResearchThread: ResearchThreadItem = {
  id: "RT",
  statement: "Does role-separated prompting improve Brenner-style artifact quality?",
  context:
    "Investigating whether structuring multi-agent sessions with explicit cognitive roles produces higher-quality artifacts compared to unified prompts.",
  why_it_matters:
    "If role separation improves artifact quality, this validates the 3-role Brenner Protocol design. If not, we should simplify.",
  anchors: ["§103", "§105", "§230"],
};

// ============================================================================
// Hypothesis Fixtures
// ============================================================================

export const sampleHypotheses: HypothesisItem[] = [
  {
    id: "H1",
    name: "Role-Separation Improves Quality",
    claim:
      "Explicitly assigning cognitive roles (generator, tester, critic) produces artifacts with fewer errors",
    mechanism:
      "Role separation creates productive ignorance—each agent focuses on their specialty without being biased by other concerns",
    anchors: ["§230", "§105"],
    third_alternative: false,
  },
  {
    id: "H2",
    name: "Unified Prompts Sufficient",
    claim: "Role separation adds coordination overhead without improving artifact quality",
    mechanism: "Modern LLMs can context-switch between generator/tester/critic modes internally",
    anchors: [],
    third_alternative: false,
  },
  {
    id: "H3",
    name: "Both Wrong - Structure vs Content",
    claim:
      "Neither role separation NOR unified prompts matter—artifact quality depends on excerpt selection",
    mechanism:
      "We're measuring the wrong thing. Quality comes from the INPUT (excerpts) not the PROCESSING (prompt structure)",
    anchors: ["§103", "§210"],
    third_alternative: true,
  },
];

// ============================================================================
// Test Fixtures
// ============================================================================

export const sampleTests: TestItem[] = [
  {
    id: "T1",
    name: "Linter Error Count Comparison",
    procedure:
      "Run 10 sessions with role-separated prompts and 10 with unified prompts. Compare artifact linter output.",
    discriminates: "H1-roles-help vs H2-roles-neutral",
    expected_outcomes: {
      "H1-roles-help": "Role-separated artifacts have fewer errors (p < 0.05)",
      "H2-roles-neutral": "No significant difference in error counts",
    },
    potency_check: "Both conditions produce parseable artifacts (compilation success rate > 90%)",
    feasibility: "Can run with existing linter in apps/web/src/lib/artifact-linter.ts",
    score: {
      likelihood_ratio: 2,
      cost: 3,
      speed: 3,
      ambiguity: 1,
    },
  },
  {
    id: "T2",
    name: "Third-Alternative Detection Rate",
    procedure:
      "Count explicit third alternatives in each artifact's hypothesis_slate. Role separation should increase 'both wrong' framings.",
    discriminates: "H1-roles-enable-third-alt vs H2-no-effect",
    expected_outcomes: {
      "H1-roles-enable-third-alt":
        ">50% of role-separated artifacts contain explicit third alternatives",
      "H2-no-effect": "Third alternative rate is similar across conditions",
    },
    potency_check: "At least one hypothesis_slate entry exists per artifact",
    score: {
      likelihood_ratio: 2,
      cost: 3,
      speed: 3,
      ambiguity: 2,
    },
  },
];

// ============================================================================
// Assumption Fixtures
// ============================================================================

export const sampleAssumptions: AssumptionItem[] = [
  {
    id: "A1",
    name: "Agents are comparable across conditions",
    statement:
      "The same models can be compared fairly across role-separated and unified conditions",
    load: "If models have different natural tendencies regardless of prompting, comparison is confounded",
    test: "Run single-model role-separated vs multi-model comparison",
    status: "unchecked",
  },
  {
    id: "A2",
    name: "Scale check: prompt tokens vs quality correlation",
    statement: "Prompt structure effects are detectable within ~10K tokens per agent",
    load: "Effect may exist but be below detection threshold at our scale",
    test: "Vary token budget and measure effect size",
    status: "unchecked",
    scale_check: true,
    calculation: "Typical session = 3 agents × ~10K tokens/agent = ~30K input tokens",
  },
  {
    id: "A3",
    name: "Linter is valid quality proxy",
    statement:
      "The artifact linter measures 'Brenner-style quality' and not just schema compliance",
    load: "If linter only checks structure, passing artifacts may still be intellectually empty",
    test: "Compare linter scores with expert human quality ratings",
    status: "unchecked",
  },
];

// ============================================================================
// Critique Fixtures
// ============================================================================

export const sampleCritiques: CritiqueItem[] = [
  {
    id: "C1",
    name: "Confounding: Model Capability Differences",
    attack:
      "We're comparing role-separated (different models) vs unified (same models). Role separation benefits may be entirely due to model selection.",
    evidence:
      "If single-model role-separated performs similarly to multi-model, model differences explain nothing",
    current_status: "Unresolved - need controlled experiment",
    real_third_alternative: true,
  },
  {
    id: "C2",
    name: "Premature Optimization Warning",
    attack:
      "We're designing experiments before we have a single 'golden artifact' that demonstrates the protocol works AT ALL.",
    evidence:
      "If we can't produce a high-quality artifact with ANY prompt structure, the comparison is moot",
    current_status: "Acknowledged - this session is exploratory",
  },
];

// ============================================================================
// Prediction Fixtures
// ============================================================================

export const samplePredictions: PredictionItem[] = [
  {
    id: "P1",
    condition: "Role-separated sessions with 3 distinct agents",
    predictions: {
      H1: "Linter error count < 5 on average",
      H2: "Linter error count similar to unified (~10)",
      H3: "Linter error count varies with excerpt quality, not prompt structure",
    },
  },
  {
    id: "P2",
    condition: "Unified prompt sessions with same total token budget",
    predictions: {
      H1: "Higher error count than role-separated",
      H2: "Similar error count to role-separated",
      H3: "Depends on excerpt selection, not prompt type",
    },
  },
];

// ============================================================================
// Complete Artifact Fixtures
// ============================================================================

/**
 * Valid, complete artifact for testing merge and lint operations.
 */
export const validArtifactFixture: Artifact = {
  metadata: {
    session_id: "RS-20251230-role-prompting",
    created_at: "2025-12-30T22:30:00Z",
    updated_at: "2025-12-30T23:00:00Z",
    version: 3,
    status: "active",
    contributors: [
      {
        agent: "BlackCastle",
        program: "claude-code",
        model: "opus-4.5",
        contributed_at: "2025-12-30T22:30:00Z",
      },
      {
        agent: "PurpleHill",
        program: "claude-code",
        model: "opus-4.5",
        contributed_at: "2025-12-30T22:45:00Z",
      },
      {
        agent: "BlueMountain",
        program: "codex-cli",
        model: "gpt-5.2",
        contributed_at: "2025-12-30T23:00:00Z",
      },
    ],
  },
  sections: {
    research_thread: sampleResearchThread,
    hypothesis_slate: sampleHypotheses,
    predictions_table: samplePredictions,
    discriminative_tests: sampleTests,
    assumption_ledger: sampleAssumptions,
    anomaly_register: [],
    adversarial_critique: sampleCritiques,
  },
};

/**
 * Draft artifact (minimal, incomplete).
 */
export const draftArtifactFixture: Artifact = {
  metadata: {
    session_id: "RS-20251230-draft",
    created_at: "2025-12-30T20:00:00Z",
    updated_at: "2025-12-30T20:00:00Z",
    version: 1,
    status: "draft",
    contributors: [{ agent: "TestAgent", contributed_at: "2025-12-30T20:00:00Z" }],
  },
  sections: {
    research_thread: {
      id: "RT",
      statement: "How do cells determine their fate?",
      context: "Based on Brenner transcript §58-59",
      why_it_matters: "Fundamental question in developmental biology",
    },
    hypothesis_slate: [
      {
        id: "H1",
        name: "Lineage Hypothesis",
        claim: "Cell fate is determined by lineage",
        mechanism: "Binary tree encoding",
        anchors: ["§58"],
      },
    ],
    predictions_table: [],
    discriminative_tests: [],
    assumption_ledger: [],
    anomaly_register: [],
    adversarial_critique: [],
  },
};

/**
 * Empty artifact (just created).
 */
export const emptyArtifactFixture: Artifact = {
  metadata: {
    session_id: "RS-20251230-new",
    created_at: "2025-12-30T19:00:00Z",
    updated_at: "2025-12-30T19:00:00Z",
    version: 1,
    status: "draft",
    contributors: [],
  },
  sections: {
    research_thread: null,
    hypothesis_slate: [],
    predictions_table: [],
    discriminative_tests: [],
    assumption_ledger: [],
    anomaly_register: [],
    adversarial_critique: [],
  },
};

// ============================================================================
// Session Fixtures
// ============================================================================

/**
 * Active session with ongoing work.
 */
export const activeSessionFixture: Session = {
  id: "session-active-001",
  thread_id: "RS-20251230-role-prompting",
  status: "active",
  research_question: "Does role-separated prompting improve Brenner-style artifact quality?",
  excerpts: [
    { anchor: "§103", text: "You've forgotten there's a third alternative.", source: "transcript" },
    {
      anchor: "§105",
      text: "Exclusion is always a tremendously good thing.",
      source: "transcript",
    },
    { anchor: "§230", text: "It is good to be ignorant about a new field.", source: "transcript" },
  ],
  created_at: "2025-12-30T22:30:00Z",
  updated_at: "2025-12-30T23:00:00Z",
  participants: [
    {
      agent: "BlackCastle",
      model: "opus-4.5",
      role: "generator",
      joined_at: "2025-12-30T22:30:00Z",
    },
    { agent: "PurpleHill", model: "opus-4.5", role: "tester", joined_at: "2025-12-30T22:35:00Z" },
    { agent: "BlueMountain", model: "gpt-5.2", role: "critic", joined_at: "2025-12-30T22:40:00Z" },
  ],
  artifact: validArtifactFixture,
};

/**
 * Completed session with final artifact.
 */
export const completedSessionFixture: Session = {
  id: "session-complete-001",
  thread_id: "RS-20251229-dimensional-reduction",
  status: "completed",
  research_question: "How does dimensional reduction enable new experimental approaches?",
  excerpts: [
    { anchor: "§58", text: "We reduced the problem to one dimension.", source: "transcript" },
    { anchor: "§59", text: "The choice of C. elegans was crucial.", source: "transcript" },
  ],
  created_at: "2025-12-29T10:00:00Z",
  updated_at: "2025-12-29T14:00:00Z",
  participants: [
    { agent: "GreenCastle", model: "opus-4.5", role: "generator" },
    { agent: "RedHill", model: "gpt-5.2", role: "tester" },
  ],
  artifact: validArtifactFixture,
};

/**
 * Session with error state.
 */
export const errorSessionFixture: Session = {
  id: "session-error-001",
  thread_id: "RS-20251228-failed",
  status: "error",
  research_question: "What caused the session to fail?",
  excerpts: [],
  created_at: "2025-12-28T08:00:00Z",
  updated_at: "2025-12-28T08:15:00Z",
  participants: [],
  error_message: "Agent Mail connection failed: ECONNREFUSED 127.0.0.1:8765",
};

/**
 * Pending session (just created, no activity yet).
 */
export const pendingSessionFixture: Session = {
  id: "session-pending-001",
  thread_id: "RS-20251231-new",
  status: "pending",
  research_question: "How should we structure multi-agent collaboration?",
  excerpts: [
    {
      anchor: "§210",
      text: "Routine work generates its important problems.",
      source: "transcript",
    },
  ],
  created_at: "2025-12-31T00:00:00Z",
  updated_at: "2025-12-31T00:00:00Z",
  participants: [],
};

/**
 * Cancelled session.
 */
export const cancelledSessionFixture: Session = {
  id: "session-cancelled-001",
  thread_id: "RS-20251227-cancelled",
  status: "cancelled",
  research_question: "Session was cancelled before completion.",
  excerpts: [],
  created_at: "2025-12-27T12:00:00Z",
  updated_at: "2025-12-27T12:30:00Z",
  participants: [{ agent: "WhiteDog", model: "opus-4.5" }],
};
