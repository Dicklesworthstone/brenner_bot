/**
 * Custom Test Assertions
 *
 * Domain-specific assertion helpers for Brenner Bot testing.
 * Philosophy: Clear, descriptive failure messages.
 */

import { expect } from "vitest";
import type { DeltaOperation, DeltaSection, ParsedDelta, ValidDelta } from "../lib/delta-parser";

/**
 * Assert that a parsed delta is valid.
 */
export function assertValidDelta(delta: ParsedDelta): asserts delta is ValidDelta {
  if (!delta.valid) {
    throw new Error(`Expected valid delta, but got error: ${delta.error}\nRaw: ${delta.raw}`);
  }
}

/**
 * Assert that a parsed delta is invalid with a specific error substring.
 */
export function assertInvalidDelta(delta: ParsedDelta, expectedErrorSubstring?: string): void {
  expect(delta.valid).toBe(false);
  if (!delta.valid && expectedErrorSubstring) {
    expect(delta.error).toContain(expectedErrorSubstring);
  }
}

/**
 * Assert that a delta has the expected operation.
 */
export function assertDeltaOperation(delta: ValidDelta, expected: DeltaOperation): void {
  expect(delta.operation).toBe(expected);
}

/**
 * Assert that a delta has the expected section.
 */
export function assertDeltaSection(delta: ValidDelta, expected: DeltaSection): void {
  expect(delta.section).toBe(expected);
}

/**
 * Assert that a delta has a payload with the expected fields.
 */
export function assertDeltaPayload(
  delta: ValidDelta,
  expectedFields: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(expectedFields)) {
    expect(delta.payload).toHaveProperty(key, value);
  }
}

/**
 * Assert that an array has exactly the expected length.
 * Provides helpful failure message.
 */
export function assertLength<T>(array: T[], expected: number, description = "array"): void {
  if (array.length !== expected) {
    throw new Error(
      `Expected ${description} to have length ${expected}, but got ${array.length}\n` +
        `Items: ${JSON.stringify(array, null, 2)}`,
    );
  }
}

/**
 * Assert that a string contains the expected substring.
 */
export function assertContains(actual: string, expected: string, description = "string"): void {
  if (!actual.includes(expected)) {
    throw new Error(
      `Expected ${description} to contain "${expected}"\nActual: "${actual.slice(0, 200)}${actual.length > 200 ? "..." : ""}"`,
    );
  }
}

/**
 * Assert that a value is defined (not null or undefined).
 */
export function assertDefined<T>(
  value: T | null | undefined,
  description = "value",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${description} to be defined, but got ${value}`);
  }
}

/**
 * Assert that two objects are deeply equal.
 * Note: The description parameter is reserved for future enhanced error messages.
 */
export function assertDeepEqual<T>(actual: T, expected: T): void {
  expect(actual).toEqual(expected);
}

/**
 * Assert that a transcript anchor is valid (matches §n pattern).
 */
export function assertValidAnchor(anchor: string): void {
  const anchorRegex = /^§\d+(-\d+)?$/;
  if (!anchorRegex.test(anchor)) {
    throw new Error(`Invalid transcript anchor format: "${anchor}". Expected §n or §n-m format.`);
  }
}

/**
 * Assert that all anchors in an array are valid.
 */
export function assertValidAnchors(anchors: string[]): void {
  for (const anchor of anchors) {
    assertValidAnchor(anchor);
  }
}

/**
 * Assert that a hypothesis has the required fields.
 */
export function assertValidHypothesis(payload: Record<string, unknown>): void {
  const required = ["name", "claim", "mechanism"];
  for (const field of required) {
    if (!(field in payload) || typeof payload[field] !== "string") {
      throw new Error(`Hypothesis missing required field: ${field}`);
    }
  }
}

/**
 * Assert that a discriminative test has the required fields.
 */
export function assertValidTest(payload: Record<string, unknown>): void {
  const required = ["name", "procedure", "discriminates", "expected_outcomes", "potency_check"];
  for (const field of required) {
    if (!(field in payload)) {
      throw new Error(`Discriminative test missing required field: ${field}`);
    }
  }
}

/**
 * Assert that a test score is within valid ranges.
 */
export function assertValidScore(score: Record<string, unknown>): void {
  const dimensions = ["likelihood_ratio", "cost", "speed", "ambiguity"];
  for (const dim of dimensions) {
    if (dim in score) {
      const value = score[dim];
      if (typeof value !== "number" || value < 0 || value > 3) {
        throw new Error(`Score dimension "${dim}" must be 0-3, got: ${value}`);
      }
    }
  }
}
