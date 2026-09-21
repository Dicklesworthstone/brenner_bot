/**
 * Agent-Assisted Tutorial Content
 *
 * All content for the 8-step Agent-Assisted tutorial path.
 * This is the highest-leverage path - teaching AI agents to internalize
 * and apply the Brenner methodology for research.
 *
 * @see brenner_bot-oryq (Tutorial Data: Agent-Assisted content)
 * @module tutorial-data/agent-assisted
 */

import type {
  CheckpointData,
  CodeBlockData,
  TroubleshootingItem,
  TutorialStep,
} from "@/lib/tutorial-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended step data with all content for the Agent-Assisted path.
 */
export interface AgentAssistedStepData extends TutorialStep {
  /** Code blocks used in this step */
  codeBlocks?: CodeBlockData[];
  /** Checkpoint shown after completing this step */
  checkpoint?: CheckpointData;
}

/**
 * Review checklist item for Step 8.
 */
export interface ChecklistItem {
  /** Unique identifier */
  id: string;
  /** Human-readable label (the check to perform) */
  label: string;
  /** Hint for fixing this issue if it fails */
  fixHint: string;
}

/**
 * Group of related checklist items.
 */
export interface ChecklistGroup {
  /** Section title */
  title: string;
  /** Items in this group */
  items: ChecklistItem[];
}

/**
 * Verification question for Step 4.
 */
export interface VerificationQuestion {
  /** The question to ask */
  question: string;
  /** What a good answer should include */
  expectation: string;
}

/**
 * Operator summary for Step 4.
 */
export interface OperatorCheck {
  /** Operator name with symbol */
  title: string;
  /** What the agent should understand */
  check: string;
}

// ============================================================================
// Path Metadata
// ============================================================================

export const AGENT_ASSISTED_PATH = {
  id: "agent-assisted",
  title: "Agent-Assisted",
  description:
    "Have your AI agent internalize the Brenner methodology and run research loops for you.",
  estimatedDuration: "~45 min",
  difficulty: "intermediate" as const,
  totalSteps: 8,
  prerequisites: [
    "Claude Code (Claude Max) OR Codex CLI (GPT Pro)",
    "Basic familiarity with terminal agents",
    "Git and terminal basics",
  ],
  available: true,
  href: "/tutorial/agent-assisted",
};

// ============================================================================
// Code Blocks
// ============================================================================

