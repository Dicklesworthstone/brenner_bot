/**
 * prompts.ts Unit Tests
 *
 * Tests prompt composition with real template files.
 * Philosophy: NO mocks - test real file system operations with existing templates.
 *
 * Run with: cd apps/web && bun run test -- src/lib/prompts.test.ts
 */

import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type ComposePromptInput, composePrompt, type OperatorSelection } from "./prompts";

// ============================================================================
// Test Setup - Verify template files exist
// ============================================================================

const TEMPLATE_PATH = "initial_metaprompt.md";

beforeAll(async () => {
  // Verify test template exists in public/_corpus/ (where tests run from apps/web/)
  const templateFullPath = resolve(process.cwd(), "public/_corpus", TEMPLATE_PATH);
  try {
    await access(templateFullPath);
  } catch {
    throw new Error(
      `Test template not found at ${templateFullPath}. ` +
        `Tests must run from apps/web/ directory with: bun run test`,
    );
  }
});

// ============================================================================
// composePrompt Tests
// ============================================================================

describe("composePrompt", () => {
  describe("minimal input (excerpt only)", () => {
    it("includes template content", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test excerpt content",
      };

      const result = await composePrompt(input);

      // Template should be included (initial_metaprompt starts with "Meta prompt:")
      expect(result).toContain("Meta prompt:");
    });

    it("includes separator after template", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test excerpt",
      };

      const result = await composePrompt(input);

      expect(result).toContain("---");
    });

    it("includes TRANSCRIPT EXCERPT(S) section", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "This is the excerpt content",
      };

      const result = await composePrompt(input);

      expect(result).toContain("## TRANSCRIPT EXCERPT(S)");
      expect(result).toContain("This is the excerpt content");
    });

    it("trims excerpt whitespace", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "  \n  Trimmed excerpt  \n  ",
      };

      const result = await composePrompt(input);

      // Should contain trimmed version
      expect(result).toContain("Trimmed excerpt");
      // Line after header should be the trimmed content (no leading whitespace)
      expect(result).toContain("## TRANSCRIPT EXCERPT(S)\nTrimmed excerpt\n");
    });

    it("handles empty excerpt", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "",
      };

      const result = await composePrompt(input);

      expect(result).toContain("## TRANSCRIPT EXCERPT(S)");
      // Empty excerpt should result in empty line after header
      expect(result).toMatch(/## TRANSCRIPT EXCERPT\(S\)\n\n/);
    });
  });

  describe("optional fields", () => {
    it("includes FOCUS THEME when provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        theme: "Scientific methodology",
      };

      const result = await composePrompt(input);

      expect(result).toContain("## FOCUS THEME");
      expect(result).toContain("Scientific methodology");
    });

    it("trims theme whitespace", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        theme: "  Theme with spaces  ",
      };

      const result = await composePrompt(input);

      // Line after header should be the trimmed content
      expect(result).toContain("## FOCUS THEME\nTheme with spaces\n");
    });

    it("includes TARGET RESEARCH DOMAIN when provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        domain: "Molecular biology",
      };

      const result = await composePrompt(input);

      expect(result).toContain("## TARGET RESEARCH DOMAIN");
      expect(result).toContain("Molecular biology");
    });

    it("trims domain whitespace", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        domain: "\nDomain text\n",
      };

      const result = await composePrompt(input);

      // Line after header should be the trimmed content
      expect(result).toContain("## TARGET RESEARCH DOMAIN\nDomain text\n");
    });

    it("includes CURRENT RESEARCH QUESTION when provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        question: "How does exclusion work?",
      };

      const result = await composePrompt(input);

      expect(result).toContain("## CURRENT RESEARCH QUESTION");
      expect(result).toContain("How does exclusion work?");
    });

    it("trims question whitespace", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        question: "  Question text?  ",
      };

      const result = await composePrompt(input);

      // Line after header should be the trimmed content
      expect(result).toContain("## CURRENT RESEARCH QUESTION\nQuestion text?\n");
    });

    it("omits FOCUS THEME when not provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        // theme not provided
      };

      const result = await composePrompt(input);

      expect(result).not.toContain("## FOCUS THEME");
    });

    it("omits TARGET RESEARCH DOMAIN when not provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        // domain not provided
      };

      const result = await composePrompt(input);

      expect(result).not.toContain("## TARGET RESEARCH DOMAIN");
    });

    it("omits CURRENT RESEARCH QUESTION when not provided", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        // question not provided
      };

      const result = await composePrompt(input);

      expect(result).not.toContain("## CURRENT RESEARCH QUESTION");
    });
  });

  describe("all fields combined", () => {
    it("includes all sections in correct order", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Excerpt content",
        theme: "Theme content",
        domain: "Domain content",
        question: "Question content",
      };

      const result = await composePrompt(input);

      // Verify order: template, ---, excerpt, theme, domain, question
      const excerptIndex = result.indexOf("## TRANSCRIPT EXCERPT(S)");
      const themeIndex = result.indexOf("## FOCUS THEME");
      const domainIndex = result.indexOf("## TARGET RESEARCH DOMAIN");
      const questionIndex = result.indexOf("## CURRENT RESEARCH QUESTION");

      expect(excerptIndex).toBeLessThan(themeIndex);
      expect(themeIndex).toBeLessThan(domainIndex);
      expect(domainIndex).toBeLessThan(questionIndex);
    });
  });

  describe("operator selection", () => {
    it("includes ROLE OPERATOR ASSIGNMENTS section", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: ["O1", "O2"],
        test_designer: ["O3"],
        adversarial_critic: ["O4", "O5"],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      expect(result).toContain("## ROLE OPERATOR ASSIGNMENTS");
    });

    it("includes hypothesis generator operators with label", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: ["LevelSplit", "ThirdAlternative"],
        test_designer: [],
        adversarial_critic: [],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      expect(result).toContain(
        "**Hypothesis Generator (Codex / GPT)**: LevelSplit, ThirdAlternative",
      );
    });

    it("includes test designer operators with label", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: [],
        test_designer: ["ExclusionTest"],
        adversarial_critic: [],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      expect(result).toContain("**Test Designer (Opus / Claude)**: ExclusionTest");
    });

    it("includes adversarial critic operators with label", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: [],
        test_designer: [],
        adversarial_critic: ["Recode", "ReversalTest"],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      expect(result).toContain("**Adversarial Critic (Gemini)**: Recode, ReversalTest");
    });

    it("omits role line when operators array is empty", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: ["O1"],
        test_designer: [], // empty
        adversarial_critic: ["O2"],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      expect(result).toContain("**Hypothesis Generator");
      expect(result).not.toContain("**Test Designer");
      expect(result).toContain("**Adversarial Critic");
    });

    it("places operator section before excerpt section", async () => {
      const operatorSelection: OperatorSelection = {
        hypothesis_generator: ["O1"],
        test_designer: [],
        adversarial_critic: [],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      };

      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        operatorSelection,
      };

      const result = await composePrompt(input);

      const operatorIndex = result.indexOf("## ROLE OPERATOR ASSIGNMENTS");
      const excerptIndex = result.indexOf("## TRANSCRIPT EXCERPT(S)");

      expect(operatorIndex).toBeLessThan(excerptIndex);
    });

    it("omits operator section when operatorSelection is undefined", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: TEMPLATE_PATH,
        excerpt: "Test",
        // operatorSelection not provided
      };

      const result = await composePrompt(input);

      expect(result).not.toContain("## ROLE OPERATOR ASSIGNMENTS");
    });
  });

  describe("template path resolution", () => {
    it("falls back to repo root when file not in public/_corpus", async () => {
      // AGENTS.md exists at repo root but NOT in public/_corpus/
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: "AGENTS.md",
        excerpt: "Test",
      };

      const result = await composePrompt(input);

      // AGENTS.md starts with "# AGENTS.md"
      expect(result).toContain("# AGENTS.md");
    });
  });

  describe("error handling", () => {
    it("throws when template file does not exist", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: "nonexistent_template_that_does_not_exist.md",
        excerpt: "Test",
      };

      await expect(composePrompt(input)).rejects.toThrow("Template file not found");
    });

    it("includes filename in error message", async () => {
      const input: ComposePromptInput = {
        templatePathFromRepoRoot: "missing_file_xyz123.md",
        excerpt: "Test",
      };

      await expect(composePrompt(input)).rejects.toThrow("missing_file_xyz123.md");
    });
  });
});

