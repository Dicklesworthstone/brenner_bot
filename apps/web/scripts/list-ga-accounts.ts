import { AnalyticsAdminServiceClient } from "@google-analytics/admin";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

/**
 * Parse protobuf Timestamp to ISO string
 * Timestamps from GA Admin API are objects like {seconds: string|number, nanos: number}
 */
function formatProtobufTimestamp(timestamp: unknown): string {
  if (!timestamp || typeof timestamp !== "object") {
    return "unknown";
  }

  const ts = timestamp as { seconds?: unknown; nanos?: unknown };
  const rawSeconds = ts.seconds;

  // Handle both string and number types for seconds
  let seconds: number;
  if (typeof rawSeconds === "string") {
    seconds = parseInt(rawSeconds, 10);
  } else if (typeof rawSeconds === "number") {
    seconds = rawSeconds;
  } else {
    return "unknown";
  }

  if (Number.isNaN(seconds)) {
    return "unknown";
  }

  return new Date(seconds * 1000).toISOString();
}

async function listAccounts() {
  const client = new AnalyticsAdminServiceClient();

  console.log("Listing Google Analytics accounts...\n");

  const [accounts] = await client.listAccounts({});

  if (!accounts || accounts.length === 0) {
    console.log("No GA accounts found.");
    return;
  }

  for (const account of accounts) {
    console.log(`Account: ${account.displayName}`);
    console.log(`  Name: ${account.name}`);
    console.log(`  Created: ${formatProtobufTimestamp(account.createTime)}`);
    console.log("");

    // List properties for this account
    try {
      const [properties] = await client.listProperties({
        filter: `parent:${account.name}`,
      });

      if (properties && properties.length > 0) {
        console.log("  Properties:");
        for (const prop of properties) {
          console.log(`    - ${prop.displayName}`);
          console.log(`      Resource: ${prop.name}`);
          console.log(`      Industry: ${prop.industryCategory}`);
          console.log(`      Timezone: ${prop.timeZone}`);
        }
      } else {
        console.log("  Properties: None");
      }
    } catch (error: unknown) {
      console.log(`  Properties: Error listing - ${getErrorMessage(error)}`);
    }
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

listAccounts().catch(console.error);