export const AA_CODE_BLOCKS: Record<string, CodeBlockData> = {
  // Step 2: Prerequisites - Claude Code
  claudeCodeCheck: {
    id: "claude-code-check",
    code: "claude --version",
    language: "bash",
    title: "Terminal (Claude Code)",
    description: "Check if Claude Code is installed",
  },
  claudeCodeTest: {
    id: "claude-code-test",
    code: 'claude "What model are you using?"',
    language: "bash",
    title: "Terminal (Claude Code)",
    description: "Verify Claude Code is working",
  },

  // Step 2: Prerequisites - Codex
  codexCheck: {
    id: "codex-check",
    code: "codex --version",
    language: "bash",
    title: "Terminal (Codex)",
    description: "Check if Codex CLI is installed",
  },
  codexTest: {
    id: "codex-test",
    code: 'codex "What model are you using?"',
    language: "bash",
    title: "Terminal (Codex)",
    description: "Verify Codex is working",
  },

  // Step 3: Clone into Agent Context
  agentClone: {
    id: "agent-clone",
    code: `# Start a new agent session in the brenner_bot directory
cd brenner_bot

# Claude Code:
claude

# OR Codex:
codex`,
    language: "bash",
    title: "Terminal",
    description: "Start an agent session in the project",
  },
  verifyAgentContext: {
    id: "verify-agent-context",
    code: `# Ask the agent to verify it can see the files
"Please list the key files in this repository and confirm you can read them."`,
    language: "text",
    title: "Prompt to your agent",
    description: "Verify the agent has file access",
  },

  // Step 4: Agent Studies the System (main study prompt)
  studyPrompt: {
    id: "study-prompt",
    code: `Please study the Brenner methodology by reading these documents in order:

1. First, read README.md to understand the project overview
2. Then read specs/operator_library_v0.1.md to learn the four cognitive operators
3. Finally, read one of the distillation files (e.g., final_distillation_of_brenner_method_by_opus45.md)

After reading, provide a summary that includes:
- The core insight of Brenner's approach to scientific research
- The four operators (Level Split, Exclusion Test, Object Transpose, Scale Check) and what each does
- The concept of "discriminative experiments" vs confirmation-seeking
- How to generate "third alternatives"

Take your time to read carefully. This will inform how you help with research questions.`,
    language: "text",
    title: "Prompt to your agent",
    description: "The key prompt to have the agent internalize the methodology",
  },

  // Step 5: Define Your Research Problem
  questionRefinePrompt: {
    id: "question-refine-prompt",
    code: `I have a research question I want to investigate using the Brenner approach:

[YOUR RESEARCH QUESTION HERE]

Please help me refine this question by:
1. Checking if it's at the right level of specificity
2. Identifying any hidden assumptions in the framing
3. Suggesting alternative framings that might be more tractable
4. Verifying it's the kind of question that can have discriminative tests

Apply the Level Split (Σ) and Object Transpose (⟳) operators to stress-test the question.`,
    language: "text",
    title: "Prompt to your agent",
    description: "Refine your research question with Brenner-style critique",
  },

  // Step 6: Agent Builds the Inputs
  inputGenerationPrompt: {
    id: "input-generation-prompt",
    code: `Now I need you to build the formal inputs for a Brenner research loop. My refined research question is:

[YOUR REFINED QUESTION FROM STEP 5]

Please generate the following artifacts:

## 1. Hypothesis Slate (minimum 4 hypotheses)

For each hypothesis:
- State it clearly and specifically
- Explain the mechanism it proposes
- Note what evidence would support it
- Note what evidence would falsify it

Include at least:
- The "obvious" hypothesis (what most people would assume)
- A mechanistic alternative (different underlying mechanism)
- A reversed causation hypothesis (effect causes apparent cause)
- A third-variable hypothesis (both are caused by something else)

Use **Object Transpose (⟳)** to generate the reversal and third-variable options.

## 2. Assumption Ledger

List every assumption underlying each hypothesis. Categorize them as:
- **Theoretical**: Assumptions about how things work
- **Methodological**: Assumptions about how we'd measure/observe
- **Background**: Taken-for-granted facts that might be wrong

Use **Level Split (Σ)** to check if assumptions hold at different levels.

## 3. Third Alternatives

For any pair of hypotheses that seem like the only options, generate a third possibility that:
- Is neither hypothesis A nor hypothesis B
- Could explain the same observations
- Comes from applying Object Transpose or Level Split

## 4. Critical Evaluation

For each hypothesis, apply **Scale Check (⊙)** to verify:
- Is the proposed effect size plausible?
- Do the numbers make physical/biological sense?
- What would have to be true for this mechanism to work?

Take your time. Be thorough. This is the foundation for everything that follows.`,
    language: "text",
    title: "Prompt to your agent",
    description: "Generate hypothesis slate, assumptions, and third alternatives",
  },

  // Step 7: Agent Runs the Brenner Loop
  brennerLoopPrompt: {
    id: "brenner-loop-prompt",
    code: `I want you to run a full Brenner Loop on my research question using the artifacts you already generated.

## Inputs

### Research question
[PASTE YOUR REFINED QUESTION FROM STEP 5]

### Hypothesis slate
[PASTE THE HYPOTHESIS SLATE FROM STEP 6]

### Assumption ledger
[PASTE THE ASSUMPTION LEDGER FROM STEP 6]

### Third alternatives
[PASTE THE THIRD ALTERNATIVES FROM STEP 6]

### Scale checks / plausibility notes (if any)
[PASTE ANY SCALE CHECK NOTES FROM STEP 6]

---

## Requirements (Brenner disciplines)

1) **Discriminative tests only (⊘ Exclusion Test):**
   - Propose tests where at least two hypotheses predict different outcomes.
   - Each test must specify: what observation would EXCLUDE which hypothesis.

2) **Potency check each test (🎭):**
   - If the test comes back null/negative, what do we learn?
   - If the test is likely to be ambiguous, rewrite it until it isn't.

3) **Keep the hypothesis space honest (Σ + ⟳):**
   - Ensure hypotheses are not level-mixed (Σ Level Split).
   - Ensure at least one genuine third alternative is included (⟳ Object Transpose).

4) **Scale sanity (⊙):**
   - Where relevant, include order-of-magnitude or numeric plausibility checks.

---

## Output format (strict)

Produce a single markdown artifact with these sections:

1. **Single triangulated kernel** (3–6 bullets): your best current hypothesis + the single most discriminative next test + why.
2. **Hypothesis slate (revised)**: 4+ hypotheses, each with mechanism + 1–2 key assumptions.
3. **Discriminative tests (ranked)**: a table with:
   - Test name
   - What you do / measure
   - Predictions if H1/H2/H3/... true
   - Exclusion logic (what outcome rules out what)
   - Potency check (🎭)
   - Feasibility (time/cost/skill)
4. **Assumption ledger (updated)**: grouped by hypothesis and by type (theoretical / methodological / background).
5. **Adversarial critique**: attack the framing; propose 1–2 alternative framings.
6. **Recommended next steps**: the next 3 actions, ordered by discriminative power.

Take your time and be ruthless about discriminative power.`,
    language: "text",
    title: "Prompt to your agent",
    description: "Run the full Brenner Loop and produce the research artifact",
  },

  // Step 8: Human Review - Revision Prompt
  revisionPrompt: {
    id: "revision-prompt",
    code: `Your previous artifact is close, but it fails some Brenner review checks:

[LIST THE FAILED CHECKS HERE]

Please revise the artifact, keeping the same section headings and structure. For each fix:
- Make the change as minimally as possible
- Explicitly mark additions with "NEW:" so I can spot them
- Ensure tests are discriminative (different predictions across hypotheses)
- Ensure every test has a potency check (what we learn if null)

Return the updated artifact in full.`,
    language: "text",
    title: "Revision prompt",
    description: "Request targeted revisions for failed checklist items",
  },
};

