/**
 * Quick Start Tutorial Content
 *
 * All content for the 7-step Quick Start tutorial path.
 * This file centralizes step metadata, code examples, and troubleshooting.
 *
 * @see brenner_bot-gngu (Tutorial Data: Quick Start content)
 * @module tutorial-data/quick-start
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
 * Extended step data with all content for the Quick Start path.
 */
export interface QuickStartStepData extends TutorialStep {
  /** Code blocks used in this step */
  codeBlocks?: CodeBlockData[];
  /** Checkpoint shown after completing this step */
  checkpoint?: CheckpointData;
}

/**
 * Artifact section data for Step 7.
 */
export interface ArtifactSectionData {
  name: string;
  operator: string;
  color: string;
  description: string;
  whyItMatters: string;
  lookFor: string[];
}

// ============================================================================
// Path Metadata
// ============================================================================

export const QUICK_START_PATH = {
  id: "quick-start",
  title: "Quick Start",
  description: "From zero to research artifact in ~30 minutes. Works with any AI chat interface.",
  estimatedDuration: "~30 min",
  difficulty: "beginner" as const,
  totalSteps: 7,
  prerequisites: ["Terminal access", "Git installed", "Bun installed"],
  available: true,
  href: "/tutorial/quick-start",
};

// ============================================================================
// Code Blocks
// ============================================================================

