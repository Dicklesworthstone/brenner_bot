"use client";

/**
 * SessionForm - Client Component for Session Creation
 *
 * Uses TanStack Form for field-level validation with Zod schemas.
 * Uses TanStack Query mutation for proper loading/error state management.
 *
 * Renders the Brenner Loop session kickoff form with:
 * - Real-time validation feedback on blur
 * - Loading spinner during submission
 * - Error display with actionable messages
 * - Success notification and redirect
 */

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Jargon } from "@/components/jargon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSessionErrorMessage, useSessionMutation } from "@/hooks/mutations/useSessionMutation";
import { useNetworkStatus } from "@/lib/offline";
import { sessionFieldValidators, sessionFormSchema } from "@/lib/schemas/session";
import { DEFAULT_OPERATORS, type OperatorSelection, OperatorSelector } from "./OperatorSelector";
import { RosterAssignment, type RosterEntry } from "./RosterAssignment";

// ============================================================================
// Icons
// ============================================================================

const SendIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface SessionFormProps {
  /** Default sender name (from env) */
  defaultSender?: string;
  /** Default project key (from env) */
  defaultProjectKey?: string;
}

const SESSION_PREFILL_KEY = "brenner-session-excerpt-prefill";
const SESSION_PREFILL_PARAM = "prefill";
const SESSION_PREFILL_VALUE = "excerpt-basket";

