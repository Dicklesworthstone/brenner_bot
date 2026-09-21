"use client";

/**
 * OperatorSelector - Operator selection for prompt builder
 *
 * Allows users to view and customize which operators are included
 * in role-specific prompts for Brenner Protocol sessions.
 */

import * as React from "react";
import type {
  AgentRole,
  OperatorSelection as SessionOperatorSelection,
} from "@/lib/schemas/session";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type OperatorSelection = SessionOperatorSelection;

interface OperatorSelectorProps {
  /** Current operator selections */
  value: OperatorSelection;
  /** Called when selections change */
  onChange: (selection: OperatorSelection) => void;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default operators per role (from AGENT_ROLES) */
const DEFAULT_OPERATORS: OperatorSelection = {
  hypothesis_generator: ["⊘ Level-Split", "⊕ Cross-Domain", "◊ Paradox-Hunt"],
  test_designer: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
  adversarial_critic: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
  devils_advocate: [],
  experiment_designer: [],
  statistician: [],
  brenner_channeler: [],
  synthesis: [],
};

/** All available operators that can be assigned */
const ALL_OPERATORS = [
  { symbol: "⊘", name: "Level-Split", full: "⊘ Level-Split" },
  { symbol: "𝓛", name: "Recode", full: "𝓛 Recode" },
  { symbol: "≡", name: "Invariant-Extract", full: "≡ Invariant-Extract" },
  { symbol: "✂", name: "Exclusion-Test", full: "✂ Exclusion-Test" },
  { symbol: "⟂", name: "Object-Transpose", full: "⟂ Object-Transpose" },
  { symbol: "↑", name: "Amplify", full: "↑ Amplify" },
  { symbol: "⊕", name: "Cross-Domain", full: "⊕ Cross-Domain" },
  { symbol: "◊", name: "Paradox-Hunt", full: "◊ Paradox-Hunt" },
  { symbol: "ΔE", name: "Exception-Quarantine", full: "ΔE Exception-Quarantine" },
  { symbol: "∿", name: "Dephase", full: "∿ Dephase" },
  { symbol: "†", name: "Theory-Kill", full: "† Theory-Kill" },
  { symbol: "⌂", name: "Materialize", full: "⌂ Materialize" },
  { symbol: "🔧", name: "DIY", full: "🔧 DIY" },
  { symbol: "⊞", name: "Scale-Check", full: "⊞ Scale-Check" },
  { symbol: "🎭", name: "Potency-Check", full: "🎭 Potency-Check" },
];

const ROLE_CONFIG: Record<AgentRole, { label: string; color: string; description: string }> = {
  hypothesis_generator: {
    label: "Hypothesis Generator",
    color: "from-blue-500/10 to-cyan-500/10 border-blue-500/30",
    description: "Codex / GPT-5.2",
  },
  test_designer: {
    label: "Test Designer",
    color: "from-orange-500/10 to-amber-500/10 border-orange-500/30",
    description: "Opus / Claude",
  },
  adversarial_critic: {
    label: "Adversarial Critic",
    color: "from-cyan-500/10 to-teal-500/10 border-cyan-500/30",
    description: "Gemini 3",
  },
  devils_advocate: {
    label: "Devil's Advocate",
    color: "from-red-500/10 to-rose-500/10 border-red-500/30",
    description: "Challenges assumptions",
  },
  experiment_designer: {
    label: "Experiment Designer",
    color: "from-green-500/10 to-emerald-500/10 border-green-500/30",
    description: "Designs tests",
  },
  statistician: {
    label: "Statistician",
    color: "from-purple-500/10 to-violet-500/10 border-purple-500/30",
    description: "Statistical analysis",
  },
  brenner_channeler: {
    label: "Brenner Channeler",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-500/30",
    description: "Brenner methodology",
  },
  synthesis: {
    label: "Synthesis",
    color: "from-indigo-500/10 to-blue-500/10 border-indigo-500/30",
    description: "Integrates perspectives",
  },
};

// ============================================================================
// Icons
// ============================================================================

const ChevronDownIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const CheckIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const RefreshIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export function OperatorSelector({ value, onChange, disabled }: OperatorSelectorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleOperator = (role: AgentRole, operator: string) => {
    const currentOps = value[role];
    const newOps = currentOps.includes(operator)
      ? currentOps.filter((op) => op !== operator)
      : [...currentOps, operator];

    onChange({
      ...value,
      [role]: newOps,
    });
  };

  const resetToDefaults = () => {
    onChange(DEFAULT_OPERATORS);
  };

  const hasCustomizations = React.useMemo(() => {
    // Use spread to create copies before sorting to avoid mutating props/constants
    return (
      JSON.stringify([...value.hypothesis_generator].sort()) !==
        JSON.stringify([...DEFAULT_OPERATORS.hypothesis_generator].sort()) ||
      JSON.stringify([...value.test_designer].sort()) !==
        JSON.stringify([...DEFAULT_OPERATORS.test_designer].sort()) ||
      JSON.stringify([...value.adversarial_critic].sort()) !==
        JSON.stringify([...DEFAULT_OPERATORS.adversarial_critic].sort())
    );
  }, [value]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-xl",
          "border border-border bg-card hover:bg-muted/50 transition-all",
          "text-left touch-manipulation active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div>
          <div className="font-medium text-foreground flex items-center gap-2">
            Operator Selection
            {hasCustomizations && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">
                Custom
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {isExpanded ? "Customize operators per role" : "Click to customize role operators"}
          </div>
        </div>
        <ChevronDownIcon
          className={cn(
            "size-5 text-muted-foreground transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Reset Button */}
          {hasCustomizations && (
            <button
              type="button"
              onClick={resetToDefaults}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshIcon />
              Reset to defaults
            </button>
          )}

          {/* Role Cards */}
          {(Object.keys(ROLE_CONFIG) as AgentRole[]).map((role) => (
            <RoleCard
              key={role}
              role={role}
              config={ROLE_CONFIG[role]}
              selectedOperators={value[role]}
              onToggle={(op) => toggleOperator(role, op)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function RoleCard({
  role,
  config,
  selectedOperators,
  onToggle,
  disabled,
}: {
  role: AgentRole;
  config: { label: string; color: string; description: string };
  selectedOperators: string[];
  onToggle: (operator: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", "bg-gradient-to-br", config.color)}>
      <div>
        <div className="font-semibold text-foreground">{config.label}</div>
        <div className="text-xs text-muted-foreground">{config.description}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_OPERATORS.map((op) => {
          const isSelected = selectedOperators.includes(op.full);
          const isDefault = DEFAULT_OPERATORS[role].includes(op.full);

          return (
            <button
              key={op.full}
              type="button"
              onClick={() => onToggle(op.full)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
                "border transition-all touch-manipulation active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isSelected
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              title={isDefault ? `Default for ${config.label}` : undefined}
            >
              <span className="text-base">{op.symbol}</span>
              <span>{op.name}</span>
              {isSelected && <CheckIcon className="size-3" />}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {selectedOperators.length} operator{selectedOperators.length !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_OPERATORS };