// ============================================================================
// Type Export Tests (compile-time verification)
// ============================================================================

describe("type exports", () => {
  it("OperatorSelection type has correct shape", () => {
    const selection: OperatorSelection = {
      hypothesis_generator: ["op1"],
      test_designer: ["op2"],
      adversarial_critic: ["op3"],
      devils_advocate: [],
      experiment_designer: [],
      statistician: [],
      brenner_channeler: [],
      synthesis: [],
    };

    expect(selection.hypothesis_generator).toEqual(["op1"]);
    expect(selection.test_designer).toEqual(["op2"]);
    expect(selection.adversarial_critic).toEqual(["op3"]);
  });

  it("ComposePromptInput type accepts all fields", () => {
    const input: ComposePromptInput = {
      templatePathFromRepoRoot: "test.md",
      excerpt: "excerpt",
      theme: "theme",
      domain: "domain",
      question: "question",
      operatorSelection: {
        hypothesis_generator: [],
        test_designer: [],
        adversarial_critic: [],
        devils_advocate: [],
        experiment_designer: [],
        statistician: [],
        brenner_channeler: [],
        synthesis: [],
      },
    };

    expect(input.templatePathFromRepoRoot).toBe("test.md");
    expect(input.excerpt).toBe("excerpt");
    expect(input.theme).toBe("theme");
    expect(input.domain).toBe("domain");
    expect(input.question).toBe("question");
    expect(input.operatorSelection).toBeDefined();
  });

  it("ComposePromptInput type accepts minimal fields", () => {
    const input: ComposePromptInput = {
      templatePathFromRepoRoot: "test.md",
      excerpt: "excerpt",
    };

    expect(input.theme).toBeUndefined();
    expect(input.domain).toBeUndefined();
    expect(input.question).toBeUndefined();
    expect(input.operatorSelection).toBeUndefined();
  });
});
