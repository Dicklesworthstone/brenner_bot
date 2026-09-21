/**
 * Coach Context Provider & Hooks
 *
 * Guided Coach Mode for teaching the Brenner Method to new users.
 * Provides inline explanations, worked examples, quality checkpoints,
 * and progressive scaffolding removal.
 *
 * @see brenner_bot-reew.8 (bead)
 * @module brenner-loop/coach-context
 */

"use client";

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ResearchDomain } from "./confound-detection";
import type { SessionPhase } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Coach difficulty level - affects verbosity of explanations
 */
export type CoachLevel = "beginner" | "intermediate" | "advanced";

/**
 * Categories of concepts that can be explained
 */
export type ConceptCategory =
  | "phase"
  | "operator"
  | "hypothesis"
  | "evidence"
  | "agent"
  | "methodology";

/**
 * Concept identifiers for tracking what user has learned
 */
export type ConceptId =
  // Phases
  | "phase_intake"
  | "phase_sharpening"
  | "phase_level_split"
  | "phase_exclusion_test"
  | "phase_object_transpose"
  | "phase_scale_check"
  | "phase_agent_dispatch"
  | "phase_synthesis"
  | "phase_evidence_gathering"
  | "phase_revision"
  | "phase_complete"
  // Core concepts
  | "hypothesis_card"
  | "falsification"
  | "discriminative_power"
  | "mechanism"
  | "predictions"
  | "confidence"
  // Operators
  | "operator_level_split"
  | "operator_exclusion_test"
  | "operator_object_transpose"
  | "operator_scale_check"
  // Agents
  | "agent_devils_advocate"
  | "agent_hypothesis_generator"
  | "agent_test_designer"
  | "agent_tribunal";

/**
 * User-configurable coach settings
 */
export interface CoachSettings {
  /** Whether coach mode is active */
  enabled: boolean;

  /** Current coaching level */
  level: CoachLevel;

  /** Show example walkthroughs */
  showExamples: boolean;

  /** Show explanations for concepts */
  showExplanations: boolean;

  /** Show Brenner quotes for context */
  showBrennerQuotes: boolean;

  /** Show tips during progress */
  showProgressTips: boolean;

  /** Pause workflow to explain concepts */
  pauseForExplanation: boolean;

  /** Require confirmation before major actions */
  requireConfirmation: boolean;
}

/**
 * Track user's learning progress
 */
export interface LearningProgress {
  /** Concepts the user has seen explanations for */
  seenConcepts: Set<ConceptId>;

  /** Number of sessions completed */
  sessionsCompleted: number;

  /** Number of hypotheses formulated */
  hypothesesFormulated: number;

  /** Operators the user has used */
  operatorsUsed: Set<string>;

  /** Mistakes caught and explained */
  mistakesCaught: number;

  /** Quality checkpoints passed */
  checkpointsPassed: number;

  /** First session date */
  firstSessionDate?: string;

  /** Last session date */
  lastSessionDate?: string;
}

/**
 * Coach context value exposed to consumers
 */
export interface CoachContextValue {
  /** Current coach settings */
  settings: CoachSettings;

  /** User's learning progress */
  progress: LearningProgress;

  /** Whether coach mode is active (shorthand) */
  isCoachActive: boolean;

  /** Computed effective level based on progress */
  effectiveLevel: CoachLevel;

  // === Settings Actions ===

  /** Update coach settings */
  updateSettings(updates: Partial<CoachSettings>): void;

  /** Toggle coach mode on/off */
  toggleCoach(): void;

  /** Set coach level */
  setLevel(level: CoachLevel): void;

  /** Reset settings to defaults */
  resetSettings(): void;

  // === Progress Actions ===

  /** Mark a concept as seen/learned */
  markConceptSeen(conceptId: ConceptId): void;

  /** Mark multiple concepts as seen */
  markConceptsSeen(conceptIds: ConceptId[]): void;

  /** Record session completion */
  recordSessionComplete(): void;

  /** Record hypothesis formulation */
  recordHypothesisFormulated(): void;

  /** Record operator usage */
  recordOperatorUsed(operatorId: string): void;

  /** Record mistake caught */
  recordMistakeCaught(): void;

  /** Record checkpoint passed */
  recordCheckpointPassed(): void;

  /** Reset learning progress */
  resetProgress(): void;

  // === Query Methods ===

  /** Check if user has seen a concept */
  hasSeenConcept(conceptId: ConceptId): boolean;

  /** Check if explanation should be shown for a concept */
  shouldShowExplanation(conceptId: ConceptId): boolean;

  /** Get recommended coaching content for current phase */
  getPhaseCoaching(phase: SessionPhase): PhaseCoachingContent;

  /** Check if user needs onboarding */
  needsOnboarding: boolean;
}

/**
 * Coaching content for a specific phase
 */
export interface PhaseCoachingContent {
  /** Phase identifier */
  phase: SessionPhase;

