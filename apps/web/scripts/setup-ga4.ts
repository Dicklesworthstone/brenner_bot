#!/usr/bin/env bun
/**
 * GA4 Property Setup Script for BrennerBot
 *
 * This script:
 * 1. Lists available Google Analytics accounts
 * 2. Creates a new GA4 property for BrennerBot (or uses existing)
 * 3. Creates a web data stream
 * 4. Generates an API secret for Measurement Protocol
 * 5. Configures custom dimensions, metrics, and conversion events
 *
 * Prerequisites:
 *   gcloud auth application-default login
 *
 * Usage:
 *   bun run scripts/setup-ga4.ts
 *   bun run scripts/setup-ga4.ts --property-id=EXISTING_ID  # Use existing property
 */

import { AnalyticsAdminServiceClient } from "@google-analytics/admin";

// Configuration - Property already created in JeffCo Industries
const BRENNERBOT_DISPLAY_NAME = "BrennerBot";
const BRENNERBOT_TIMEZONE = "America/New_York";
const BRENNERBOT_CURRENCY = "USD";
const WEBSITE_URL = "https://brennerbot.org";

// Custom dimensions for BrennerBot research engagement tracking
const CUSTOM_DIMENSIONS = [
  // Corpus engagement
  {
    name: "document_type",
    scope: "EVENT",
    description: "Type of document (transcript, distillation, quote_bank)",
  },
  {
    name: "document_id",
    scope: "EVENT",
    description: "Document identifier or section anchor (e.g., §58)",
  },
  { name: "document_title", scope: "EVENT", description: "Document title" },

  // Reading engagement
  {
    name: "reading_depth_percent",
    scope: "EVENT",
    description: "How far user scrolled in document (0-100)",
  },
  {
    name: "time_on_document_bucket",
    scope: "EVENT",
    description: "Time bucket: quick (<30s), engaged (30s-3m), deep (3m+)",
  },

  // Search behavior
  { name: "search_query", scope: "EVENT", description: "Search query entered" },
  { name: "search_category", scope: "EVENT", description: "Search category filter used" },
  {
    name: "search_results_count",
    scope: "EVENT",
    description: "Number of search results returned",
  },

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

  // Glossary/jargon engagement
  { name: "jargon_term", scope: "EVENT", description: "Jargon term viewed" },
  {
    name: "jargon_category",
    scope: "EVENT",
    description: "Jargon category (operators, brenner, biology, etc.)",
  },

  // Operator library
  {
    name: "operator_id",
    scope: "EVENT",
    description: "Operator ID (e.g., level-split, exclusion-test)",
  },
  { name: "operator_name", scope: "EVENT", description: "Operator display name" },

  // User learning journey
  {
    name: "session_learning_mode",
    scope: "USER",
    description: "User learning mode (explorer, researcher, practitioner)",
  },
  {
    name: "content_discovery_source",
    scope: "EVENT",
    description: "How user found content (search, nav, link, scroll)",
  },

  // Cross-document navigation
  { name: "navigation_from", scope: "EVENT", description: "Page user navigated from" },
  { name: "navigation_to", scope: "EVENT", description: "Page user navigated to" },
  { name: "anchor_clicked", scope: "EVENT", description: "Anchor/citation clicked (e.g., §58)" },

  // Engagement quality
  {
    name: "engagement_score",
    scope: "EVENT",
    description: "Computed engagement score for session",
  },
  { name: "is_returning_user", scope: "USER", description: "Whether user has visited before" },
  { name: "visit_count", scope: "USER", description: "Number of total visits" },

  // Funnel tracking
  { name: "funnel_id", scope: "EVENT", description: "Unique funnel session ID" },
  { name: "funnel_source", scope: "USER", description: "Traffic source when funnel started" },
  { name: "funnel_medium", scope: "USER", description: "Traffic medium when funnel started" },
  { name: "funnel_campaign", scope: "USER", description: "Campaign when funnel started" },
  { name: "milestone", scope: "EVENT", description: "User milestone reached" },
  { name: "dropoff_reason", scope: "EVENT", description: "Reason for funnel abandonment" },
];

// Custom metrics for BrennerBot
const CUSTOM_METRICS = [
  {
    name: "time_on_document_seconds",
    scope: "EVENT",
    description: "Time spent reading document in seconds",
    measurementUnit: "SECONDS",
  },
  {
    name: "time_on_tutorial_step_seconds",
    scope: "EVENT",
    description: "Time spent on tutorial step in seconds",
    measurementUnit: "SECONDS",
  },
  {
    name: "documents_viewed_count",
    scope: "EVENT",
    description: "Number of documents viewed in session",
    measurementUnit: "STANDARD",
  },
  {
    name: "search_click_position",
    scope: "EVENT",
    description: "Position of clicked search result",
    measurementUnit: "STANDARD",
  },
  {
    name: "total_session_time_seconds",
    scope: "EVENT",
    description: "Total session time in seconds",
    measurementUnit: "SECONDS",
  },
];

