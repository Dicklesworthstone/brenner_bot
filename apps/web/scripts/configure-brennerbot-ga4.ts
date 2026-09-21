#!/usr/bin/env bun
/**
 * Configure BrennerBot GA4 Property
 *
 * Creates API secret and custom dimensions for the BrennerBot property.
 */

import { AnalyticsAdminServiceClient } from "@google-analytics/admin";

const PROPERTY_ID = "518309558";
const PROPERTY_NAME = `properties/${PROPERTY_ID}`;
const DATA_STREAM = `properties/${PROPERTY_ID}/dataStreams/13238961558`;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

// Custom dimensions for BrennerBot research engagement tracking
const CUSTOM_DIMENSIONS = [
  // Corpus engagement
  {
    name: "document_type",
    scope: "EVENT",
    description: "Type of document (transcript, distillation, quote_bank)",
  },
  { name: "document_id", scope: "EVENT", description: "Document identifier or section anchor" },
  { name: "document_title", scope: "EVENT", description: "Document title" },

  // Reading engagement
  { name: "reading_depth_percent", scope: "EVENT", description: "How far user scrolled (0-100)" },
  {
    name: "time_on_document_bucket",
    scope: "EVENT",
    description: "Time bucket: quick/engaged/deep",
  },

  // Search behavior
  { name: "search_query", scope: "EVENT", description: "Search query entered" },
  { name: "search_category", scope: "EVENT", description: "Search category filter" },
  { name: "search_results_count", scope: "EVENT", description: "Number of results returned" },

  // Tutorial/Wizard funnel
  { name: "tutorial_step", scope: "EVENT", description: "Current tutorial step ID" },
  { name: "tutorial_step_name", scope: "EVENT", description: "Tutorial step name" },
  {
    name: "tutorial_progress_percent",
    scope: "EVENT",
    description: "Progress through tutorial (0-100)",
  },
  { name: "tutorial_total_steps", scope: "EVENT", description: "Total steps in tutorial" },
  { name: "tutorial_completed_steps", scope: "EVENT", description: "Number of completed steps" },
  { name: "tutorial_path", scope: "EVENT", description: "Tutorial path ID" },
  { name: "tutorial_path_name", scope: "EVENT", description: "Tutorial path name" },
  { name: "time_from_previous_step", scope: "EVENT", description: "Seconds since previous step" },

  // Funnel tracking
  { name: "funnel_id", scope: "EVENT", description: "Unique funnel session ID" },
  { name: "funnel_source", scope: "USER", description: "Traffic source when funnel started" },
  { name: "funnel_medium", scope: "USER", description: "Traffic medium when funnel started" },
  { name: "milestone", scope: "EVENT", description: "Funnel milestone name" },

  // Engagement context
  { name: "is_returning", scope: "EVENT", description: "Whether user is returning" },
  { name: "dropoff_reason", scope: "EVENT", description: "Reason for funnel abandonment" },
  { name: "excerpt_count", scope: "EVENT", description: "Number of excerpts saved" },
  { name: "session_document_count", scope: "EVENT", description: "Documents viewed in session" },

  // Acquisition tracking (EVENT-scoped - sent with session_start_enhanced)
  { name: "utm_source", scope: "EVENT", description: "UTM source parameter" },
  { name: "utm_medium", scope: "EVENT", description: "UTM medium parameter" },
  { name: "utm_campaign", scope: "EVENT", description: "UTM campaign parameter" },
  { name: "utm_term", scope: "EVENT", description: "UTM term parameter" },
  { name: "utm_content", scope: "EVENT", description: "UTM content parameter" },
  { name: "referrer", scope: "EVENT", description: "Full referrer URL" },
  { name: "referrer_domain", scope: "EVENT", description: "Referrer domain (e.g., google.com)" },
  { name: "landing_page", scope: "EVENT", description: "Landing page path" },
  { name: "is_first_visit", scope: "EVENT", description: "Whether this is first visit" },
  {
    name: "platform",
    scope: "EVENT",
    description: "Platform (macOS, Windows, Linux, iOS, Android)",
  },
];

// Conversion events - MUST match ConversionType in analytics.ts exactly
const CONVERSION_EVENTS = [
  "first_document_read", // User read first document beyond landing
  "deep_reading", // User spent 3+ minutes on a document
  "corpus_explorer", // User viewed 5+ documents
  "search_engaged", // User clicked search result in top 3
  "tutorial_started", // User started the tutorial
  "tutorial_step_complete", // User completed a tutorial step
  "tutorial_complete", // User completed full tutorial
  "glossary_engaged", // User explored 3+ jargon terms
  "operator_studied", // User studied an operator in detail
  "return_visitor", // User returned (2nd visit)
  "power_user", // User viewed 20+ documents
  "conversion", // Generic conversion wrapper event
];