export const CODE_BLOCKS: Record<string, CodeBlockData> = {
  // Step 2: Prerequisites
  gitCheck: {
    id: "git-check",
    code: "git --version",
    language: "bash",
    title: "Terminal",
    description: "Check if Git is installed",
  },
  bunCheck: {
    id: "bun-check",
    code: "bun --version",
    language: "bash",
    title: "Terminal",
    description: "Check if Bun is installed",
  },
  bunInstall: {
    id: "bun-install",
    code: "curl -fsSL https://bun.sh/install | bash",
    language: "bash",
    title: "Install Bun",
    description: "One-liner to install Bun",
  },
  verifyAll: {
    id: "verify-all",
    code: `git --version
bun --version`,
    language: "bash",
    title: "Terminal",
    description: "Verify both tools are installed",
  },

  // Step 3: Clone & Install
  cloneRepo: {
    id: "clone-repo",
    code: `git clone https://github.com/Dicklesworthstone/brenner_bot.git
cd brenner_bot`,
    language: "bash",
    title: "Terminal",
    description: "Clone the BrennerBot repository",
  },
  installDeps: {
    id: "install-deps",
    code: "bun install",
    language: "bash",
    title: "Terminal",
    description: "Install project dependencies",
  },
  doctorCheck: {
    id: "doctor-check",
    code: "./brenner doctor",
    language: "bash",
    title: "Terminal",
    description: "Verify the installation",
  },
  doctorOutput: {
    id: "doctor-output",
    code: `BrennerBot Doctor Report
========================
✓ Bun runtime: 1.x.x
✓ Dependencies installed
✓ Corpus files present
✓ CLI executable
⚠ Agent Mail: not running (optional for Quick Start)`,
    language: "text",
    title: "Expected Output",
    description: "What you should see from the doctor command",
  },

  // Step 4: Search the Corpus
  searchExample: {
    id: "search-example",
    code: `./brenner corpus search "pattern formation"`,
    language: "bash",
    title: "Terminal",
    description: "Example corpus search",
  },
  searchResults: {
    id: "search-results",
    code: `§58: "The best thing in science is to work out of phase.
      While everyone else is doing X, you should be doing Y..."

§78: "You have to choose the right problem. That's the most
      important thing. And the right problem is one where..."

§161: "The real question is always: what is the mechanism?
       Not what is the correlation, but what causes what..."`,
    language: "text",
    title: "Sample Results",
    description: "Example search results with §n references",
  },
  searchYourTopic: {
    id: "search-your-topic",
    code: `# Replace with your topic
./brenner corpus search "YOUR_TOPIC_HERE"

# Examples:
./brenner corpus search "causation"
./brenner corpus search "experimental design"
./brenner corpus search "hypothesis testing"`,
    language: "bash",
    title: "Terminal",
    description: "Search for your own research topic",
  },

  // Step 5: Build an Excerpt
  excerptBuild: {
    id: "excerpt-build",
    code: `# Replace with YOUR section numbers from Step 4
./brenner excerpt build --sections 58,78,161 > my_excerpt.md

# Or use search to find sections first
./brenner corpus search "your topic" --format sections
./brenner excerpt build --sections THOSE_SECTIONS > my_excerpt.md`,
    language: "bash",
    title: "Terminal",
    description: "Build an excerpt from specific sections",
  },
  excerptView: {
    id: "excerpt-view",
    code: "cat my_excerpt.md",
    language: "bash",
    title: "Terminal",
    description: "View the compiled excerpt",
  },
  excerptExample: {
    id: "excerpt-example",
    code: `# Research Excerpt

## Relevant Brenner Segments

### §58: Working Out of Phase
"The best thing in science is to work out of phase.
While everyone else is doing X, you should be doing Y.
That's how you make real discoveries..."

### §78: Choosing the Right Problem
"You have to choose the right problem. That's the most
important thing. And the right problem is one where you
can actually make progress, where the tools exist..."

### §161: Mechanism vs Correlation
"The real question is always: what is the mechanism?
Not what is the correlation, but what causes what.
Correlation is the beginning, not the end..."`,
    language: "markdown",
    title: "my_excerpt.md",
    description: "Example excerpt file",
  },

  // Step 6: Your First Session
  promptCompose: {
    id: "prompt-compose",
    code: `./brenner prompt compose \\
  --excerpt-file my_excerpt.md \\
  --question "How do cells determine their position in a developing embryo?" \\
  --role unified \\
  --output-file my_prompt.md`,
    language: "bash",
    title: "Terminal",
    description: "Compose a kickoff prompt",
  },
  promptView: {
    id: "prompt-view",
    code: "cat my_prompt.md",
    language: "bash",
    title: "Terminal",
    description: "View the composed prompt",
  },
  saveOutput: {
    id: "save-output",
    code: `# Create a file and paste the response
# (Or copy directly from the AI interface)

# macOS:
pbpaste > my_artifact.md

# Linux (with xclip):
xclip -selection clipboard -o > my_artifact.md

# Or just paste into a text editor and save`,
    language: "bash",
    title: "Terminal",
    description: "Save the AI's response to a file",
  },

  // Step 1: Sample Artifact Preview
  sampleArtifact: {
    id: "sample-artifact",
    code: `# Research Artifact: Cell Fate Determination

## Hypothesis Slate

### H1: Morphogen Gradient Model
Cells determine their fate by reading concentration gradients
of signaling molecules (morphogens) secreted from organizing centers.
- Mechanism: Concentration-dependent transcription factor activation
- Anchors: §58, §78

### H2: Timing Model
Cell fate is determined by intrinsic timing mechanisms that
count cell divisions or developmental stages.
- Mechanism: Sequential gene expression programs
- Anchors: §161

### H3: Third Alternative (Stochastic + Selection)
Initial fate assignment is stochastic, with selection
mechanisms eliminating "incorrect" outcomes.
- Mechanism: Random differentiation + competitive survival
- Anchors: §203

## Discriminative Tests
...`,
    language: "markdown",
    title: "my_artifact.md",
    description: "Sample research artifact preview",
  },
};

// ============================================================================
// Troubleshooting Items
// ============================================================================