  /** Short title */
  title: string;

  /** Brief explanation (shown always) */
  brief: string;

  /** Full explanation (shown to beginners) */
  full: string;

  /** Key learning points */
  keyPoints: string[];

  /** Related Brenner quote */
  brennerQuote?: {
    text: string;
    section: string;
  };

  /** Common mistakes to watch for */
  commonMistakes: string[];

  /** Example domain-specific content */
  examples: Record<ResearchDomain, string>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: CoachSettings = {
  enabled: true,
  level: "beginner",
  showExamples: true,
  showExplanations: true,
  showBrennerQuotes: true,
  showProgressTips: true,
  pauseForExplanation: true,
  requireConfirmation: true,
};

const DEFAULT_PROGRESS: LearningProgress = {
  seenConcepts: new Set(),
  sessionsCompleted: 0,
  hypothesesFormulated: 0,
  operatorsUsed: new Set(),
  mistakesCaught: 0,
  checkpointsPassed: 0,
};

const STORAGE_KEY_SETTINGS = "brenner-coach-settings";
const STORAGE_KEY_PROGRESS = "brenner-coach-progress";

/**
 * Session thresholds for automatic level progression
 */
const LEVEL_THRESHOLDS = {
  intermediate: 3, // After 3 completed sessions
  advanced: 10, // After 10 completed sessions
};

// ============================================================================
// Phase Coaching Content
// ============================================================================

const PHASE_COACHING: Record<SessionPhase, PhaseCoachingContent> = {
  intake: {
    phase: "intake",
    title: "Hypothesis Intake",
    brief: "Capture your initial hypothesis and the puzzle that prompted it.",
    full: `This is where every research journey begins. You have a puzzle—something that doesn't fit,
an observation that surprised you, or a question that won't let go.

The intake phase helps you articulate what you believe and WHY you believe it. A good hypothesis
isn't just a guess—it proposes a specific mechanism that could be tested.`,
    keyPoints: [
      "State what you believe clearly and specifically",
      "Explain the mechanism—HOW does it work?",
      "Identify what puzzle or observation prompted this",
      "Don't worry about being wrong—that's what testing is for",
    ],
    brennerQuote: {
      text: "The hypothesis is not a destination but a starting point for rigorous inquiry.",
      section: "§12",
    },
    commonMistakes: [
      'Being too vague ("X affects Y" without specifying how)',
      "Stating a correlation without proposing causation",
      "Not specifying the mechanism",
      "Making the hypothesis unfalsifiable",
    ],
    examples: {
      psychology:
        '"Social media use causes depression in teenagers" → Better: "Curated social media content triggers negative social comparison, releasing cortisol and reducing dopamine sensitivity."',
      epidemiology:
        '"Air pollution increases mortality" → Better: "PM2.5 particles cross the blood-brain barrier, triggering neuroinflammation that accelerates cognitive decline."',
      economics:
        '"Education increases income" → Better: "Additional education signals unobservable ability to employers, leading to higher wage offers."',
      biology:
        '"Gene X causes cancer" → Better: "BRCA1 mutations impair DNA double-strand break repair, allowing oncogenic mutations to accumulate."',
      sociology:
        '"Inequality causes crime" → Better: "Visible wealth disparities increase perceived relative deprivation, triggering status-seeking through illicit means."',
      computer_science:
        '"Bigger models perform better" → Better: "Increased model capacity enables learning more fine-grained feature representations."',
      neuroscience:
        '"Sleep improves memory" → Better: "Sleep spindles during NREM trigger hippocampal replay, consolidating episodic memories to neocortex."',
      general: "Start with your observation, then propose HOW and WHY it happens.",
    },
  },

  sharpening: {
    phase: "sharpening",
    title: "Hypothesis Sharpening",
    brief: "Refine vague terms and strengthen your mechanism.",
    full: `Before testing, we need to sharpen the blade. Vague hypotheses can't be falsified—
they just bend to fit any evidence. This phase forces precision.

What exactly do you mean by each term? What specific mechanism are you proposing?
What would you expect to see if you're right? What would prove you wrong?`,
    keyPoints: [
      "Define key terms precisely",
      "Specify the causal mechanism step-by-step",
      "List predictions if true (what MUST happen)",
      "List falsification conditions (what would DISPROVE it)",
    ],
    brennerQuote: {
      text: "A hypothesis that cannot be wrong cannot be right.",
      section: "§45",
    },
    commonMistakes: [
      "Keeping terms vague ('stress', 'performance', 'health')",
      "Not specifying the causal chain",
      "Predictions that are too weak to test",
      "Falsification conditions that are actually just weak support",
    ],
    examples: {
      psychology: "Define 'depression' — clinical diagnosis? PHQ-9 score? Self-reported sadness?",
      epidemiology: "Define 'exposure' — dose? duration? timing in life? route of exposure?",
      economics: "Define 'education' — years? degree? type? quality? timing?",
      biology: "Define 'gene expression' — mRNA levels? protein levels? functional activity?",
      sociology: "Define 'inequality' — income? wealth? opportunity? perception?",
      computer_science: "Define 'performance' — accuracy? latency? throughput? robustness?",
      neuroscience: "Define 'memory' — episodic? semantic? procedural? short-term? long-term?",
      general: "Ask: If someone else read this, would they know exactly what I mean?",
    },
  },

  level_split: {
    phase: "level_split",
    title: "Level Split",
    brief: "Decompose your hypothesis across levels of analysis.",
    full: `One of Brenner's key insights: problems often confuse levels of analysis.
A psychological phenomenon might have social causes; a social pattern might have biological roots.

Level Split forces you to consider: At which level does your mechanism actually operate?
Are you explaining cellular behavior with population statistics? Individual psychology with social forces?`,
    keyPoints: [
      "Identify all relevant levels (molecular, cellular, individual, group, population)",
      "Check: is your mechanism at the right level for your outcome?",
      "Look for level-crossing confounds",
      "Consider both bottom-up and top-down causation",
    ],
    brennerQuote: {
      text: "The failure to distinguish levels of analysis is responsible for more bad science than any other single error.",
      section: "§67",
    },
    commonMistakes: [
      "Explaining individual behavior with group statistics (ecological fallacy)",
      "Assuming micro-causes have macro-effects (composition fallacy)",
      "Ignoring emergent properties at higher levels",
      "Confusing correlation at one level with causation at another",
    ],
    examples: {
      psychology: "Is the effect at neural, cognitive, behavioral, or social level?",
      epidemiology: "Is this an individual risk factor or population-level determinant?",
      economics: "Micro (individual choice) vs macro (aggregate behavior) vs institutional level?",
      biology: "Molecular → cellular → tissue → organ → organism → population?",
      sociology: "Individual → dyad → group → organization → institution → society?",
      computer_science: "Instruction → function → module → system → distributed system?",
      neuroscience: "Synapse → neuron → circuit → region → network → brain → behavior?",
      general: "Ask: at which level does my proposed mechanism actually operate?",
    },
  },

  exclusion_test: {
    phase: "exclusion_test",
    title: "Exclusion Test",
    brief: "Design tests that could PROVE YOU WRONG.",
    full: `This is Brenner's most important contribution: the Exclusion Test. Most research asks
"Is there evidence for my idea?" Brenner asks "What would PROVE ME WRONG?"

A good exclusion test has high discriminative power—it distinguishes your hypothesis from
alternatives. If your hypothesis predicts X but alternatives also predict X, observing X
tells you nothing.`,
    keyPoints: [
      "Focus on what would FALSIFY your hypothesis, not confirm it",
      "Design tests with high discriminative power",
      "Ask: if this test fails, would I actually change my mind?",
      "The best tests put your hypothesis at genuine risk",
    ],
    brennerQuote: {
      text: "Not merely unlikely if the hypothesis is wrong—IMPOSSIBLE if the hypothesis is right.",
      section: "§89",
    },
    commonMistakes: [
      "Designing tests that can only confirm (confirmation bias)",
      "Tests where both success and failure 'support' the hypothesis",
      "Low discriminative power (alternative hypotheses predict the same)",
      "Moving goalposts when tests don't go as expected",
    ],
    examples: {
      psychology:
        "If CBT works via cognitive restructuring, then CBT-without-cognitive-component should fail.",
      epidemiology:
        "If PM2.5 causes mortality, then populations with equal PM2.5 but different compositions should have equal mortality.",
      economics:
        "If education is signaling, then degree-holders should earn more even when employers can directly assess ability.",
      biology: "If gene X is necessary, then knockout should completely prevent the phenotype.",
      sociology:
        "If relative deprivation causes crime, then reducing visible inequality without changing absolute levels should reduce crime.",
      computer_science:
        "If attention is key, then removing attention mechanism should dramatically hurt performance.",
      neuroscience:
        "If hippocampus is necessary for memory, then hippocampal lesion should prevent new memory formation.",
      general: "Ask: What observation would make me abandon this hypothesis?",
    },
  },

  object_transpose: {
    phase: "object_transpose",
    title: "Object Transpose",
    brief: "Generate competing hypotheses that explain the same data.",
    full: `Science isn't just about testing YOUR hypothesis—it's about comparing it to alternatives.
Object Transpose forces you to seriously consider: what ELSE could explain these observations?

The goal isn't to dismiss alternatives but to design tests that discriminate between them.
If you can't distinguish your hypothesis from alternatives, you haven't learned anything.`,
    keyPoints: [
      "Generate at least 2-3 serious alternative hypotheses",
      "Treat alternatives as genuinely possible, not strawmen",
      "Look for predictions that differ between hypotheses",
      "Design tests that discriminate between your hypothesis and alternatives",
    ],
    brennerQuote: {
      text: "The hallmark of good science is not confirming your hypothesis but eliminating the alternatives.",
      section: "§103",
    },
    commonMistakes: [
      "Only considering weak alternatives (strawman opponents)",
      "Ignoring alternatives that explain the data equally well",
      "Not specifying how alternatives differ in predictions",
      "Assuming your hypothesis is 'obvious' or 'the only possibility'",
    ],
    examples: {
      psychology:
        "Social media causes depression OR depressed people use more social media (reverse causation)?",
      epidemiology:
        "Exercise prevents disease OR healthy people exercise more (healthy user bias)?",
      economics: "Education increases productivity OR signals pre-existing ability?",
      biology: "Gene causes phenotype OR is merely correlated with causal gene?",
      sociology: "Culture causes behavior OR behavior creates culture?",
      computer_science: "Architecture matters OR just more parameters?",
      neuroscience: "Region causes behavior OR just correlates with causal region?",
      general: "What else could explain exactly the same observations?",
    },
  },

  scale_check: {
    phase: "scale_check",
    title: "Scale Check",
    brief: "Verify your hypothesis works at the proposed scale.",
    full: `Effects that work in the lab may vanish in the real world. Effects in one population
may not generalize. Scale Check asks: does your hypothesis hold at the scale you care about?

This includes checking effect sizes (is it big enough to matter?), generalizability
(does it work outside the lab?), and practical significance (who cares?).`,
    keyPoints: [
      "Check if lab effects replicate in real-world settings",
      "Verify effect sizes are practically significant",
      "Consider whether results generalize across populations",
      "Ask: even if true, does it matter at scale?",
    ],
    brennerQuote: {
      text: "A statistically significant effect that vanishes at scale is not a discovery—it's an artifact.",
      section: "§118",
    },
    commonMistakes: [
      "Assuming lab effects translate to real-world impact",
      "Ignoring effect sizes in favor of p-values",
      "Generalizing from WEIRD populations to humanity",
      "Confusing statistical significance with practical importance",
    ],
    examples: {
      psychology: "Does a 30-minute intervention with college students generalize to real therapy?",
      epidemiology: "Does a risk factor from one population apply to others?",
      economics: "Do small-scale experiments predict market behavior?",
      biology: "Do in-vitro results predict in-vivo effects?",
      sociology: "Do patterns in one society generalize?",
      computer_science: "Does benchmark performance predict real-world utility?",
      neuroscience: "Do findings in mice translate to humans?",
      general: "Ask: would this matter if it scaled to the real world?",
    },
  },

  agent_dispatch: {
    phase: "agent_dispatch",
    title: "Agent Dispatch",
    brief: "Send your hypothesis to AI agents for adversarial review.",
    full: `Now your hypothesis faces the tribunal. Multiple AI agents with different roles—
devil's advocate, hypothesis generator, test designer—will challenge your thinking.

This isn't about agreement; it's about stress-testing. The agents will find weaknesses
you missed, suggest alternatives you didn't consider, and design tests you wouldn't think of.`,
    keyPoints: [
      "Agents will challenge your assumptions adversarially",
      "Devil's Advocate looks for fatal flaws",
      "Test Designer proposes rigorous tests",
      "Hypothesis Generator suggests alternatives",
    ],
    brennerQuote: {
      text: "The best criticism comes from those who understand your position well enough to attack it effectively.",
      section: "§134",
    },
    commonMistakes: [
      "Dismissing agent criticism without engagement",
      "Cherry-picking only supportive agent feedback",
      "Not revising after legitimate challenges",
      "Treating agent interaction as validation rather than testing",
    ],
    examples: {
      psychology: "Agents will probe your mechanism, sample, and measures.",
      epidemiology: "Agents will challenge confounding and selection.",
      economics: "Agents will question assumptions and identification.",
      biology: "Agents will probe mechanism and alternative pathways.",
      sociology: "Agents will challenge generalizability and causal direction.",
      computer_science: "Agents will question baselines and evaluation.",
      neuroscience: "Agents will probe specificity and alternative explanations.",
      general: "Prepare to defend your hypothesis against smart critics.",
    },
  },

  synthesis: {
    phase: "synthesis",
    title: "Synthesis",
    brief: "Integrate feedback and revise your hypothesis.",
    full: `After the gauntlet of operators and agents, it's time to synthesize.
What did you learn? How should your hypothesis change? What new tests emerged?

Good scientists don't just collect evidence—they update their beliefs. This phase
makes that update explicit and traceable.`,
    keyPoints: [
      "Review all operator findings and agent feedback",
      "Identify which challenges were valid",
      "Revise hypothesis based on legitimate criticism",
      "Note what you learned (even if hypothesis unchanged)",
    ],
    brennerQuote: {
      text: "The willingness to revise is what separates science from dogma.",
      section: "§145",
    },
    commonMistakes: [
      "Ignoring valid criticism to preserve original hypothesis",
      "Over-revising based on every criticism (losing core insight)",
      "Not documenting what changed and why",
      "Treating synthesis as rubber-stamping rather than genuine revision",
    ],
    examples: {
      psychology: "Did agent feedback reveal confounds in your mechanism?",
      epidemiology: "Did scale check reveal generalizability limits?",
      economics: "Did object transpose surface better alternative theories?",
      biology: "Did level split reveal wrong level of analysis?",
      sociology: "Did exclusion test reveal weak discriminative power?",
      computer_science: "Did agents identify evaluation weaknesses?",
      neuroscience: "Did synthesis reveal need for different experiment?",
      general: "What is the strongest version of your hypothesis now?",
    },
  },

  evidence_gathering: {
    phase: "evidence_gathering",
    title: "Evidence Gathering",
    brief: "Collect and record evidence from tests.",
    full: `Theory time is over—now comes evidence. Run your exclusion tests, gather data,
and record what you find. Be honest: pre-register predictions so you can't move goalposts.

Evidence should update your confidence systematically. Strong evidence for: confidence up.
Strong evidence against: confidence down. Ambiguous evidence: stay humble.`,
    keyPoints: [
      "Lock predictions BEFORE gathering evidence",
      "Record all evidence, not just confirming",
      "Update confidence based on evidence strength",
      "Note surprise—where predictions failed",
    ],
    brennerQuote: {
      text: "Evidence that cannot change your mind is not evidence—it's rationalization.",
      section: "§156",
    },
    commonMistakes: [
      "Changing predictions after seeing evidence (HARKing)",
      "Only recording confirming evidence",
      "Not updating confidence when evidence is weak",
      "Rationalizing contradictory evidence away",
    ],
    examples: {
      psychology: "Run your exclusion test; record participant responses.",
      epidemiology: "Analyze your cohort data; note unexpected patterns.",
      economics: "Implement your identification strategy; check robustness.",
      biology: "Run your knockout experiment; measure phenotype.",
      sociology: "Conduct your survey/observation; code responses.",
      computer_science: "Run your ablation study; record metrics.",
      neuroscience: "Collect your imaging/lesion data; analyze patterns.",
      general: "Gather evidence that could change your confidence.",
    },
  },

  revision: {
    phase: "revision",
    title: "Revision",
    brief: "Update your hypothesis based on evidence.",
    full: `Evidence is in. Now comes the hard part: actually updating your beliefs.
If the evidence supported your hypothesis, your confidence should increase.
If it contradicted it, you need to revise or potentially abandon.

The revision phase tracks how your hypothesis evolved—maintaining an audit trail
of what changed and why.`,
    keyPoints: [
      "Update confidence based on evidence",
      "Revise mechanism if evidence suggests changes",
      "Consider abandoning if evidence is decisive",
      "Document evolution for future reference",
    ],
    brennerQuote: {
      text: "The scientist who cannot change their mind when the evidence demands it has ceased to be a scientist.",
      section: "§167",
    },
    commonMistakes: [
      "Not updating confidence after strong evidence",
      "Endlessly revising to fit any evidence (unfalsifiable)",
      "Abandoning too quickly on weak evidence",
      "Not documenting the evolution chain",
    ],
    examples: {
      psychology: "Evidence suggests mechanism is different—revise pathway.",
      epidemiology: "Confound explains effect—lower confidence significantly.",
      economics: "Identification strategy failed—consider alternative theory.",
      biology: "Knockout has unexpected phenotype—revise mechanism.",
      sociology: "Pattern doesn't generalize—narrow scope of hypothesis.",
      computer_science: "Ablation shows component unnecessary—simplify theory.",
      neuroscience: "Region isn't necessary—broaden to network model.",
      general: "How should the evidence change what you believe?",
    },
  },

  complete: {
    phase: "complete",
    title: "Complete",
    brief: "Session complete. Review your research brief.",
    full: `Congratulations! You've completed a full Brenner Loop cycle. Your hypothesis has been
sharpened, split across levels, tested via exclusion, compared to alternatives,
challenged by agents, and updated with evidence.

The research brief summarizes your journey—the hypothesis evolution, key tests,
and current confidence level.`,
    keyPoints: [
      "Review your hypothesis evolution",
      "Check your final confidence level",
      "Note key learnings and surprises",
      "Consider next iteration if needed",
    ],
    brennerQuote: {
      text: "Completion is not the end of inquiry but the foundation for the next cycle.",
      section: "§178",
    },
    commonMistakes: [
      "Treating completion as final truth",
      "Not planning follow-up investigations",
      "Ignoring remaining uncertainties",
      "Forgetting lessons for future hypotheses",
    ],
    examples: {
      psychology: "What did this cycle reveal about your theory of mind?",
      epidemiology: "What exposure-outcome relationships remain uncertain?",
      economics: "What market behavior still needs explanation?",
      biology: "What molecular mechanisms remain unclear?",
      sociology: "What social dynamics need further study?",
      computer_science: "What architectural questions remain?",
      neuroscience: "What brain-behavior relationships need more work?",
      general: "What's the next question this cycle raised?",
    },
  },
};

// ============================================================================
// Reducer
// ============================================================================

interface CoachState {
  settings: CoachSettings;
  progress: LearningProgress;
}

type CoachAction =
  | { type: "UPDATE_SETTINGS"; updates: Partial<CoachSettings> }
  | { type: "TOGGLE_COACH" }
  | { type: "RESET_SETTINGS" }
  | { type: "MARK_CONCEPT_SEEN"; conceptId: ConceptId }
  | { type: "MARK_CONCEPTS_SEEN"; conceptIds: ConceptId[] }
  | { type: "RECORD_SESSION_COMPLETE" }
  | { type: "RECORD_HYPOTHESIS_FORMULATED" }
  | { type: "RECORD_OPERATOR_USED"; operatorId: string }
  | { type: "RECORD_MISTAKE_CAUGHT" }
  | { type: "RECORD_CHECKPOINT_PASSED" }
  | { type: "RESET_PROGRESS" }
  | { type: "HYDRATE"; settings: CoachSettings; progress: LearningProgress };

function coachReducer(state: CoachState, action: CoachAction): CoachState {
  switch (action.type) {
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.updates },
      };

