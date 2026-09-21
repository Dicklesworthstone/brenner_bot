import { describe, expect, it } from "vitest";
import {
  type AdversarialCriticCriteria,
  AnomalyQuarantineDisciplineSchema,
  BRENNER_QUOTES,
  CitationComplianceSchema,
  type ContributionScore,
  ContributionScoreSchema,
  calculateAdversarialCriticScore,
  calculateHypothesisGeneratorScore,
  calculateTestDesignerScore,
  calculateUniversalScore,
  checkPassFailGates,
  createEmptyCitationCompliance,
  createEmptyRationaleQuality,
  createEmptyStructuralCorrectness,
  DiscriminativePowerSchema,
  generateSessionWarnings,
  generateWarnings,
  type HypothesisGeneratorCriteria,
  LevelSeparationSchema,
  MAX_ROLE_SCORES,
  MAX_SCORES,
  ObjectTranspositionSchema,
  OptionalScoreSchema,
  ParadoxExploitationSchema,
  PotencyCheckSufficiencySchema,
  RationaleQualitySchema,
  RealThirdAlternativeSchema,
  RoleSchema,
  SCORE_WEIGHTS,
  ScaleCheckRigorSchema,
  ScoreCalibrationHonestySchema,
  ScoreSchema,
  SESSION_WARNING_THRESHOLDS,
  type SessionScore,
  SessionScoreSchema,
  StructuralCorrectnessSchema,
  type TestDesignerCriteria,
  TheoryKillJustificationSchema,
  ThirdAlternativePresenceSchema,
  type UniversalCriteria,
} from "./scorecard";

describe("Score Schemas", () => {
  describe("ScoreSchema", () => {
    it("accepts valid scores 0-3", () => {
      expect(ScoreSchema.parse(0)).toBe(0);
      expect(ScoreSchema.parse(1)).toBe(1);
      expect(ScoreSchema.parse(2)).toBe(2);
      expect(ScoreSchema.parse(3)).toBe(3);
    });

    it("rejects invalid scores", () => {
      expect(() => ScoreSchema.parse(-1)).toThrow();
      expect(() => ScoreSchema.parse(4)).toThrow();
      expect(() => ScoreSchema.parse(1.5)).toThrow();
    });
  });

  describe("OptionalScoreSchema", () => {
    it("accepts valid scores 0-2", () => {
      expect(OptionalScoreSchema.parse(0)).toBe(0);
      expect(OptionalScoreSchema.parse(1)).toBe(1);
      expect(OptionalScoreSchema.parse(2)).toBe(2);
    });

    it("rejects invalid scores", () => {
      expect(() => OptionalScoreSchema.parse(3)).toThrow();
      expect(() => OptionalScoreSchema.parse(-1)).toThrow();
    });
  });

  describe("RoleSchema", () => {
    it("accepts valid roles", () => {
      expect(RoleSchema.parse("hypothesis_generator")).toBe("hypothesis_generator");
      expect(RoleSchema.parse("test_designer")).toBe("test_designer");
      expect(RoleSchema.parse("adversarial_critic")).toBe("adversarial_critic");
    });

    it("rejects invalid roles", () => {
      expect(() => RoleSchema.parse("invalid_role")).toThrow();
    });
  });
});