async function configureProperty() {
  const client = new AnalyticsAdminServiceClient();

  console.log("Configuring BrennerBot GA4 property...\n");

  // 1. Create Measurement Protocol API secret
  console.log("Creating Measurement Protocol API credential...");
  try {
    const [secret] = await client.createMeasurementProtocolSecret({
      parent: DATA_STREAM,
      measurementProtocolSecret: {
        displayName: "BrennerBot Server",
      },
    });

    console.log("✓ API credential created.");
    if (secret.secretValue) {
      console.log("Store the generated value securely (not printed to avoid leaking).");
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("already exists")) {
      console.log("API credential already exists, skipping...");
    } else {
      console.error("Error creating API credential:", message);
    }
  }

  // 2. Get existing custom dimensions
  console.log("\nChecking existing custom dimensions...");
  const existingDimensions = new Set<string>();

  try {
    const [dimensions] = await client.listCustomDimensions({ parent: PROPERTY_NAME });
    for (const dim of dimensions || []) {
      const name = dim.parameterName || "";
      existingDimensions.add(name);
    }
    console.log(`Found ${existingDimensions.size} existing dimensions`);
  } catch (error: unknown) {
    console.error("Error listing dimensions:", getErrorMessage(error));
  }

  // 3. Create missing custom dimensions
  console.log("\nCreating custom dimensions...");
  let created = 0;
  let skipped = 0;

  for (const dim of CUSTOM_DIMENSIONS) {
    if (existingDimensions.has(dim.name)) {
      skipped++;
      continue;
    }

    try {
      await client.createCustomDimension({
        parent: PROPERTY_NAME,
        customDimension: {
          parameterName: dim.name,
          displayName: dim.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          description: dim.description,
          scope: dim.scope as "EVENT" | "USER",
        },
      });
      created++;
      console.log(`  ✓ ${dim.name}`);
    } catch (error: unknown) {
      console.error(`  ✗ ${dim.name}: ${getErrorMessage(error)}`);
    }
  }

  console.log(`\nDimensions: ${created} created, ${skipped} already existed`);

  // 4. Mark conversion events
  console.log("\nConfiguring conversion events...");
  for (const eventName of CONVERSION_EVENTS) {
    try {
      await client.createConversionEvent({
        parent: PROPERTY_NAME,
        conversionEvent: {
          eventName,
        },
      });
      console.log(`  ✓ ${eventName}`);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message.includes("already exists")) {
        console.log(`  • ${eventName} (exists)`);
      } else {
        console.error(`  ✗ ${eventName}: ${message}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Configuration complete!");
  console.log("=".repeat(60));
}

configureProperty().catch(console.error);

// =============================================================================
// Additional User Property Dimensions (run separately if needed)
// =============================================================================

const ADDITIONAL_USER_DIMENSIONS = [
  { name: "first_visit_date", scope: "USER", description: "Timestamp of first visit" },
  { name: "first_traffic_source", scope: "USER", description: "Traffic source on first visit" },
  { name: "first_traffic_medium", scope: "USER", description: "Traffic medium on first visit" },
  { name: "first_landing_page", scope: "USER", description: "Landing page on first visit" },
  {
    name: "latest_traffic_source",
    scope: "USER",
    description: "Traffic source in current session",
  },
  {
    name: "latest_traffic_medium",
    scope: "USER",
    description: "Traffic medium in current session",
  },
  { name: "visit_count", scope: "USER", description: "Total visit count" },
  { name: "is_returning_user", scope: "USER", description: "Whether user has visited before" },
  { name: "tutorial_completed", scope: "USER", description: "Whether user completed tutorial" },
];

async function addUserDimensions() {
  const client = new AnalyticsAdminServiceClient();

  console.log("\nAdding user-scoped dimensions...");

  // Get existing
  const existingDimensions = new Set<string>();
  try {
    const [dimensions] = await client.listCustomDimensions({ parent: PROPERTY_NAME });
    for (const dim of dimensions || []) {
      existingDimensions.add(dim.parameterName || "");
    }
  } catch (error: unknown) {
    console.error("Error listing dimensions:", getErrorMessage(error));
  }

  for (const dim of ADDITIONAL_USER_DIMENSIONS) {
    if (existingDimensions.has(dim.name)) {
      console.log(`  • ${dim.name} (exists)`);
      continue;
    }

    try {
      await client.createCustomDimension({
        parent: PROPERTY_NAME,
        customDimension: {
          parameterName: dim.name,
          displayName: dim.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          description: dim.description,
          scope: dim.scope as "EVENT" | "USER",
        },
      });
      console.log(`  ✓ ${dim.name}`);
    } catch (error: unknown) {
      console.error(`  ✗ ${dim.name}: ${getErrorMessage(error)}`);
    }
  }
}

// Run if called with --add-user-dims flag
if (process.argv.includes("--add-user-dims")) {
  addUserDimensions().catch(console.error);
}
