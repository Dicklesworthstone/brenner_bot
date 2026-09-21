/**
 * Test Data Fixtures Library Tests
 *
 * Validates that all fixtures are properly typed and structurally valid.
 * These tests ensure the fixtures themselves are usable in other tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  activeSessionFixture,
  adminUserFixture,
  // API fixtures
  agentMailInboxFixture,
  agentMailThreadFixture,
  agentProfileFixture,
  // User fixtures
  authenticatedUserFixture,
  comprehensiveTranscript,
  createAgentMailInbox,
  createAgentMailMessage,
  createHypothesis,
  createSession,
  createTranscriptDocument,
  createUser,
  createValidArtifact,
  draftArtifactFixture,
  emptyArtifactFixture,
  emptyInboxFixture,
  emptyTranscript,
  error404Fixture,
  error500Fixture,
  errorSessionFixture,
  expiredAuthSessionFixture,
  geminiDistillation,
  // Factories
  generateId,
  generateTimestamp,
  gptDistillation,
  guestUserFixture,
  jsonRpcErrorFixture,
  jsonRpcSuccessFixture,
  metapromptFixture,
  // Document fixtures
  minimalTranscript,
  observerUserFixture,
  opusDistillation,
  pendingSessionFixture,
  permissionMatrixFixture,
  quoteBankFixture,
  rawTranscriptMarkdown,
  resetIdCounter,
  sampleHypotheses,
  // Session fixtures
  sampleResearchThread,
  sampleTests,
  validArtifactFixture,
  validAuthSessionFixture,
} from "./index";

// ============================================================================
// Document Fixtures Tests
// ============================================================================

describe("Document Fixtures", () => {
  describe("Transcript fixtures", () => {
    it("minimalTranscript has valid structure", () => {
      expect(minimalTranscript.id).toBeDefined();
      expect(minimalTranscript.type).toBe("transcript");
      expect(minimalTranscript.totalSections).toBe(minimalTranscript.sections.length);
      expect(minimalTranscript.sections.length).toBeGreaterThan(0);
    });

    it("comprehensiveTranscript covers key Brenner concepts", () => {
      expect(comprehensiveTranscript.totalSections).toBe(8);

      // Check for key section numbers
      const sectionNumbers = comprehensiveTranscript.sections.map((s) => s.number);
      expect(sectionNumbers).toContain(103); // Third alternative
      expect(sectionNumbers).toContain(105); // Exclusion
      expect(sectionNumbers).toContain(230); // Productive ignorance
    });

    it("emptyTranscript has no sections", () => {
      expect(emptyTranscript.sections.length).toBe(0);
      expect(emptyTranscript.totalSections).toBe(0);
    });

    it("sections have valid anchors", () => {
      for (const section of comprehensiveTranscript.sections) {
        expect(section.anchors).toBeDefined();
        expect(section.anchors.length).toBeGreaterThan(0);
        expect(section.anchors[0]).toMatch(/^§\d+$/);
      }
    });
  });

  describe("Distillation fixtures", () => {
    it("opusDistillation is typed correctly", () => {
      expect(opusDistillation.type).toBe("distillation");
      expect(opusDistillation.model).toBe("opus-4.5");
    });

    it("gptDistillation is typed correctly", () => {
      expect(gptDistillation.model).toBe("gpt-5.2");
    });

    it("geminiDistillation is typed correctly", () => {
      expect(geminiDistillation.model).toBe("gemini-3");
    });
  });

  describe("Quote bank fixture", () => {
    it("has quotes with valid structure", () => {
      expect(quoteBankFixture.quotes.length).toBeGreaterThan(0);

      for (const quote of quoteBankFixture.quotes) {
        expect(quote.id).toBeDefined();
        expect(quote.text).toBeDefined();
        expect(quote.section).toMatch(/^§\d+$/);
        expect(quote.tags.length).toBeGreaterThan(0);
      }
    });

    it("tags are consistent with quotes", () => {
      const allQuoteTags = quoteBankFixture.quotes.flatMap((q) => q.tags);
      for (const tag of quoteBankFixture.tags) {
        expect(allQuoteTags).toContain(tag);
      }
    });
  });

  describe("Metaprompt fixture", () => {
    it("has valid structure", () => {
      expect(metapromptFixture.type).toBe("metaprompt");
      expect(metapromptFixture.content).toContain("Brenner");
      expect(metapromptFixture.version).toBeDefined();
    });
  });

  describe("Raw markdown fixtures", () => {
    it("rawTranscriptMarkdown contains expected structure", () => {
      expect(rawTranscriptMarkdown).toContain("# Sydney Brenner");
      expect(rawTranscriptMarkdown).toContain("##");
      expect(rawTranscriptMarkdown).toContain(">");
    });
  });
});

// ============================================================================
// Session Fixtures Tests
// ============================================================================

describe("Session Fixtures", () => {
  describe("Research thread", () => {
    it("has required fields", () => {
      expect(sampleResearchThread.id).toBe("RT");
      expect(sampleResearchThread.statement).toBeDefined();
      expect(sampleResearchThread.context).toBeDefined();
      expect(sampleResearchThread.why_it_matters).toBeDefined();
    });
  });

  describe("Hypothesis fixtures", () => {
    it("includes a third alternative", () => {
      const thirdAlt = sampleHypotheses.find((h) => h.third_alternative === true);
      expect(thirdAlt).toBeDefined();
      expect(thirdAlt?.name).toContain("Both Wrong");
    });

    it("all hypotheses have required fields", () => {
      for (const h of sampleHypotheses) {
        expect(h.id).toBeDefined();
        expect(h.name).toBeDefined();
        expect(h.claim).toBeDefined();
        expect(h.mechanism).toBeDefined();
      }
    });
  });

  describe("Test fixtures", () => {
    it("tests have discriminative structure", () => {
      for (const t of sampleTests) {
        expect(t.procedure).toBeDefined();
        expect(t.discriminates).toBeDefined();
        expect(Object.keys(t.expected_outcomes).length).toBeGreaterThan(1);
        expect(t.potency_check).toBeDefined();
      }
    });
  });

  describe("Artifact fixtures", () => {
    it("validArtifactFixture passes basic structure check", () => {
      expect(validArtifactFixture.metadata.session_id).toBeDefined();
      expect(validArtifactFixture.metadata.status).toBe("active");
      expect(validArtifactFixture.sections.research_thread).not.toBeNull();
      expect(validArtifactFixture.sections.hypothesis_slate.length).toBeGreaterThanOrEqual(3);
    });

    it("validArtifactFixture has third alternative", () => {
      const thirdAlt = validArtifactFixture.sections.hypothesis_slate.find(
        (h) => h.third_alternative === true,
      );
      expect(thirdAlt).toBeDefined();
    });

    it("draftArtifactFixture is minimal", () => {
      expect(draftArtifactFixture.metadata.status).toBe("draft");
      expect(draftArtifactFixture.sections.hypothesis_slate.length).toBe(1);
    });

    it("emptyArtifactFixture has null research thread", () => {
      expect(emptyArtifactFixture.sections.research_thread).toBeNull();
      expect(emptyArtifactFixture.sections.hypothesis_slate.length).toBe(0);
    });
  });

  describe("Session fixtures", () => {
    it("activeSessionFixture has participants", () => {
      expect(activeSessionFixture.status).toBe("active");
      expect(activeSessionFixture.participants.length).toBeGreaterThan(0);
      expect(activeSessionFixture.artifact).toBeDefined();
    });

    it("errorSessionFixture has error message", () => {
      expect(errorSessionFixture.status).toBe("error");
      expect(errorSessionFixture.error_message).toBeDefined();
    });

    it("pendingSessionFixture has no participants yet", () => {
      expect(pendingSessionFixture.status).toBe("pending");
      expect(pendingSessionFixture.participants.length).toBe(0);
    });
  });
});

// ============================================================================
// User Fixtures Tests
// ============================================================================

describe("User Fixtures", () => {
  describe("User fixtures", () => {
    it("authenticatedUserFixture is a researcher", () => {
      expect(authenticatedUserFixture.role).toBe("researcher");
      expect(authenticatedUserFixture.email).toBeDefined();
      expect(authenticatedUserFixture.preferences).toBeDefined();
    });

    it("adminUserFixture is an admin", () => {
      expect(adminUserFixture.role).toBe("admin");
    });

    it("observerUserFixture is an observer", () => {
      expect(observerUserFixture.role).toBe("observer");
    });

    it("guestUserFixture is a guest", () => {
      expect(guestUserFixture.role).toBe("guest");
    });
  });

  describe("Auth session fixtures", () => {
    it("validAuthSessionFixture has valid token", () => {
      expect(validAuthSessionFixture.access_token).toBeDefined();
      expect(validAuthSessionFixture.user).toBeDefined();
      expect(new Date(validAuthSessionFixture.expires_at).getTime()).toBeGreaterThan(
        new Date(validAuthSessionFixture.issued_at).getTime(),
      );
    });

    it("expiredAuthSessionFixture is expired", () => {
      // The expired fixture has expires_at in the past (Dec 29, 2025)
      // A truly expired session should have expires_at < now
      const expiresAt = new Date(expiredAuthSessionFixture.expires_at).getTime();
      const now = new Date("2025-12-30T12:00:00Z").getTime(); // Reference point after expiry
      expect(expiresAt).toBeLessThan(now);
    });
  });

  describe("Permission matrix", () => {
    it("admin has all permissions", () => {
      expect(permissionMatrixFixture.admin.canAccessAdmin).toBe(true);
      expect(permissionMatrixFixture.admin.canManageUsers).toBe(true);
    });

    it("guest has minimal permissions", () => {
      expect(permissionMatrixFixture.guest.canReadCorpus).toBe(true);
      expect(permissionMatrixFixture.guest.canCreateSession).toBe(false);
      expect(permissionMatrixFixture.guest.canAccessAdmin).toBe(false);
    });
  });
});

// ============================================================================
// API Fixtures Tests
// ============================================================================

describe("API Fixtures", () => {
  describe("Agent Mail fixtures", () => {
    it("agentMailInboxFixture has messages", () => {
      expect(agentMailInboxFixture.messages.length).toBeGreaterThan(0);
      expect(agentMailInboxFixture.count).toBe(agentMailInboxFixture.messages.length);
    });

    it("emptyInboxFixture has no messages", () => {
      expect(emptyInboxFixture.messages.length).toBe(0);
      expect(emptyInboxFixture.count).toBe(0);
    });

    it("agentMailThreadFixture has ordered messages", () => {
      const messages = agentMailThreadFixture.messages;
      expect(messages.length).toBeGreaterThan(1);

      // Check chronological order
      for (let i = 1; i < messages.length; i++) {
        expect(new Date(messages[i].created_ts).getTime()).toBeGreaterThanOrEqual(
          new Date(messages[i - 1].created_ts).getTime(),
        );
      }
    });

    it("agentProfileFixture has required fields", () => {
      expect(agentProfileFixture.name).toBeDefined();
      expect(agentProfileFixture.program).toBeDefined();
      expect(agentProfileFixture.model).toBeDefined();
    });
  });

  describe("Error fixtures", () => {
    it("error404Fixture has correct status", () => {
      expect(error404Fixture.status).toBe(404);
      expect(error404Fixture.error).toBe("Not Found");
    });

    it("error500Fixture has correct status", () => {
      expect(error500Fixture.status).toBe(500);
      expect(error500Fixture.error).toBe("Internal Server Error");
    });
  });

  describe("JSON-RPC fixtures", () => {
    it("jsonRpcSuccessFixture has result", () => {
      expect(jsonRpcSuccessFixture.jsonrpc).toBe("2.0");
      expect(jsonRpcSuccessFixture.result).toBeDefined();
      expect(jsonRpcSuccessFixture.error).toBeUndefined();
    });

    it("jsonRpcErrorFixture has error", () => {
      expect(jsonRpcErrorFixture.jsonrpc).toBe("2.0");
      expect(jsonRpcErrorFixture.error).toBeDefined();
    });
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("Factory Functions", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("generateId", () => {
    it("generates unique IDs", () => {
      const id1 = generateId("test");
      const id2 = generateId("test");
      expect(id1).not.toBe(id2);
    });

    it("uses prefix", () => {
      const id = generateId("custom");
      expect(id).toContain("custom");
    });
  });

  describe("generateTimestamp", () => {
    it("generates valid ISO timestamp", () => {
      const ts = generateTimestamp();
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it("applies offset correctly", () => {
      const now = new Date();
      const futureTs = generateTimestamp(60);
      const futureDate = new Date(futureTs);

      // Should be roughly 60 minutes in the future
      const diffMinutes = (futureDate.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(59);
      expect(diffMinutes).toBeLessThan(61);
    });
  });

  describe("createTranscriptDocument", () => {
    it("creates with defaults", () => {
      const doc = createTranscriptDocument();
      expect(doc.type).toBe("transcript");
      expect(doc.sections.length).toBe(1);
    });

    it("accepts custom sections", () => {
      const doc = createTranscriptDocument({}, [
        { number: 103, title: "Third Alternative" },
        { number: 105, title: "Exclusion" },
      ]);
      expect(doc.sections.length).toBe(2);
      expect(doc.sections[0].number).toBe(103);
    });
  });

  describe("createSession", () => {
    it("creates with defaults", () => {
      const session = createSession();
      expect(session.status).toBe("pending");
      expect(session.id).toBeDefined();
      expect(session.thread_id).toBeDefined();
    });

    it("accepts overrides", () => {
      const session = createSession({
        status: "active",
        research_question: "Custom question?",
      });
      expect(session.status).toBe("active");
      expect(session.research_question).toBe("Custom question?");
    });
  });

  describe("createHypothesis", () => {
    it("creates with defaults", () => {
      const h = createHypothesis();
      expect(h.name).toBeDefined();
      expect(h.claim).toBeDefined();
      expect(h.third_alternative).toBe(false);
    });

    it("accepts third_alternative override", () => {
      const h = createHypothesis({ third_alternative: true });
      expect(h.third_alternative).toBe(true);
    });
  });

  describe("createValidArtifact", () => {
    it("creates a complete, valid artifact", () => {
      const artifact = createValidArtifact();

      // Check structure
      expect(artifact.metadata.session_id).toBeDefined();
      expect(artifact.sections.research_thread).not.toBeNull();
      expect(artifact.sections.hypothesis_slate.length).toBeGreaterThanOrEqual(3);
      expect(artifact.sections.discriminative_tests.length).toBeGreaterThanOrEqual(2);
      expect(artifact.sections.assumption_ledger.length).toBeGreaterThanOrEqual(2);
      expect(artifact.sections.adversarial_critique.length).toBeGreaterThanOrEqual(2);

      // Check third alternative exists
      const hasThirdAlt = artifact.sections.hypothesis_slate.some((h) => h.third_alternative);
      expect(hasThirdAlt).toBe(true);

      // Check scale check exists
      const hasScaleCheck = artifact.sections.assumption_ledger.some((a) => a.scale_check);
      expect(hasScaleCheck).toBe(true);
    });
  });

  describe("createUser", () => {
    it("creates with defaults", () => {
      const user = createUser();
      expect(user.email).toContain("@example.com");
      expect(user.role).toBe("researcher");
    });

    it("accepts role override", () => {
      const user = createUser({ role: "admin" });
      expect(user.role).toBe("admin");
    });
  });

  describe("createAgentMailMessage", () => {
    it("creates with defaults", () => {
      const msg = createAgentMailMessage();
      expect(msg.subject).toBeDefined();
      expect(msg.from).toBeDefined();
      expect(msg.to).toBeDefined();
      expect(msg.importance).toBe("normal");
    });

    it("accepts thread_id", () => {
      const msg = createAgentMailMessage({ thread_id: "RS-20251230-test" });
      expect(msg.thread_id).toBe("RS-20251230-test");
    });
  });

  describe("createAgentMailInbox", () => {
    it("creates empty inbox", () => {
      const inbox = createAgentMailInbox("TestAgent");
      expect(inbox.agent).toBe("TestAgent");
      expect(inbox.count).toBe(0);
      expect(inbox.messages.length).toBe(0);
    });

    it("creates inbox with messages", () => {
      const messages = [
        createAgentMailMessage({ subject: "Message 1" }),
        createAgentMailMessage({ subject: "Message 2" }),
      ];
      const inbox = createAgentMailInbox("TestAgent", messages);
      expect(inbox.count).toBe(2);
      expect(inbox.messages.length).toBe(2);
    });
  });
});