describe("Universal Criteria Schemas", () => {
  describe("StructuralCorrectnessSchema", () => {
    it("accepts valid structural correctness", () => {
      const valid = {
        score: 3,
        validJson: true,
        hasRequiredFields: true,
        sectionOperationMatch: true,
      };
      expect(StructuralCorrectnessSchema.parse(valid)).toEqual(valid);
    });

    it("accepts with optional notes", () => {
      const withNotes = {
        score: 2,
        validJson: true,
        hasRequiredFields: true,
        sectionOperationMatch: false,
        notes: "Minor section mismatch",
      };
      expect(StructuralCorrectnessSchema.parse(withNotes)).toEqual(withNotes);
    });
  });

  describe("CitationComplianceSchema", () => {
    it("accepts valid citation compliance", () => {
      const valid = {
        score: 3,
        anchorCount: 5,
        validAnchors: 5,
        hasInferenceMarkers: true,
        fakeAnchorDetected: false,
      };
      expect(CitationComplianceSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("RationaleQualitySchema", () => {
    it("accepts valid rationale quality", () => {
      const valid = {
        score: 3,
        hasRationale: true,
        mentionsOperators: true,
        explainsWhy: true,
      };
      expect(RationaleQualitySchema.parse(valid)).toEqual(valid);
    });
  });
});

describe("Hypothesis Generator Criteria Schemas", () => {
  describe("LevelSeparationSchema", () => {
    it("accepts valid level separation", () => {
      const valid = {
        score: 3,
        conflationDetected: false,
        mechanismTyped: true,
      };
      expect(LevelSeparationSchema.parse(valid)).toEqual(valid);
    });

    it("accepts with conflation patterns", () => {
      const withPatterns = {
        score: 1,
        conflationDetected: true,
        conflationPatterns: ["The gene tells the cell to...", "The organism decides to..."],
        mechanismTyped: false,
      };
      expect(LevelSeparationSchema.parse(withPatterns)).toEqual(withPatterns);
    });
  });

  describe("ThirdAlternativePresenceSchema", () => {
    it("accepts valid third alternative presence", () => {
      const valid = {
        score: 3,
        hasThirdAlternative: true,
        isGenuinelyOrthogonal: true,
        isPlaceholder: false,
      };
      expect(ThirdAlternativePresenceSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("ParadoxExploitationSchema", () => {
    it("accepts valid paradox exploitation", () => {
      const valid = {
        score: 2,
        applicable: true,
        paradoxIdentified: true,
        hypothesisDerivedFromParadox: true,
      };
      expect(ParadoxExploitationSchema.parse(valid)).toEqual(valid);
    });

    it("handles not applicable case", () => {
      const notApplicable = {
        score: 0,
        applicable: false,
        paradoxIdentified: false,
        hypothesisDerivedFromParadox: false,
      };
      expect(ParadoxExploitationSchema.parse(notApplicable)).toEqual(notApplicable);
    });
  });
});

describe("Test Designer Criteria Schemas", () => {
  describe("DiscriminativePowerSchema", () => {
    it("accepts valid discriminative power", () => {
      const valid = {
        score: 3,
        hypothesesDiscriminated: 2,
        outcomesAreDifferent: true,
        outcomesAreObservable: true,
        likelihoodRatioEstimate: ">100:1",
      };
      expect(DiscriminativePowerSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("PotencyCheckSufficiencySchema", () => {
    it("accepts valid potency check sufficiency", () => {
      const valid = {
        score: 3,
        hasPotencyCheck: true,
        hasPositiveControl: true,
        hasSensitivityVerification: true,
        hasTimingValidation: true,
      };
      expect(PotencyCheckSufficiencySchema.parse(valid)).toEqual(valid);
    });
  });

  describe("ObjectTranspositionSchema", () => {
    it("accepts valid object transposition", () => {
      const valid = {
        score: 2,
        applicable: true,
        alternativesConsidered: true,
        costBenefitProvided: true,
      };
      expect(ObjectTranspositionSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("ScoreCalibrationHonestySchema", () => {
    it("accepts valid score calibration", () => {
      const valid = {
        score: 2,
        hasEvidenceScore: true,
        isInflated: false,
        isConservative: true,
      };
      expect(ScoreCalibrationHonestySchema.parse(valid)).toEqual(valid);
    });
  });
});

describe("Adversarial Critic Criteria Schemas", () => {
  describe("ScaleCheckRigorSchema", () => {
    it("accepts valid scale check rigor", () => {
      const valid = {
        score: 3,
        hasScaleCheck: true,
        hasCalculation: true,
        hasUnits: true,
        hasConclusion: true,
      };
      expect(ScaleCheckRigorSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("AnomalyQuarantineDisciplineSchema", () => {
    it("accepts valid anomaly quarantine discipline", () => {
      const valid = {
        score: 3,
        anomalyCount: 2,
        quarantinedCount: 2,
        hasResolutionPlans: true,
        prematurelyDestroys: false,
      };
      expect(AnomalyQuarantineDisciplineSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("TheoryKillJustificationSchema", () => {
    it("accepts valid theory kill justification", () => {
      const valid = {
        score: 3,
        applicable: true,
        hasEvidence: true,
        evidenceIsDecisive: true,
        rescueMovesConsidered: true,
        unjustifiedPatternDetected: false,
      };
      expect(TheoryKillJustificationSchema.parse(valid)).toEqual(valid);
    });

    it("handles not applicable case", () => {
      const notApplicable = {
        score: 0,
        applicable: false,
        hasEvidence: false,
        evidenceIsDecisive: false,
        rescueMovesConsidered: false,
        unjustifiedPatternDetected: false,
      };
      expect(TheoryKillJustificationSchema.parse(notApplicable)).toEqual(notApplicable);
    });
  });

  describe("RealThirdAlternativeSchema", () => {
    it("accepts valid real third alternative", () => {
      const valid = {
        score: 3,
        hasAlternative: true,
        isSpecific: true,
        hasMechanism: true,
        hasTestablePredictions: true,
      };
      expect(RealThirdAlternativeSchema.parse(valid)).toEqual(valid);
    });
  });
});

describe("Score Calculation Functions", () => {
  const createUniversalCriteria = (scores: {
    structural: number;
    citation: number;
    rationale: number;
  }): UniversalCriteria => ({
    structuralCorrectness: {
      score: scores.structural,
      validJson: true,
      hasRequiredFields: true,
      sectionOperationMatch: true,
    },
    citationCompliance: {
      score: scores.citation,
      anchorCount: 3,
      validAnchors: 3,
      hasInferenceMarkers: true,
      fakeAnchorDetected: false,
    },
    rationaleQuality: {
      score: scores.rationale,
      hasRationale: true,
      mentionsOperators: true,
      explainsWhy: true,
    },
  });

  describe("calculateUniversalScore", () => {
    it("calculates correct weighted score", () => {
      const criteria = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      // 3*1.0 + 3*1.0 + 3*0.5 = 7.5
      expect(calculateUniversalScore(criteria)).toBe(7.5);
    });

    it("handles zero scores", () => {
      const criteria = createUniversalCriteria({ structural: 0, citation: 0, rationale: 0 });
      expect(calculateUniversalScore(criteria)).toBe(0);
    });
  });

  describe("calculateHypothesisGeneratorScore", () => {
    it("calculates correct weighted score with paradox applicable", () => {
      const universal = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      const specific: HypothesisGeneratorCriteria = {
        levelSeparation: { score: 3, conflationDetected: false, mechanismTyped: true },
        thirdAlternativePresence: {
          score: 3,
          hasThirdAlternative: true,
          isGenuinelyOrthogonal: true,
          isPlaceholder: false,
        },
        paradoxExploitation: {
          score: 2,
          applicable: true,
          paradoxIdentified: true,
          hypothesisDerivedFromParadox: true,
        },
      };

      const result = calculateHypothesisGeneratorScore(universal, specific);
      // Universal: 7.5
      // Specific: 3*1.5 + 3*2.0 + 2*0.5 = 4.5 + 6 + 1 = 11.5
      // Total: 19
      expect(result.score).toBe(19);
      expect(result.maxScore).toBe(19);
    });

    it("adjusts max score when paradox not applicable", () => {
      const universal = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      const specific: HypothesisGeneratorCriteria = {
        levelSeparation: { score: 3, conflationDetected: false, mechanismTyped: true },
        thirdAlternativePresence: {
          score: 3,
          hasThirdAlternative: true,
          isGenuinelyOrthogonal: true,
          isPlaceholder: false,
        },
        paradoxExploitation: {
          score: 0,
          applicable: false,
          paradoxIdentified: false,
          hypothesisDerivedFromParadox: false,
        },
      };

      const result = calculateHypothesisGeneratorScore(universal, specific);
      // Max reduced by 2*0.5 = 1
      expect(result.maxScore).toBe(18);
      // Score: 7.5 + 4.5 + 6 + 0 = 18
      expect(result.score).toBe(18);
    });
  });

  describe("calculateTestDesignerScore", () => {
    it("calculates correct weighted score", () => {
      const universal = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      const specific: TestDesignerCriteria = {
        discriminativePower: {
          score: 3,
          hypothesesDiscriminated: 2,
          outcomesAreDifferent: true,
          outcomesAreObservable: true,
        },
        potencyCheckSufficiency: {
          score: 3,
          hasPotencyCheck: true,
          hasPositiveControl: true,
          hasSensitivityVerification: true,
          hasTimingValidation: true,
        },
        objectTransposition: {
          score: 2,
          applicable: true,
          alternativesConsidered: true,
          costBenefitProvided: true,
        },
        scoreCalibrationHonesty: {
          score: 2,
          hasEvidenceScore: true,
          isInflated: false,
          isConservative: true,
        },
      };

      const result = calculateTestDesignerScore(universal, specific);
      // Universal: 7.5
      // Specific: 3*2.0 + 3*2.0 + 2*0.5 + 2*0.5 = 6 + 6 + 1 + 1 = 14
      // Total: 21.5
      expect(result.score).toBe(21.5);
      expect(result.maxScore).toBe(21.5);
    });
  });

  describe("calculateAdversarialCriticScore", () => {
    it("calculates correct weighted score with kill applicable", () => {
      const universal = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      const specific: AdversarialCriticCriteria = {
        scaleCheckRigor: {
          score: 3,
          hasScaleCheck: true,
          hasCalculation: true,
          hasUnits: true,
          hasConclusion: true,
        },
        anomalyQuarantineDiscipline: {
          score: 3,
          anomalyCount: 2,
          quarantinedCount: 2,
          hasResolutionPlans: true,
          prematurelyDestroys: false,
        },
        theoryKillJustification: {
          score: 3,
          applicable: true,
          hasEvidence: true,
          evidenceIsDecisive: true,
          rescueMovesConsidered: true,
          unjustifiedPatternDetected: false,
        },
        realThirdAlternative: {
          score: 3,
          hasAlternative: true,
          isSpecific: true,
          hasMechanism: true,
          hasTestablePredictions: true,
        },
      };

      const result = calculateAdversarialCriticScore(universal, specific);
      // Universal: 7.5
      // Specific: 3*1.5 + 3*1.5 + 3*1.5 + 3*1.5 = 18
      // Total: 25.5
      expect(result.score).toBe(25.5);
      expect(result.maxScore).toBe(25.5);
    });

    it("adjusts max score when kill not applicable", () => {
      const universal = createUniversalCriteria({ structural: 3, citation: 3, rationale: 3 });
      const specific: AdversarialCriticCriteria = {
        scaleCheckRigor: {
          score: 3,
          hasScaleCheck: true,
          hasCalculation: true,
          hasUnits: true,
          hasConclusion: true,
        },
        anomalyQuarantineDiscipline: {
          score: 3,
          anomalyCount: 2,
          quarantinedCount: 2,
          hasResolutionPlans: true,
          prematurelyDestroys: false,
        },
        theoryKillJustification: {
          score: 0,
          applicable: false,
          hasEvidence: false,
          evidenceIsDecisive: false,
          rescueMovesConsidered: false,
          unjustifiedPatternDetected: false,
        },
        realThirdAlternative: {
          score: 3,
          hasAlternative: true,
          isSpecific: true,
          hasMechanism: true,
          hasTestablePredictions: true,
        },
      };

      const result = calculateAdversarialCriticScore(universal, specific);
      expect(result.maxScore).toBe(21);
      // Score: 7.5 + 4.5 + 4.5 + 0 + 4.5 = 21
      expect(result.score).toBe(21);
    });
  });
});

describe("Pass/Fail Gates", () => {
  const createMockContributionScore = (
    overrides: Partial<ContributionScore> = {},
  ): ContributionScore => ({
    contributionId: "test-contribution-1",
    sessionId: "RS20251230",
    role: "hypothesis_generator",
    universal: {
      structuralCorrectness: {
        score: 3,
        validJson: true,
        hasRequiredFields: true,
        sectionOperationMatch: true,
      },
      citationCompliance: {
        score: 3,
        anchorCount: 3,
        validAnchors: 3,
        hasInferenceMarkers: true,
        fakeAnchorDetected: false,
      },
      rationaleQuality: {
        score: 3,
        hasRationale: true,
        mentionsOperators: true,
        explainsWhy: true,
      },
    },
    compositeScore: 19,
    maxScore: 19,
    percentage: 100,
    passFailGates: { passed: true, failures: [] },
    warnings: [],
    scoredAt: new Date().toISOString(),
    ...overrides,
  });

  describe("checkPassFailGates", () => {
    it("passes all gates with valid score", () => {
      const score = createMockContributionScore();
      const result = checkPassFailGates(score);
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("fails on invalid JSON", () => {
      const score = createMockContributionScore({
        universal: {
          structuralCorrectness: {
            score: 0,
            validJson: false,
            hasRequiredFields: false,
            sectionOperationMatch: false,
          },
          citationCompliance: {
            score: 3,
            anchorCount: 3,
            validAnchors: 3,
            hasInferenceMarkers: true,
            fakeAnchorDetected: false,
          },
          rationaleQuality: {
            score: 3,
            hasRationale: true,
            mentionsOperators: true,
            explainsWhy: true,
          },
        },
      });
      const result = checkPassFailGates(score);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.gate === "invalidJson")).toBe(true);
    });

    it("fails on fake anchor detected", () => {
      const score = createMockContributionScore({
        universal: {
          structuralCorrectness: {
            score: 3,
            validJson: true,
            hasRequiredFields: true,
            sectionOperationMatch: true,
          },
          citationCompliance: {
            score: 0,
            anchorCount: 1,
            validAnchors: 0,
            hasInferenceMarkers: false,
            fakeAnchorDetected: true,
          },
          rationaleQuality: {
            score: 3,
            hasRationale: true,
            mentionsOperators: true,
            explainsWhy: true,
          },
        },
      });
      const result = checkPassFailGates(score);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.gate === "fakeAnchor")).toBe(true);
    });

    it("fails on missing potency check for test designer", () => {
      const score = createMockContributionScore({
        role: "test_designer",
        testDesigner: {
          discriminativePower: {
            score: 3,
            hypothesesDiscriminated: 2,
            outcomesAreDifferent: true,
            outcomesAreObservable: true,
          },
          potencyCheckSufficiency: {
            score: 0,
            hasPotencyCheck: false,
            hasPositiveControl: false,
            hasSensitivityVerification: false,
            hasTimingValidation: false,
          },
          objectTransposition: {
            score: 0,
            applicable: false,
            alternativesConsidered: false,
            costBenefitProvided: false,
          },
          scoreCalibrationHonesty: {
            score: 0,
            hasEvidenceScore: false,
            isInflated: false,
            isConservative: false,
          },
        },
      });
      const result = checkPassFailGates(score);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.gate === "missingPotencyCheck")).toBe(true);
    });

    it("fails on kill without evidence", () => {
      const score = createMockContributionScore({
        role: "adversarial_critic",
        adversarialCritic: {
          scaleCheckRigor: {
            score: 0,
            hasScaleCheck: false,
            hasCalculation: false,
            hasUnits: false,
            hasConclusion: false,
          },
          anomalyQuarantineDiscipline: {
            score: 0,
            anomalyCount: 0,
            quarantinedCount: 0,
            hasResolutionPlans: false,
            prematurelyDestroys: false,
          },
          theoryKillJustification: {
            score: 0,
            applicable: true,
            hasEvidence: false,
            evidenceIsDecisive: false,
            rescueMovesConsidered: false,
            unjustifiedPatternDetected: true,
          },
          realThirdAlternative: {
            score: 0,
            hasAlternative: false,
            isSpecific: false,
            hasMechanism: false,
            hasTestablePredictions: false,
          },
        },
      });
      const result = checkPassFailGates(score);
      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.gate === "killWithoutRationale")).toBe(true);
    });
  });
});

describe("Warning Generation", () => {
  const createMockContributionScore = (
    overrides: Partial<ContributionScore> = {},
  ): ContributionScore => ({
    contributionId: "test-contribution-1",
    sessionId: "RS20251230",
    role: "hypothesis_generator",
    universal: {
      structuralCorrectness: {
        score: 3,
        validJson: true,
        hasRequiredFields: true,
        sectionOperationMatch: true,
      },
      citationCompliance: {
        score: 3,
        anchorCount: 3,
        validAnchors: 3,
        hasInferenceMarkers: true,
        fakeAnchorDetected: false,
      },
      rationaleQuality: {
        score: 3,
        hasRationale: true,
        mentionsOperators: true,
        explainsWhy: true,
      },
    },
    compositeScore: 19,
    maxScore: 19,
    percentage: 100,
    passFailGates: { passed: true, failures: [] },
    warnings: [],
    scoredAt: new Date().toISOString(),
    ...overrides,
  });

  describe("generateWarnings", () => {
    it("generates low quality warning when percentage < 50", () => {
      const score = createMockContributionScore({
        compositeScore: 5,
        maxScore: 19,
        percentage: 26,
      });
      const warnings = generateWarnings(score);
      expect(warnings.some((w) => w.criterion === "composite")).toBe(true);
    });

    it("generates missing scale check warning for adversarial critic", () => {
      const score = createMockContributionScore({
        role: "adversarial_critic",
        percentage: 60,
        adversarialCritic: {
          scaleCheckRigor: {
            score: 0,
            hasScaleCheck: false,
            hasCalculation: false,
            hasUnits: false,
            hasConclusion: false,
          },
          anomalyQuarantineDiscipline: {
            score: 3,
            anomalyCount: 1,
            quarantinedCount: 1,
            hasResolutionPlans: true,
            prematurelyDestroys: false,
          },
          theoryKillJustification: {
            score: 0,
            applicable: false,
            hasEvidence: false,
            evidenceIsDecisive: false,
            rescueMovesConsidered: false,
            unjustifiedPatternDetected: false,
          },
          realThirdAlternative: {
            score: 3,
            hasAlternative: true,
            isSpecific: true,
            hasMechanism: true,
            hasTestablePredictions: true,
          },
        },
      });
      const warnings = generateWarnings(score);
      expect(warnings.some((w) => w.criterion === "scaleCheckRigor")).toBe(true);
    });

    it("generates weak potency warning for test designer", () => {
      const score = createMockContributionScore({
        role: "test_designer",
        percentage: 60,
        testDesigner: {
          discriminativePower: {
            score: 3,
            hypothesesDiscriminated: 2,
            outcomesAreDifferent: true,
            outcomesAreObservable: true,
          },
          potencyCheckSufficiency: {
            score: 1,
            hasPotencyCheck: true,
            hasPositiveControl: true,
            hasSensitivityVerification: false,
            hasTimingValidation: false,
          },
          objectTransposition: {
            score: 0,
            applicable: false,
            alternativesConsidered: false,
            costBenefitProvided: false,
          },
          scoreCalibrationHonesty: {
            score: 0,
            hasEvidenceScore: false,
            isInflated: false,
            isConservative: false,
          },
        },
      });
      const warnings = generateWarnings(score);
      expect(warnings.some((w) => w.criterion === "potencyCheckSufficiency")).toBe(true);
    });

    it("returns empty array when no warnings", () => {
      const score = createMockContributionScore();
      const warnings = generateWarnings(score);
      expect(warnings).toHaveLength(0);
    });
  });
});

describe("Helper Functions", () => {
  describe("createEmptyStructuralCorrectness", () => {
    it("creates empty structural correctness", () => {
      const empty = createEmptyStructuralCorrectness();
      expect(empty.score).toBe(0);
      expect(empty.validJson).toBe(false);
      expect(empty.hasRequiredFields).toBe(false);
      expect(empty.sectionOperationMatch).toBe(false);
    });
  });

  describe("createEmptyCitationCompliance", () => {
    it("creates empty citation compliance", () => {
      const empty = createEmptyCitationCompliance();
      expect(empty.score).toBe(0);
      expect(empty.anchorCount).toBe(0);
      expect(empty.validAnchors).toBe(0);
      expect(empty.hasInferenceMarkers).toBe(false);
      expect(empty.fakeAnchorDetected).toBe(false);
    });
  });

  describe("createEmptyRationaleQuality", () => {
    it("creates empty rationale quality", () => {
      const empty = createEmptyRationaleQuality();
      expect(empty.score).toBe(0);
      expect(empty.hasRationale).toBe(false);
      expect(empty.mentionsOperators).toBe(false);
      expect(empty.explainsWhy).toBe(false);
    });
  });
});

describe("Constants", () => {
  describe("SCORE_WEIGHTS", () => {
    it("has correct weights", () => {
      expect(SCORE_WEIGHTS.structuralCorrectness).toBe(1.0);
      expect(SCORE_WEIGHTS.citationCompliance).toBe(1.0);
      expect(SCORE_WEIGHTS.rationaleQuality).toBe(0.5);
      expect(SCORE_WEIGHTS.levelSeparation).toBe(1.5);
      expect(SCORE_WEIGHTS.thirdAlternativePresence).toBe(2.0);
      expect(SCORE_WEIGHTS.paradoxExploitation).toBe(0.5);
      expect(SCORE_WEIGHTS.discriminativePower).toBe(2.0);
      expect(SCORE_WEIGHTS.potencyCheckSufficiency).toBe(2.0);
      expect(SCORE_WEIGHTS.objectTransposition).toBe(0.5);
      expect(SCORE_WEIGHTS.scoreCalibrationHonesty).toBe(0.5);
      expect(SCORE_WEIGHTS.scaleCheckRigor).toBe(1.5);
      expect(SCORE_WEIGHTS.anomalyQuarantineDiscipline).toBe(1.5);
      expect(SCORE_WEIGHTS.theoryKillJustification).toBe(1.5);
      expect(SCORE_WEIGHTS.realThirdAlternative).toBe(1.5);
    });
  });

  describe("MAX_SCORES", () => {
    it("has correct max values", () => {
      expect(MAX_SCORES.structuralCorrectness).toBe(3);
      expect(MAX_SCORES.paradoxExploitation).toBe(2);
      expect(MAX_SCORES.objectTransposition).toBe(2);
      expect(MAX_SCORES.scoreCalibrationHonesty).toBe(2);
    });
  });

  describe("MAX_ROLE_SCORES", () => {
    it("has correct max role scores", () => {
      expect(MAX_ROLE_SCORES.hypothesis_generator).toBe(19);
      expect(MAX_ROLE_SCORES.test_designer).toBe(21.5);
      expect(MAX_ROLE_SCORES.adversarial_critic_with_kill).toBe(25.5);
      expect(MAX_ROLE_SCORES.adversarial_critic_no_kill).toBe(21);
    });
  });

  describe("BRENNER_QUOTES", () => {
    it("has quotes for key criteria", () => {
      expect(BRENNER_QUOTES.levelSeparation).toContain("§58");
      expect(BRENNER_QUOTES.thirdAlternativePresence).toContain("§103");
      expect(BRENNER_QUOTES.theoryKillJustification).toContain("§229");
      expect(BRENNER_QUOTES.discriminativePower).toContain("§147");
    });
  });
});

describe("Composite Score Schemas", () => {
  describe("ContributionScoreSchema", () => {
    it("validates a complete contribution score", () => {
      const valid = {
        contributionId: "delta-001",
        sessionId: "RS20251230",
        role: "hypothesis_generator" as const,
        universal: {
          structuralCorrectness: {
            score: 3,
            validJson: true,
            hasRequiredFields: true,
            sectionOperationMatch: true,
          },
          citationCompliance: {
            score: 3,
            anchorCount: 3,
            validAnchors: 3,
            hasInferenceMarkers: true,
            fakeAnchorDetected: false,
          },
          rationaleQuality: {
            score: 3,
            hasRationale: true,
            mentionsOperators: true,
            explainsWhy: true,
          },
        },
        hypothesisGenerator: {
          levelSeparation: { score: 3, conflationDetected: false, mechanismTyped: true },
          thirdAlternativePresence: {
            score: 3,
            hasThirdAlternative: true,
            isGenuinelyOrthogonal: true,
            isPlaceholder: false,
          },
          paradoxExploitation: {
            score: 2,
            applicable: true,
            paradoxIdentified: true,
            hypothesisDerivedFromParadox: true,
          },
        },
        compositeScore: 19,
        maxScore: 19,
        percentage: 100,
        passFailGates: { passed: true, failures: [] },
        warnings: [],
        scoredAt: new Date().toISOString(),
      };

      expect(() => ContributionScoreSchema.parse(valid)).not.toThrow();
    });
  });

  describe("SessionScoreSchema", () => {
    it("validates a session score", () => {
      const valid = {
        sessionId: "RS20251230",
        contributions: [],
        roleAggregations: {
          hypothesisGenerator: {
            count: 3,
            meanScore: 15,
            meanPercentage: 78.9,
          },
        },
        sessionMetrics: {
          totalContributions: 3,
          progression: "improving" as const,
          convergence: {
            addCount: 2,
            killCount: 1,
            converging: false,
          },
          operatorCoverage: {
            used: ["⊘", "⊕"],
            missing: ["⊙"],
            coveragePercentage: 66.7,
          },
        },
        overallScore: 15,
        overallPercentage: 78.9,
        scoredAt: new Date().toISOString(),
      };

      expect(() => SessionScoreSchema.parse(valid)).not.toThrow();
    });
  });
});

// ============================================================================
// Session-Level Warning Tests
// ============================================================================

describe("Session-Level Warnings", () => {
  // Helper to create a minimal session score
  function createSessionScore(overrides: Partial<SessionScore> = {}): SessionScore {
    return {
      sessionId: "RS20251230",
      contributions: [],
      roleAggregations: {},
      sessionMetrics: {
        totalContributions: 0,
        progression: "stable" as const,
        convergence: {
          addCount: 0,
          killCount: 0,
          converging: true,
        },
        operatorCoverage: {
          used: [],
          missing: [],
          coveragePercentage: 100,
        },
      },
      overallScore: 0,
      overallPercentage: 0,
      scoredAt: new Date().toISOString(),
      ...overrides,
    };
  }

  describe("SESSION_WARNING_THRESHOLDS", () => {
    describe("hypothesisSprawl", () => {
      it("triggers when > 3 ADDs and 0 KILLs", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 4,
            progression: "stable",
            convergence: {
              addCount: 4,
              killCount: 0,
              converging: false,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.hypothesisSprawl.check(session)).toBe(true);
      });

      it("does not trigger when killCount > 0", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "stable",
            convergence: {
              addCount: 4,
              killCount: 1,
              converging: false,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.hypothesisSprawl.check(session)).toBe(false);
      });

      it("does not trigger when addCount <= 3", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 3,
            progression: "stable",
            convergence: {
              addCount: 3,
              killCount: 0,
              converging: false,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.hypothesisSprawl.check(session)).toBe(false);
      });
    });

    describe("lowConvergence", () => {
      it("triggers when >= 5 contributions and not converging", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "stable",
            convergence: {
              addCount: 3,
              killCount: 2,
              converging: false,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.lowConvergence.check(session)).toBe(true);
      });

      it("does not trigger when converging", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "stable",
            convergence: {
              addCount: 2,
              killCount: 3,
              converging: true,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.lowConvergence.check(session)).toBe(false);
      });

      it("does not trigger when < 5 contributions", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 4,
            progression: "stable",
            convergence: {
              addCount: 3,
              killCount: 1,
              converging: false,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.lowConvergence.check(session)).toBe(false);
      });
    });

    describe("lowOperatorCoverage", () => {
      it("triggers when coverage < 50%", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 3,
            progression: "stable",
            convergence: {
              addCount: 2,
              killCount: 1,
              converging: true,
            },
            operatorCoverage: {
              used: ["⊘"],
              missing: ["⊕", "⊙"],
              coveragePercentage: 33.3,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.lowOperatorCoverage.check(session)).toBe(true);
      });

      it("does not trigger when coverage >= 50%", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 3,
            progression: "stable",
            convergence: {
              addCount: 2,
              killCount: 1,
              converging: true,
            },
            operatorCoverage: {
              used: ["⊘", "⊕"],
              missing: ["⊙"],
              coveragePercentage: 66.7,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.lowOperatorCoverage.check(session)).toBe(false);
      });
    });

    describe("decliningQuality", () => {
      it("triggers when progression is declining", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "declining",
            convergence: {
              addCount: 3,
              killCount: 2,
              converging: true,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.decliningQuality.check(session)).toBe(true);
      });

      it("does not trigger when progression is improving", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "improving",
            convergence: {
              addCount: 3,
              killCount: 2,
              converging: true,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.decliningQuality.check(session)).toBe(false);
      });

      it("does not trigger when progression is stable", () => {
        const session = createSessionScore({
          sessionMetrics: {
            totalContributions: 5,
            progression: "stable",
            convergence: {
              addCount: 3,
              killCount: 2,
              converging: true,
            },
            operatorCoverage: {
              used: [],
              missing: [],
              coveragePercentage: 100,
            },
          },
        });

        expect(SESSION_WARNING_THRESHOLDS.decliningQuality.check(session)).toBe(false);
      });
    });
  });

  describe("generateSessionWarnings", () => {
    it("returns empty array when no warnings triggered", () => {
      const session = createSessionScore({
        sessionMetrics: {
          totalContributions: 3,
          progression: "improving",
          convergence: {
            addCount: 2,
            killCount: 1,
            converging: true,
          },
          operatorCoverage: {
            used: ["⊘", "⊕", "⊙"],
            missing: [],
            coveragePercentage: 100,
          },
        },
      });

      const warnings = generateSessionWarnings(session);
      expect(warnings).toEqual([]);
    });

    it("returns single warning when one threshold triggered", () => {
      const session = createSessionScore({
        sessionMetrics: {
          totalContributions: 3,
          progression: "declining",
          convergence: {
            addCount: 2,
            killCount: 1,
            converging: true,
          },
          operatorCoverage: {
            used: ["⊘", "⊕", "⊙"],
            missing: [],
            coveragePercentage: 100,
          },
        },
      });

      const warnings = generateSessionWarnings(session);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].criterion).toBe("progression");
      expect(warnings[0].message).toContain("declining");
    });

    it("returns multiple warnings when multiple thresholds triggered", () => {
      const session = createSessionScore({
        sessionMetrics: {
          totalContributions: 6,
          progression: "declining",
          convergence: {
            addCount: 5,
            killCount: 0,
            converging: false,
          },
          operatorCoverage: {
            used: ["⊘"],
            missing: ["⊕", "⊙"],
            coveragePercentage: 33.3,
          },
        },
      });

      const warnings = generateSessionWarnings(session);
      // Should trigger: hypothesisSprawl, lowConvergence, lowOperatorCoverage, decliningQuality
      expect(warnings.length).toBeGreaterThanOrEqual(3);

      const criteria = warnings.map((w) => w.criterion);
      expect(criteria).toContain("convergence"); // hypothesisSprawl or lowConvergence
      expect(criteria).toContain("operatorCoverage");
      expect(criteria).toContain("progression");
    });

    it("warnings have correct structure", () => {
      const session = createSessionScore({
        sessionMetrics: {
          totalContributions: 5,
          progression: "declining",
          convergence: {
            addCount: 2,
            killCount: 1,
            converging: true,
          },
          operatorCoverage: {
            used: ["⊘", "⊕"],
            missing: ["⊙"],
            coveragePercentage: 66.7,
          },
        },
      });

      const warnings = generateSessionWarnings(session);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toHaveProperty("criterion");
      expect(warnings[0]).toHaveProperty("message");
      expect(typeof warnings[0].criterion).toBe("string");
      expect(typeof warnings[0].message).toBe("string");
    });
  });
});

// ============================================================================
// Session-Level Dimension Scoring Tests (7 Dimensions)
// ============================================================================

import type { Artifact } from "../artifact-merge";
import {
  computeGrade,
  type SessionData,
  scoreAdversarialPressure,
  scoreAssumptionTracking,
  scoreExperimentalFeasibility,
  scoreHypothesisKillRate,
  scoreParadoxGrounding,
  scoreSession,
  scoreTestDiscriminability,
  scoreThirdAlternativeDiscovery,
} from "./scorecard";

function createEmptyArtifact(): Artifact {
  return {
    metadata: {
      session_id: "test-session",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      contributors: [],
      status: "active",
    },
    sections: {
      research_thread: null,
      hypothesis_slate: [],
      predictions_table: [],
      discriminative_tests: [],
      assumption_ledger: [],
      anomaly_register: [],
      adversarial_critique: [],
    },
  };
}

function createTestSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: "test-session-001",
    artifact: createEmptyArtifact(),
    ...overrides,
  };
}

describe("Session-Level Dimension Scoring", () => {
  describe("scoreParadoxGrounding", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreParadoxGrounding(session);

      expect(result.dimension).toBe("paradoxGrounding");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(20);
      expect(result.signals).toHaveLength(4);
    });

    it("detects paradox keywords in research question", () => {
      const session = createTestSession({
        researchQuestion: "A surprising paradox: cells differentiate despite identical genomes",
      });
      const result = scoreParadoxGrounding(session);

      expect(result.signals.find((s) => s.signal.includes("paradox/puzzle"))?.found).toBe(true);
      expect(result.points).toBeGreaterThan(0);
    });

    it("detects paradigm challenge language", () => {
      const session = createTestSession({
        researchQuestion: "We challenge the assumption that DNA alone determines cell fate",
      });
      const result = scoreParadoxGrounding(session);

      expect(result.signals.find((s) => s.signal.includes("paradigm"))?.found).toBe(true);
    });

    it("detects anomalies in artifact", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.anomaly_register = [
        {
          id: "X-1",
          name: "Anomaly 1",
          observation: "Unexpected behavior",
          conflicts_with: ["H1"],
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreParadoxGrounding(session);

      expect(result.signals.find((s) => s.signal.includes("surprising observation"))?.found).toBe(
        true,
      );
      expect(
        result.signals.find((s) => s.signal.includes("surprising observation"))?.evidence,
      ).toContain("1 anomalies");
    });

    it("detects falsified assumptions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.assumption_ledger = [
        {
          id: "A-1",
          name: "Test assumption",
          statement: "We assume X",
          load: "H1",
          test: "Check X",
          status: "falsified",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreParadoxGrounding(session);

      expect(result.signals.find((s) => s.signal.includes("assumptions questioned"))?.found).toBe(
        true,
      );
    });

    it("achieves max score with all signals", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.anomaly_register = [
        { id: "X-1", name: "Anomaly 1", observation: "Test", conflicts_with: [] },
      ];
      artifact.sections.assumption_ledger = [
        {
          id: "A-1",
          name: "Test",
          statement: "Test",
          load: "H1",
          test: "Test",
          status: "falsified",
        },
      ];

      const session = createTestSession({
        researchQuestion: "A surprising paradox that challenges existing assumptions",
        artifact,
      });
      const result = scoreParadoxGrounding(session);

      expect(result.points).toBe(20);
      expect(result.percentage).toBe(100);
    });
  });

  describe("scoreHypothesisKillRate", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreHypothesisKillRate(session);

      expect(result.dimension).toBe("hypothesisKillRate");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(20);
    });

    it("penalizes static sessions with hypotheses but no transitions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        { id: "H-1", name: "H1", claim: "Test", mechanism: "Test" },
        { id: "H-2", name: "H2", claim: "Test", mechanism: "Test" },
      ];

      const session = createTestSession({ artifact, hypothesisTransitions: [] });
      const result = scoreHypothesisKillRate(session);

      expect(result.signals.some((s) => s.signal.includes("static session") && s.found)).toBe(true);
      expect(result.points).toBeLessThan(0);
    });

    it("detects kills from killed flag on hypotheses", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        {
          id: "H-1",
          name: "H1",
          claim: "Test",
          mechanism: "Test",
          killed: true,
          kill_reason: "Refuted by test T-1 results",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreHypothesisKillRate(session);

      expect(result.signals.find((s) => s.signal.includes("killed in session"))?.found).toBe(true);
      expect(result.points).toBeGreaterThan(0);
    });

    it("detects reasoning from flagged kills without transitions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        {
          id: "H-1",
          name: "H1",
          claim: "Test",
          mechanism: "Test",
          killed: true,
          kill_reason: "Experiment showed no binding affinity",
        },
      ];

      const session = createTestSession({ artifact, hypothesisTransitions: [] });
      const result = scoreHypothesisKillRate(session);

      // Should detect reasoning from kill_reason field even without transitions
      expect(result.signals.find((s) => s.signal.includes("reasoning documented"))?.found).toBe(
        true,
      );
    });

    it("detects test links from flagged kills via killed_by field", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        {
          id: "H-1",
          name: "H1",
          claim: "Test",
          mechanism: "Test",
          killed: true,
          killed_by: "T-1",
          kill_reason: "Failed test T-1",
        },
      ];

      const session = createTestSession({ artifact, hypothesisTransitions: [] });
      const result = scoreHypothesisKillRate(session);

      // Should detect test link from killed_by field even without transitions
      expect(result.signals.find((s) => s.signal.includes("test result"))?.found).toBe(true);
    });

    it("detects kills from transitions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        { id: "H-1", name: "H1", claim: "Test", mechanism: "Test" },
      ];

      const session = createTestSession({
        artifact,
        hypothesisTransitions: [
          {
            hypothesisId: "H-1",
            fromState: "active",
            toState: "refuted",
            triggeredBy: "T-1",
            reason: "Test T-1 showed no effect, contradicting H1 prediction",
            timestamp: new Date().toISOString(),
          },
        ],
      });
      const result = scoreHypothesisKillRate(session);

      expect(result.signals.find((s) => s.signal.includes("killed in session"))?.found).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("test result"))?.found).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("reasoning documented"))?.found).toBe(
        true,
      );
    });
  });

  describe("scoreTestDiscriminability", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreTestDiscriminability(session);

      expect(result.dimension).toBe("testDiscriminability");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(20);
    });

    it("detects tests with different predictions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.discriminative_tests = [
        {
          id: "T-1",
          name: "Test 1",
          procedure: "Measure protein levels via Western blot",
          discriminates: "H1 vs H2",
          expected_outcomes: { H1: "High expression", H2: "Low expression" },
          potency_check: "Include positive control with known high expression",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreTestDiscriminability(session);

      expect(result.signals.find((s) => s.signal.includes("different predictions"))?.found).toBe(
        true,
      );
      expect(result.signals.find((s) => s.signal.includes("observable"))?.found).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("Potency checks"))?.found).toBe(true);
    });

    it("requires all tests to have potency checks for full score", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.discriminative_tests = [
        {
          id: "T-1",
          name: "Test 1",
          procedure: "Test procedure",
          discriminates: "H1 vs H2",
          expected_outcomes: { H1: "A", H2: "B" },
          potency_check: "Positive control included",
        },
        {
          id: "T-2",
          name: "Test 2",
          procedure: "Test procedure",
          discriminates: "H1 vs H2",
          expected_outcomes: { H1: "C", H2: "D" },
          potency_check: "", // Missing potency check
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreTestDiscriminability(session);

      // Should not get full potency points since T-2 lacks potency check
      expect(result.signals.find((s) => s.signal.includes("Potency checks"))?.found).toBe(false);
    });
  });

  describe("scoreAssumptionTracking", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreAssumptionTracking(session);

      expect(result.dimension).toBe("assumptionTracking");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(15);
    });

    it("detects recorded assumptions", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.assumption_ledger = [
        {
          id: "A-1",
          name: "Assumption 1",
          statement: "We assume X",
          load: "H1, H2",
          test: "Check X",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreAssumptionTracking(session);

      expect(result.signals.find((s) => s.signal.includes("recorded"))?.found).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("linked to hypotheses"))?.found).toBe(
        true,
      );
    });

    it("detects scale/physics checks", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.assumption_ledger = [
        {
          id: "A-1",
          name: "Diffusion time scale",
          statement: "Morphogen diffuses fast enough",
          load: "H1",
          test: "Calculate diffusion time",
          scale_check: true,
          calculation: "D = 10 μm²/s, L = 100 μm, τ = L²/D = 1000s",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreAssumptionTracking(session);

      expect(result.signals.find((s) => s.signal.includes("Scale/physics"))?.found).toBe(true);
    });
  });

  describe("scoreThirdAlternativeDiscovery", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreThirdAlternativeDiscovery(session);

      expect(result.dimension).toBe("thirdAlternativeDiscovery");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(15);
    });

    it("detects third alternatives", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.hypothesis_slate = [
        { id: "H-1", name: "H1", claim: "Position determines fate", mechanism: "Gradient signals" },
        { id: "H-2", name: "H2", claim: "Lineage determines fate", mechanism: "Division counting" },
        {
          id: "H-3",
          name: "H3",
          claim: "Chromatin state determines fate",
          mechanism: "Epigenetic marks causes persistent gene silencing",
          third_alternative: true,
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreThirdAlternativeDiscovery(session);

      expect(
        result.signals.find((s) => s.signal.includes("Third alternatives proposed"))?.found,
      ).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("causal structure"))?.found).toBe(true);
    });
  });

  describe("scoreExperimentalFeasibility", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreExperimentalFeasibility(session);

      expect(result.dimension).toBe("experimentalFeasibility");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(10);
    });

    it("detects feasibility assessments", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.discriminative_tests = [
        {
          id: "T-1",
          name: "Test 1",
          procedure: "Test",
          discriminates: "H1 vs H2",
          expected_outcomes: {},
          potency_check: "Test",
          feasibility: "Requires standard lab equipment, can be completed in 2 weeks",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreExperimentalFeasibility(session);

      expect(result.signals.find((s) => s.signal.includes("feasibility assessment"))?.found).toBe(
        true,
      );
    });

    it("detects executed tests", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.discriminative_tests = [
        {
          id: "T-1",
          name: "Test 1",
          procedure: "Test",
          discriminates: "H1 vs H2",
          expected_outcomes: {},
          potency_check: "Test",
          status: "passed",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreExperimentalFeasibility(session);

      expect(result.signals.find((s) => s.signal.includes("executed"))?.found).toBe(true);
    });
  });

  describe("scoreAdversarialPressure", () => {
    it("scores 0 for empty session", () => {
      const session = createTestSession();
      const result = scoreAdversarialPressure(session);

      expect(result.dimension).toBe("adversarialPressure");
      expect(result.points).toBe(0);
      expect(result.maxPoints).toBe(20);
    });

    it("detects logged critiques", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.adversarial_critique = [
        {
          id: "C-1",
          name: "Scale critique",
          attack: "H1 cannot work at observed timescales",
          evidence:
            "Diffusion time is 1000s but differentiation occurs in 100s - this is a fundamental physical constraint",
          current_status: "active",
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreAdversarialPressure(session);

      expect(result.signals.find((s) => s.signal.includes("logged"))?.found).toBe(true);
      expect(result.signals.find((s) => s.signal.includes("evidence backing"))?.found).toBe(true);
    });

    it("detects real third alternatives from critique", () => {
      const artifact = createEmptyArtifact();
      artifact.sections.adversarial_critique = [
        {
          id: "C-1",
          name: "Alternative mechanism",
          attack: "Both H1 and H2 assume morphogen gradients",
          evidence: "Contact-dependent signaling would explain the observed pattern",
          current_status: "active",
          real_third_alternative: true,
        },
      ];

      const session = createTestSession({ artifact });
      const result = scoreAdversarialPressure(session);

      expect(result.signals.find((s) => s.signal.includes("Real third alternatives"))?.found).toBe(
        true,
      );
    });
  });

  describe("computeGrade", () => {
    it("returns A for 90%+", () => {
      expect(computeGrade(90, 100)).toBe("A");
      expect(computeGrade(100, 100)).toBe("A");
      expect(computeGrade(95, 100)).toBe("A");
    });

    it("returns B for 80-89%", () => {
      expect(computeGrade(80, 100)).toBe("B");
      expect(computeGrade(89, 100)).toBe("B");
    });

    it("returns C for 70-79%", () => {
      expect(computeGrade(70, 100)).toBe("C");
      expect(computeGrade(79, 100)).toBe("C");
    });

    it("returns D for 60-69%", () => {
      expect(computeGrade(60, 100)).toBe("D");
      expect(computeGrade(69, 100)).toBe("D");
    });

    it("returns F for below 60%", () => {
      expect(computeGrade(59, 100)).toBe("F");
      expect(computeGrade(0, 100)).toBe("F");
    });

    it("handles edge case of zero max score", () => {
      expect(computeGrade(0, 0)).toBe("F");
    });
  });

  describe("scoreSession", () => {
    it("scores empty session with low grade", () => {
      const session = createTestSession();
      const result = scoreSession(session);

      expect(result.sessionId).toBe("test-session-001");
      expect(result.totalScore).toBe(0);
      expect(result.maxScore).toBe(120); // Sum of all dimension max scores
      expect(result.grade).toBe("F");
      expect(result.dimensions.paradoxGrounding).toBeDefined();
      expect(result.dimensions.hypothesisKillRate).toBeDefined();
      expect(result.dimensions.testDiscriminability).toBeDefined();
      expect(result.dimensions.assumptionTracking).toBeDefined();
      expect(result.dimensions.thirdAlternativeDiscovery).toBeDefined();
      expect(result.dimensions.experimentalFeasibility).toBeDefined();
      expect(result.dimensions.adversarialPressure).toBeDefined();
    });

    it("scores high-quality session with high grade", () => {
      const artifact = createEmptyArtifact();

      // Add anomalies for paradox grounding
      artifact.sections.anomaly_register = [
        { id: "X-1", name: "Anomaly", observation: "Surprising result", conflicts_with: ["H1"] },
      ];

      // Add falsified assumption
      artifact.sections.assumption_ledger = [
        {
          id: "A-1",
          name: "A1",
          statement: "Test",
          load: "H1, H2",
          test: "Test",
          status: "falsified",
          scale_check: true,
        },
      ];

      // Add hypotheses with third alternative
      artifact.sections.hypothesis_slate = [
        {
          id: "H-1",
          name: "H1",
          claim: "Test",
          mechanism: "Mechanism A",
          killed: true,
          kill_reason: "Refuted by T-1 results",
        },
        { id: "H-2", name: "H2", claim: "Test", mechanism: "Mechanism B" },
        {
          id: "H-3",
          name: "H3",
          claim: "Test",
          mechanism: "Different approach causes different outcome",
          third_alternative: true,
        },
      ];

      // Add discriminative tests
      artifact.sections.discriminative_tests = [
        {
          id: "T-1",
          name: "Test 1",
          procedure: "Measure and quantify protein levels",
          discriminates: "H1 vs H2",
          expected_outcomes: { H1: "High", H2: "Low" },
          potency_check: "Include positive control samples",
          feasibility: "Standard equipment available",
          status: "passed",
        },
      ];

      // Add critiques
      artifact.sections.adversarial_critique = [
        {
          id: "C-1",
          name: "Critique",
          attack: "H1 timing is off",
          evidence: "Calculation shows diffusion time exceeds observed timescale by 10x",
          current_status: "active",
          real_third_alternative: true,
        },
      ];

      const session = createTestSession({
        researchQuestion: "A surprising paradox: how can cells challenge the central dogma?",
        artifact,
        hypothesisTransitions: [
          {
            hypothesisId: "H-1",
            fromState: "active",
            toState: "refuted",
            triggeredBy: "T-1",
            reason: "Test results contradicted H1 prediction",
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const result = scoreSession(session);

      expect(result.totalScore).toBeGreaterThan(60);
      expect(result.grade).not.toBe("F");
    });
  });
});
