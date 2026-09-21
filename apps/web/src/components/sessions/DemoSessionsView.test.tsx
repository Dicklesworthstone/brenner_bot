/**
 * Tests for DemoSessionsView component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEMO_SESSIONS, getDemoThreadSummaries } from "@/lib/fixtures/demo-sessions";
import { DemoSessionsView } from "./DemoSessionsView";

// Mock next/link to render as anchor tags
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("DemoSessionsView", () => {
  describe("rendering", () => {
    it("renders demo banner", () => {
      render(<DemoSessionsView />);
      expect(screen.getByText("Demo Mode")).toBeInTheDocument();
    });

    it("renders demo explanation text", () => {
      render(<DemoSessionsView />);
      expect(
        screen.getByText(/example sessions demonstrating the BrennerBot/i),
      ).toBeInTheDocument();
    });

    it("renders tutorial link", () => {
      render(<DemoSessionsView />);
      const tutorialLink = screen.getByText("Try the tutorial");
      expect(tutorialLink).toBeInTheDocument();
      expect(tutorialLink.closest("a")).toHaveAttribute("href", "/tutorial/quick-start");
    });

    it("renders corpus link", () => {
      render(<DemoSessionsView />);
      const corpusLink = screen.getByText("Browse the corpus");
      expect(corpusLink).toBeInTheDocument();
      expect(corpusLink.closest("a")).toHaveAttribute("href", "/corpus");
    });
  });

  describe("session cards", () => {
    it("renders all demo sessions", () => {
      render(<DemoSessionsView />);
      const summaries = getDemoThreadSummaries();

      for (const summary of summaries) {
        expect(screen.getByText(summary.threadId)).toBeInTheDocument();
      }
    });

    it("session cards link to correct URLs", () => {
      render(<DemoSessionsView />);
      const summaries = getDemoThreadSummaries();

      for (const summary of summaries) {
        const threadText = screen.getByText(summary.threadId);
        const card = threadText.closest("a");
        expect(card).toHaveAttribute("href", `/sessions/${summary.threadId}`);
      }
    });

    it("shows phase badges", () => {
      render(<DemoSessionsView />);

      // Check for known phases in our demo data
      expect(screen.getByText("Compiled")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Responses")).toBeInTheDocument();
      expect(screen.getByText("In Critique")).toBeInTheDocument();
    });

    it("shows message counts", () => {
      render(<DemoSessionsView />);
      const summaries = getDemoThreadSummaries();

      for (const summary of summaries) {
        expect(screen.getByText(`${summary.messageCount} messages`)).toBeInTheDocument();
      }
    });

    it("shows compiled badge for sessions with artifacts", () => {
      render(<DemoSessionsView />);

      // Sessions with hasArtifact=true should show "compiled" badge
      const compiledBadges = screen.getAllByText("compiled");
      expect(compiledBadges.length).toBeGreaterThan(0);
    });

    it("shows demo badge on each card", () => {
      render(<DemoSessionsView />);

      // Each session card should have a "demo" badge
      const demoBadges = screen.getAllByText("demo");
      expect(demoBadges.length).toBe(DEMO_SESSIONS.length);
    });

    it("shows participants", () => {
      render(<DemoSessionsView />);
      const summaries = getDemoThreadSummaries();

      // At least one session should show participants
      const firstSession = summaries[0];
      if (firstSession.participants.length > 0) {
        // Use getAllByText since participant names may appear in multiple sessions
        const participantElements = screen.getAllByText(new RegExp(firstSession.participants[0]));
        expect(participantElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe("custom sessions prop", () => {
    it("accepts custom sessions array", () => {
      const customSessions = [
        {
          threadId: "demo-custom-test",
          messageCount: 2,
          firstMessageTs: "2025-01-01T00:00:00Z",
          lastMessageTs: "2025-01-01T01:00:00Z",
          phase: "compiled" as const,
          hasArtifact: true,
          pendingAcks: 0,
          participants: ["Agent1", "Agent2"],
        },
      ];

      render(<DemoSessionsView sessions={customSessions} />);

      expect(screen.getByText("demo-custom-test")).toBeInTheDocument();
      expect(screen.getByText("2 messages")).toBeInTheDocument();
      expect(screen.getByText(/Agent1/)).toBeInTheDocument();
    });

    it("uses fixture data when no sessions prop provided", () => {
      render(<DemoSessionsView />);

      // Should render the fixture sessions
      const summaries = getDemoThreadSummaries();
      expect(summaries.length).toBeGreaterThan(0);

      for (const summary of summaries) {
        expect(screen.getByText(summary.threadId)).toBeInTheDocument();
      }
    });
  });

  describe("accessibility", () => {
    it("banner has semantic heading", () => {
      render(<DemoSessionsView />);
      const heading = screen.getByRole("heading", { name: "Demo Mode" });
      expect(heading).toBeInTheDocument();
    });

    it("session cards are clickable links", () => {
      render(<DemoSessionsView />);
      const links = screen.getAllByRole("link");

      // Should have tutorial link + corpus link + one per session
      const summaries = getDemoThreadSummaries();
      expect(links.length).toBe(summaries.length + 2);
    });
  });
});