export const TROUBLESHOOTING: Record<string, TroubleshootingItem[]> = {
  step1: [
    {
      problem: "This feels too abstract",
      solution: "Skim the sample artifact below to see the concrete output you're aiming for.",
    },
    {
      problem: "Unsure if your question fits",
      solution:
        "Pick a question where different answers would change what you do next (experiment, decision, or model).",
    },
  ],

  step2: [
    {
      problem: "bun: command not found",
      symptoms: ["Terminal shows 'command not found' after running bun"],
      solution:
        "Bun needs to be added to your PATH. Restart your terminal after installing, or source your shell config.",
      commands: ["source ~/.bashrc", "# or: source ~/.zshrc"],
    },
    {
      problem: "Windows: commands don't work in PowerShell",
      symptoms: ["Errors running git or bun in PowerShell"],
      solution:
        "Use WSL2 (Windows Subsystem for Linux) for the best experience. BrennerBot is designed for Unix-like environments.",
      commands: ["wsl --install"],
    },
    {
      problem: "Permission denied errors",
      symptoms: ["'Permission denied' when installing bun"],
      solution:
        "Use the user-level install (no sudo required) or check your directory permissions.",
    },
  ],

  step3: [
    {
      problem: "Clone fails with 'Permission denied (publickey)'",
      symptoms: ["SSH authentication error during git clone"],
      solution: "Use the HTTPS URL instead, or set up SSH keys for GitHub.",
      commands: ["git clone https://github.com/Dicklesworthstone/brenner_bot.git"],
    },
    {
      problem: "bun install hangs or times out",
      symptoms: ["Installation seems stuck", "Network timeouts"],
      solution:
        "Check your internet connection. If behind a corporate proxy, configure Bun's proxy settings.",
    },
    {
      problem: "Doctor command shows warnings",
      symptoms: ["Yellow warnings in doctor output"],
      solution:
        "Warnings about Agent Mail or optional features are fine for Quick Start. Only errors (red) need attention.",
    },
  ],

  step4: [
    {
      problem: "No results found for my search",
      symptoms: ["Empty results", "No matching segments"],
      solution:
        "Try broader or different terms. The corpus uses Brenner's vocabulary, which may differ from modern terminology.",
      commands: ['./brenner corpus search "mechanism"', './brenner corpus search "experiment"'],
    },
    {
      problem: "Command not found: brenner",
      symptoms: ["'brenner' is not recognized"],
      solution: "Make sure you're in the brenner_bot directory and use the full path.",
      commands: ['./brenner corpus search "your topic"'],
    },
  ],

  step5: [
    {
      problem: "Section number not found",
      symptoms: ["Error: section §X not found"],
      solution:
        "Double-check the section number from your search results. Use ./brenner corpus list to see all available sections.",
    },
    {
      problem: "Output file is empty",
      symptoms: ["Created file has no content"],
      solution: "Make sure you're using valid section numbers separated by commas, with no spaces.",
      commands: ["./brenner excerpt build --sections 58,78,161 > my_excerpt.md"],
    },
  ],

  step6: [
    {
      problem: "Prompt file is too long for my AI",
      symptoms: ["Token limit exceeded", "Message too long"],
      solution:
        "Trim your excerpt to fewer sections, or use a model with a larger context window (Claude, GPT-4).",
    },
    {
      problem: "AI doesn't follow the format",
      symptoms: ["Output missing sections", "Unstructured response"],
      solution:
        "Make sure you copied the ENTIRE prompt including all instructions. Some AIs need explicit formatting reminders.",
    },
    {
      problem: "Command not found",
      symptoms: ["brenner: command not found"],
      solution:
        "Make sure you're in the brenner_bot directory and using ./brenner (with the dot-slash).",
      commands: ["cd brenner_bot", "./brenner prompt compose --help"],
    },
  ],

  step7: [
    {
      problem: "Missing a third alternative",
      solution: 'Add an explicit "both could be wrong" hypothesis and re-run the prompt.',
    },
    {
      problem: "Tests don't discriminate",
      solution: "Rewrite tests so at least two hypotheses predict different outcomes.",
    },
  ],
};

// ============================================================================
// Checkpoints
// ============================================================================