    case "TOGGLE_COACH":
      return {
        ...state,
        settings: { ...state.settings, enabled: !state.settings.enabled },
      };

    case "RESET_SETTINGS":
      return {
        ...state,
        settings: { ...DEFAULT_SETTINGS },
      };

    case "MARK_CONCEPT_SEEN": {
      const newSeen = new Set(state.progress.seenConcepts);
      newSeen.add(action.conceptId);
      return {
        ...state,
        progress: { ...state.progress, seenConcepts: newSeen },
      };
    }

    case "MARK_CONCEPTS_SEEN": {
      const newSeen = new Set(state.progress.seenConcepts);
      for (const conceptId of action.conceptIds) {
        newSeen.add(conceptId);
      }
      return {
        ...state,
        progress: { ...state.progress, seenConcepts: newSeen },
      };
    }

    case "RECORD_SESSION_COMPLETE": {
      const now = new Date().toISOString();
      return {
        ...state,
        progress: {
          ...state.progress,
          sessionsCompleted: state.progress.sessionsCompleted + 1,
          lastSessionDate: now,
          firstSessionDate: state.progress.firstSessionDate ?? now,
        },
      };
    }

    case "RECORD_HYPOTHESIS_FORMULATED":
      return {
        ...state,
        progress: {
          ...state.progress,
          hypothesesFormulated: state.progress.hypothesesFormulated + 1,
        },
      };

