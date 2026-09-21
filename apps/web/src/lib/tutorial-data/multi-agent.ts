/**
 * Multi-Agent Cockpit Tutorial Data
 *
 * Centralized content for the advanced multi-agent tutorial track.
 * 10 steps covering full cockpit orchestration with Claude, GPT, and Gemini.
 *
 * @module tutorial-data/multi-agent
 */

import type {
  CheckpointData,
  CodeBlockData,
  TroubleshootingItem,
  TutorialPath,
  TutorialStep,
} from "../tutorial-types";

// ============================================================================
// Path Metadata
// ============================================================================

export const MULTI_AGENT_COCKPIT_PATH: TutorialPath = {
  id: "multi-agent-cockpit",
  title: "Multi-Agent Cockpit",
  description:
    "Orchestrate a research group with Claude, GPT, and Gemini working in parallel via Agent Mail.",
  icon: "users",
  accent: "success",
  estimatedTime: "~2 hours",
  estimatedDuration: "~2 hours",
  difficulty: "advanced",
  audience:
    "Researchers comfortable with terminal tools who want to run structured multi-agent research sessions.",
  prerequisites: [
    "Claude Code (Claude Max subscription)",
    "Codex CLI (GPT Pro subscription)",
    "Gemini CLI (Gemini Ultra subscription)",
    "tmux installed",
    "Completed the Agent-Assisted tutorial",
  ],
  totalSteps: 10,
  stepCount: 10,
  available: true,
  href: "/tutorial/multi-agent",
};

// ============================================================================
// Step Definitions
// ============================================================================

export interface MultiAgentStepData extends TutorialStep {
  cliCommands?: string[];
}

export const MAC_STEP_1: MultiAgentStepData = {
  id: "mac-1",
  pathId: "multi-agent-cockpit",
  stepNumber: 1,
  title: "Install Infrastructure",
  estimatedTime: "~15 min",
  whatYouLearn: [
    "How to orchestrate multiple terminal sessions",
    "The Agent Mail message-passing architecture",
  ],
  whatYouDo: [
    "Install ntm (Named Tmux Manager)",
    "Install and start Agent Mail",
    "Install the brenner CLI",
    "Verify all tools with `brenner doctor`",
  ],
  cliCommands: [
    "cargo install ntm",
    "cd /path/to/mcp_agent_mail && bash scripts/run_server_with_token.sh",
    "bun build --compile ./brenner.ts --outfile brenner",
    "./brenner doctor",
  ],
};

export const MAC_STEP_2: MultiAgentStepData = {
  id: "mac-2",
  pathId: "multi-agent-cockpit",
  stepNumber: 2,
  title: "Configure Agent Subscriptions",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Subscription-based agent access (no API keys in code)",
    "How CLI tools authenticate via existing subscriptions",
  ],
  whatYouDo: [
    "Verify Claude Code is authenticated (Claude Max)",
    "Verify Codex CLI is authenticated (GPT Pro)",
    "Verify Gemini CLI is authenticated (Gemini Ultra)",
  ],
  cliCommands: ["claude --version", "codex --version", "gemini --version"],
};

export const MAC_STEP_3: MultiAgentStepData = {
  id: "mac-3",
  pathId: "multi-agent-cockpit",
  stepNumber: 3,
  title: "Define Your Roster",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Role-based agent orchestration",
    "The three canonical Brenner roles",
    "Agent Mail identity registration",
  ],
  whatYouDo: [
    "Register agent identities in Agent Mail",
    "Map agents to Brenner roles",
    "Verify roster with `brenner mail agents`",
  ],
  cliCommands: ['./brenner mail agents --project-key "$PWD"'],
};

export const MAC_STEP_4: MultiAgentStepData = {
  id: "mac-4",
  pathId: "multi-agent-cockpit",
  stepNumber: 4,
  title: "Write Your Kickoff Prompt",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Multi-agent prompt design",
    "How to seed productive disagreement",
    "Excerpt-based grounding in primary sources",
  ],
  whatYouDo: [
    "Search the corpus for relevant sections",
    "Build an excerpt from transcript sections",
    "Compose a kickoff prompt with research question",
  ],
  cliCommands: [
    './brenner corpus search "your topic"',
    "./brenner excerpt build --sections 58,78,161 > excerpt.md",
    "./brenner prompt compose --excerpt-file excerpt.md",
  ],
};

export const MAC_STEP_5: MultiAgentStepData = {
  id: "mac-5",
  pathId: "multi-agent-cockpit",
  stepNumber: 5,
  title: "Launch the Session",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The session start workflow",
    "How Agent Mail threads work",
    "Role-separated vs unified kickoff modes",
  ],
  whatYouDo: [
    "Create an ntm session with agent panes",
    "Send role-separated kickoff messages",
    "Verify messages are delivered",
  ],
  cliCommands: [
    'export THREAD_ID="RS-$(date +%Y%m%d)-your-topic"',
    "ntm new $THREAD_ID --layout=3-agent",
    './brenner session start --project-key "$PWD" --thread-id $THREAD_ID --sender GreenCastle --to BlueLake,PurpleMountain,GreenValley --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,GreenValley=adversarial_critic" --excerpt-file excerpt.md --question "Your research question"',
  ],
};

