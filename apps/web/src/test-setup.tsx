/**
 * Test Setup for Vitest
 *
 * Extends Vitest's expect with jest-dom matchers for DOM assertions.
 * This file is automatically run before each test file.
 *
 * @see https://testing-library.com/docs/ecosystem-jest-dom/
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// happy-dom polyfills
// ---------------------------------------------------------------------------

// Radix Select relies on pointer capture APIs; happy-dom doesn't implement them (yet).
// Provide no-op implementations to keep unit tests deterministic.
if (typeof HTMLElement !== "undefined") {
  try {
    const elementProto = HTMLElement.prototype as unknown as {
      hasPointerCapture?: (pointerId: number) => boolean;
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
    };

    if (typeof elementProto.hasPointerCapture !== "function") {
      elementProto.hasPointerCapture = () => false;
    }
    if (typeof elementProto.setPointerCapture !== "function") {
      elementProto.setPointerCapture = () => {};
    }
    if (typeof elementProto.releasePointerCapture !== "function") {
      elementProto.releasePointerCapture = () => {};
    }
  } catch {
    // Ignore polyfill failures; tests should still run even without pointer capture APIs.
  }
}

// Animation props used by framer-motion that should be stripped in tests
const ANIMATION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "layout",
  "layoutId",
  // Drag-related props (these otherwise leak onto DOM nodes and trigger React warnings)
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragTransition",
  "dragListener",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onPan",
  "onPanStart",
  "onPanEnd",
  "onAnimationStart",
  "onAnimationComplete",
]);

/**
 * Strip framer-motion animation props from an object, returning only HTML-safe props.
 */
function stripAnimationProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  const sanitizedEntries = Object.entries(props).filter(([key]) => !ANIMATION_PROPS.has(key));

  // Framer Motion often uses x/y MotionValues in `style`. In unit tests we render plain DOM nodes,
  // so drop non-CSS keys to avoid noisy warnings and brittle snapshots.
  const styleEntryIndex = sanitizedEntries.findIndex(([key]) => key === "style");
  if (styleEntryIndex !== -1) {
    const styleValue = sanitizedEntries[styleEntryIndex]?.[1];
    if (styleValue && typeof styleValue === "object" && !Array.isArray(styleValue)) {
      const styleObj = styleValue as Record<string, unknown>;
      const { x, y, ...rest } = styleObj;
      void x;
      void y;
      sanitizedEntries[styleEntryIndex] = ["style", rest];
    }
  }

  return Object.fromEntries(sanitizedEntries) as Partial<T>;
}

// Mock framer-motion to render without animations in tests
// This prevents elements from being stuck at initial opacity: 0
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({ children, ...props }: React.ComponentProps<"div">) => (
        <div {...(stripAnimationProps(props) as React.ComponentProps<"div">)}>{children}</div>
      ),
      section: ({ children, ...props }: React.ComponentProps<"section">) => (
        <section {...(stripAnimationProps(props) as React.ComponentProps<"section">)}>
          {children}
        </section>
      ),
      span: ({ children, ...props }: React.ComponentProps<"span">) => (
        <span {...(stripAnimationProps(props) as React.ComponentProps<"span">)}>{children}</span>
      ),
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p {...(stripAnimationProps(props) as React.ComponentProps<"p">)}>{children}</p>
      ),
      button: ({ children, ...props }: React.ComponentProps<"button">) => (
        <button {...(stripAnimationProps(props) as React.ComponentProps<"button">)}>
          {children}
        </button>
      ),
      a: ({ children, ...props }: React.ComponentProps<"a">) => (
        <a {...(stripAnimationProps(props) as React.ComponentProps<"a">)}>{children}</a>
      ),
    },
  };
});