// ============================================================================
// Troubleshooting Items
// ============================================================================

export const AA_TROUBLESHOOTING: Record<string, TroubleshootingItem[]> = {
  step1: [
    {
      problem: "Not sure if I need this path",
      solution:
        "If you have Claude Max or GPT Pro and want to run multiple research loops efficiently, this is your path. Otherwise, try Quick Start first.",
    },
    {
      problem: "Confused about what a coding agent is",
      solution:
        "Claude Code and Codex are AI assistants that run in your terminal with access to files and commands. They're different from chat interfaces.",
    },
  ],

  step2: [
    {
      problem: "Claude Code not recognized",
      symptoms: ["'claude' is not recognized as a command"],
      solution:
        "Make sure Claude Code is installed and added to your PATH. Try restarting your terminal.",
      commands: ["claude --help"],
    },
    {
      problem: "Codex not recognized",
      symptoms: ["'codex' is not recognized as a command"],
      solution:
        "Make sure Codex CLI is installed. You may need to run the installer again or check your PATH.",
      commands: ["codex --help"],
    },
    {
      problem: "Wrong subscription tier",
      symptoms: ["Model access denied", "Subscription required"],
      solution:
        "Agent-Assisted requires Claude Max (for Claude Code with Opus 4.5) or GPT Pro (for Codex with GPT 5). Check your subscription status.",
    },
  ],

  step3: [
    {
      problem: "Agent can't see files",
      symptoms: ["File not found", "Cannot read directory"],
      solution:
        "Make sure you started the agent session from inside the brenner_bot directory. The agent needs file access to read documentation.",
      commands: ["cd brenner_bot", "claude  # or: codex"],
    },
    {
      problem: "Permission denied reading files",
      symptoms: ["Permission denied", "Access not allowed"],
      solution:
        "Some agent configurations restrict file access. Check your agent's permission settings or try running with elevated permissions.",
    },
  ],

  step4: [
    {
      problem: "Agent's summary is too superficial",
      solution:
        "Ask follow-up questions about specific operators or concepts to deepen its understanding.",
    },
    {
      problem: "Agent didn't mention all four operators",
      solution:
        "Explicitly ask it to read specs/operator_library_v0.1.md and summarize each operator.",
    },
    {
      problem: "Agent seems to be guessing instead of reading",
      solution:
        "Ask it to quote specific passages from the files. If it can't, it may not have proper file access (see Step 3 troubleshooting).",
    },
  ],

  step5: [
    {
      problem: "Question is too broad",
      solution:
        "Ask the agent to apply Level Split (Σ) to break it into more specific sub-questions at different levels of analysis.",
    },
    {
      problem: "Question has hidden assumptions",
      solution:
        "Ask the agent to list all assumptions embedded in the question, then decide which to keep and which to challenge.",
    },
    {
      problem: "Can't think of alternative framings",
      solution:
        "Apply Object Transpose (⟳): What if the causation is reversed? What if both are caused by a third factor?",
    },
  ],

  step6: [
    {
      problem: "Hypotheses are too similar",
      solution:
        "Demand hypotheses that would require different tests to distinguish. If two hypotheses predict the same outcomes, they're really one hypothesis.",
    },
    {
      problem: "Missing third alternatives",
      solution:
        "Explicitly ask for a hypothesis that is 'neither A nor B' and would explain the same observations through a completely different mechanism.",
    },
    {
      problem: "Assumption ledger feels incomplete",
      solution:
        "Ask for assumptions in three categories: theoretical (how things work), methodological (how we measure), and background (taken-for-granted facts).",
    },
  ],

  step7: [
    {
      problem: "Tests don't discriminate between hypotheses",
      solution:
        "Rewrite tests as prediction tables: if H1 is true, we expect X; if H2 is true, we expect Y. Remove tests where all hypotheses predict the same outcome.",
    },
    {
      problem: "No potency checks",
      solution:
        "For each test, ask: 'If this comes back null, what do we learn?' If the answer is 'nothing', redesign the test.",
    },
    {
      problem: "Artifact is too long and unfocused",
      solution:
        "Ask for the 'single triangulated kernel': best hypothesis + single most discriminative test + why this test matters.",
    },
  ],

  step8: [
    {
      problem: "Artifact feels impressive but un-actionable",
      solution:
        "Force a single next test: ask for the 'single triangulated kernel' (best hypothesis + best discriminative test + why).",
    },
    {
      problem: "Too many tests, no ranking",
      solution:
        "Require a potency-ranked list and ask for the top 1 test that would eliminate the most hypotheses.",
    },
    {
      problem: "Agent keeps making the same mistakes after revision",
      solution:
        "Be more specific in your revision request. Quote the exact failed check and the exact fix you want.",
    },
  ],
};

