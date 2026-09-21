"use client";

import { AnimatePresence, motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const CloseIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Spring physics for natural feel
const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 40,
  mass: 1,
};

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const constraintsRef = React.useRef<HTMLDivElement>(null);

  // Motion value for drag-to-dismiss
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);

  // Handle escape key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Portal mounting
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle drag end
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="bottom-sheet-container"
          ref={constraintsRef}
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "bottom-sheet-title" : undefined}
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col",
              "rounded-t-3xl border-t border-border/50 bg-card shadow-2xl",
              className,
            )}
            style={{ y, touchAction: "pan-y" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-border/50">
                <h2 id="bottom-sheet-title" className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <motion.button
                  onClick={onClose}
                  className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
                  aria-label="Close"
                  whileTap={{ scale: 0.92 }}
                >
                  <CloseIcon />
                </motion.button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-2">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Helper hook to manage bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// Context for bottom sheet actions
interface BottomSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export function BottomSheetActions({
  actions,
  onClose,
}: {
  actions: BottomSheetAction[];
  onClose: () => void;
}) {
  return (
    <div className="space-y-1">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left",
            "hover:bg-muted active:bg-muted/70 active:scale-[0.98] transition-all touch-manipulation",
            action.destructive && "text-destructive hover:bg-destructive/10",
          )}
        >
          {action.icon && <span className="size-5 text-muted-foreground">{action.icon}</span>}
          <span className="font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
