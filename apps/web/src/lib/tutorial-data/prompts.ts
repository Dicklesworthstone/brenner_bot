/**
 * Prompt Templates Library
 *
 * Versioned, tested prompts for Agent-Assisted tutorial paths.
 * These prompts are the primary interface between users and their AI agents.
 *
 * @see brenner_bot-u38r (Tutorial Content: Prompt Templates Library)
 * @module tutorial-data/prompts
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A versioned prompt template with metadata for testing and maintenance.
 */
export interface PromptTemplate {
  /** Unique identifier for the prompt */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** ISO date when last tested */
  lastTested: string;
  /** Agents/models the prompt has been verified with */
  testedWith: string[];
  /** Known issues or limitations */
  knownIssues?: string[];
  /** The actual prompt content */
  content: string;
  /** Why this prompt is structured this way */
  explanation: string;
  /** Placeholders the user needs to fill in */
  variables?: PromptVariable[];
  /** Which tutorial step(s) use this prompt */
  usedIn: string[];
  /** Tags for filtering */
  tags: string[];
}

/**
 * A placeholder variable in a prompt template.
 */
export interface PromptVariable {
  /** The placeholder text (e.g., "[YOUR QUESTION]") */
  placeholder: string;
  /** What the user should put here */
  description: string;
  /** Example value */
  example?: string;
  /** Whether this is required */
  required: boolean;
}

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Agent Onboarding Prompt (Step 4)
 *
 * Has the agent systematically study the Brenner methodology by reading
 * key documents and summarizing its understanding.
 */
export const AGENT_ONBOARDING_PROMPT: PromptTemplate = {
  id: "agent-onboarding",
  name: "Agent Onboarding",
  version: "1.0.0",
  lastTested: "2026-01-04",
  testedWith: ["Claude Code (opus-4.5)", "Codex CLI (gpt-5)"],
  content: `Please study the Brenner methodology by reading these documents in order:

1. First, read README.md to understand the project overview
2. Then read specs/operator_library_v0.1.md to learn the four cognitive operators
3. Finally, read one of the distillation files (e.g., final_distillation_of_brenner_method_by_opus45.md)

After reading, provide a summary that includes:
- The core insight of Brenner's approach to scientific research
- The four operators (Level Split, Exclusion Test, Object Transpose, Scale Check) and what each does
- The concept of "discriminative experiments" vs confirmation-seeking
- How to generate "third alternatives"

Take your time to read carefully. This will inform how you help with research questions.`,
  explanation: `This prompt ensures the agent builds a working understanding of the methodology
before attempting to apply it. The ordered reading list moves from overview to specifics.
The summary requirements verify the agent grasped the key concepts.`,
  usedIn: ["agent-assisted/4"],
  tags: ["onboarding", "methodology", "study"],
};

/**
 * Input Generation Prompt (Step 6)
 *
 * Has the agent generate the formal inputs for a Brenner research loop:
 * hypothesis slate, assumption ledger, third alternatives, and scale checks.
 */
export const INPUT_GENERATION_PROMPT: PromptTemplate = {
  id: "input-generation",
  name: "Input Generation",
  version: "1.0.0",
  lastTested: "2026-01-04",
  testedWith: ["Claude Code (opus-4.5)", "Codex CLI (gpt-5)"],
  variables: [
    {
      placeholder: "[YOUR REFINED QUESTION FROM STEP 5]",
      description: "Your research question after refinement in Step 5",
      example: "What mechanism explains the observed correlation between X and Y in population Z?",
      required: true,
    },
  ],
  content: `Now I need you to build the formal inputs for a Brenner research loop. My refined research question is:

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
  explanation: `This prompt structures the input generation using all four Brenner operators.
The explicit section headers ensure the agent produces organized output. The minimum
requirements (4+ hypotheses, categorized assumptions) prevent shallow responses.
Referencing the operators by name reinforces the methodology.`,
  usedIn: ["agent-assisted/6"],
  tags: ["hypothesis", "assumptions", "generation"],
};

/**
 * Brenner Loop Execution Prompt (Step 7)
 *
 * Has the agent run the full Brenner loop, producing discriminative tests,
 * potency rankings, and a complete research artifact.
 */
export const BRENNER_LOOP_PROMPT: PromptTemplate = {
  id: "brenner-loop",
  name: "Brenner Loop Execution",
  version: "1.0.0",
  lastTested: "2026-01-04",
  testedWith: ["Claude Code (opus-4.5)", "Codex CLI (gpt-5)"],
  variables: [
    {
      placeholder: "[PASTE YOUR REFINED QUESTION FROM STEP 5]",
      description: "Your refined research question",
      required: true,
    },
    {
      placeholder: "[PASTE THE HYPOTHESIS SLATE FROM STEP 6]",
      description: "The hypothesis slate generated in Step 6",
      required: true,
    },
    {
      placeholder: "[PASTE THE ASSUMPTION LEDGER FROM STEP 6]",
      description: "The assumption ledger from Step 6",
      required: true,
    },
    {
      placeholder: "[PASTE THE THIRD ALTERNATIVES FROM STEP 6]",
      description: "Third alternatives identified in Step 6",
      required: true,
    },
    {
      placeholder: "[PASTE ANY SCALE CHECK NOTES FROM STEP 6]",
      description: "Scale check notes (if any) from Step 6",
      required: false,
    },
  ],
  content: `I want you to run a full Brenner Loop on my research question using the artifacts you already generated.

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
  explanation: `This is the core prompt that produces the research artifact. The strict output
format ensures consistency across sessions. The Brenner disciplines section reminds the agent
of key principles. The potency check requirement prevents weak tests. The "single triangulated
kernel" forces prioritization rather than listing everything equally.`,
  usedIn: ["agent-assisted/7"],
  tags: ["loop", "tests", "discriminative", "artifact"],
};