// ============================================================================
// Checkpoints
// ============================================================================

export const AA_CHECKPOINTS: Record<string, CheckpointData> = {
  step4: {
    title: "Agent Internalization Complete!",
    accomplishments: [
      "Had your agent systematically study the Brenner documentation",
      "Verified understanding of the four cognitive operators",
      "Confirmed agent can explain discriminative vs confirmation-seeking experiments",
    ],
    nextPreview: "Next, you'll define your research problem and have the agent help refine it.",
  },

  step8: {
    title: "Agent-Assisted Tutorial Complete!",
    accomplishments: [
      "Set up an AI coding agent to internalize the Brenner method",
      "Refined a research question using Brenner-style critique",
      "Generated a hypothesis slate + assumption ledger",
      "Produced discriminative tests ranked by potency",
      "Reviewed the artifact with a failure-mode checklist",
    ],
    nextPreview:
      "Next: run another loop on a new question, or move to Multi-Agent Cockpit for parallel role-separated orchestration.",
  },
};

// ============================================================================
// Review Checklist (Step 8)
// ============================================================================

export const REVIEW_CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Hypotheses",
    items: [
      {
        id: "hyp-4plus",
        label: "4+ distinct hypotheses (not variants of one idea)",
        fixHint:
          "Ask for 2 additional hypotheses that would require different tests to distinguish.",
      },
      {
        id: "hyp-mechanism",
        label: "Each hypothesis includes an explicit mechanism",
        fixHint:
          "For each hypothesis: 'state mechanism in 1–2 sentences; if unknown, mark as unknown and propose tests to identify it.'",
      },
      {
        id: "hyp-third-alt",
        label: "At least one genuine third alternative is treated as first-class",
        fixHint:
          "Explicitly demand a third alternative that is neither A nor B, with its own predictions and tests.",
      },
    ],
  },
  {
    title: "Discriminative Tests",
    items: [
      {
        id: "test-discriminate",
        label: "Each test makes different predictions across hypotheses",
        fixHint:
          "Rewrite tests as prediction tables: H1/H2/H3 predict different outcomes; remove tests that don't discriminate.",
      },
      {
        id: "test-exclusion-logic",
        label: "Each test states exclusion logic (what outcome rules out what)",
        fixHint:
          "Add an explicit 'If we observe X, we exclude H2 because…' for each hypothesis/test pair.",
      },
      {
        id: "test-potency",
        label: "Each test includes a potency check (🎭) for null/ambiguous outcomes",
        fixHint:
          "Ask the agent: 'If null, what do we learn? If ambiguous, redesign the test until it's informative.'",
      },
      {
        id: "test-ranking",
        label: "Tests are ranked by discriminative power + feasibility",
        fixHint:
          "Require a ranked list and pick the top 1 test that eliminates the most hypotheses with realistic effort.",
      },
    ],
  },
  {
    title: "Assumptions & Scale",
    items: [
      {
        id: "assumptions-complete",
        label: "Assumption ledger includes theoretical + methodological + background assumptions",
        fixHint: "Ask for three buckets and ensure at least 3–5 assumptions per hypothesis.",
      },
      {
        id: "scale-check",
        label: "Scale checks include numbers or order-of-magnitude estimates (⊙)",
        fixHint:
          "Demand explicit numbers: 'Give rough magnitudes; if unknown, bound ranges and state what would falsify them.'",
      },
    ],
  },
  {
    title: "Critique & Next Steps",
    items: [
      {
        id: "critique-framing",
        label: "Adversarial critique attacks the framing (not just details)",
        fixHint: "Ask for 1–2 alternative framings and why your current framing might be wrong.",
      },
      {
        id: "next-steps",
        label: "Next steps are specific and test-first (not vague reading)",
        fixHint:
          "Ask for the single most discriminative next test + the minimum evidence needed to run it.",
      },
    ],
  },
];

