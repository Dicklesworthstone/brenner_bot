/**
 * Server-Side Event Tracking API for BrennerBot
 *
 * This endpoint implements the GA4 Measurement Protocol for reliable server-side
 * event tracking that bypasses ad blockers. Used for critical conversion events.
 *
 * Features:
 * - Rate limiting (60 requests/minute per IP)
 * - Payload validation and sanitization
 * - Secure forwarding to GA4 Measurement Protocol
 *
 * Usage:
 *   POST /api/track
 *   {
 *     "client_id": "123456.789012",
 *     "events": [{ "name": "conversion", "params": { ... } }]
 *   }
 */

import { type NextRequest, NextResponse } from "next/server";

// =============================================================================
// Configuration
// =============================================================================

// Sanitize and validate GA Measurement ID
function sanitizeGaMeasurementId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let cleaned = value.trim();
  if (!cleaned) return undefined;

  // Remove quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove escaped newlines
  cleaned = cleaned.replace(/\\n$/, "").replace(/\s+$/, "");

  const ga4Match = cleaned.match(/^(G-[A-Z0-9]+)/i);
  if (ga4Match) return ga4Match[1];

  return undefined;
}

// Sanitize API secret
function sanitizeApiSecret(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let cleaned = value.trim();
  if (!cleaned) return undefined;

  // Remove quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove escaped newlines
  cleaned = cleaned.replace(/\\n$/, "").replace(/\s+$/, "");

  return cleaned || undefined;
}

const GA_MEASUREMENT_ID = sanitizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
const GA_API_SECRET = sanitizeApiSecret(process.env.GA_API_SECRET);

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute
const MAX_MAP_SIZE = 10000;
const CLEANUP_INTERVAL = 100;

// Validation limits
const MAX_PAYLOAD_SIZE = 32 * 1024; // 32KB
const MAX_EVENTS_PER_REQUEST = 10;
const MAX_EVENT_NAME_LENGTH = 40;
const MAX_PARAM_KEYS_PER_EVENT = 25;
const MAX_PARAM_STRING_LENGTH = 100;
const MAX_CLIENT_ID_LENGTH = 100;

// =============================================================================
// Rate Limiting
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let requestsSinceCleanup = 0;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup
  requestsSinceCleanup++;
  if (requestsSinceCleanup >= CLEANUP_INTERVAL || rateLimitMap.size > MAX_MAP_SIZE) {
    cleanupExpiredEntries();
    requestsSinceCleanup = 0;
  }

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    if (!record && rateLimitMap.size >= MAX_MAP_SIZE) {
      return true; // Too many unique IPs, reject
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

// =============================================================================
// Validation Helpers
// =============================================================================

function isValidEventName(name: string): boolean {
  if (!name || name.length > MAX_EVENT_NAME_LENGTH) return false;
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

function isValidClientId(clientId: string): boolean {
  if (!clientId || clientId.length > MAX_CLIENT_ID_LENGTH) return false;
  return /^[a-zA-Z0-9._-]+$/.test(clientId);
}

function isValidParamKey(key: string): boolean {
  if (!key || key.length > 40) return false;
  // Prevent prototype pollution
  if (["__proto__", "constructor", "prototype"].includes(key)) return false;
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeEventParams(params: unknown): Record<string, string | number | boolean> {
  if (!isPlainObject(params)) return {};

  const sanitized: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [key, value] of Object.entries(params)) {
    if (count >= MAX_PARAM_KEYS_PER_EVENT) break;
    if (!isValidParamKey(key)) continue;

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_PARAM_STRING_LENGTH);
      count++;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
      count++;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
      count++;
    }
  }

  return sanitized;
}

function sanitizeUserProperties(
  props: unknown,
): Record<string, { value: string | number | boolean }> | null {
  if (!isPlainObject(props)) return null;

  const sanitized: Record<string, { value: string | number | boolean }> = {};
  let count = 0;

  for (const [key, value] of Object.entries(props)) {
    if (count >= 25) break;
    if (!isValidParamKey(key)) continue;

    if (typeof value === "string") {
      sanitized[key] = { value: value.slice(0, MAX_PARAM_STRING_LENGTH) };
      count++;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = { value };
      count++;
    } else if (typeof value === "boolean") {
      sanitized[key] = { value };
      count++;
    }
  }

  return count > 0 ? sanitized : null;
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest) {
  // Check if GA is configured
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) {
    return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
  }

  // Rate limiting
  // SECURITY: Use X-Real-IP header which is set by Vercel edge (not spoofable by clients).
  // Avoid X-Forwarded-For as clients can prepend arbitrary values to it.
  const ip = request.headers.get("x-real-ip") || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Check content length
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await request.json();

    // Validate client_id
    const clientId = typeof body.client_id === "string" ? body.client_id : "";
    if (!isValidClientId(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    // Validate events
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: "Events array required" }, { status: 400 });
    }

    if (body.events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Max ${MAX_EVENTS_PER_REQUEST} events per request` },
        { status: 400 },
      );
    }

    // Sanitize events
    const sanitizedEvents: { name: string; params: Record<string, unknown> }[] = [];

    for (const event of body.events) {
      if (!isPlainObject(event)) continue;

      const eventName = typeof event.name === "string" ? event.name : "";
      if (!isValidEventName(eventName)) continue;

      const sanitizedParams = sanitizeEventParams(event.params);

      sanitizedEvents.push({
        name: eventName,
        params: sanitizedParams,
      });
    }

    if (sanitizedEvents.length === 0) {
      return NextResponse.json({ error: "No valid events" }, { status: 400 });
    }

    // Sanitize user properties if provided
    const sanitizedUserProperties = sanitizeUserProperties(body.user_properties);

    // Optional user_id
    const userId =
      typeof body.user_id === "string" && body.user_id.length <= 100 ? body.user_id : undefined;

    // Generate session ID
    const sessionId = `server_${Date.now()}`;

    // Build Measurement Protocol payload
    const payload = {
      client_id: clientId,
      events: sanitizedEvents.map((event) => ({
        name: event.name,
        params: {
          ...event.params,
          engagement_time_msec: 100,
          session_id: sessionId,
        },
      })),
      ...(userId && { user_id: userId }),
      ...(sanitizedUserProperties && { user_properties: sanitizedUserProperties }),
    };

    // Send to GA4 Measurement Protocol
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`GA4 MP error: ${response.status}`);
        return NextResponse.json({ error: "Analytics service error" }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        events_sent: sanitizedEvents.length,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error("GA4 MP fetch error:", fetchError);
      return NextResponse.json({ error: "Analytics service unavailable" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}

// Handle preflight for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
