/**
 * BrennerBot Analytics Library
 *
 * Comprehensive GA4 integration for tracking user engagement with the Brenner method corpus,
 * tutorial funnels, and research content. Implements dual-track analytics (client + server)
 * for reliable conversion tracking.
 *
 * Key tracking areas:
 * 1. Corpus engagement (document reading, scroll depth, time on page)
 * 2. Tutorial/wizard funnel (step-by-step progress)
 * 3. Search behavior (queries, click-through)
 * 4. Glossary/operator exploration
 * 5. Navigation patterns and content discovery
 *
 * Usage:
 *   import { trackDocumentView, trackTutorialStep, trackSearch } from '@/lib/analytics';
 */

// =============================================================================
// Configuration & Types
// =============================================================================

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (
      command: "config" | "event" | "set" | "js",
      targetId: string | Date,
      params?: Record<string, unknown>,
    ) => void;
  }
}

/**
 * Sanitize GA Measurement ID (handles common misconfigurations)
 */
function sanitizeGaMeasurementId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let cleaned = value.trim();
  if (!cleaned) return undefined;

  // Remove accidental quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove escaped newlines from Vercel env pulls
  cleaned = cleaned.replace(/\\n$/, "").replace(/\s+$/, "");

  // Extract valid GA4 ID pattern
  const ga4Match = cleaned.match(/^(G-[A-Z0-9]+)/i);
  if (ga4Match) return ga4Match[1];

  // Legacy UA format (shouldn't be used but handle gracefully)
  const uaMatch = cleaned.match(/^(UA-\d+-\d+)/i);
  if (uaMatch) return uaMatch[1];

  return undefined;
}

const GA_MEASUREMENT_ID_RAW = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const GA_MEASUREMENT_ID = sanitizeGaMeasurementId(GA_MEASUREMENT_ID_RAW);

// =============================================================================
// Core Analytics Functions
// =============================================================================

/**
 * Check if analytics is properly configured and we're in a browser
 */
export function isAnalyticsEnabled(): boolean {
  return typeof window !== "undefined" && !!GA_MEASUREMENT_ID && typeof window.gtag === "function";
}

/**
 * Safe localStorage get
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe localStorage set
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore - localStorage might be full or blocked
  }
}

/**
 * Safe JSON parse from localStorage
 */
function safeGetJSON<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Safe JSON stringify to localStorage
 */
function safeSetJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore
  }
}

/**
 * Get or create a stable client ID for the user
 */
export function getClientId(): string {
  if (typeof window === "undefined") return "";

  const storageKey = "brennerbot_client_id";
  let clientId = safeGetItem(storageKey);

  if (!clientId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      clientId = crypto.randomUUID();
    } else {
      clientId = `${Date.now()}.${Math.random().toString(36).slice(2, 11)}`;
    }
    safeSetItem(storageKey, clientId);
  }

  return clientId;
}

/**
 * Get or create a persistent user ID
 */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const storageKey = "brennerbot_user_id";
  let userId = safeGetItem(storageKey);

  if (!userId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      userId = `user_${crypto.randomUUID()}`;
    } else {
      userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    safeSetItem(storageKey, userId);
    sendEvent("new_user_created", { user_id: userId });
  }

  return userId;
}

// =============================================================================
// Event Tracking
// =============================================================================

/**
 * Send a custom event to GA4
 */
export function sendEvent(eventName: string, parameters?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) return;

  window.gtag("event", eventName, {
    ...parameters,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Set user properties in GA4
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (!isAnalyticsEnabled()) return;

  window.gtag("set", "user_properties", properties);
}

/**
 * Send event via server-side Measurement Protocol (bypasses ad blockers)
 */
export async function sendServerEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!GA_MEASUREMENT_ID) return;

  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: getClientId(),
        events: [{ name: eventName, params }],
      }),
    });
  } catch {
    // Silently fail - don't disrupt user experience
  }
}

// =============================================================================
// System Health Analytics
// =============================================================================

const SYSTEM_EVENT_PREFIX = "system_";
const MAX_ERROR_MESSAGE_LENGTH = 180;

function sanitizeSystemEventName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return `${SYSTEM_EVENT_PREFIX}unknown`;
  return trimmed.startsWith(SYSTEM_EVENT_PREFIX) ? trimmed : `${SYSTEM_EVENT_PREFIX}${trimmed}`;
}