export const MAC_STEP_6: MultiAgentStepData = {
  id: "mac-6",
  pathId: "multi-agent-cockpit",
  stepNumber: 6,
  title: "Monitor Agent Collaboration",
  estimatedTime: "~30 min",
  whatYouLearn: [
    "Reading multi-agent conversation flows",
    "When and how to intervene as operator",
    "Delta format and structured output",
  ],
  whatYouDo: [
    "Watch agents produce deltas in tmux panes",
    "Check session status periodically",
    "Intervene if agents stall or produce invalid output",
  ],
  cliCommands: [
    './brenner session status --project-key "$PWD" --thread-id $THREAD_ID --watch',
    "ntm broadcast $THREAD_ID 'Please check your Agent Mail inbox'",
  ],
};

export const MAC_STEP_7: MultiAgentStepData = {
  id: "mac-7",
  pathId: "multi-agent-cockpit",
  stepNumber: 7,
  title: "Compile Deltas into Artifact",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "The delta merge algorithm",
    "Artifact structure and versioning",
    "Linting and validation",
  ],
  whatYouDo: [
    "Compile agent deltas into a unified artifact",
    "Review the linting report",
    "Write the artifact to disk",
    "Publish back to the Agent Mail thread",
  ],
  cliCommands: [
    './brenner session compile --project-key "$PWD" --thread-id $THREAD_ID > artifact.md',
    './brenner session publish --project-key "$PWD" --thread-id $THREAD_ID --sender GreenCastle --to BlueLake,PurpleMountain,GreenValley',
  ],
};

export const MAC_STEP_8: MultiAgentStepData = {
  id: "mac-8",
  pathId: "multi-agent-cockpit",
  stepNumber: 8,
  title: "Score the Session",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "The 7-dimension evaluation rubric",
    "How to identify session quality gaps",
    "Using feedback to guide next rounds",
  ],
  whatYouDo: [
    "Score the session with the Brenner scorecard",
    "Review dimension-by-dimension breakdown",
    "Generate improvement feedback",
  ],
  cliCommands: ["./brenner score $SESSION_ID", "./brenner feedback $SESSION_ID"],
};

export const MAC_STEP_9: MultiAgentStepData = {
  id: "mac-9",
  pathId: "multi-agent-cockpit",
  stepNumber: 9,
  title: "Iterate or Publish",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Multi-session research programs",
    "When to iterate vs when to conclude",
    "Sharing artifacts with collaborators",
  ],
  whatYouDo: [
    "Decide whether to run another round",
    "Create a research program if continuing",
    "Export the artifact for external review",
  ],
  cliCommands: [
    './brenner program create --name "Your Program" --description "..."',
    "./brenner program add-session RP-... --session $SESSION_ID",
  ],
};

export const MAC_STEP_10: MultiAgentStepData = {
  id: "mac-10",
  pathId: "multi-agent-cockpit",
  stepNumber: 10,
  title: "Teardown and Review",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Resource management for multi-agent setups",
    "Post-session retrospective practices",
    "Recording sessions for replay",
  ],
  whatYouDo: [
    "Stop Agent Mail and ntm sessions",
    "Record the session for replay",
    "Review the leaderboard",
  ],
  cliCommands: [
    "./brenner session record --session-dir ./artifacts/$THREAD_ID --out-file record.json",
    "./brenner leaderboard",
  ],
};

// ============================================================================
// Code Blocks
// ============================================================================

