/**
 * Unit tests for lib/utils.ts
 *
 * Tests the cn() class name merging utility.
 * Philosophy: NO mocks - test real tailwind-merge behavior.
 */

import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn() - class name merging", () => {
  describe("basic functionality", () => {
    it("returns empty string for no inputs", () => {
      expect(cn()).toBe("");
    });

    it("returns single class unchanged", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("joins multiple classes with space", () => {
      expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });
  });

  describe("conditional classes", () => {
    it("filters out falsy values", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", null, "baz")).toBe("foo baz");
      expect(cn("foo", undefined, "baz")).toBe("foo baz");
      // Use variables to avoid TS2873 "expression is always falsy" warnings
      const zero = 0 as number;
      const emptyStr = "" as string;
      expect(cn("foo", zero && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", emptyStr && "bar", "baz")).toBe("foo baz");
    });

    it("includes truthy conditional classes", () => {
      expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
    });
  });

  describe("array inputs", () => {
    it("flattens array inputs", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
      expect(cn("base", ["nested", "classes"])).toBe("base nested classes");
    });

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
    });
  });

  describe("object inputs", () => {
    it("includes keys with truthy values", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles mixed inputs", () => {
      expect(cn("base", { conditional: true }, ["array", "item"])).toBe(
        "base conditional array item",
      );
    });
  });

  describe("tailwind-merge behavior", () => {
    it("resolves conflicting padding", () => {
      expect(cn("p-4", "p-8")).toBe("p-8");
    });

    it("resolves conflicting margin", () => {
      expect(cn("m-2", "m-4")).toBe("m-4");
    });

    it("resolves conflicting text sizes", () => {
      expect(cn("text-sm", "text-lg")).toBe("text-lg");
    });

    it("resolves conflicting colors", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-gray-100", "bg-white")).toBe("bg-white");
    });

    it("resolves conflicting flex directions", () => {
      expect(cn("flex-row", "flex-col")).toBe("flex-col");
    });

    it("preserves non-conflicting classes", () => {
      expect(cn("flex", "items-center", "justify-between", "p-4")).toBe(
        "flex items-center justify-between p-4",
      );
    });

    it("resolves responsive variants", () => {
      expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
    });

    it("resolves hover variants", () => {
      expect(cn("hover:bg-gray-100", "hover:bg-gray-200")).toBe("hover:bg-gray-200");
    });

    it("preserves different variant prefixes", () => {
      expect(cn("p-4", "md:p-8", "lg:p-12")).toBe("p-4 md:p-8 lg:p-12");
    });
  });

  describe("real-world usage patterns", () => {
    it("merges base styles with conditional overrides", () => {
      const isActive = true;
      const result = cn(
        "px-4 py-2 rounded-md text-sm font-medium",
        isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700",
      );
      expect(result).toBe("px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white");
    });

    it("merges base styles with prop overrides", () => {
      const className = "mt-4 p-8";
      const result = cn("p-4 text-gray-900", className);
      expect(result).toBe("text-gray-900 mt-4 p-8");
    });

    it("handles component composition", () => {
      const baseButton = "px-4 py-2 rounded-md font-medium";
      const variants = {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      };
      const sizes = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg px-6 py-3",
      };

      // Small primary button
      expect(cn(baseButton, variants.primary, sizes.sm)).toBe(
        "px-4 py-2 rounded-md font-medium bg-blue-500 text-white hover:bg-blue-600 text-sm",
      );

      // Large secondary button
      expect(cn(baseButton, variants.secondary, sizes.lg)).toBe(
        "rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 text-lg px-6 py-3",
      );
    });
  });
});