    case "RECORD_OPERATOR_USED": {
      const newOps = new Set(state.progress.operatorsUsed);
      newOps.add(action.operatorId);
      return {
        ...state,
        progress: { ...state.progress, operatorsUsed: newOps },
      };
    }

    case "RECORD_MISTAKE_CAUGHT":
      return {
        ...state,
        progress: {
          ...state.progress,
          mistakesCaught: state.progress.mistakesCaught + 1,
        },
      };

    case "RECORD_CHECKPOINT_PASSED":
      return {
        ...state,
        progress: {
          ...state.progress,
          checkpointsPassed: state.progress.checkpointsPassed + 1,
        },
      };

    case "RESET_PROGRESS":
      return {
        ...state,
        progress: {
          seenConcepts: new Set(),
          sessionsCompleted: 0,
          hypothesesFormulated: 0,
          operatorsUsed: new Set(),
          mistakesCaught: 0,
          checkpointsPassed: 0,
        },
      };

    case "HYDRATE":
      return {
        settings: action.settings,
        progress: action.progress,
      };

    default:
      return state;
  }
}

// ============================================================================
// Storage Helpers
// ============================================================================

function serializeProgress(progress: LearningProgress): string {
  return JSON.stringify({
    ...progress,
    seenConcepts: Array.from(progress.seenConcepts),
    operatorsUsed: Array.from(progress.operatorsUsed),
  });
}

