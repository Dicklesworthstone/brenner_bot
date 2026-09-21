"use client";

/**
 * RosterAssignment - Role Assignment UI for Session Recipients
 *
 * Displays a list of recipients with dropdowns to assign roles.
 * Supports:
 * - Per-recipient role assignment
 * - "Default 3-agent" quick assign button
 * - Unified mode toggle (same prompt to all)
 */

import * as React from "react";
import { AGENT_ROLE_LABELS, AGENT_ROLE_VALUES, type AgentRole } from "@/lib/schemas/session";

// ============================================================================
// Types
// ============================================================================

export interface RosterEntry {
  agentName: string;
  role: AgentRole;
}

interface RosterAssignmentProps {
  /** List of recipient agent names (parsed from comma-separated input) */
  recipients: string[];
  /** Current roster entries */
  roster: RosterEntry[];
  /** Callback when roster changes */
  onRosterChange: (roster: RosterEntry[]) => void;
  /** Current roster mode */
  rosterMode: "role_separated" | "unified";
  /** Callback when roster mode changes */
  onRosterModeChange: (mode: "role_separated" | "unified") => void;
  /** Whether the form is disabled (e.g., during submission) */
  disabled?: boolean;
}

// ============================================================================
// Icons
// ============================================================================

const UsersIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

// ============================================================================
// Default Role Assignment Order
// ============================================================================

/** Default role assignment order for quick assign */
const DEFAULT_ROLE_ORDER: AgentRole[] = [
  "hypothesis_generator",
  "test_designer",
  "adversarial_critic",
];

/**
 * Apply default 3-agent role assignment.
 * Assigns roles in order: hypothesis_generator, test_designer, adversarial_critic.
 * If more than 3 agents, wraps around.
 */
function applyDefaultRoles(recipients: string[]): RosterEntry[] {
  return recipients.map((agentName, index) => ({
    agentName,
    role: DEFAULT_ROLE_ORDER[index % DEFAULT_ROLE_ORDER.length],
  }));
}

// ============================================================================
// Component
// ============================================================================

export function RosterAssignment({
  recipients,
  roster,
  onRosterChange,
  rosterMode,
  onRosterModeChange,
  disabled = false,
}: RosterAssignmentProps) {
  // Sync roster with recipients when recipients change
  React.useEffect(() => {
    if (recipients.length === 0) {
      if (roster.length > 0) {
        onRosterChange([]);
      }
      return;
    }

    // Check if roster matches current recipients
    const rosterNames = new Set(roster.map((e) => e.agentName));
    const recipientSet = new Set(recipients);

    // If recipients changed, rebuild roster preserving existing roles
    const needsUpdate =
      roster.length !== recipients.length ||
      recipients.some((r) => !rosterNames.has(r)) ||
      roster.some((e) => !recipientSet.has(e.agentName));

    if (needsUpdate) {
      const newRoster: RosterEntry[] = recipients.map((agentName, index) => {
        // Preserve existing role if agent was already in roster
        const existing = roster.find((e) => e.agentName === agentName);
        if (existing) {
          return existing;
        }
        // Assign default role based on position
        return {
          agentName,
          role: DEFAULT_ROLE_ORDER[index % DEFAULT_ROLE_ORDER.length],
        };
      });
      onRosterChange(newRoster);
    }
  }, [recipients, roster, onRosterChange]);

  // Update a single entry's role
  const handleRoleChange = (agentName: string, role: AgentRole) => {
    const newRoster = roster.map((entry) =>
      entry.agentName === agentName ? { ...entry, role } : entry,
    );
    onRosterChange(newRoster);
  };

  // Apply default 3-agent assignment
  const handleDefaultAssign = () => {
    onRosterChange(applyDefaultRoles(recipients));
    onRosterModeChange("role_separated");
  };

  // Toggle unified mode
  const handleUnifiedToggle = () => {
    onRosterModeChange(rosterMode === "unified" ? "role_separated" : "unified");
  };

  if (recipients.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon />
          <h3 className="font-medium text-foreground">Role Assignment</h3>
          <span className="text-xs text-muted-foreground">
            ({recipients.length} recipient{recipients.length !== 1 ? "s" : ""})
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDefaultAssign}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            <SparklesIcon />
            Default 3-Agent
          </button>
        </div>
      </div>

      {/* Unified Mode Toggle */}
      <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 active:bg-muted/70 cursor-pointer transition-all touch-manipulation">
        <input
          type="checkbox"
          checked={rosterMode === "unified"}
          onChange={handleUnifiedToggle}
          disabled={disabled}
          className="size-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background disabled:opacity-50"
        />
        <div>
          <div className="text-sm font-medium text-foreground">Unified Mode</div>
          <div className="text-xs text-muted-foreground">
            Send the same prompt to all recipients (no role differentiation)
          </div>
        </div>
      </label>

      {/* Role Assignment Table */}
      {rosterMode === "role_separated" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Agent</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roster.map((entry) => (
                <tr key={entry.agentName} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-foreground">{entry.agentName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry.role}
                      onChange={(e) =>
                        handleRoleChange(entry.agentName, e.target.value as AgentRole)
                      }
                      disabled={disabled}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {AGENT_ROLE_VALUES.map((role) => (
                        <option key={role} value={role}>
                          {AGENT_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Legend */}
      {rosterMode === "role_separated" && (
        <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30">
          <div>
            <strong>Hypothesis Generator:</strong> Generates candidate hypotheses, hunts paradoxes
          </div>
          <div>
            <strong>Test Designer:</strong> Designs discriminative tests with potency controls
          </div>
          <div>
            <strong>Adversarial Critic:</strong> Attacks framing, checks scale, quarantines
            anomalies
          </div>
        </div>
      )}
    </div>
  );
}

export { applyDefaultRoles };