function truncateMessage(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function normalizeSystemError(error: unknown): {
  error_type?: string;
  error_message?: string;
} {
  if (!error) return {};
  if (error instanceof Error) {
    return {
      error_type: error.name || "Error",
      error_message: truncateMessage(error.message || "Unknown error", MAX_ERROR_MESSAGE_LENGTH),
    };
  }
  if (typeof error === "string") {
    return {
      error_type: "Error",
      error_message: truncateMessage(error, MAX_ERROR_MESSAGE_LENGTH),
    };
  }
  try {
    return {
      error_type: "Error",
      error_message: truncateMessage(JSON.stringify(error), MAX_ERROR_MESSAGE_LENGTH),
    };
  } catch {
    return {
      error_type: "Error",
      error_message: "Unknown error",
    };
  }
}

function coerceSystemParams(
  params?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const safeParams: Record<string, string | number | boolean> = {};
  if (!params) return safeParams;

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safeParams[key] = value;
    }
  }

  return safeParams;
}

export function trackSystemEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const name = sanitizeSystemEventName(eventName);
  const safeParams = coerceSystemParams({
    ...params,
    path: window.location?.pathname ?? "",
  });

  sendEvent(name, safeParams);
  void sendServerEvent(name, safeParams);
}

export function trackSystemLatency(
  eventName: string,
  durationMs: number,
  params?: Record<string, unknown>,
): void {
  trackSystemEvent(eventName, {
    ...params,
    duration_ms: Math.max(0, Math.round(durationMs)),
  });
}

// =============================================================================
// Document & Corpus Tracking
// =============================================================================

export type DocumentType =
  | "transcript"
  | "distillation"
  | "quote_bank"
  | "metaprompt"
  | "method"
  | "operators"
  | "glossary"
  | "session"
  | "landing";

const FIRST_DOC_READ_KEY = "brennerbot_first_doc_read";

/**
 * Track when a user views a document
 */
export function trackDocumentView(
  documentType: DocumentType,
  documentId: string,
  documentTitle: string,
  source?: "search" | "nav" | "link" | "scroll" | "direct",
): void {
  sendEvent("document_view", {
    document_type: documentType,
    document_id: documentId,
    document_title: documentTitle,
    content_discovery_source: source || "direct",
  });

  // Track first document read conversion (only fires once ever)
  if (!safeGetItem(FIRST_DOC_READ_KEY) && documentType !== "landing") {
    safeSetItem(FIRST_DOC_READ_KEY, new Date().toISOString());
    trackConversion("first_document_read", 1);
  }
}

/**
 * Track scroll depth on a document
 */
export function trackScrollDepth(
  depth: 25 | 50 | 75 | 90 | 100,
  documentType: DocumentType,
  documentId: string,
): void {
  sendEvent("scroll_depth", {
    depth_percentage: depth,
    document_type: documentType,
    document_id: documentId,
    reading_depth_percent: depth,
  });
}

/**
 * Track time spent on a document
 */
export function trackTimeOnDocument(
  seconds: number,
  documentType: DocumentType,
  documentId: string,
): void {
  // Categorize into buckets for analysis
  let timeBucket: "quick" | "engaged" | "deep";
  if (seconds < 30) {
    timeBucket = "quick";
  } else if (seconds < 180) {
    timeBucket = "engaged";
  } else {
    timeBucket = "deep";
  }

  sendEvent("time_on_document", {
    time_on_document_seconds: seconds,
    document_type: documentType,
    document_id: documentId,
    time_on_document_bucket: timeBucket,
  });

  // Track conversion for deep reading
  if (seconds >= 180) {
    trackConversion("deep_reading", 5);
  }
}

/**
 * Track when a user clicks an anchor reference (e.g., §58)
 */
export function trackAnchorClick(anchor: string, fromDocument: string, toDocument?: string): void {
  sendEvent("anchor_click", {
    anchor_clicked: anchor,
    navigation_from: fromDocument,
    navigation_to: toDocument || anchor,
  });
}

/**
 * Track document exit (for measuring engagement)
 */