export const MAC_CODE_BLOCKS: Record<string, CodeBlockData> = {
  installNtm: {
    id: "install-ntm",
    code: "cargo install ntm\nntm --version",
    language: "bash",
    title: "Install ntm",
    description: "Named Tmux Manager for multi-agent orchestration.",
  },
  startAgentMail: {
    id: "start-agent-mail",
    code: "cd /path/to/mcp_agent_mail\nbash scripts/run_server_with_token.sh\n# Verify: curl http://127.0.0.1:8765/health",
    language: "bash",
    title: "Start Agent Mail",
    description: "The coordination bus for multi-agent messaging.",
  },
  buildBrenner: {
    id: "build-brenner",
    code: "bun build --compile ./brenner.ts --outfile brenner\n./brenner doctor",
    language: "bash",
    title: "Build brenner CLI",
    description: "Compile the CLI into a single executable.",
  },
  corpusSearch: {
    id: "corpus-search",
    code: './brenner corpus search "dimensional reduction"\n./brenner excerpt build --sections 58,78,161 > excerpt.md',
    language: "bash",
    title: "Search and excerpt",
    description: "Find relevant Brenner transcript sections.",
  },
  sessionStart: {
    id: "session-start",
    code: 'export THREAD_ID="RS-$(date +%Y%m%d)-cell-fate"\nntm new $THREAD_ID --layout=3-agent\n\n./brenner session start \\\n  --project-key "$PWD" \\\n  --thread-id $THREAD_ID \\\n  --sender GreenCastle \\\n  --to BlueLake,PurpleMountain,GreenValley \\\n  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,GreenValley=adversarial_critic" \\\n  --excerpt-file excerpt.md \\\n  --question "How do cells determine their position?"',
    language: "bash",
    title: "Launch session",
    description: "Spawn agents and send role-separated kickoffs.",
  },
  sessionWatch: {
    id: "session-watch",
    code: './brenner session status --project-key "$PWD" --thread-id $THREAD_ID --watch --timeout 3600',
    language: "bash",
    title: "Monitor session",
    description: "Poll until all roles have contributed.",
  },
  sessionCompile: {
    id: "session-compile",
    code: './brenner session compile --project-key "$PWD" --thread-id $THREAD_ID > artifact.md\n./brenner session publish --project-key "$PWD" --thread-id $THREAD_ID \\\n  --sender GreenCastle --to BlueLake,PurpleMountain,GreenValley',
    language: "bash",
    title: "Compile and publish",
    description: "Merge deltas into a unified artifact.",
  },
  sessionScore: {
    id: "session-score",
    code: "./brenner score $SESSION_ID\n./brenner feedback $SESSION_ID",
    language: "bash",
    title: "Score the session",
    description: "Evaluate with the 7-dimension Brenner scorecard.",
  },
  sessionRecord: {
    id: "session-record",
    code: "./brenner session record --session-dir ./artifacts/$THREAD_ID --out-file record.json\n./brenner session replay --record-file record.json --mode trace",
    language: "bash",
    title: "Record for replay",
    description: "Capture the session for reproducibility.",
  },
  robotAlternative: {
    id: "robot-alternative",
    code: './brenner session robot \\\n  --session-dir ./artifacts/my-session \\\n  --question "Your research question" \\\n  --excerpt-file excerpt.md \\\n  --max-rounds 3',
    language: "bash",
    title: "Robot mode (no Agent Mail)",
    description: "Alternative: run locally without Agent Mail infrastructure.",
  },
};

// ============================================================================
// Troubleshooting
// ============================================================================

export const MAC_TROUBLESHOOTING: Record<string, TroubleshootingItem[]> = {
  step1: [
    {
      problem: "ntm not found after cargo install",
      symptoms: ["command not found: ntm"],
      solution: 'Add ~/.cargo/bin to your PATH: export PATH="$HOME/.cargo/bin:$PATH"',
      commands: ['export PATH="$HOME/.cargo/bin:$PATH"', "ntm --version"],
    },
    {
      problem: "Agent Mail won't start",
      symptoms: ["Connection refused on port 8765"],
      solution:
        "Check if another process is using port 8765, or set AGENT_MAIL_PORT to a different port.",
      commands: ["lsof -i :8765", "AGENT_MAIL_PORT=9876 bash scripts/run_server_with_token.sh"],
    },
  ],
  step2: [
    {
      problem: "Claude Code not authenticated",
      symptoms: ["Please log in to Claude"],
      solution:
        "Run `claude` in a terminal — it will prompt for authentication via your Claude Max subscription.",
      commands: ["claude --version"],
    },
  ],
  step5: [
    {
      problem: "Agent Mail: from_agent not registered",
      symptoms: ["from_agent not registered"],
      solution:
        'Register agents with the correct project_key: ./brenner mail agents --project-key "$PWD"',
      commands: ['./brenner mail agents --project-key "$PWD"'],
    },
  ],
  step7: [
    {
      problem: "Compile produces empty artifact",
      symptoms: ["No deltas found", "0 operations applied"],
      solution:
        "Check that agents produced valid delta blocks. Run: ./brenner session diagnose --thread-id $THREAD_ID",
      commands: ['./brenner session diagnose --project-key "$PWD" --thread-id $THREAD_ID'],
    },
  ],
};

// ============================================================================
// Checkpoints
// ============================================================================

export const MAC_CHECKPOINTS: Record<string, CheckpointData> = {
  infrastructure: {
    title: "Infrastructure Ready",
    accomplishments: [
      "ntm, Agent Mail, and brenner CLI installed",
      "All three CLI agents authenticated",
      "brenner doctor passes",
    ],
    nextPreview: "You'll define your roster and compose a kickoff prompt.",
  },
  sessionComplete: {
    title: "Session Complete",
    accomplishments: [
      "Multi-agent session ran successfully",
      "Artifact compiled from 3 agent contributions",
      "Session scored with the 7-dimension rubric",
    ],
    nextPreview: "You can iterate, publish, or start a new research program.",
  },
};

// ============================================================================
// Helpers
// ============================================================================

const ALL_STEPS: MultiAgentStepData[] = [
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
];

export function getAllMultiAgentSteps(): MultiAgentStepData[] {
  return ALL_STEPS;
}

export function getMultiAgentStep(stepNumber: number): MultiAgentStepData | undefined {
  return ALL_STEPS.find((s) => s.stepNumber === stepNumber);
}

export function getMACCodeBlock(id: string): CodeBlockData | undefined {
  return MAC_CODE_BLOCKS[id];
}

export function getMACTotalEstimatedTime(): string {
  return MULTI_AGENT_COCKPIT_PATH.estimatedDuration;
}