/**
 * Artifact Revision Prompt (Step 8)
 *
 * Used when the human review identifies issues with the agent's artifact.
 * Guides targeted revisions while maintaining structure.
 */
export const ARTIFACT_REVISION_PROMPT: PromptTemplate = {
  id: "artifact-revision",
  name: "Artifact Revision",
  version: "1.0.0",
  lastTested: "2026-01-04",
  testedWith: ["Claude Code (opus-4.5)", "Codex CLI (gpt-5)"],
  variables: [
    {
      placeholder: "[LIST THE FAILED CHECKS HERE]",
      description: "The checklist items that failed during human review (from Step 8)",
      example:
        "- Tests are not discriminative (same predictions across hypotheses)\n- Missing potency check for Test 2",
      required: true,
    },
  ],
  content: `Your previous artifact is close, but it fails some Brenner review checks:

[LIST THE FAILED CHECKS HERE]

Please revise the artifact, keeping the same section headings and structure. For each fix:
- Make the change as minimally as possible
- Explicitly mark additions with "NEW:" so I can spot them
- Ensure tests are discriminative (different predictions across hypotheses)
- Ensure every test has a potency check (what we learn if null)

Return the updated artifact in full.`,
  explanation: `This revision prompt maintains consistency with the original artifact while
targeting specific issues. The "NEW:" markers make changes visible for human review.
The minimal change requirement prevents the agent from rewriting everything.`,
  usedIn: ["agent-assisted/8"],
  tags: ["revision", "review", "fixes"],
};

// ============================================================================
// Prompt Registry
// ============================================================================

/**
 * All available prompt templates, indexed by ID.
 */
export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  [AGENT_ONBOARDING_PROMPT.id]: AGENT_ONBOARDING_PROMPT,
  [INPUT_GENERATION_PROMPT.id]: INPUT_GENERATION_PROMPT,
  [BRENNER_LOOP_PROMPT.id]: BRENNER_LOOP_PROMPT,
  [ARTIFACT_REVISION_PROMPT.id]: ARTIFACT_REVISION_PROMPT,
};

/**
 * Get all prompts as an array, sorted by typical usage order.
 */
export function getAllPrompts(): PromptTemplate[] {
  return [
    AGENT_ONBOARDING_PROMPT,
    INPUT_GENERATION_PROMPT,
    BRENNER_LOOP_PROMPT,
    ARTIFACT_REVISION_PROMPT,
  ];
}

/**
 * Get prompts filtered by tag.
 */
export function getPromptsByTag(tag: string): PromptTemplate[] {
  return getAllPrompts().filter((p) => p.tags.includes(tag));
}

/**
 * Get prompts used in a specific tutorial step.
 */
export function getPromptsForStep(stepPath: string): PromptTemplate[] {
  return getAllPrompts().filter((p) => p.usedIn.includes(stepPath));
}

/**
 * Replace variables in a prompt with provided values.
 */
export function fillPromptVariables(
  prompt: PromptTemplate,
  values: Record<string, string>,
): string {
  let result = prompt.content;
  for (const variable of prompt.variables || []) {
    const value = values[variable.placeholder];
    if (value) {
      result = result.replace(variable.placeholder, value);
    }
  }
  return result;
}

/**
 * Get all unique tags from the prompt registry.
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const prompt of getAllPrompts()) {
    for (const tag of prompt.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
