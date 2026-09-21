"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useRef, useState } from "react";

type NavTarget = { id: string; title: string };

type SwipeAxis = "x" | "y" | null;

type GestureState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  axis: SwipeAxis;
  rawDx: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getThresholdPx(viewportWidth: number): number {
  return Math.min(viewportWidth * 0.5, 100);
}

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null;
  if (!element) return false;

  const interactive = element.closest(
    'a,button,input,textarea,select,summary,[role="button"],[role="link"]',
  );
  return Boolean(interactive);
}

export function DocumentSwipeNavClient({
  prev,
  next,
  children,
}: {
  prev: NavTarget | null;
  next: NavTarget | null;
  children: ReactNode;
}) {
  const router = useRouter();

  const gestureRef = useRef<GestureState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    axis: null,
    rawDx: 0,
  });

  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const thresholdPx = useMemo(() => {
    if (typeof window === "undefined") return 100;
    return getThresholdPx(window.innerWidth);
  }, []);

  const edgeDamping = useMemo(() => {
    const canGoPrev = Boolean(prev);
    const canGoNext = Boolean(next);
    return { canGoPrev, canGoNext };
  }, [prev, next]);

  const showPrevHint = isDragging && dragOffsetPx > 0 && Boolean(prev);
  const showNextHint = isDragging && dragOffsetPx < 0 && Boolean(next);
  const hintOpacity = Math.min(1, Math.abs(dragOffsetPx) / thresholdPx);

  return (
    <div
      data-testid="document-swipe-nav"
      className="relative"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        if (shouldIgnoreSwipeStart(event.target)) return;

        gestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          axis: null,
          rawDx: 0,
        };
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current;
        if (gesture.pointerId === null) return;
        if (event.pointerId !== gesture.pointerId) return;

        const rawDx = event.clientX - gesture.startX;
        const rawDy = event.clientY - gesture.startY;

        gesture.rawDx = rawDx;

        if (gesture.axis === null) {
          const absDx = Math.abs(rawDx);
          const absDy = Math.abs(rawDy);
          if (absDx < 10 && absDy < 10) return;

          if (absDy > absDx) {
            gesture.axis = "y";
            return;
          }

          gesture.axis = "x";
          setIsDragging(true);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Ignore capture errors; swipe still works without it.
          }
        }

        if (gesture.axis !== "x") return;

        const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
        const maxOffsetPx = viewportWidth ? Math.min(viewportWidth * 0.6, 240) : 240;

        let effectiveDx = rawDx;
        if (rawDx > 0 && !edgeDamping.canGoPrev) effectiveDx *= 0.35;
        if (rawDx < 0 && !edgeDamping.canGoNext) effectiveDx *= 0.35;

        setDragOffsetPx(clamp(effectiveDx, -maxOffsetPx, maxOffsetPx));
      }}
      onPointerUp={(event) => {
        const gesture = gestureRef.current;
        if (gesture.pointerId === null) return;
        if (event.pointerId !== gesture.pointerId) return;

        const rawDx = gesture.rawDx;
        const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
        const activeThresholdPx = viewportWidth ? getThresholdPx(viewportWidth) : thresholdPx;

        const wantsPrev = rawDx > activeThresholdPx;
        const wantsNext = rawDx < -activeThresholdPx;
        const target = wantsPrev ? prev : wantsNext ? next : null;

        gestureRef.current = {
          pointerId: null,
          startX: 0,
          startY: 0,
          axis: null,
          rawDx: 0,
        };

        setIsDragging(false);
        setDragOffsetPx(0);

        if (gesture.axis === "x" && target) {
          router.push(`/corpus/${target.id}`);
        }
      }}
      onPointerCancel={() => {
        gestureRef.current = {
          pointerId: null,
          startX: 0,
          startY: 0,
          axis: null,
          rawDx: 0,
        };
        setIsDragging(false);
        setDragOffsetPx(0);
      }}
    >
      {/* Prev hint */}
      {prev ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex w-20 items-center justify-start px-3"
          style={{ opacity: showPrevHint ? hintOpacity : 0 }}
        >
          <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span className="max-w-24 truncate">{prev.title}</span>
          </div>
        </div>
      ) : null}

      {/* Next hint */}
      {next ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-end px-3"
          style={{ opacity: showNextHint ? hintOpacity : 0 }}
        >
          <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
            <span className="max-w-24 truncate">{next.title}</span>
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
        </div>
      ) : null}

      <div
        className={`will-change-transform ${
          isDragging ? "" : "transition-transform duration-200 ease-out"
        }`}
        style={{ transform: `translate3d(${dragOffsetPx}px, 0, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}