function deserializeProgress(json: string): LearningProgress {
  const data = JSON.parse(json) as Record<string, unknown>;

  // Validate and extract fields with type safety
  const seenConcepts = Array.isArray(data.seenConcepts)
    ? new Set(data.seenConcepts as ConceptId[])
    : new Set<ConceptId>();
  const operatorsUsed = Array.isArray(data.operatorsUsed)
    ? new Set(data.operatorsUsed as string[])
    : new Set<string>();

  return {
    seenConcepts,
    operatorsUsed,
    sessionsCompleted: typeof data.sessionsCompleted === "number" ? data.sessionsCompleted : 0,
    hypothesesFormulated:
      typeof data.hypothesesFormulated === "number" ? data.hypothesesFormulated : 0,
    mistakesCaught: typeof data.mistakesCaught === "number" ? data.mistakesCaught : 0,
    checkpointsPassed: typeof data.checkpointsPassed === "number" ? data.checkpointsPassed : 0,
    firstSessionDate: typeof data.firstSessionDate === "string" ? data.firstSessionDate : undefined,
    lastSessionDate: typeof data.lastSessionDate === "string" ? data.lastSessionDate : undefined,
  };
}

const VALID_LEVELS = new Set<CoachLevel>(["beginner", "intermediate", "advanced"]);