export const CHECKPOINTS: Record<string, CheckpointData> = {
  step3: {
    title: "Installation Complete!",
    accomplishments: [
      "Cloned the BrennerBot repository",
      "Installed all dependencies",
      "Verified the installation with doctor",
    ],
    nextPreview: "Next, you'll learn to search Brenner's corpus for relevant wisdom.",
  },

  step7: {
    title: "Tutorial Complete!",
    accomplishments: [
      "Learned what BrennerBot is and the Two Axioms",
      "Set up your local environment",
      "Searched the Brenner corpus",
      "Built a personalized excerpt",
      "Ran your first AI-powered research session",
      "Produced a structured research artifact",
    ],
    nextPreview:
      "You're now ready to iterate on your research or try the Agent-Assisted path for more advanced workflows.",
  },
};

// ============================================================================
// Step Data
// ============================================================================

export const STEP_1: QuickStartStepData = {
  id: "qs-1",
  pathId: "quick-start",
  stepNumber: 1,
  title: "What Is This?",
  estimatedTime: "~3 min",
  whatYouLearn: [
    "Who Sydney Brenner was and why his method matters",
    "The Two Axioms that ground discriminative research",
    "What you'll produce by the end of this tutorial",
  ],
  whatYouDo: [
    "Read the introduction to BrennerBot",
    "Understand the Two Axioms",
    "Preview the research artifact you'll create",
  ],
  troubleshooting: TROUBLESHOOTING.step1,
  codeBlocks: [CODE_BLOCKS.sampleArtifact],
};

export const STEP_2: QuickStartStepData = {
  id: "qs-2",
  pathId: "quick-start",
  stepNumber: 2,
  title: "Prerequisites",
  estimatedTime: "~2 min",
  whatYouLearn: ["How to verify your development environment", "Platform-specific setup tips"],
  whatYouDo: ["Check that Git is installed", "Verify terminal access", "Install Bun (if needed)"],
  troubleshooting: TROUBLESHOOTING.step2,
  codeBlocks: [
    CODE_BLOCKS.gitCheck,
    CODE_BLOCKS.bunCheck,
    CODE_BLOCKS.bunInstall,
    CODE_BLOCKS.verifyAll,
  ],
};

export const STEP_3: QuickStartStepData = {
  id: "qs-3",
  pathId: "quick-start",
  stepNumber: 3,
  title: "Clone & Install",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to set up the local BrennerBot environment",
    "Using the doctor command to verify installation",
  ],
  whatYouDo: [
    "Clone the brenner_bot repository",
    "Install dependencies with bun",
    "Run the doctor command to verify",
  ],
  troubleshooting: TROUBLESHOOTING.step3,
  checkpoint: CHECKPOINTS.step3,
  codeBlocks: [
    CODE_BLOCKS.cloneRepo,
    CODE_BLOCKS.installDeps,
    CODE_BLOCKS.doctorCheck,
    CODE_BLOCKS.doctorOutput,
  ],
};

export const STEP_4: QuickStartStepData = {
  id: "qs-4",
  pathId: "quick-start",
  stepNumber: 4,
  title: "Search the Corpus",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How corpus search finds relevant transcript segments",
    "Understanding §n references for stable citations",
  ],
  whatYouDo: [
    "Run example corpus searches",
    "Search for your own research topic",
    "Note 3-5 §n references that seem relevant",
  ],
  troubleshooting: TROUBLESHOOTING.step4,
  codeBlocks: [CODE_BLOCKS.searchExample, CODE_BLOCKS.searchResults, CODE_BLOCKS.searchYourTopic],
};

export const STEP_5: QuickStartStepData = {
  id: "qs-5",
  pathId: "quick-start",
  stepNumber: 5,
  title: "Build an Excerpt",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "Why excerpts matter for grounding research in Brenner's wisdom",
    "How to compose sections into a personalized reference document",
  ],
  whatYouDo: [
    "Run the excerpt build command with your section numbers",
    "Save the excerpt to a file",
    "Review the compiled content",
  ],
  troubleshooting: TROUBLESHOOTING.step5,
  codeBlocks: [CODE_BLOCKS.excerptBuild, CODE_BLOCKS.excerptView, CODE_BLOCKS.excerptExample],
};

