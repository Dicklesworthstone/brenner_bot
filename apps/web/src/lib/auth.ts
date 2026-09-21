/**
 * Lab Mode Authentication & Authorization
 *
 * Defense-in-depth gating for orchestration features:
 * 1. BRENNER_LAB_MODE must be "1" or "true" (fail-closed)
 * 2. Either:
 *    - Cloudflare Access headers (when deployed behind CF Access), OR
 *    - BRENNER_LAB_SECRET shared secret (header/cookie) for local + fallback
 *
 * Public deployments MUST NOT trigger Agent Mail operations without
 * explicit enablement.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const LAB_SECRET_HEADER = "x-brenner-lab-secret";
const LAB_SECRET_COOKIE = "brenner_lab_secret";

const CF_ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const CF_ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const TRUST_CF_ACCESS_ENV = "BRENNER_TRUST_CF_ACCESS_HEADERS";

/**
 * Check if lab mode is enabled via environment variable.
 * Fail-closed: returns false unless explicitly enabled.
 */
export function isLabModeEnabled(): boolean {
  const value = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

function shouldTrustCloudflareAccessHeaders(): boolean {
  const value = (process.env[TRUST_CF_ACCESS_ENV] ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * Get the configured lab secret (if any).
 * When set, requests must include this secret to access orchestration.
 */
function getLabSecret(): string | undefined {
  const secret = process.env.BRENNER_LAB_SECRET?.trim();
  return secret && secret.length > 0 ? secret : undefined;
}

/**
 * Constant-time string comparison using HMAC.
 * Uses HMAC to normalize both inputs to the same length before comparison,
 * preventing timing side-channels that could leak secret length information.
 */
function safeEquals(a: string, b: string): boolean {
  // HMAC produces fixed-length output regardless of input length,
  // eliminating timing leaks from length differences
  const hmacKey = "brenner-auth-compare";
  const hmacA = createHmac("sha256", hmacKey).update(a).digest();
  const hmacB = createHmac("sha256", hmacKey).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

function hasCloudflareAccessHeaders(headers?: { get?: (name: string) => string | null }): boolean {
  const jwt = headers?.get?.(CF_ACCESS_JWT_HEADER);
  if (typeof jwt === "string" && jwt.trim().length > 0) return true;

  const email = headers?.get?.(CF_ACCESS_EMAIL_HEADER);
  if (typeof email === "string" && email.trim().length > 0) return true;

  return false;
}

/**
 * Check if a request has valid lab secret credentials.
 * Checks both header and cookie for the secret.
 *
 * @param headers - Request headers (or Headers object)
 * @param cookies - Cookie getter function or object
 * @returns true if a configured secret exists AND matches
 */
export function hasValidLabSecret(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined },
): boolean {
  const configuredSecret = getLabSecret();

  // No secret configured => can't pass this check (use Cloudflare Access instead)
  if (!configuredSecret) return false;

  // Check header first
  const headerValue = headers?.get?.(LAB_SECRET_HEADER);
  if (typeof headerValue === "string" && safeEquals(headerValue, configuredSecret)) return true;

  // Check cookie as fallback
  const cookieValue = cookies?.get?.(LAB_SECRET_COOKIE)?.value;
  if (typeof cookieValue === "string" && safeEquals(cookieValue, configuredSecret)) return true;

  return false;
}

/**
 * Comprehensive auth check for orchestration features.
 * Returns an object with authorization status and reason.
 *
 * @param headers - Request headers
 * @param cookies - Cookie getter
 * @returns Authorization result with reason
 */
export function checkOrchestrationAuth(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined },
): { authorized: boolean; reason: string } {
  // Check 1: Lab mode must be enabled
  if (!isLabModeEnabled()) {
    return {
      authorized: false,
      reason: "Lab mode is disabled. Set BRENNER_LAB_MODE=1 to enable orchestration.",
    };
  }

  // Check 2: Cloudflare Access headers OR shared secret
  // We only trust Cloudflare Access headers when explicitly enabled, because
  // these headers can be spoofed if the origin is reachable directly.
  if (shouldTrustCloudflareAccessHeaders() && hasCloudflareAccessHeaders(headers)) {
    return { authorized: true, reason: "Authorized (Cloudflare Access)" };
  }

  if (hasValidLabSecret(headers, cookies)) {
    return { authorized: true, reason: "Authorized (lab secret)" };
  }

  if (hasCloudflareAccessHeaders(headers) && !shouldTrustCloudflareAccessHeaders()) {
    return {
      authorized: false,
      reason:
        `Cloudflare Access headers detected, but ${TRUST_CF_ACCESS_ENV} is not enabled. ` +
        `Set ${TRUST_CF_ACCESS_ENV}=1 (only if the app is truly behind Cloudflare Access), or use BRENNER_LAB_SECRET.`,
    };
  }

  const secretConfigured = Boolean(getLabSecret());
  if (secretConfigured) {
    return {
      authorized: false,
      reason:
        "Invalid or missing lab secret. Provide via x-brenner-lab-secret header or brenner_lab_secret cookie.",
    };
  }

  if (!shouldTrustCloudflareAccessHeaders()) {
    return {
      authorized: false,
      reason: `No BRENNER_LAB_SECRET configured. Set BRENNER_LAB_SECRET, or (if behind Cloudflare Access) set ${TRUST_CF_ACCESS_ENV}=1.`,
    };
  }

  return {
    authorized: false,
    reason: "Missing Cloudflare Access headers and no BRENNER_LAB_SECRET configured.",
  };
}

/**
 * Assert orchestration is authorized or throw.
 * Use in server actions for fail-fast behavior.
 */
export function assertOrchestrationAuth(
  headers?: { get?: (name: string) => string | null },
  cookies?: { get?: (name: string) => { value: string } | undefined },
): void {
  const { authorized, reason } = checkOrchestrationAuth(headers, cookies);
  if (!authorized) {
    throw new Error(`Orchestration denied: ${reason}`);
  }
}

/**
 * Header/cookie names for client-side use.
 */
export const AUTH_CONSTANTS = {
  LAB_SECRET_HEADER,
  LAB_SECRET_COOKIE,
} as const;
