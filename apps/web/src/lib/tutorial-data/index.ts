/**
 * Tutorial Data Module
 *
 * Centralized content and data for all tutorial paths.
 * Exports step metadata, code examples, troubleshooting, and prompts.
 *
 * @module tutorial-data
 */

export type {
  AgentAssistedStepData,
  ChecklistGroup,
  ChecklistItem,
  OperatorCheck,
  VerificationQuestion,
} from "./agent-assisted";
// Agent-Assisted path content
export {
  // Checkpoints
  AA_CHECKPOINTS,
  // Code blocks
  AA_CODE_BLOCKS,
  // Next steps (Step 8)
  AA_NEXT_STEPS,
  // Individual steps
  AA_STEP_1,
  AA_STEP_2,
  AA_STEP_3,
  AA_STEP_4,
  AA_STEP_5,
  AA_STEP_6,
  AA_STEP_7,
  AA_STEP_8,
  // Troubleshooting
  AA_TROUBLESHOOTING,
  // Path metadata
  AGENT_ASSISTED_PATH,
  AGENT_ASSISTED_TRAITS,
  AGENT_PROVIDES,
  ALL_CHECKLIST_ITEMS,
  // Comparison data (Step 1)
  DIRECT_PROMPTING_TRAITS,
  getAACodeBlock,
  getAACodeBlocksForStep,
  getAATotalEstimatedTime,
  getAgentAssistedStep,
  getAgentAssistedStepMeta,
  // Helper functions
  getAllAgentAssistedSteps,
  getChecklistGroup,
  getChecklistItem,
  getChecklistItemCount,
  HIGH_LEVERAGE_REASONS,
  HUMAN_PROVIDES,
  OPERATOR_CHECKS,
  // Review checklist
  REVIEW_CHECKLIST_GROUPS,
  STEP_4_SUCCESS_CRITERIA,
  // Verification (Step 4)
  VERIFICATION_QUESTIONS,
} from "./agent-assisted";
export type { TutorialDomainExample, TutorialExampleDomain } from "./examples";
// Domain examples (worked artifacts)
export {
  BIOLOGY_CELL_FATE_EXAMPLE,
  CS_LLM_HALLUCINATION_EXAMPLE,
  getAllTutorialDomainExamples,
  getTutorialDomainExample,
  getTutorialDomainExamplesByDomain,
  SOCIAL_COMMUNITY_TOXICITY_EXAMPLE,
  TUTORIAL_DOMAIN_EXAMPLES,
} from "./examples";
export type { MultiAgentStepData } from "./multi-agent";
// Multi-Agent Cockpit path content
export {
  // Helper functions
  getAllMultiAgentSteps,
  getMACCodeBlock,
  getMACTotalEstimatedTime,
  getMultiAgentStep,
  // Checkpoints
  MAC_CHECKPOINTS,
  // Code blocks
  MAC_CODE_BLOCKS,
  // Individual steps
  MAC_STEP_1,
  MAC_STEP_2,
  MAC_STEP_3,
  MAC_STEP_4,
  MAC_STEP_5,
  MAC_STEP_6,
  MAC_STEP_7,
  MAC_STEP_8,
  MAC_STEP_9,
  MAC_STEP_10,
  // Troubleshooting
  MAC_TROUBLESHOOTING,
  // Path metadata
  MULTI_AGENT_COCKPIT_PATH,
} from "./multi-agent";
export type { PromptTemplate, PromptVariable } from "./prompts";
// Prompt templates for Agent-Assisted path
export {
  AGENT_ONBOARDING_PROMPT,
  ARTIFACT_REVISION_PROMPT,
  BRENNER_LOOP_PROMPT,
  fillPromptVariables,
  getAllPrompts,
  getAllTags,
  getPromptsByTag,
  getPromptsForStep,
  INPUT_GENERATION_PROMPT,
  PROMPT_REGISTRY,
} from "./prompts";
export type { ArtifactSectionData, QuickStartStepData } from "./quick-start";
// Quick Start path content
export {
  ARTIFACT_PREVIEW_ITEMS,
  // Step 7 data
  ARTIFACT_SECTIONS,
  BRENNER_OPERATORS,
  // Checkpoints
  CHECKPOINTS,
  // Code blocks
  CODE_BLOCKS,
  // Helper functions
  getAllQuickStartSteps,
  getCodeBlock,
  getCodeBlocksForStep,
  getQuickStartStep,
  getQuickStartStepMeta,
  getTotalEstimatedTime,
  // Step 7 next steps
  NEXT_STEPS,
  // Path metadata
  QUICK_START_PATH,
  // Individual steps
  STEP_1,
  STEP_2,
  STEP_3,
  STEP_4,
  STEP_5,
  STEP_6,
  STEP_7,
  // Troubleshooting
  TROUBLESHOOTING,
  // Step 1 data
  TWO_AXIOMS,
} from "./quick-start";