function deserializeSettings(json: string): CoachSettings {
  const data = JSON.parse(json) as Record<string, unknown>;

  // Validate level is a valid CoachLevel
  const level =
    typeof data.level === "string" && VALID_LEVELS.has(data.level as CoachLevel)
      ? (data.level as CoachLevel)
      : DEFAULT_SETTINGS.level;

  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_SETTINGS.enabled,
    level,
    showExamples:
      typeof data.showExamples === "boolean" ? data.showExamples : DEFAULT_SETTINGS.showExamples,
    showExplanations:
      typeof data.showExplanations === "boolean"
        ? data.showExplanations
        : DEFAULT_SETTINGS.showExplanations,
    showBrennerQuotes:
      typeof data.showBrennerQuotes === "boolean"
        ? data.showBrennerQuotes
        : DEFAULT_SETTINGS.showBrennerQuotes,
    showProgressTips:
      typeof data.showProgressTips === "boolean"
        ? data.showProgressTips
        : DEFAULT_SETTINGS.showProgressTips,
    pauseForExplanation:
      typeof data.pauseForExplanation === "boolean"
        ? data.pauseForExplanation
        : DEFAULT_SETTINGS.pauseForExplanation,
    requireConfirmation:
      typeof data.requireConfirmation === "boolean"
        ? data.requireConfirmation
        : DEFAULT_SETTINGS.requireConfirmation,
  };
}