/**
 * All checklist items flattened for iteration.
 */
export const ALL_CHECKLIST_ITEMS: ChecklistItem[] = REVIEW_CHECKLIST_GROUPS.flatMap((g) => g.items);

// ============================================================================
// Verification Questions (Step 4)
// ============================================================================

export const VERIFICATION_QUESTIONS: VerificationQuestion[] = [
  {
    question: "What makes an experiment 'discriminative' rather than 'confirmation-seeking'?",
    expectation:
      "Should mention that discriminative experiments can rule out hypotheses, not just confirm favorites.",
  },
  {
    question: "When should I use Level Split vs Object Transpose?",
    expectation:
      "Level Split for different scales/levels of analysis; Object Transpose for reversed causation or alternative framings.",
  },
  {
    question: "What is a 'third alternative' and why is it important?",
    expectation:
      "A hypothesis that is neither of the obvious options; important because the 'obvious' debate might be wrong on both sides.",
  },
  {
    question: "How do I know if my hypothesis is at the right level of abstraction?",
    expectation:
      "Should mention Level Split (Σ) and checking if the hypothesis is testable at its stated level.",
  },
];

// ============================================================================
// Operator Checks (Step 4)
// ============================================================================

export const OPERATOR_CHECKS: OperatorCheck[] = [
  {
    title: "Level Split (Σ)",
    check: "Breaking problems into appropriate levels of analysis",
  },
  {
    title: "Exclusion Test (⊘)",
    check: "Designing experiments that can falsify hypotheses",
  },
  {
    title: "Object Transpose (⟳)",
    check: "Considering reversed causation and third variables",
  },
  {
    title: "Scale Check (⊙)",
    check: "Verifying effect sizes make physical/biological sense",
  },
];

// ============================================================================
// Success Criteria (Step 4)
// ============================================================================

export const STEP_4_SUCCESS_CRITERIA = [
  "Explain each of the four operators in its own words",
  "Distinguish discriminative experiments from confirmation-seeking",
  "Explain why 'third alternatives' matter",
  "Reference specific concepts from the Brenner corpus",
];

// ============================================================================
// Step Data
// ============================================================================

