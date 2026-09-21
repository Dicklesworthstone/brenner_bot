"use client";

/**
 * useTutorialAnalytics - Hook for tutorial analytics tracking
 *
 * Provides easy integration of analytics with tutorial components.
 * Automatically tracks step views, completions, and navigation patterns.
 *
 * Usage:
 *   const { trackStepView, trackStepComplete, trackNavigation } = useTutorialAnalytics();
 *
 *   // In TutorialStep or page component:
 *   useEffect(() => {
 *     trackStepView(currentStep, stepName);
 *   }, [currentStep]);
 *
 *   const handleNext = () => {
 *     trackStepComplete(currentStep, stepName);
 *     goToNextStep();
 *   };
 */

import { useCallback, useEffect, useRef } from "react";
import {
  getTutorialProgress,
  initTutorialFunnel,
  type TutorialStep,
  trackTutorialDropoff,
  trackTutorialStepComplete,
  trackTutorialStepEnter,
} from "@/lib/analytics";

export interface UseTutorialAnalyticsOptions {
  /** Auto-initialize funnel on mount */
  autoInit?: boolean;
  /** Track dropoff on unmount */
  trackDropoffOnUnmount?: boolean;
}

export interface TutorialAnalyticsHook {
  /** Track when user views a step */
  trackStepView: (stepNumber: number, stepName: TutorialStep) => void;
  /** Track when user completes a step */
  trackStepComplete: (
    stepNumber: number,
    stepName: TutorialStep,
    additionalData?: Record<string, unknown>,
  ) => void;
  /** Track explicit dropoff */
  trackDropoff: (reason?: string) => void;
  /** Get current progress */
  getProgress: typeof getTutorialProgress;
  /** Initialize funnel (usually automatic) */
  initFunnel: typeof initTutorialFunnel;
}

/**
 * Hook for tutorial analytics tracking
 */
export function useTutorialAnalytics(
  options: UseTutorialAnalyticsOptions = {},
): TutorialAnalyticsHook {
  const { autoInit = true, trackDropoffOnUnmount = true } = options;
  const hasInitialized = useRef(false);
  const currentStepRef = useRef<number>(0);

  // Auto-initialize funnel on mount
  useEffect(() => {
    if (autoInit && !hasInitialized.current) {
      const progress = getTutorialProgress();
      if (progress.currentStep === 0 && progress.completedSteps.length === 0) {
        initTutorialFunnel();
      }
      hasInitialized.current = true;
    }
  }, [autoInit]);

  // Track dropoff on unmount
  useEffect(() => {
    return () => {
      if (trackDropoffOnUnmount) {
        const progress = getTutorialProgress();
        // Only track dropoff if not completed
        if (progress.completedSteps.length < progress.totalSteps) {
          trackTutorialDropoff("navigation_away");
        }
      }
    };
  }, [trackDropoffOnUnmount]);

  const trackStepView = useCallback((stepNumber: number, stepName: TutorialStep) => {
    currentStepRef.current = stepNumber;
    trackTutorialStepEnter(stepNumber, stepName);
  }, []);

  const trackStepComplete = useCallback(
    (stepNumber: number, stepName: TutorialStep, additionalData?: Record<string, unknown>) => {
      trackTutorialStepComplete(stepNumber, stepName, additionalData);
    },
    [],
  );

  const trackDropoff = useCallback((reason?: string) => {
    trackTutorialDropoff(reason);
  }, []);

  return {
    trackStepView,
    trackStepComplete,
    trackDropoff,
    getProgress: getTutorialProgress,
    initFunnel: initTutorialFunnel,
  };
}

export default useTutorialAnalytics;
