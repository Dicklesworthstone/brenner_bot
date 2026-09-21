"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type RefreshControlsProps = {
  autoIntervalMs?: number;
  defaultAuto?: boolean;
  className?: string;
  threadId?: string;
};

function RefreshIcon({ className }: { className?: string }) {
  return (
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
        d="M16.023 9.348h4.992m0 0v4.992m0-4.992l-3.181 3.182a8.25 8.25 0 11-2.679-5.656l1.656 1.657"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
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
        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
      />
    </svg>
  );
}

export function RefreshControls({
  autoIntervalMs = 15_000,
  defaultAuto = false,
  className,
  threadId,
}: RefreshControlsProps) {
  const router = useRouter();
  const [auto, setAuto] = React.useState(defaultAuto);
  const lastToastAtRef = React.useRef(0);

  React.useEffect(() => {
    if (!auto) return;

    let intervalId: number | null = null;
    let eventSource: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let opened = false;
    let cleanedUp = false;

    const intervalSeconds = Math.max(1, Math.round(autoIntervalMs / 1000));

    const startInterval = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        router.refresh();
      }, autoIntervalMs);
    };

    const maybeToast = (title: string, message?: string) => {
      const now = Date.now();
      if (now - lastToastAtRef.current < 2500) return;
      lastToastAtRef.current = now;
      toast.info(title, message, 3000);
    };

    if (typeof window !== "undefined" && typeof window.EventSource !== "undefined") {
      // Prefer SSE when threadId is provided (fallback to interval refresh if it can't connect).
      // Note: EventSource cannot attach custom headers, so lab auth must use cookies or CF Access.
      const url = new URL("/api/realtime", window.location.origin);
      if (threadId) url.searchParams.set("threadId", threadId);
      url.searchParams.set(
        "pollIntervalMs",
        String(Math.min(5000, Math.max(1000, Math.round(autoIntervalMs / 3)))),
      );

      if (threadId) {
        eventSource = new EventSource(url.toString());

        fallbackTimer = window.setTimeout(() => {
          if (cleanedUp || opened) return;
          maybeToast("Real-time unavailable", `Falling back to ${intervalSeconds}s refresh`);
          startInterval();
        }, 5000);

        eventSource.addEventListener("open", () => {
          opened = true;
          if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
        });

        eventSource.addEventListener("ready", () => {
          opened = true;
          if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
        });

        eventSource.addEventListener("thread_update", (event) => {
          if (document.visibilityState !== "visible") return;

          opened = true;
          if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);

          try {
            const payload = JSON.parse(String((event as MessageEvent).data ?? "")) as {
              newCount?: number;
              newMessages?: Array<{ subjectType?: string; from?: string; subject?: string }>;
            };

            const first = payload.newMessages?.[0];
            const label =
              first?.subjectType && first.subjectType !== "unknown"
                ? first.subjectType.toUpperCase()
                : "UPDATE";
            const from = first?.from ? ` from ${first.from}` : "";
            const count =
              typeof payload.newCount === "number" && payload.newCount > 1
                ? ` (+${payload.newCount})`
                : "";
            maybeToast(`New ${label}${from}${count}`);
          } catch {}

          router.refresh();
        });

        eventSource.onerror = () => {
          // If the connection was established but is now closed, fall back to polling.
          if (!opened) return;
          if (!eventSource) return;
          if (eventSource.readyState !== EventSource.CLOSED) return;
          maybeToast("Real-time disconnected", `Falling back to ${intervalSeconds}s refresh`);
          startInterval();
        };
      } else {
        startInterval();
      }
    } else {
      startInterval();
    }

    return () => {
      cleanedUp = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      if (eventSource) eventSource.close();
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [auto, autoIntervalMs, router, threadId]);

  const intervalSeconds = Math.max(1, Math.round(autoIntervalMs / 1000));

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          aria-label="Refresh"
        >
          <RefreshIcon className="size-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <Button
          type="button"
          variant={auto ? "secondary" : "outline"}
          size="sm"
          aria-pressed={auto}
          onClick={() => setAuto((v) => !v)}
          aria-label={
            auto
              ? `Auto refresh on (${intervalSeconds}s)`
              : `Auto refresh off (${intervalSeconds}s)`
          }
        >
          <ClockIcon className="size-4" />
          <span className="hidden sm:inline">Auto</span>
          <span className="hidden md:inline text-xs text-muted-foreground">{intervalSeconds}s</span>
        </Button>
      </div>
    </div>
  );
}