export function trackDocumentExit(
  documentType: DocumentType,
  documentId: string,
  timeSpentSeconds: number,
  maxScrollDepth: number,
): void {
  sendEvent("document_exit", {
    document_type: documentType,
    document_id: documentId,
    time_on_document_seconds: timeSpentSeconds,
    reading_depth_percent: maxScrollDepth,
    transport_type: "beacon",
  });
}

// =============================================================================
// Search Tracking
// =============================================================================

/**
 * Track search query execution
 */
export function trackSearch(query: string, category: string | null, resultsCount: number): void {
  sendEvent("search", {
    search_query: query,
    search_category: category || "all",
    search_results_count: resultsCount,
  });
}

/**
 * Track when a user clicks a search result
 */
export function trackSearchResultClick(
  query: string,
  resultPosition: number,
  resultDocumentId: string,
  resultDocumentType: DocumentType,
): void {
  sendEvent("search_result_click", {
    search_query: query,
    search_click_position: resultPosition,
    document_id: resultDocumentId,
    document_type: resultDocumentType,
    content_discovery_source: "search",
  });

  // Track conversion for engaged search
  if (resultPosition <= 3) {
    trackConversion("search_engaged", 2);
  }
}

// =============================================================================
// Glossary & Operator Tracking
// =============================================================================

export type JargonCategory =
  | "operators"
  | "brenner"
  | "biology"
  | "bayesian"
  | "method"
  | "project";

/**
 * Track when a user views a jargon term
 */
export function trackJargonView(
  term: string,
  category: JargonCategory,
  viewType: "tooltip" | "modal" | "page",
): void {
  sendEvent("jargon_view", {
    jargon_term: term,
    jargon_category: category,
    view_type: viewType,
  });
}

/**
 * Track accumulated jargon engagement
 */
const jargonViewedInSession = new Set<string>();

export function trackJargonEngagement(term: string, category: JargonCategory): void {
  jargonViewedInSession.add(term);

  // Track the specific category being explored
  sendEvent("jargon_engagement", {
    jargon_term: term,
    jargon_category: category,
    unique_terms_viewed: jargonViewedInSession.size,
  });

  if (jargonViewedInSession.size === 3) {
    trackConversion("glossary_engaged", 3);
  }
}

/**
 * Track when a user views an operator in detail
 */
export function trackOperatorView(
  operatorId: string,
  operatorName: string,
  viewType: "list" | "detail" | "inline",
): void {
  sendEvent("operator_view", {
    operator_id: operatorId,
    operator_name: operatorName,
    view_type: viewType,
  });

  if (viewType === "detail") {
    trackConversion("operator_studied", 3);
  }
}

// =============================================================================
// Tutorial/Wizard Funnel Tracking
// =============================================================================

export type TutorialStep =
  | "welcome"
  | "what_is_brenner"
  | "two_axioms"
  | "operators_intro"
  | "level_split"
  | "exclusion_test"
  | "object_transpose"
  | "scale_check"
  | "practice_session"
  | "next_steps"
  | "complete";

const TUTORIAL_STEPS: TutorialStep[] = [
  "welcome",
  "what_is_brenner",
  "two_axioms",
  "operators_intro",
  "level_split",
  "exclusion_test",
  "object_transpose",
  "scale_check",
  "practice_session",
  "next_steps",
  "complete",
];

const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;
const TUTORIAL_FUNNEL_KEY = "brennerbot_tutorial_funnel";

interface TutorialFunnelData {
  sessionId: string;
  startedAt: string;
  currentStep: number;
  maxStepReached: number;
  stepTimestamps: Record<number, { entered: string; completed?: string }>;
  completedSteps: number[];
  source: string;
  medium: string;
  campaign: string;
}

function getTutorialFunnelData(): TutorialFunnelData | null {
  return safeGetJSON<TutorialFunnelData>(TUTORIAL_FUNNEL_KEY);
}

/**
 * Initialize the tutorial funnel
 */
