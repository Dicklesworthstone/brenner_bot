import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Check if lab mode is enabled (duplicated here because middleware runs in Edge runtime
 * and cannot import from lib/auth.ts which may use Node.js APIs).
 */
function isLabModeEnabled(): boolean {
  const value = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

function shouldTrustCloudflareAccessHeaders(): boolean {
  const value = (process.env.BRENNER_TRUST_CF_ACCESS_HEADERS ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Edge runtime doesn't have crypto.timingSafeEqual, so we implement manually.
 */
function safeEquals(a: string, b: string): boolean {
  let result = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    result |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return result === 0;
}

/**
 * Validate lab secret if configured.
 * Uses constant-time comparison to prevent timing attacks.
 */
function hasValidLabSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.BRENNER_LAB_SECRET?.trim();

  // If no secret configured, this check cannot pass (use Cloudflare Access instead)
  if (!configuredSecret || configuredSecret.length === 0) return false;

  // Check header
  const headerValue = request.headers.get("x-brenner-lab-secret");
  if (headerValue && safeEquals(headerValue, configuredSecret)) return true;

  // Check cookie
  const cookieValue = request.cookies.get("brenner_lab_secret")?.value;
  if (cookieValue && safeEquals(cookieValue, configuredSecret)) return true;

  return false;
}

function hasCloudflareAccessHeaders(request: NextRequest): boolean {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (jwt && jwt.trim().length > 0) return true;

  const email = request.headers.get("cf-access-authenticated-user-email");
  if (email && email.trim().length > 0) return true;

  return false;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is the public site - allow demo content without auth
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const isPublicHost = host.includes("brennerbot.org");
  const isPageRoute = !pathname.startsWith("/api/");

  // Protect orchestration routes (sessions, API endpoints that trigger Agent Mail)
  // Fail-closed: deny access unless explicitly enabled
  const isOrchestrationPath =
    pathname.startsWith("/sessions") ||
    pathname.startsWith("/api/sessions") ||
    pathname.startsWith("/api/experiments");

  if (isOrchestrationPath) {
    // Allow public site page routes through - they show demo content
    if (isPublicHost && isPageRoute) {
      return NextResponse.next();
    }

    // Check 1: Lab mode must be enabled
    if (!isLabModeEnabled()) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Check 2: Cloudflare Access headers (only when explicitly trusted) OR shared secret
    const authorized =
      (shouldTrustCloudflareAccessHeaders() && hasCloudflareAccessHeaders(request)) ||
      hasValidLabSecret(request);
    if (!authorized) {
      // Fail closed without revealing which auth layer is missing
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sessions/:path*", "/api/sessions/:path*", "/api/experiments/:path*"],
};
