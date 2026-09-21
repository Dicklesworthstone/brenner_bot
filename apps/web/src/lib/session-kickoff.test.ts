import { describe, expect, it } from "vitest";

import {
  composeKickoffMessages,
  composeUnifiedKickoff,
  DEFAULT_ROLE,
  getAgentRole,
} from "./session-kickoff";

describe("session-kickoff", () => {
  describe("getAgentRole", () => {
    it("returns role config for exact known agent keys", () => {
      expect(getAgentRole("Codex").role).toBe("hypothesis_generator");
      expect(getAgentRole("Opus").role).toBe("test_designer");
      expect(getAgentRole("Gemini").role).toBe("adversarial_critic");
    });

    it("matches case-insensitively against known agent keys", () => {
      expect(getAgentRole("cOdEx").role).toBe("hypothesis_generator");
      expect(getAgentRole("cLaUdE").role).toBe("test_designer");
      expect(getAgentRole("gEmInI").role).toBe("adversarial_critic");
    });

    it("falls back to keyword heuristics for unknown names", () => {
      expect(getAgentRole("BlueLake codex").role).toBe("hypothesis_generator");
      expect(getAgentRole("PurpleMountain opus").role).toBe("test_designer");
      expect(getAgentRole("GreenValley gemini-cli").role).toBe("adversarial_critic");
    });

    it("matches gpt keyword in agent name", () => {
      expect(getAgentRole("gpt-agent").role).toBe("hypothesis_generator");
      expect(getAgentRole("custom-gpt-helper").role).toBe("hypothesis_generator");
    });

    it("matches claude keyword in agent name", () => {
      expect(getAgentRole("claude-assistant").role).toBe("test_designer");
      expect(getAgentRole("my-claude-bot").role).toBe("test_designer");
    });

    it("falls back to DEFAULT_ROLE for unknown names without hints", () => {
      expect(getAgentRole("BlueLake").role).toBe(DEFAULT_ROLE.role);
    });
  });

  describe("composeKickoffMessages", () => {
    it("injects the role prompt from specs/role_prompts_v0.1.md markers when available", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
      });

      expect(msg.body).toContain("## Role Prompt (System)");
      expect(msg.body).toContain("You are a HYPOTHESIS GENERATOR");
    });

    it("injects selected operator cards when operatorSelection is provided", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
        operatorSelection: {
          hypothesis_generator: ["⊞ Scale-Check", "🎭 Potency-Check"],
          test_designer: [],
          adversarial_critic: [],
          devils_advocate: [],
          experiment_designer: [],
          statistician: [],
          brenner_channeler: [],
          synthesis: [],
        },
      });

      expect(msg.body).toContain("## Operator Focus (selected)");
      expect(msg.body).toContain("### ⊞ Scale-Check (scale-check)");
      expect(msg.body).toContain("[OPERATOR: ⊞ Scale-Check]");
      expect(msg.body).toContain("### 🎭 Chastity-vs-Impotence Check (potency-check)");
      expect(msg.body).toContain("[OPERATOR: 🎭 Chastity-vs-Impotence Check]");
    });

    it("uses explicit roster mapping when provided and includes roster section", () => {
      const messages = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["BlueLake", "GreenCastle", "PurpleMountain"],
        recipientRoles: {
          BlueLake: "hypothesis_generator",
          GreenCastle: "test_designer",
          PurpleMountain: "adversarial_critic",
        },
        memoryContext: "## MEMORY CONTEXT\n\n- Example",
        initialHypotheses: "- H1\n- H2",
        constraints: "No vendor APIs.",
      });

      expect(messages).toHaveLength(3);
      expect(messages.every((m) => m.ackRequired === true)).toBe(true);

      const byRecipient = new Map(messages.map((m) => [m.to, m]));
      expect(byRecipient.get("BlueLake")?.role.role).toBe("hypothesis_generator");
      expect(byRecipient.get("GreenCastle")?.role.role).toBe("test_designer");
      expect(byRecipient.get("PurpleMountain")?.role.role).toBe("adversarial_critic");

      const body = byRecipient.get("BlueLake")?.body ?? "";
      expect(body).toContain("## Roster (explicit)");
      expect(body).toContain("- BlueLake: Hypothesis Generator");
      expect(body).toContain("- GreenCastle: Test Designer");
      expect(body).toContain("- PurpleMountain: Adversarial Critic");

      expect(body).toContain("## Transcript Excerpt");
      expect(body).toContain("§1: excerpt");
      expect(body).toContain("## Initial Hypotheses (Seed)");
      expect(body).toContain("## Constraints");
      expect(body).toContain("## MEMORY CONTEXT");
    });

    it("throws when explicit recipientRoles is missing entries for recipients", () => {
      expect(() =>
        composeKickoffMessages({
          threadId: "RS-20251231-demo",
          researchQuestion: "How does X behave under Y?",
          context: "Minimal context.",
          excerpt: "§1: excerpt",
          recipients: ["BlueLake", "GreenCastle"],
          recipientRoles: {
            BlueLake: "hypothesis_generator",
          },
        }),
      ).toThrow(/Missing recipient role mapping/);
    });

    it("throws for invalid recipientRoles values", () => {
      expect(() =>
        composeKickoffMessages({
          threadId: "RS-20251231-demo",
          researchQuestion: "How does X behave under Y?",
          context: "Minimal context.",
          excerpt: "§1: excerpt",
          recipients: ["BlueLake"],
          recipientRoles: {
            BlueLake: "not-a-role" as never,
          },
        }),
      ).toThrow(/Invalid recipientRoles entry/);
    });

    it("throws for empty recipientRoles recipient key", () => {
      expect(() =>
        composeKickoffMessages({
          threadId: "RS-20251231-demo",
          researchQuestion: "How does X behave under Y?",
          context: "Minimal context.",
          excerpt: "§1: excerpt",
          recipients: ["BlueLake"],
          recipientRoles: {
            "   ": "hypothesis_generator",
          },
        }),
      ).toThrow(/empty recipient name/i);
    });

    it("uses default requested outputs when none provided, per role", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
      });

      expect(msg.body).toContain("## Requested Outputs");
      expect(msg.body).toContain("third alternative");
      expect(msg.body).toContain("## Response Format");
      expect(msg.subject).toContain("[RS-20251231-demo]");
    });

    it("uses test_designer default requested outputs for Opus role", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Opus"],
      });

      expect(msg.body).toContain("## Requested Outputs");
      expect(msg.body).toContain("discriminative tests");
      expect(msg.body).toContain("potency check");
    });

    it("uses adversarial_critic default requested outputs for Gemini role", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Gemini"],
      });

      expect(msg.body).toContain("## Requested Outputs");
      expect(msg.body).toContain("Scale checks");
      expect(msg.body).toContain("anomaly quarantine");
      expect(msg.body).toContain("third alternative critique");
    });

    it("uses requestedOutputs when provided", () => {
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
        requestedOutputs: "- Custom output 1\n- Custom output 2",
      });

      expect(msg.body).toContain("## Requested Outputs");
      expect(msg.body).toContain("Custom output 1");
      expect(msg.body).not.toContain("2-4 hypotheses");
    });

    it("truncates subject when researchQuestion is long", () => {
      const long = "x".repeat(61);
      const [msg] = composeKickoffMessages({
        threadId: "RS-20251231-demo",
        researchQuestion: long,
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
      });
      expect(msg.subject.endsWith("...")).toBe(true);
    });
  });

  describe("composeUnifiedKickoff", () => {
    it("includes optional sections when provided", () => {
      const unified = composeUnifiedKickoff({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
        memoryContext: "## MEMORY CONTEXT\n\n- Example",
        initialHypotheses: "- H1\n- H2",
        constraints: "No vendor APIs.",
        requestedOutputs: "- Custom output",
      });

      expect(unified.ackRequired).toBe(true);
      expect(unified.body).toContain("# Brenner Protocol Session: RS-20251231-demo");
      expect(unified.body).toContain("## MEMORY CONTEXT");
      expect(unified.body).toContain("## Initial Hypotheses");
      expect(unified.body).toContain("## Constraints");
      expect(unified.body).toContain("## Requested Outputs");
      expect(unified.body).toContain("Custom output");
    });

    it("includes operator selection section when provided", () => {
      const unified = composeUnifiedKickoff({
        threadId: "RS-20251231-demo",
        researchQuestion: "How does X behave under Y?",
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
        operatorSelection: {
          hypothesis_generator: ["⊘ Level-Split"],
          test_designer: ["✂ Exclusion-Test"],
          adversarial_critic: [],
          devils_advocate: [],
          experiment_designer: [],
          statistician: [],
          brenner_channeler: [],
          synthesis: [],
        },
      });

      expect(unified.body).toContain("## ROLE OPERATOR ASSIGNMENTS");
      expect(unified.body).toContain("Hypothesis Generator: ⊘ Level-Split");
      expect(unified.body).toContain("Test Designer: ✂ Exclusion-Test");
    });

    it("truncates subject when researchQuestion is long", () => {
      const long = "y".repeat(61);
      const unified = composeUnifiedKickoff({
        threadId: "RS-20251231-demo",
        researchQuestion: long,
        context: "Minimal context.",
        excerpt: "§1: excerpt",
        recipients: ["Codex"],
      });

      expect(unified.subject.endsWith("...")).toBe(true);
    });
  });
});