export const AA_STEP_1: AgentAssistedStepData = {
  id: "aa-1",
  pathId: "agent-assisted",
  stepNumber: 1,
  title: "Why Agent-Assisted?",
  estimatedTime: "~3 min",
  whatYouLearn: [
    "Why having your AI agent internalize methodology is high-leverage",
    "The human-AI collaboration model for research",
    "What distinguishes this from prompting an AI directly",
  ],
  whatYouDo: [
    "Understand the agent-assisted approach",
    "Learn the division of labor between human and AI",
    "Set expectations for the tutorial",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step1,
};

export const AA_STEP_2: AgentAssistedStepData = {
  id: "aa-2",
  pathId: "agent-assisted",
  stepNumber: 2,
  title: "Prerequisites",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to verify your AI agent is properly installed",
    "Tool-specific setup for Claude Code vs Codex",
  ],
  whatYouDo: [
    "Check that Claude Code or Codex is installed",
    "Verify you have the correct subscription tier",
    "Test that the agent can respond",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step2,
  codeBlocks: [
    AA_CODE_BLOCKS.claudeCodeCheck,
    AA_CODE_BLOCKS.claudeCodeTest,
    AA_CODE_BLOCKS.codexCheck,
    AA_CODE_BLOCKS.codexTest,
  ],
};

export const AA_STEP_3: AgentAssistedStepData = {
  id: "aa-3",
  pathId: "agent-assisted",
  stepNumber: 3,
  title: "Clone into Agent Context",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to give your agent access to the BrennerBot codebase",
    "Why file context matters for agent understanding",
  ],
  whatYouDo: [
    "Start an agent session in the brenner_bot directory",
    "Verify the agent can read project files",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step3,
  codeBlocks: [AA_CODE_BLOCKS.agentClone, AA_CODE_BLOCKS.verifyAgentContext],
};

export const AA_STEP_4: AgentAssistedStepData = {
  id: "aa-4",
  pathId: "agent-assisted",
  stepNumber: 4,
  title: "Agent Studies the System",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "How to have your agent systematically study documentation",
    "What the agent should extract from each document",
    "How to verify the agent has internalized the methodology",
  ],
  whatYouDo: [
    "Give your agent the study prompt",
    "Wait while it reads the key documents",
    "Review its summary to verify understanding",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step4,
  checkpoint: AA_CHECKPOINTS.step4,
  codeBlocks: [AA_CODE_BLOCKS.studyPrompt],
};

export const AA_STEP_5: AgentAssistedStepData = {
  id: "aa-5",
  pathId: "agent-assisted",
  stepNumber: 5,
  title: "Define Your Research Problem",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to articulate a research question clearly",
    "Using Brenner operators to refine and strengthen questions",
    "Identifying hidden assumptions in your framing",
  ],
  whatYouDo: [
    "State your initial research question",
    "Have the agent apply Level Split and Object Transpose",
    "Refine the question based on critique",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step5,
  codeBlocks: [AA_CODE_BLOCKS.questionRefinePrompt],
};

export const AA_STEP_6: AgentAssistedStepData = {
  id: "aa-6",
  pathId: "agent-assisted",
  stepNumber: 6,
  title: "Agent Builds the Inputs",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "How to generate a structured hypothesis slate",
    "Building assumption ledgers with proper categorization",
    "Creating genuine third alternatives",
  ],
  whatYouDo: [
    "Give the agent the input generation prompt",
    "Review the hypothesis slate for completeness",
    "Verify third alternatives are genuine (not strawmen)",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step6,
  codeBlocks: [AA_CODE_BLOCKS.inputGenerationPrompt],
};

export const AA_STEP_7: AgentAssistedStepData = {
  id: "aa-7",
  pathId: "agent-assisted",
  stepNumber: 7,
  title: "Agent Runs the Brenner Loop",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "The structure of a complete Brenner research artifact",
    "What makes tests truly discriminative",
    "The role of potency checks in experiment design",
  ],
  whatYouDo: [
    "Give the agent the Brenner Loop prompt with your inputs",
    "Wait while it generates the full artifact",
    "Save the output for review in Step 8",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step7,
  codeBlocks: [AA_CODE_BLOCKS.brennerLoopPrompt],
};

export const AA_STEP_8: AgentAssistedStepData = {
  id: "aa-8",
  pathId: "agent-assisted",
  stepNumber: 8,
  title: "Human Review",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The most common Brenner-loop failure modes",
    "How to surgically request a revision from the agent",
    "How to decide what to do next",
  ],
  whatYouDo: [
    "Run the checklist against the artifact",
    "Request revisions for any failed checks",
    "Archive the artifact and choose next tests",
  ],
  troubleshooting: AA_TROUBLESHOOTING.step8,
  checkpoint: AA_CHECKPOINTS.step8,
  codeBlocks: [AA_CODE_BLOCKS.revisionPrompt],
};