// ============================================================================
// Context
// ============================================================================

const CoachContext = createContext<CoachContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface CoachProviderProps {
  children: ReactNode;
}

/**
 * Provides coach mode state and actions to child components.
 *
 * Features:
 * - Persists settings and progress to localStorage
 * - Auto-adjusts level based on user progress
 * - Tracks learning for gradual scaffolding removal
 */
export function CoachProvider({ children }: CoachProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(coachReducer, {
    settings: DEFAULT_SETTINGS,
    progress: DEFAULT_PROGRESS,
  });

  // Track whether initial hydration from localStorage is complete
  // to prevent premature persistence of default values
  const hydrated = useRef(false);

  // -------------------------------------------------------------------------
  // Hydration from localStorage
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const settingsJson = localStorage.getItem(STORAGE_KEY_SETTINGS);
      const progressJson = localStorage.getItem(STORAGE_KEY_PROGRESS);

      const settings = settingsJson ? deserializeSettings(settingsJson) : DEFAULT_SETTINGS;
      const progress = progressJson ? deserializeProgress(progressJson) : DEFAULT_PROGRESS;

      dispatch({ type: "HYDRATE", settings, progress });
    } catch (error) {
      console.error("Failed to load coach state from localStorage:", error);
    } finally {
      // Mark hydration complete even on error to allow future persistence
      hydrated.current = true;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Persistence to localStorage
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip persistence until hydration is complete to avoid overwriting saved data
    if (!hydrated.current) return;

    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEY_PROGRESS, serializeProgress(state.progress));
    } catch (error) {
      console.error("Failed to save coach state to localStorage:", error);
    }
  }, [state.settings, state.progress]);

  // -------------------------------------------------------------------------
  // Computed Values
  // -------------------------------------------------------------------------

  const effectiveLevel = useMemo((): CoachLevel => {
    // Override if user explicitly set a level
    if (state.settings.level !== "beginner") {
      return state.settings.level;
    }

    // Auto-adjust based on progress
    if (state.progress.sessionsCompleted >= LEVEL_THRESHOLDS.advanced) {
      return "advanced";
    }
    if (state.progress.sessionsCompleted >= LEVEL_THRESHOLDS.intermediate) {
      return "intermediate";
    }
    return "beginner";
  }, [state.settings.level, state.progress.sessionsCompleted]);

  const needsOnboarding = useMemo((): boolean => {
    return state.progress.sessionsCompleted === 0;
  }, [state.progress.sessionsCompleted]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const updateSettings = useCallback((updates: Partial<CoachSettings>): void => {
    dispatch({ type: "UPDATE_SETTINGS", updates });
  }, []);

  const toggleCoach = useCallback((): void => {
    dispatch({ type: "TOGGLE_COACH" });
  }, []);

  const setLevel = useCallback((level: CoachLevel): void => {
    dispatch({ type: "UPDATE_SETTINGS", updates: { level } });
  }, []);

  const resetSettings = useCallback((): void => {
    dispatch({ type: "RESET_SETTINGS" });
  }, []);

  const markConceptSeen = useCallback((conceptId: ConceptId): void => {
    dispatch({ type: "MARK_CONCEPT_SEEN", conceptId });
  }, []);

  const markConceptsSeen = useCallback((conceptIds: ConceptId[]): void => {
    dispatch({ type: "MARK_CONCEPTS_SEEN", conceptIds });
  }, []);

  const recordSessionComplete = useCallback((): void => {
    dispatch({ type: "RECORD_SESSION_COMPLETE" });
  }, []);

  const recordHypothesisFormulated = useCallback((): void => {
    dispatch({ type: "RECORD_HYPOTHESIS_FORMULATED" });
  }, []);

  const recordOperatorUsed = useCallback((operatorId: string): void => {
    dispatch({ type: "RECORD_OPERATOR_USED", operatorId });
  }, []);

  const recordMistakeCaught = useCallback((): void => {
    dispatch({ type: "RECORD_MISTAKE_CAUGHT" });
  }, []);

  const recordCheckpointPassed = useCallback((): void => {
    dispatch({ type: "RECORD_CHECKPOINT_PASSED" });
  }, []);

  const resetProgress = useCallback((): void => {
    dispatch({ type: "RESET_PROGRESS" });
  }, []);

  // -------------------------------------------------------------------------
  // Query Methods
  // -------------------------------------------------------------------------

  const hasSeenConcept = useCallback(
    (conceptId: ConceptId): boolean => {
      return state.progress.seenConcepts.has(conceptId);
    },
    [state.progress.seenConcepts],
  );

  const shouldShowExplanation = useCallback(
    (conceptId: ConceptId): boolean => {
      if (!state.settings.enabled) return false;
      if (!state.settings.showExplanations) return false;

      // Always show for beginners
      if (effectiveLevel === "beginner") return true;

      // For intermediate/advanced, only show if not seen
      return !state.progress.seenConcepts.has(conceptId);
    },
    [state.settings, state.progress.seenConcepts, effectiveLevel],
  );

  const getPhaseCoaching = useCallback((phase: SessionPhase): PhaseCoachingContent => {
    return PHASE_COACHING[phase];
  }, []);

  // -------------------------------------------------------------------------
  // Context Value
  // -------------------------------------------------------------------------

  const value = useMemo(
    (): CoachContextValue => ({
      settings: state.settings,
      progress: state.progress,
      isCoachActive: state.settings.enabled,
      effectiveLevel,

      updateSettings,
      toggleCoach,
      setLevel,
      resetSettings,

      markConceptSeen,
      markConceptsSeen,
      recordSessionComplete,
      recordHypothesisFormulated,
      recordOperatorUsed,
      recordMistakeCaught,
      recordCheckpointPassed,
      resetProgress,

      hasSeenConcept,
      shouldShowExplanation,
      getPhaseCoaching,
      needsOnboarding,
    }),
    [
      state.settings,
      state.progress,
      effectiveLevel,
      updateSettings,
      toggleCoach,
      setLevel,
      resetSettings,
      markConceptSeen,
      markConceptsSeen,
      recordSessionComplete,
      recordHypothesisFormulated,
      recordOperatorUsed,
      recordMistakeCaught,
      recordCheckpointPassed,
      resetProgress,
      hasSeenConcept,
      shouldShowExplanation,
      getPhaseCoaching,
      needsOnboarding,
    ],
  );

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the full coach context.
 *
 * @throws Error if used outside CoachProvider
 */
export function useCoach(): CoachContextValue {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error("useCoach must be used within a CoachProvider");
  }
  return context;
}

/**
 * Check if coach mode is active.
 *
 * Convenience hook that just returns the enabled state.
 */
export function useCoachActive(): boolean {
  const { isCoachActive } = useCoach();
  return isCoachActive;
}

/**
 * Get coaching content for current phase.
 *
 * @param phase - The current session phase
 * @returns Phase-specific coaching content
 */
export function usePhaseCoaching(phase: SessionPhase): PhaseCoachingContent {
  const { getPhaseCoaching } = useCoach();
  return useMemo(() => getPhaseCoaching(phase), [getPhaseCoaching, phase]);
}

/**
 * Get coach level and progress info.
 *
 * @returns Object with level and progress information
 */
export function useCoachProgress(): {
  level: CoachLevel;
  sessionsCompleted: number;
  needsOnboarding: boolean;
} {
  const { effectiveLevel, progress, needsOnboarding } = useCoach();
  return {
    level: effectiveLevel,
    sessionsCompleted: progress.sessionsCompleted,
    needsOnboarding,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { CoachContext, LEVEL_THRESHOLDS, PHASE_COACHING };
