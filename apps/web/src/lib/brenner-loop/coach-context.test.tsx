/**
 * Coach Context Tests
 *
 * Tests for the Guided Coach Mode context and hooks.
 *
 * @see brenner_bot-reew.8 (bead)
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CoachLevel,
  CoachProvider,
  LEVEL_THRESHOLDS,
  PHASE_COACHING,
  useCoach,
  useCoachActive,
  useCoachProgress,
  usePhaseCoaching,
} from "./coach-context";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Wrapper for hooks
function wrapper({ children }: { children: React.ReactNode }) {
  return <CoachProvider>{children}</CoachProvider>;
}

describe("CoachProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("provides default settings", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.level).toBe("beginner");
    expect(result.current.settings.showExamples).toBe(true);
    expect(result.current.settings.showExplanations).toBe(true);
  });

  it("provides default progress", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.progress.sessionsCompleted).toBe(0);
    expect(result.current.progress.hypothesesFormulated).toBe(0);
    expect(result.current.progress.seenConcepts.size).toBe(0);
  });

  it("isCoachActive reflects enabled setting", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.isCoachActive).toBe(true);

    act(() => {
      result.current.toggleCoach();
    });

    expect(result.current.isCoachActive).toBe(false);
  });
});

describe("useCoach settings actions", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("updateSettings updates individual settings", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.updateSettings({ showExamples: false });
    });

    expect(result.current.settings.showExamples).toBe(false);
    expect(result.current.settings.showExplanations).toBe(true); // Unchanged
  });

  it("toggleCoach toggles enabled state", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.settings.enabled).toBe(true);

    act(() => {
      result.current.toggleCoach();
    });
    expect(result.current.settings.enabled).toBe(false);

    act(() => {
      result.current.toggleCoach();
    });
    expect(result.current.settings.enabled).toBe(true);
  });

  it("setLevel changes the coaching level", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.setLevel("intermediate");
    });

    expect(result.current.settings.level).toBe("intermediate");
  });

  it("resetSettings restores defaults", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Change some settings
    act(() => {
      result.current.updateSettings({
        showExamples: false,
        level: "advanced",
        pauseForExplanation: false,
      });
    });

    expect(result.current.settings.showExamples).toBe(false);
    expect(result.current.settings.level).toBe("advanced");

    // Reset
    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.showExamples).toBe(true);
    expect(result.current.settings.level).toBe("beginner");
  });
});

describe("useCoach progress actions", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("markConceptSeen adds concept to seen set", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.hasSeenConcept("phase_intake")).toBe(false);

    act(() => {
      result.current.markConceptSeen("phase_intake");
    });

    expect(result.current.hasSeenConcept("phase_intake")).toBe(true);
  });

  it("markConceptsSeen adds multiple concepts", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.markConceptsSeen(["phase_intake", "phase_sharpening", "hypothesis_card"]);
    });

    expect(result.current.hasSeenConcept("phase_intake")).toBe(true);
    expect(result.current.hasSeenConcept("phase_sharpening")).toBe(true);
    expect(result.current.hasSeenConcept("hypothesis_card")).toBe(true);
    expect(result.current.hasSeenConcept("phase_level_split")).toBe(false);
  });

  it("recordSessionComplete increments session count", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.progress.sessionsCompleted).toBe(0);

    act(() => {
      result.current.recordSessionComplete();
    });

    expect(result.current.progress.sessionsCompleted).toBe(1);

    act(() => {
      result.current.recordSessionComplete();
    });

    expect(result.current.progress.sessionsCompleted).toBe(2);
  });

  it("recordHypothesisFormulated increments count", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.recordHypothesisFormulated();
      result.current.recordHypothesisFormulated();
      result.current.recordHypothesisFormulated();
    });

    expect(result.current.progress.hypothesesFormulated).toBe(3);
  });

  it("recordOperatorUsed adds operator to used set", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.recordOperatorUsed("level_split");
      result.current.recordOperatorUsed("exclusion_test");
    });

    expect(result.current.progress.operatorsUsed.has("level_split")).toBe(true);
    expect(result.current.progress.operatorsUsed.has("exclusion_test")).toBe(true);
  });

  it("recordMistakeCaught increments mistake count", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.recordMistakeCaught();
    });

    expect(result.current.progress.mistakesCaught).toBe(1);
  });

  it("recordCheckpointPassed increments checkpoint count", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.recordCheckpointPassed();
      result.current.recordCheckpointPassed();
    });

    expect(result.current.progress.checkpointsPassed).toBe(2);
  });

  it("resetProgress clears all progress", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Accumulate some progress
    act(() => {
      result.current.recordSessionComplete();
      result.current.recordHypothesisFormulated();
      result.current.markConceptSeen("phase_intake");
      result.current.recordOperatorUsed("level_split");
    });

    expect(result.current.progress.sessionsCompleted).toBe(1);

    // Reset
    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress.sessionsCompleted).toBe(0);
    expect(result.current.progress.hypothesesFormulated).toBe(0);
    expect(result.current.progress.seenConcepts.size).toBe(0);
    expect(result.current.progress.operatorsUsed.size).toBe(0);
  });
});

describe("effectiveLevel calculation", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns beginner for new users", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.effectiveLevel).toBe("beginner");
  });

  it("auto-upgrades to intermediate after threshold", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Complete enough sessions to reach intermediate
    act(() => {
      for (let i = 0; i < LEVEL_THRESHOLDS.intermediate; i++) {
        result.current.recordSessionComplete();
      }
    });

    expect(result.current.effectiveLevel).toBe("intermediate");
  });

  it("auto-upgrades to advanced after higher threshold", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Complete enough sessions to reach advanced
    act(() => {
      for (let i = 0; i < LEVEL_THRESHOLDS.advanced; i++) {
        result.current.recordSessionComplete();
      }
    });

    expect(result.current.effectiveLevel).toBe("advanced");
  });

  it("respects explicit level setting over auto", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Set to intermediate explicitly
    act(() => {
      result.current.setLevel("intermediate");
    });

    // Effective level should be intermediate even with 0 sessions
    expect(result.current.effectiveLevel).toBe("intermediate");
  });
});

describe("shouldShowExplanation", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns true for beginners for any concept", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.shouldShowExplanation("phase_intake")).toBe(true);
    expect(result.current.shouldShowExplanation("hypothesis_card")).toBe(true);
  });

  it("returns false when coach is disabled", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.toggleCoach();
    });

    expect(result.current.shouldShowExplanation("phase_intake")).toBe(false);
  });

  it("returns false when showExplanations is disabled", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.updateSettings({ showExplanations: false });
    });

    expect(result.current.shouldShowExplanation("phase_intake")).toBe(false);
  });

  it("returns false for seen concepts at intermediate+ level", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    // Set to intermediate
    act(() => {
      result.current.setLevel("intermediate");
      result.current.markConceptSeen("phase_intake");
    });

    expect(result.current.shouldShowExplanation("phase_intake")).toBe(false);
    expect(result.current.shouldShowExplanation("phase_sharpening")).toBe(true); // Not seen yet
  });
});

describe("needsOnboarding", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns true for users with 0 sessions", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    expect(result.current.needsOnboarding).toBe(true);
  });

  it("returns false after completing first session", () => {
    const { result } = renderHook(() => useCoach(), { wrapper });

    act(() => {
      result.current.recordSessionComplete();
    });

    expect(result.current.needsOnboarding).toBe(false);
  });
});

describe("usePhaseCoaching", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns coaching content for intake phase", () => {
    const { result } = renderHook(() => usePhaseCoaching("intake"), { wrapper });

    expect(result.current.phase).toBe("intake");
    expect(result.current.title).toBe("Hypothesis Intake");
    expect(result.current.brief).toBeDefined();
    expect(result.current.full).toBeDefined();
    expect(result.current.keyPoints.length).toBeGreaterThan(0);
    expect(result.current.commonMistakes.length).toBeGreaterThan(0);
  });

  it("returns coaching content for exclusion_test phase", () => {
    const { result } = renderHook(() => usePhaseCoaching("exclusion_test"), { wrapper });

    expect(result.current.phase).toBe("exclusion_test");
    expect(result.current.title).toBe("Exclusion Test");
    expect(result.current.brennerQuote).toBeDefined();
    expect(result.current.brennerQuote?.section).toBe("§89");
  });

  it("includes domain-specific examples", () => {
    const { result } = renderHook(() => usePhaseCoaching("level_split"), { wrapper });

    expect(result.current.examples.psychology).toBeDefined();
    expect(result.current.examples.epidemiology).toBeDefined();
    expect(result.current.examples.economics).toBeDefined();
    expect(result.current.examples.biology).toBeDefined();
  });
});

describe("useCoachProgress", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns level and progress info", () => {
    const { result } = renderHook(() => useCoachProgress(), { wrapper });

    expect(result.current.level).toBe("beginner");
    expect(result.current.sessionsCompleted).toBe(0);
    expect(result.current.needsOnboarding).toBe(true);
  });
});

describe("useCoachActive", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns true when coach is enabled", () => {
    const { result } = renderHook(() => useCoachActive(), { wrapper });

    expect(result.current).toBe(true);
  });
});

describe("PHASE_COACHING constant", () => {
  it("has content for all session phases", () => {
    const phases = [
      "intake",
      "sharpening",
      "level_split",
      "exclusion_test",
      "object_transpose",
      "scale_check",
      "agent_dispatch",
      "synthesis",
      "evidence_gathering",
      "revision",
      "complete",
    ] as const;

    for (const phase of phases) {
      expect(PHASE_COACHING[phase]).toBeDefined();
      expect(PHASE_COACHING[phase].phase).toBe(phase);
      expect(PHASE_COACHING[phase].title).toBeDefined();
      expect(PHASE_COACHING[phase].brief).toBeDefined();
      expect(PHASE_COACHING[phase].full).toBeDefined();
      expect(PHASE_COACHING[phase].keyPoints.length).toBeGreaterThan(0);
      expect(PHASE_COACHING[phase].commonMistakes.length).toBeGreaterThan(0);
    }
  });

  it("has examples for all research domains", () => {
    const domains = [
      "psychology",
      "epidemiology",
      "economics",
      "biology",
      "sociology",
      "computer_science",
      "neuroscience",
      "general",
    ] as const;

    for (const phase of Object.values(PHASE_COACHING)) {
      for (const domain of domains) {
        expect(phase.examples[domain]).toBeDefined();
        expect(phase.examples[domain].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("LEVEL_THRESHOLDS constant", () => {
  it("defines intermediate threshold", () => {
    expect(LEVEL_THRESHOLDS.intermediate).toBeGreaterThan(0);
  });

  it("defines advanced threshold higher than intermediate", () => {
    expect(LEVEL_THRESHOLDS.advanced).toBeGreaterThan(LEVEL_THRESHOLDS.intermediate);
  });
});