export function initTutorialFunnel(): TutorialFunnelData {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");

  let sessionId = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    sessionId = `tutorial_${crypto.randomUUID()}`;
  } else {
    sessionId = `tutorial_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  const funnelData: TutorialFunnelData = {
    sessionId,
    startedAt: new Date().toISOString(),
    currentStep: 0,
    maxStepReached: 0,
    stepTimestamps: {},
    completedSteps: [],
    source: params.get("utm_source") || document.referrer || "direct",
    medium: params.get("utm_medium") || "none",
    campaign: params.get("utm_campaign") || "none",
  };

  safeSetJSON(TUTORIAL_FUNNEL_KEY, funnelData);

  sendEvent("tutorial_funnel_initiated", {
    funnel_id: funnelData.sessionId,
    funnel_source: funnelData.source,
    funnel_medium: funnelData.medium,
    funnel_campaign: funnelData.campaign,
    referrer: typeof document !== "undefined" ? document.referrer : "",
  });

  trackConversion("tutorial_started", 1);

  return funnelData;
}

/**
 * Track when user enters a tutorial step
 */
export function trackTutorialStepEnter(stepNumber: number, stepName: TutorialStep): void {
  let funnelData = getTutorialFunnelData();
  if (!funnelData) {
    funnelData = initTutorialFunnel();
  }

  const now = new Date().toISOString();
  const previousStep = funnelData.currentStep;
  const isNewMaxStep = stepNumber > funnelData.maxStepReached;

  funnelData.currentStep = stepNumber;
  funnelData.maxStepReached = Math.max(funnelData.maxStepReached, stepNumber);
  funnelData.stepTimestamps[stepNumber] = {
    ...funnelData.stepTimestamps[stepNumber],
    entered: now,
  };

  safeSetJSON(TUTORIAL_FUNNEL_KEY, funnelData);

  // Calculate time from previous step (including step 0)
  let timeFromPreviousStep: number | undefined;
  if (previousStep >= 0 && funnelData.stepTimestamps[previousStep]?.entered) {
    const prevTime = new Date(funnelData.stepTimestamps[previousStep].entered).getTime();
    timeFromPreviousStep = Math.round((Date.now() - prevTime) / 1000);
  }

  sendEvent("tutorial_step_enter", {
    funnel_id: funnelData.sessionId,
    tutorial_step: stepNumber,
    tutorial_step_name: stepName,
    previous_step: previousStep,
    is_new_max_step: isNewMaxStep,
    tutorial_progress_percent: Math.round((stepNumber / TOTAL_TUTORIAL_STEPS) * 100),
    tutorial_total_steps: TOTAL_TUTORIAL_STEPS,
    time_from_previous_step: timeFromPreviousStep,
    is_returning: !isNewMaxStep && stepNumber <= funnelData.maxStepReached,
  });

  // Track milestones
  if (stepNumber === 1) {
    sendEvent("tutorial_milestone", {
      milestone: "tutorial_started",
      funnel_id: funnelData.sessionId,
    });
  } else if (stepNumber === 4) {
    sendEvent("tutorial_milestone", {
      milestone: "operators_reached",
      funnel_id: funnelData.sessionId,
    });
  } else if (stepNumber === 9) {
    sendEvent("tutorial_milestone", {
      milestone: "practice_reached",
      funnel_id: funnelData.sessionId,
    });
  }
}

/**
 * Track when user completes a tutorial step
 */
export function trackTutorialStepComplete(
  stepNumber: number,
  stepName: TutorialStep,
  additionalData?: Record<string, unknown>,
): void {
  const funnelData = getTutorialFunnelData();
  if (!funnelData) return;

  const now = new Date().toISOString();

  // Calculate time on step
  let timeOnStep: number | undefined;
  if (funnelData.stepTimestamps[stepNumber]?.entered) {
    const enterTime = new Date(funnelData.stepTimestamps[stepNumber].entered).getTime();
    timeOnStep = Math.round((Date.now() - enterTime) / 1000);
  }

  if (!funnelData.completedSteps.includes(stepNumber)) {
    funnelData.completedSteps.push(stepNumber);
    funnelData.completedSteps.sort((a, b) => a - b);
  }

  funnelData.stepTimestamps[stepNumber] = {
    ...funnelData.stepTimestamps[stepNumber],
    completed: now,
  };

  safeSetJSON(TUTORIAL_FUNNEL_KEY, funnelData);

  sendEvent("tutorial_step_complete", {
    funnel_id: funnelData.sessionId,
    tutorial_step: stepNumber,
    tutorial_step_name: stepName,
    time_on_tutorial_step_seconds: timeOnStep,
    tutorial_completed_steps: funnelData.completedSteps.length,
    tutorial_total_steps: TOTAL_TUTORIAL_STEPS,
    tutorial_progress_percent: Math.round(
      (funnelData.completedSteps.length / TOTAL_TUTORIAL_STEPS) * 100,
    ),
    ...additionalData,
  });

  trackConversion("tutorial_step_complete", 2);

  // Check for tutorial completion
  if (stepNumber === TOTAL_TUTORIAL_STEPS - 1) {
    trackTutorialComplete();
  }
}

/**
 * Track tutorial completion
 */
export function trackTutorialComplete(): void {
  const funnelData = getTutorialFunnelData();
  if (!funnelData) return;

  const startTime = new Date(funnelData.startedAt).getTime();
  const totalTimeSeconds = Math.round((Date.now() - startTime) / 1000);
  const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

  sendEvent("tutorial_complete", {
    funnel_id: funnelData.sessionId,
    total_session_time_seconds: totalTimeSeconds,
    total_time_minutes: totalTimeMinutes,
    tutorial_completed_steps: funnelData.completedSteps.length,
    max_step_reached: funnelData.maxStepReached,
    funnel_source: funnelData.source,
    funnel_medium: funnelData.medium,
    funnel_campaign: funnelData.campaign,
  });

  trackConversion("tutorial_complete", 10);

  setUserProperties({
    tutorial_completed: true,
    tutorial_completion_date: new Date().toISOString(),
    tutorial_completion_time_minutes: totalTimeMinutes,
  });
}

/**
 * Track tutorial dropoff/abandonment
 */
export function trackTutorialDropoff(reason?: string): void {
  const funnelData = getTutorialFunnelData();
  if (!funnelData || funnelData.completedSteps.includes(TOTAL_TUTORIAL_STEPS - 1)) return;

  const startTime = new Date(funnelData.startedAt).getTime();
  const totalTimeSeconds = Math.round((Date.now() - startTime) / 1000);

  // Calculate time on current step
  let timeOnCurrentStep: number | undefined;
  if (funnelData.stepTimestamps[funnelData.currentStep]?.entered) {
    const enterTime = new Date(funnelData.stepTimestamps[funnelData.currentStep].entered).getTime();
    timeOnCurrentStep = Math.round((Date.now() - enterTime) / 1000);
  }

  sendEvent("tutorial_dropoff", {
    funnel_id: funnelData.sessionId,
    dropped_at_step: funnelData.currentStep,
    dropped_at_step_name: TUTORIAL_STEPS[funnelData.currentStep] || "unknown",
    max_step_reached: funnelData.maxStepReached,
    tutorial_completed_steps: funnelData.completedSteps.length,
    total_session_time_seconds: totalTimeSeconds,
    time_on_current_step_seconds: timeOnCurrentStep,
    dropoff_reason: reason || "unknown",
    funnel_source: funnelData.source,
    funnel_medium: funnelData.medium,
  });
}

/**
 * Get current tutorial progress for UI display
 */
export function getTutorialProgress(): {
  currentStep: number;
  maxStepReached: number;
  completedSteps: number[];
  totalSteps: number;
  progressPercent: number;
} {
  const funnelData = getTutorialFunnelData();
  if (!funnelData) {
    return {
      currentStep: 0,
      maxStepReached: 0,
      completedSteps: [],
      totalSteps: TOTAL_TUTORIAL_STEPS,
      progressPercent: 0,
    };
  }

  return {
    currentStep: funnelData.currentStep,
    maxStepReached: funnelData.maxStepReached,
    completedSteps: funnelData.completedSteps,
    totalSteps: TOTAL_TUTORIAL_STEPS,
    progressPercent: Math.round((funnelData.completedSteps.length / TOTAL_TUTORIAL_STEPS) * 100),
  };
}

// =============================================================================
// Conversion Tracking
// =============================================================================

export type ConversionType =
  | "first_document_read"
  | "deep_reading"
  | "corpus_explorer"
  | "search_engaged"
  | "tutorial_started"
  | "tutorial_step_complete"
  | "tutorial_complete"
  | "glossary_engaged"
  | "operator_studied"
  | "return_visitor"
  | "power_user";

/**
 * Track a conversion event (both client and server-side)
 */
export function trackConversion(conversionType: ConversionType, value?: number): void {
  const params = {
    conversion_type: conversionType,
    conversion_value: value ?? 0,
  };

  // Client-side (fast but may be blocked)
  sendEvent("conversion", params);

  // Server-side (reliable)
  sendServerEvent("conversion", params);

  // Also send the specific conversion event name
  sendEvent(conversionType, { conversion_value: value ?? 0 });
  sendServerEvent(conversionType, { conversion_value: value ?? 0 });
}

// =============================================================================
// Session & Engagement Tracking
// =============================================================================

/**
 * Extract UTM parameters and referrer from current URL
 */
function getAcquisitionData(): {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
  referrer_domain: string;
  landing_page: string;
} {
  if (typeof window === "undefined") {
    return {
      utm_source: "direct",
      utm_medium: "none",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      referrer: "",
      referrer_domain: "",
      landing_page: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";
  let referrerDomain = "";

  try {
    if (referrer) {
      referrerDomain = new URL(referrer).hostname;
    }
  } catch {
    // Invalid URL
  }

  // Determine source from UTM or referrer
  let source = params.get("utm_source") || "";
  let medium = params.get("utm_medium") || "";

  if (!source && referrer) {
    // Infer source from referrer
    if (referrerDomain.includes("google")) {
      source = "google";
      medium = medium || "organic";
    } else if (referrerDomain.includes("bing")) {
      source = "bing";
      medium = medium || "organic";
    } else if (referrerDomain.includes("twitter") || referrerDomain.includes("x.com")) {
      source = "twitter";
      medium = medium || "social";
    } else if (referrerDomain.includes("linkedin")) {
      source = "linkedin";
      medium = medium || "social";
    } else if (referrerDomain.includes("facebook")) {
      source = "facebook";
      medium = medium || "social";
    } else if (referrerDomain.includes("reddit")) {
      source = "reddit";
      medium = medium || "social";
    } else if (referrerDomain.includes("github")) {
      source = "github";
      medium = medium || "referral";
    } else if (referrerDomain) {
      source = referrerDomain;
      medium = medium || "referral";
    }
  }

  return {
    utm_source: source || "direct",
    utm_medium: medium || "none",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
    referrer,
    referrer_domain: referrerDomain,
    landing_page: window.location.pathname,
  };
}

const FIRST_VISIT_KEY = "brennerbot_first_visit";
const FIRST_SOURCE_KEY = "brennerbot_first_source";

/**
 * Track session start with device info, UTM parameters, and referrer
 */
export function trackSessionStart(): void {
  if (typeof window === "undefined") return;

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isTouchDevice = "ontouchstart" in window;
  const acquisition = getAcquisitionData();

  // Check for first visit
  const isFirstVisit = !safeGetItem(FIRST_VISIT_KEY);
  const now = new Date().toISOString();

  if (isFirstVisit) {
    safeSetItem(FIRST_VISIT_KEY, now);
    safeSetJSON(FIRST_SOURCE_KEY, {
      source: acquisition.utm_source,
      medium: acquisition.utm_medium,
      campaign: acquisition.utm_campaign,
      landing_page: acquisition.landing_page,
      referrer: acquisition.referrer,
    });
  }

  // Get first visit data for user properties
  const firstVisitDate = safeGetItem(FIRST_VISIT_KEY) || now;
  const firstSource = safeGetJSON<{
    source: string;
    medium: string;
    campaign: string;
    landing_page: string;
  }>(FIRST_SOURCE_KEY);

  sendEvent("session_start_enhanced", {
    // Device info
    screen_width: screenWidth,
    screen_height: screenHeight,
    device_pixel_ratio: devicePixelRatio,
    is_touch_device: isTouchDevice,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.userAgent.includes("Mac")
      ? "macOS"
      : navigator.userAgent.includes("Win")
        ? "Windows"
        : navigator.userAgent.includes("Linux")
          ? "Linux"
          : navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")
            ? "iOS"
            : navigator.userAgent.includes("Android")
              ? "Android"
              : "unknown",
    // Acquisition data
    utm_source: acquisition.utm_source,
    utm_medium: acquisition.utm_medium,
    utm_campaign: acquisition.utm_campaign,
    utm_term: acquisition.utm_term,
    utm_content: acquisition.utm_content,
    referrer: acquisition.referrer,
    referrer_domain: acquisition.referrer_domain,
    landing_page: acquisition.landing_page,
    is_first_visit: isFirstVisit,
  });

  // Check for returning user
  const visitCount = parseInt(safeGetItem("brennerbot_visit_count") || "0", 10) + 1;
  safeSetItem("brennerbot_visit_count", String(visitCount));

  // Set comprehensive user properties
  setUserProperties({
    // Visit tracking
    visit_count: visitCount,
    is_returning_user: visitCount > 1,
    // First visit attribution (persists across sessions)
    first_visit_date: firstVisitDate,
    first_traffic_source: firstSource?.source || acquisition.utm_source,
    first_traffic_medium: firstSource?.medium || acquisition.utm_medium,
    first_landing_page: firstSource?.landing_page || acquisition.landing_page,
    // Current session attribution
    latest_traffic_source: acquisition.utm_source,
    latest_traffic_medium: acquisition.utm_medium,
  });

  if (visitCount === 2) {
    trackConversion("return_visitor", 5);
  }
}

// Track documents viewed across sessions for power user detection
const DOCS_VIEWED_KEY = "brennerbot_docs_viewed";

export function trackDocumentsViewed(documentId: string): void {
  const viewed = new Set(safeGetJSON<string[]>(DOCS_VIEWED_KEY) || []);
  viewed.add(documentId);
  safeSetJSON(DOCS_VIEWED_KEY, Array.from(viewed));

  const count = viewed.size;

  sendEvent("documents_viewed_milestone", {
    documents_viewed_count: count,
  });

  if (count === 5) {
    trackConversion("corpus_explorer", 5);
  } else if (count === 20) {
    trackConversion("power_user", 10);
  }
}

// =============================================================================
// Navigation Tracking
// =============================================================================

/**
 * Track navigation between pages
 */
export function trackNavigation(
  from: string,
  to: string,
  method: "nav" | "link" | "search" | "back" | "forward",
): void {
  sendEvent("navigation", {
    navigation_from: from,
    navigation_to: to,
    navigation_method: method,
  });
}

/**
 * Track outbound link clicks
 */
export function trackOutboundLink(url: string, linkText: string): void {
  let linkDomain = "unknown";
  try {
    linkDomain = new URL(url).hostname;
  } catch {
    // Invalid URL
  }

  sendEvent("outbound_link_click", {
    link_url: url,
    link_text: linkText,
    link_domain: linkDomain,
  });
}

/**
 * Track CTA clicks on landing page
 */
export function trackLandingCTA(
  ctaType: "hero_start" | "feature_start" | "footer_start" | "nav_start" | "tutorial_start",
  ctaText: string,
): void {
  sendEvent("landing_cta_click", {
    cta_type: ctaType,
    cta_text: ctaText,
    page_scroll_depth:
      typeof window !== "undefined"
        ? (() => {
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            return scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 0;
          })()
        : 0,
  });
}

// =============================================================================
// Error Tracking
// =============================================================================

/**
 * Track errors for debugging
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  errorStack?: string,
  context?: Record<string, unknown>,
): void {
  sendEvent("error_occurred", {
    error_type: errorType,
    error_message: errorMessage,
    error_stack: errorStack?.slice(0, 500),
    ...context,
  });
}

/**
 * Track API errors
 */
export function trackAPIError(endpoint: string, statusCode: number, errorMessage: string): void {
  sendEvent("api_error", {
    endpoint,
    status_code: statusCode,
    error_message: errorMessage,
  });
}

// =============================================================================
// Performance Tracking
// =============================================================================

/**
 * Track page performance metrics
 */
export function trackPagePerformance(): void {
  if (typeof window === "undefined" || !window.performance) return;

  const timing = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (!timing) return;

  sendEvent("page_performance", {
    dns_lookup_ms: Math.round(timing.domainLookupEnd - timing.domainLookupStart),
    tcp_connect_ms: Math.round(timing.connectEnd - timing.connectStart),
    ttfb_ms: Math.round(timing.responseStart - timing.requestStart),
    dom_interactive_ms: Math.round(timing.domInteractive - timing.startTime),
    dom_complete_ms: Math.round(timing.domComplete - timing.startTime),
    load_complete_ms: Math.round(timing.loadEventEnd - timing.startTime),
  });
}

/**
 * Track Web Vitals
 */
export function trackWebVitals(metric: { name: string; value: number; id: string }): void {
  sendEvent("web_vitals", {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_id: metric.id,
  });
}