// Conversion events for BrennerBot engagement funnel
const CONVERSION_EVENTS = [
  "first_document_read", // User read first document beyond landing
  "deep_reading", // User spent 3+ minutes on a document
  "corpus_explorer", // User viewed 5+ documents
  "search_engaged", // User performed search and clicked result
  "tutorial_started", // User started the tutorial
  "tutorial_step_complete", // User completed a tutorial step
  "tutorial_complete", // User completed full tutorial
  "glossary_engaged", // User explored 3+ jargon terms
  "operator_studied", // User studied an operator in detail
  "return_visitor", // User returned within 7 days
  "power_user", // User viewed 20+ documents across sessions
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function main() {
  console.log("🔬 BrennerBot GA4 Setup Script\n");
  console.log("This script will set up Google Analytics 4 for BrennerBot.\n");

  // Check for ADC
  try {
    const adminClient = new AnalyticsAdminServiceClient();

    // Parse command line args
    const args = process.argv.slice(2);
    const propertyIdArg = args.find((a) => a.startsWith("--property-id="));
    const existingPropertyId = propertyIdArg?.split("=")[1];

    if (existingPropertyId) {
      console.log(`Using existing property ID: ${existingPropertyId}\n`);
      await configureExistingProperty(adminClient, existingPropertyId);
    } else {
      // List accounts and create new property
      await listAccountsAndCreateProperty(adminClient);
    }
  } catch (error) {
    if (getErrorMessage(error).includes("Could not load the default credentials")) {
      console.error("❌ Application Default Credentials not configured.\n");
      console.error("Please run:\n");
      console.error("  gcloud auth application-default login\n");
      console.error("Then re-run this script.");
      process.exit(1);
    }
    throw error;
  }
}

async function listAccountsAndCreateProperty(adminClient: AnalyticsAdminServiceClient) {
  console.log("📋 Listing Google Analytics accounts...\n");

  const [accounts] = await adminClient.listAccounts({});

  if (!accounts || accounts.length === 0) {
    console.error("❌ No Google Analytics accounts found.");
    console.error("Please create a GA account at https://analytics.google.com/");
    process.exit(1);
  }

  console.log("Available accounts:");
  accounts.forEach((account, i) => {
    const id = account.name?.replace("accounts/", "");
    console.log(`  ${i + 1}. ${account.displayName} (ID: ${id})`);
  });

  // Use first account by default (you can modify this)
  const selectedAccount = accounts[0];
  const accountId = selectedAccount.name?.replace("accounts/", "");

  console.log(`\n✓ Using account: ${selectedAccount.displayName}\n`);

  // Check if BrennerBot property already exists
  console.log("🔍 Checking for existing BrennerBot property...\n");

  const [properties] = await adminClient.listProperties({
    filter: `parent:accounts/${accountId}`,
  });

  const existingProperty = properties?.find((p) =>
    p.displayName?.toLowerCase().includes("brenner"),
  );

  if (existingProperty) {
    const propertyId = existingProperty.name?.replace("properties/", "");
    console.log(`✓ Found existing property: ${existingProperty.displayName} (ID: ${propertyId})`);
    console.log("\nTo configure this property, run:");
    console.log(`  bun run scripts/setup-ga4.ts --property-id=${propertyId}\n`);

    // Get the measurement ID
    await getDataStreamInfo(adminClient, existingProperty.name!);
    return;
  }

  // Create new property
  console.log("📊 Creating new GA4 property for BrennerBot...\n");

  const [newProperty] = await adminClient.createProperty({
    property: {
      parent: `accounts/${accountId}`,
      displayName: BRENNERBOT_DISPLAY_NAME,
      timeZone: BRENNERBOT_TIMEZONE,
      currencyCode: BRENNERBOT_CURRENCY,
      industryCategory: "REFERENCE",
    },
  });

  const propertyId = newProperty.name?.replace("properties/", "");
  console.log(`✓ Created property: ${newProperty.displayName} (ID: ${propertyId})`);

  // Create web data stream
  console.log("\n🌐 Creating web data stream...\n");

  const [dataStream] = await adminClient.createDataStream({
    parent: newProperty.name,
    dataStream: {
      type: "WEB_DATA_STREAM",
      displayName: "BrennerBot Website",
      webStreamData: {
        defaultUri: WEBSITE_URL,
      },
    },
  });

  const measurementId = dataStream.webStreamData?.measurementId;
  console.log(`✓ Created data stream with Measurement ID: ${measurementId}`);

  // Create Measurement Protocol API secret
  console.log("\n🔐 Creating Measurement Protocol API credential...\n");

  const [secret] = await adminClient.createMeasurementProtocolSecret({
    parent: dataStream.name,
    measurementProtocolSecret: {
      displayName: "BrennerBot Server-Side Tracking",
    },
  });

  console.log("✓ Created API credential.");
  if (secret.secretValue) {
    console.log("Store the generated value securely (not printed to avoid leaking).");
  }

  // Configure custom dimensions and conversions
  await configureProperty(adminClient, newProperty.name!, propertyId!);

  // Output environment variables
  console.log("\n" + "=".repeat(60));
  console.log("📝 ADD THESE TO YOUR .env.local FILE:");
  console.log("=".repeat(60) + "\n");
  console.log(`NEXT_PUBLIC_GA_MEASUREMENT_ID=${measurementId}`);
  console.log(`GA_PROPERTY_ID=${propertyId}`);
  console.log("Add the Measurement Protocol value manually (not printed).");
  console.log("\n" + "=".repeat(60));
  console.log(`\n🎉 GA4 setup complete!`);
  console.log(`\nView your property at:`);
  console.log(
    `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`,
  );
}

async function configureExistingProperty(
  adminClient: AnalyticsAdminServiceClient,
  propertyId: string,
) {
  const propertyName = `properties/${propertyId}`;

  // Get property info
  const [property] = await adminClient.getProperty({ name: propertyName });
  console.log(`✓ Found property: ${property.displayName}\n`);

  // Get data stream info
  await getDataStreamInfo(adminClient, propertyName);

  // Configure custom dimensions and conversions
  await configureProperty(adminClient, propertyName, propertyId);
}

async function getDataStreamInfo(adminClient: AnalyticsAdminServiceClient, propertyName: string) {
  const [dataStreams] = await adminClient.listDataStreams({ parent: propertyName });

  const webStream = dataStreams?.find((ds) => ds.type === "WEB_DATA_STREAM");
  if (webStream) {
    console.log(`\n📊 Data Stream Info:`);
    console.log(`   Measurement ID: ${webStream.webStreamData?.measurementId}`);
    console.log(`   Stream URL: ${webStream.webStreamData?.defaultUri}`);

    // List Measurement Protocol entries
    const [apiEntries] = await adminClient.listMeasurementProtocolSecrets({
      parent: webStream.name,
    });

    if (apiEntries && apiEntries.length > 0) {
      console.log(`   API entries configured: ${apiEntries.length}`);
    }
  }
}

async function configureProperty(
  adminClient: AnalyticsAdminServiceClient,
  propertyName: string,
  propertyId: string,
) {
  console.log("\n⚙️  Configuring custom dimensions...\n");

  // Get existing custom dimensions
  const [existingDimensions] = await adminClient.listCustomDimensions({ parent: propertyName });
  const existingDimNames = new Set(existingDimensions?.map((d) => d.parameterName) || []);

  let createdDimensions = 0;
  let skippedDimensions = 0;

  for (const dim of CUSTOM_DIMENSIONS) {
    if (existingDimNames.has(dim.name)) {
      skippedDimensions++;
      continue;
    }

    try {
      await adminClient.createCustomDimension({
        parent: propertyName,
        customDimension: {
          parameterName: dim.name,
          displayName: dim.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          description: dim.description,
          scope: dim.scope === "USER" ? "USER" : "EVENT",
        },
      });
      createdDimensions++;
    } catch (error) {
      console.warn(`  ⚠️  Could not create dimension ${dim.name}: ${getErrorMessage(error)}`);
    }
  }

  console.log(
    `  ✓ Created ${createdDimensions} custom dimensions (${skippedDimensions} already existed)`,
  );

  // Create custom metrics
  console.log("\n⚙️  Configuring custom metrics...\n");

  const [existingMetrics] = await adminClient.listCustomMetrics({ parent: propertyName });
  const existingMetricNames = new Set(existingMetrics?.map((m) => m.parameterName) || []);

  let createdMetrics = 0;
  let skippedMetrics = 0;

  for (const metric of CUSTOM_METRICS) {
    if (existingMetricNames.has(metric.name)) {
      skippedMetrics++;
      continue;
    }

    try {
      await adminClient.createCustomMetric({
        parent: propertyName,
        customMetric: {
          parameterName: metric.name,
          displayName: metric.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          description: metric.description,
          scope: "EVENT",
          measurementUnit: metric.measurementUnit === "SECONDS" ? "SECONDS" : "STANDARD",
        },
      });
      createdMetrics++;
    } catch (error) {
      console.warn(`  ⚠️  Could not create metric ${metric.name}: ${getErrorMessage(error)}`);
    }
  }

  console.log(`  ✓ Created ${createdMetrics} custom metrics (${skippedMetrics} already existed)`);

  // Configure conversion events
  console.log("\n⚙️  Configuring conversion events...\n");

  let configuredConversions = 0;

  for (const eventName of CONVERSION_EVENTS) {
    try {
      await adminClient.createConversionEvent({
        parent: propertyName,
        conversionEvent: {
          eventName: eventName,
        },
      });
      configuredConversions++;
    } catch (error) {
      // Likely already exists, which is fine
      if (!getErrorMessage(error).includes("already exists")) {
        console.warn(`  ⚠️  Could not configure conversion ${eventName}: ${getErrorMessage(error)}`);
      }
    }
  }

  console.log(`  ✓ Configured ${configuredConversions} conversion events`);

  console.log(`\n✅ Property ${propertyId} configured successfully!`);
}

main().catch((error) => {
  console.error("Fatal error:", getErrorMessage(error));
  process.exit(1);
});