// ============================================================================
// Field Error Component
// ============================================================================

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="mt-1 text-sm text-destructive">
      {errors.map((error, i) => (
        <p key={i}>{error}</p>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SessionForm({ defaultSender = "", defaultProjectKey = "" }: SessionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useSessionMutation();
  const { isOnline } = useNetworkStatus();

  const [queuedSession, setQueuedSession] = React.useState<{
    threadId: string;
    queuedAt?: string;
  } | null>(null);

  // Operator selection state (for prompt builder)
  const [operatorSelection, setOperatorSelection] =
    React.useState<OperatorSelection>(DEFAULT_OPERATORS);

  // Roster state for role assignment
  const [roster, setRoster] = React.useState<RosterEntry[]>([]);
  const [rosterMode, setRosterMode] = React.useState<"role_separated" | "unified">(
    "role_separated",
  );

  // Parse recipients from form value to array
  const [parsedRecipients, setParsedRecipients] = React.useState<string[]>([]);

  const form = useForm({
    defaultValues: {
      threadId: "",
      sender: defaultSender,
      recipients: "",
      subject: "",
      excerpt: "",
      theme: "",
      domain: "",
      question: "",
      ackRequired: false,
    },
    onSubmit: async ({ value }) => {
      // Parse and validate with full schema
      const parsed = sessionFormSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }

      mutation.mutate(
        {
          projectKey: defaultProjectKey || undefined,
          sender: parsed.data.sender,
          recipients: parsed.data.recipients,
          threadId: parsed.data.threadId,
          subject: parsed.data.subject || undefined,
          excerpt: parsed.data.excerpt,
          theme: parsed.data.theme || undefined,
          domain: parsed.data.domain || undefined,
          question: parsed.data.question || undefined,
          ackRequired: parsed.data.ackRequired,
          operatorSelection,
          rosterMode,
          roster: rosterMode === "role_separated" ? roster : undefined,
        },
        {
          onSuccess: (result) => {
            if (result.queued) {
              setQueuedSession({ threadId: result.threadId, queuedAt: result.queuedAt });
              return;
            }
            router.push(`/sessions/new?sent=1&thread=${encodeURIComponent(result.threadId)}`);
          },
        },
      );
    },
  });

  // Prefill excerpt from localStorage when explicitly requested (e.g. from Excerpt Basket export).
  React.useEffect(() => {
    const prefill = searchParams.get(SESSION_PREFILL_PARAM);
    if (prefill !== SESSION_PREFILL_VALUE) return;

    let draft: string | null = null;
    try {
      draft = window.localStorage.getItem(SESSION_PREFILL_KEY);
      window.localStorage.removeItem(SESSION_PREFILL_KEY);
    } catch {
      draft = null;
    }

    if (draft && !(form.state.values.excerpt ?? "").trim()) {
      form.setFieldValue("excerpt", draft);
    }
  }, [form, searchParams]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Error Display */}
      {mutation.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-destructive mt-0.5">
            <AlertCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-destructive">Failed to send kickoff</div>
            <p className="text-sm text-muted-foreground mt-1">
              {getSessionErrorMessage(mutation.error)}
            </p>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-amber-600 dark:text-amber-400 mt-0.5">
            <AlertCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-amber-700 dark:text-amber-300">You’re offline</div>
            <p className="text-sm text-muted-foreground mt-1">
              Submissions will be queued and sent automatically once you’re back online.
            </p>
          </div>
        </div>
      )}

      {queuedSession && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-amber-600 dark:text-amber-400 mt-0.5">
            <AlertCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-amber-700 dark:text-amber-300">
              Session queued for delivery
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Thread <span className="font-mono">{queuedSession.threadId}</span> will send when
              connectivity is restored.
            </p>
          </div>
        </div>
      )}

      {/* Session Setup */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Session Setup</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="threadId"
            validators={{
              onBlur: sessionFieldValidators.threadId,
            }}
          >
            {(field) => (
              <div>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  label="Thread ID"
                  placeholder="FEAT-123"
                  hint="Unique identifier for this research thread"
                  disabled={mutation.isPending}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors.map(String)} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="sender"
            validators={{
              onBlur: sessionFieldValidators.sender,
            }}
          >
            {(field) => (
              <div>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  label="Your Agent Name"
                  placeholder="GreenCastle"
                  hint="How you'll appear in Agent Mail"
                  disabled={mutation.isPending}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={field.state.meta.errors.map(String)} />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field
          name="recipients"
          validators={{
            onBlur: sessionFieldValidators.recipients,
          }}
        >
          {(field) => (
            <div>
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => {
                  const value = e.target.value;
                  field.handleChange(value);
                  // Parse recipients for roster assignment
                  const parsed = value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setParsedRecipients(parsed);
                }}
                onBlur={field.handleBlur}
                label="Recipients"
                placeholder="BlueMountain, RedForest"
                hint="Comma-separated list of agent names"
                disabled={mutation.isPending}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors.map(String)} />
            </div>
          )}
        </form.Field>

        {/* Role Assignment Section */}
        {parsedRecipients.length > 0 && (
          <RosterAssignment
            recipients={parsedRecipients}
            roster={roster}
            onRosterChange={setRoster}
            rosterMode={rosterMode}
            onRosterModeChange={setRosterMode}
            disabled={mutation.isPending}
          />
        )}

        <form.Field
          name="subject"
          validators={{
            onBlur: sessionFieldValidators.subject,
          }}
        >
          {(field) => (
            <div>
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                label="Subject"
                placeholder="KICKOFF: [FEAT-123] Brenner Loop kickoff"
                hint="Optional - auto-generated from thread ID; will be prefixed with KICKOFF:"
                disabled={mutation.isPending}
              />
              <FieldError errors={field.state.meta.errors.map(String)} />
            </div>
          )}
        </form.Field>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Content</h2>

        <form.Field
          name="excerpt"
          validators={{
            onBlur: sessionFieldValidators.excerpt,
          }}
        >
          {(field) => (
            <div>
              <Textarea
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                label="Transcript Excerpt"
                placeholder="Paste transcript chunks here (with section headings if you have them)."
                hint="The raw Brenner transcript material to analyze"
                className="min-h-[200px] font-mono text-sm"
                autoResize
                disabled={mutation.isPending}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors.map(String)} />
            </div>
          )}
        </form.Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field
            name="theme"
            validators={{
              onBlur: sessionFieldValidators.theme,
            }}
          >
            {(field) => (
              <div>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  label="Theme"
                  placeholder="decision experiments"
                  hint="Optional focus area"
                  disabled={mutation.isPending}
                />
                <FieldError errors={field.state.meta.errors.map(String)} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="domain"
            validators={{
              onBlur: sessionFieldValidators.domain,
            }}
          >
            {(field) => (
              <div>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  label="Domain"
                  placeholder="biology"
                  hint="Optional field context"
                  disabled={mutation.isPending}
                />
                <FieldError errors={field.state.meta.errors.map(String)} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="question"
            validators={{
              onBlur: sessionFieldValidators.question,
            }}
          >
            {(field) => (
              <div>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  label="Question"
                  placeholder="What's the most discriminative next experiment?"
                  hint="Optional guiding question"
                  disabled={mutation.isPending}
                />
                <FieldError errors={field.state.meta.errors.map(String)} />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Operator Selection (Prompt Builder) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Operator Selection</h2>
        <OperatorSelector
          value={operatorSelection}
          onChange={setOperatorSelection}
          disabled={mutation.isPending}
        />
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Options</h2>

        <form.Field name="ackRequired">
          {(field) => (
            <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 active:bg-muted/70 active:scale-[0.99] cursor-pointer transition-all touch-manipulation">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                disabled={mutation.isPending}
                className="size-6 rounded border-border text-primary focus:ring-primary focus:ring-offset-background disabled:opacity-50"
              />
              <div>
                <div className="font-medium text-foreground">Require acknowledgment</div>
                <div className="text-sm text-muted-foreground">
                  Recipients must explicitly confirm receipt
                </div>
              </div>
            </label>
          )}
        </form.Field>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              size="lg"
              className="gap-2"
              disabled={!canSubmit || mutation.isPending || isSubmitting}
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon />
                  Send Kickoff
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
        <p className="text-sm text-muted-foreground">
          {mutation.isPending ? (
            "Composing prompt and sending to Agent Mail..."
          ) : (
            <>
              This will compose and send a <Jargon term="brenner-loop">Brenner Loop</Jargon> prompt
              to the specified agents.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