export const STEP_6: QuickStartStepData = {
  id: "qs-6",
  pathId: "quick-start",
  stepNumber: 6,
  title: "Your First Session",
  estimatedTime: "~8 min",
  whatYouLearn: [
    "How to generate structured prompts with the Brenner methodology",
    "Running sessions in 'local mode' with any AI",
  ],
  whatYouDo: [
    "Compose a kickoff prompt using your excerpt",
    "Copy the prompt to your AI chat interface",
    "Run the session and save the output",
  ],
  troubleshooting: TROUBLESHOOTING.step6,
  codeBlocks: [CODE_BLOCKS.promptCompose, CODE_BLOCKS.promptView, CODE_BLOCKS.saveOutput],
};

export const STEP_7: QuickStartStepData = {
  id: "qs-7",
  pathId: "quick-start",
  stepNumber: 7,
  title: "Understand the Output",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The anatomy of a Brenner research artifact",
    "How each section connects to Brenner's operators",
    "What to do next with your artifact",
  ],
  whatYouDo: [
    "Review each section of your artifact",
    "Understand why each section matters",
    "Plan your next steps",
  ],
  troubleshooting: TROUBLESHOOTING.step7,
  checkpoint: CHECKPOINTS.step7,
};

// ============================================================================
// Artifact Sections (Step 7)
// ============================================================================

export const ARTIFACT_SECTIONS: ArtifactSectionData[] = [
  {
    name: "Hypothesis Slate",
    operator: "Level Split (Σ)",
    color: "primary",
    description:
      '2-5 competing explanations for your phenomenon, including at least one genuine "third alternative" that challenges both leading theories.',
    whyItMatters:
      "Brenner never tested a single hypothesis in isolation. Multiple competing explanations force you to think about what would differentiate them.",
    lookFor: [
      "At least 3 distinct hypotheses",
      "A genuine third alternative (not a strawman)",
      "Mechanism specified for each",
      "§n citations from your excerpt",
    ],
  },
  {
    name: "Discriminative Tests",
    operator: "Exclusion Test (⊘)",
    color: "accent",
    description:
      "Tests designed to eliminate hypotheses, not just confirm your favorite. Each test should give a different result depending on which hypothesis is true.",
    whyItMatters:
      '"The best experiment is one that can give a clean answer" — Brenner. Tests that only confirm don\'t advance knowledge as efficiently as tests that discriminate.',
    lookFor: [
      "Tests that produce different outcomes for different hypotheses",
      "Potency checks (what would a negative result mean?)",
      "Feasibility assessment",
      "Priority ranking",
    ],
  },
  {
    name: "Assumption Ledger",
    operator: "Scale Check (⊙)",
    color: "[oklch(0.7_0.15_30)]",
    description:
      "Explicit load-bearing beliefs that your hypotheses rest on. These are the hidden premises that could invalidate your conclusions if wrong.",
    whyItMatters:
      "Every hypothesis depends on assumptions about scale, boundary conditions, and mechanisms. Making them explicit reveals vulnerability points.",
    lookFor: [
      "Scale assumptions (at what level of analysis?)",
      "Boundary conditions (when does this apply?)",
      "Measurement assumptions (how do we observe?)",
      "Mechanism assumptions (what's the causal pathway?)",
    ],
  },
  {
    name: "Adversarial Critique",
    operator: "Object Transpose (⟳)",
    color: "[oklch(0.65_0.2_250)]",
    description:
      "Attacks on your own framing. A devil's advocate perspective that challenges whether you've even asked the right question.",
    whyItMatters:
      "The hardest part of research is realizing your entire frame might be wrong. This section forces confrontation with that possibility.",
    lookFor: [
      "Attacks on the question itself, not just the answers",
      "Alternative framings suggested",
      "Hidden biases exposed",
      '"Real third alternative" check',
    ],
  },
];

// ============================================================================
// Brenner Operators (Step 7)
// ============================================================================