// ============================================================================
// Comparison Data (Step 1)
// ============================================================================

export const DIRECT_PROMPTING_TRAITS = [
  "You write detailed prompts each time",
  "AI follows instructions literally",
  "Context resets with each conversation",
  "You do the methodological thinking",
];

export const AGENT_ASSISTED_TRAITS = [
  "Agent internalizes the methodology once",
  "AI thinks with the method, not just about it",
  "Context persists across the session",
  "Agent provides methodological discipline",
];

export const HUMAN_PROVIDES = [
  "Domain expertise and context",
  "The research question that matters to you",
  "Judgment on what's feasible",
  "Final decisions and direction",
];

export const AGENT_PROVIDES = [
  "Methodological discipline (from Brenner)",
  "Systematic hypothesis generation",
  "Third alternatives you might miss",
  "Structured artifact creation",
];

export const HIGH_LEVERAGE_REASONS = [
  {
    title: "Reusable across questions",
    description:
      "Once the agent has internalized the method, you can apply it to any research question without re-explaining the methodology.",
  },
  {
    title: "Faster iteration",
    description:
      "The agent remembers context within a session, so you can refine hypotheses and tests without starting over.",
  },
  {
    title: "Consistent methodology",
    description:
      "The agent applies Brenner's operators systematically, catching blind spots you might miss under time pressure.",
  },
];

// ============================================================================
// Next Steps (Step 8)
// ============================================================================

export const AA_NEXT_STEPS = [
  {
    title: "Run Another Loop",
    description:
      "Apply the same methodology to a different research question. Your agent already knows the method.",
  },
  {
    title: "Execute the Top Test",
    description:
      "Pick the highest-ranked discriminative test from your artifact and actually run it (or gather evidence).",
  },
  {
    title: "Try Multi-Agent Cockpit",
    description:
      "For more complex research programs, try orchestrating multiple specialized agents working in parallel.",
  },
  {
    title: "Archive Your Artifact",
    description:
      "Save your research artifact as a Session in the BrennerBot web app for future reference.",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all Agent-Assisted steps in order.
 */
export function getAllAgentAssistedSteps(): AgentAssistedStepData[] {
  return [AA_STEP_1, AA_STEP_2, AA_STEP_3, AA_STEP_4, AA_STEP_5, AA_STEP_6, AA_STEP_7, AA_STEP_8];
}

/**
 * Get a specific step by number (1-indexed).
 */
export function getAgentAssistedStep(stepNumber: number): AgentAssistedStepData | undefined {
  const steps = getAllAgentAssistedSteps();
  return steps[stepNumber - 1];
}

/**
 * Get step metadata for progress display.
 */
export function getAgentAssistedStepMeta() {
  return getAllAgentAssistedSteps().map((step) => ({
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    estimatedTime: step.estimatedTime,
  }));
}

/**
 * Get code block by ID.
 */
export function getAACodeBlock(id: string): CodeBlockData | undefined {
  return Object.values(AA_CODE_BLOCKS).find((block) => block.id === id);
}

/**
 * Get all code blocks for a step.
 */
export function getAACodeBlocksForStep(stepNumber: number): CodeBlockData[] {
  const step = getAgentAssistedStep(stepNumber);
  return step?.codeBlocks ?? [];
}

/**
 * Calculate total estimated time for the tutorial.
 */
export function getAATotalEstimatedTime(): string {
  const steps = getAllAgentAssistedSteps();
  let totalMinutes = 0;

  for (const step of steps) {
    const match = step.estimatedTime.match(/~?(\d+)/);
    if (match) {
      totalMinutes += parseInt(match[1], 10);
    }
  }

  return `~${totalMinutes} min`;
}

/**
 * Get checklist group by title.
 */
export function getChecklistGroup(title: string): ChecklistGroup | undefined {
  return REVIEW_CHECKLIST_GROUPS.find((g) => g.title === title);
}

/**
 * Get checklist item by ID.
 */
export function getChecklistItem(id: string): ChecklistItem | undefined {
  return ALL_CHECKLIST_ITEMS.find((item) => item.id === id);
}

/**
 * Get total checklist item count.
 */
export function getChecklistItemCount(): number {
  return ALL_CHECKLIST_ITEMS.length;
}