export const BRENNER_OPERATORS = [
  {
    symbol: "Σ",
    name: "Level Split",
    description: "Multiple hypotheses at different levels",
    color: "primary",
  },
  {
    symbol: "⊘",
    name: "Exclusion Test",
    description: "Tests that eliminate alternatives",
    color: "accent",
  },
  {
    symbol: "⊙",
    name: "Scale Check",
    description: "Assumptions and boundary conditions",
    color: "[oklch(0.7_0.15_30)]",
  },
  {
    symbol: "⟳",
    name: "Object Transpose",
    description: "Different perspectives and framings",
    color: "[oklch(0.65_0.2_250)]",
  },
];

// ============================================================================
// Two Axioms (Step 1)
// ============================================================================

export const TWO_AXIOMS = [
  {
    number: 1,
    title: "Reality has a generative grammar",
    description:
      "The world is produced by causal machinery with discoverable rules. Phenomena aren't random — they're generated by underlying mechanisms that we can identify and understand.",
  },
  {
    number: 2,
    title: "To understand is to reconstruct",
    description:
      "You haven't explained something until you can build it from primitives. Description isn't explanation — you need to specify the mechanism that produces the phenomenon.",
  },
];

// ============================================================================
// Artifact Preview Items (Step 1)
// ============================================================================

export const ARTIFACT_PREVIEW_ITEMS = [
  {
    title: "Hypothesis Slate",
    description: '2-5 competing explanations, including a genuine "third alternative"',
  },
  {
    title: "Discriminative Tests",
    description: "Tests designed to separate hypotheses, not just confirm your favorite",
  },
  {
    title: "Assumption Ledger",
    description: "Explicit load-bearing beliefs that your hypotheses depend on",
  },
  {
    title: "Adversarial Critique",
    description: "Attacks on your own framing to strengthen your thinking",
  },
];

// ============================================================================
// Next Steps (Step 7)
// ============================================================================

export const NEXT_STEPS = [
  {
    title: "Refine Your Artifact",
    description:
      "Use the Adversarial Critique section to identify weaknesses, then iterate on your hypotheses and tests.",
  },
  {
    title: "Run Discriminative Tests",
    description:
      "Pick the highest-priority test and actually run it (or gather existing evidence that addresses it).",
  },
  {
    title: "Try Agent-Assisted",
    description:
      "For more sophisticated research, try the Agent-Assisted path with Claude Code or GPT Codex.",
  },
  {
    title: "Explore the Corpus",
    description:
      "Dive deeper into Brenner's wisdom with the full corpus browser at brennerbot.org/corpus.",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all Quick Start steps in order.
 */
export function getAllQuickStartSteps(): QuickStartStepData[] {
  return [STEP_1, STEP_2, STEP_3, STEP_4, STEP_5, STEP_6, STEP_7];
}

/**
 * Get a specific step by number (1-indexed).
 */
export function getQuickStartStep(stepNumber: number): QuickStartStepData | undefined {
  const steps = getAllQuickStartSteps();
  return steps[stepNumber - 1];
}

/**
 * Get step metadata for progress display.
 */
export function getQuickStartStepMeta() {
  return getAllQuickStartSteps().map((step) => ({
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    estimatedTime: step.estimatedTime,
  }));
}

/**
 * Get code block by ID.
 */
export function getCodeBlock(id: string): CodeBlockData | undefined {
  return Object.values(CODE_BLOCKS).find((block) => block.id === id);
}

/**
 * Get all code blocks for a step.
 */
export function getCodeBlocksForStep(stepNumber: number): CodeBlockData[] {
  const step = getQuickStartStep(stepNumber);
  return step?.codeBlocks ?? [];
}

/**
 * Calculate total estimated time for the tutorial.
 */
export function getTotalEstimatedTime(): string {
  // Sum up individual times (they're in "~N min" format)
  const steps = getAllQuickStartSteps();
  let totalMinutes = 0;

  for (const step of steps) {
    const match = step.estimatedTime.match(/~?(\d+)/);
    if (match) {
      totalMinutes += parseInt(match[1], 10);
    }
  }

  return `~${totalMinutes} min`;
}
