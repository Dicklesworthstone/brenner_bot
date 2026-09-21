"use client";

/**
 * LiteratureSearch - Paper Search and Citation Import Tool
 *
 * Enables searching for relevant papers, importing citations, and
 * recording literature evidence in the Evidence Ledger.
 *
 * Features:
 * - Hypothesis-aware search query suggestions
 * - BibTeX import with parsing
 * - DOI lookup
 * - Paper relevance scoring
 * - Quick evidence recording from papers
 *
 * @see brenner_bot-njjo.7 (bead)
 * @module components/brenner-loop/evidence/LiteratureSearch
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Import,
  Plus,
  Quote,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { DiscriminativePower, EvidenceResult } from "@/lib/brenner-loop/evidence";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import {
  bibTeXToPaperResult,
  calculateRelevance,
  doiToUrl,
  extractDOI,
  formatCitation,
  generateSearchQueries,
  getPaperAgeCategory,
  getRelevanceColor,
  getRelevanceLabel,
  isValidDOI,
  type PaperResult,
  parseBibTeX,
  type SuggestedSearches,
  summarizePaper,
} from "@/lib/brenner-loop/literature";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface LiteratureSearchProps {
  /** Current session ID */
  sessionId: string;
  /** Current hypothesis for relevance scoring */
  hypothesis: HypothesisCard;
  /** Current confidence level */
  currentConfidence: number;
  /** Callback when user wants to record paper as evidence */
  onRecordEvidence?: (payload: RecordLiteratureEvidencePayload) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface RecordLiteratureEvidencePayload {
  sessionId: string;
  hypothesisId: string;
  confidenceBefore: number;
  paper: PaperResult;
  result: EvidenceResult;
  keyFinding: string;
  interpretation: string;
  discriminativePower: DiscriminativePower;
}

type SearchTab = "suggested" | "manual" | "import";

interface RecordingState {
  paper: PaperResult;
  result: EvidenceResult | null;
  keyFinding: string;
  interpretation: string;
  discriminativePower: DiscriminativePower;
}

// ============================================================================
// Constants
// ============================================================================

const RESULT_OPTIONS: { value: EvidenceResult; label: string; color: string }[] = [
  { value: "supports", label: "Supports hypothesis", color: "text-green-600" },
  { value: "challenges", label: "Challenges hypothesis", color: "text-red-600" },
  { value: "inconclusive", label: "Inconclusive", color: "text-amber-600" },
];

const POWER_OPTIONS: { value: DiscriminativePower; label: string }[] = [
  { value: 1, label: "★☆☆☆☆ Weak" },
  { value: 2, label: "★★☆☆☆ Low" },
  { value: 3, label: "★★★☆☆ Moderate" },
  { value: 4, label: "★★★★☆ Strong" },
  { value: 5, label: "★★★★★ Decisive" },
];

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Display a single paper result
 */
function PaperCard({
  paper,
  onSelect,
  isSelected,
}: {
  paper: PaperResult;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formatCitation(paper));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg border transition-all cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
      onClick={onSelect}
    >
      {/* Header with relevance badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm leading-tight flex-1">{paper.title}</h4>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-xs", getRelevanceColor(paper.relevanceScore))}
        >
          {getRelevanceLabel(paper.relevanceScore)}
        </Badge>
      </div>

      {/* Authors and year */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Users className="size-3" />
        <span className="truncate">
          {paper.authors.length > 2 ? `${paper.authors[0]} et al.` : paper.authors.join(", ")}
        </span>
        <Calendar className="size-3 ml-2" />
        <span>{paper.year}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {getPaperAgeCategory(paper.year)}
        </Badge>
      </div>

      {/* Abstract preview */}
      {paper.abstract && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {summarizePaper(paper, 150)}
        </p>
      )}

      {/* Venue and citations */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {paper.venue && <span className="truncate max-w-[200px]">{paper.venue}</span>}
        {paper.citationCount > 0 && (
          <span className="flex items-center gap-1">
            <Quote className="size-3" />
            {paper.citationCount} citations
          </span>
        )}
      </div>

      {/* Relevance rationale */}
      {paper.relevanceRationale && (
        <div className="text-xs bg-muted/50 rounded p-2 mb-3">
          <span className="font-medium">Relevance: </span>
          {paper.relevanceRationale}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {paper.url && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(paper.url, "_blank");
            }}
          >
            <ExternalLink className="size-3 mr-1" />
            View
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
          {copied ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
          {copied ? "Copied" : "Citation"}
        </Button>
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? "Selected" : "Record as Evidence"}
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Suggested searches based on hypothesis
 */
function SuggestedSearchesPanel({
  suggestions,
  onSearch,
}: {
  suggestions: SuggestedSearches;
  onSearch: (query: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4" />
        <span>Suggested searches based on your hypothesis</span>
      </div>

      {/* Primary query */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Primary Search</h4>
        <div
          className="p-3 rounded-lg border border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => onSearch(suggestions.primaryQuery)}
        >
          <div className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <span className="text-sm flex-1 truncate">{suggestions.primaryQuery}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Alternative queries */}
      {suggestions.alternativeQueries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Alternative Searches</h4>
          <div className="space-y-2">
            {suggestions.alternativeQueries.map((query, index) => (
              <div
                key={index}
                className="p-2 rounded border hover:border-primary/50 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSearch(query)}
              >
                <div className="flex items-center gap-2">
                  <Search className="size-3 text-muted-foreground" />
                  <span className="text-xs flex-1 truncate">{query}</span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Key Terms</h4>
        <div className="flex flex-wrap gap-1">
          {suggestions.keywords.slice(0, 10).map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-primary/20"
              onClick={() => onSearch(keyword)}
            >
              {keyword}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * BibTeX import panel
 */
function ImportPanel({
  hypothesis,
  onPaperImported,
}: {
  hypothesis: HypothesisCard;
  onPaperImported: (paper: PaperResult) => void;
}) {
  const [bibtex, setBibtex] = React.useState("");
  const [doi, setDoi] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [importedPaper, setImportedPaper] = React.useState<PaperResult | null>(null);

  const handleBibTeXImport = () => {
    setError(null);
    const entry = parseBibTeX(bibtex);
    if (!entry) {
      setError("Could not parse BibTeX entry. Please check the format.");
      return;
    }
    const paper = bibTeXToPaperResult(entry, hypothesis);
    setImportedPaper(paper);
    onPaperImported(paper);
  };

  const handleDOILookup = () => {
    setError(null);
    const extractedDoi = extractDOI(doi);
    if (!extractedDoi || !isValidDOI(extractedDoi)) {
      setError("Invalid DOI format. Please enter a valid DOI.");
      return;
    }
    // Note: Actual DOI lookup would require an API call
    // For now, create a placeholder paper
    const paper: PaperResult = {
      id: `doi:${extractedDoi}`,
      title: "Paper from DOI lookup",
      authors: [],
      year: new Date().getFullYear(),
      abstract: "",
      citationCount: 0,
      url: doiToUrl(extractedDoi),
      doi: extractedDoi,
      relevanceScore: 0,
    };
    // Calculate relevance
    const { score, rationale } = calculateRelevance(paper, hypothesis);
    paper.relevanceScore = score;
    paper.relevanceRationale = rationale;
    setImportedPaper(paper);
    onPaperImported(paper);
  };

  return (
    <div className="space-y-6">
      {/* BibTeX Import */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4" />
          <h4 className="text-sm font-medium">Import from BibTeX</h4>
        </div>
        <Textarea
          placeholder="Paste BibTeX entry here...

@article{smith2023,
  title = {Example Paper},
  author = {Smith, John},
  year = {2023},
  ...
}"
          value={bibtex}
          onChange={(e) => setBibtex(e.target.value)}
          className="font-mono text-xs h-32"
        />
        <Button onClick={handleBibTeXImport} disabled={!bibtex.trim()}>
          <Import className="size-4 mr-2" />
          Parse BibTeX
        </Button>
      </div>

      {/* DOI Lookup */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4" />
          <h4 className="text-sm font-medium">Lookup by DOI</h4>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="10.1234/example.2023 or https://doi.org/..."
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleDOILookup} disabled={!doi.trim()}>
            <Search className="size-4 mr-2" />
            Lookup
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {/* Imported paper preview */}
      {importedPaper && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Imported Paper</h4>
          <PaperCard paper={importedPaper} onSelect={() => {}} isSelected={false} />
        </div>
      )}
    </div>
  );
}

/**
 * Evidence recording panel
 */
function RecordEvidencePanel({
  recording,
  onUpdate,
  onSubmit,
  onCancel,
}: {
  recording: RecordingState;
  onUpdate: (updates: Partial<RecordingState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const isValid =
    recording.result !== null &&
    recording.keyFinding.trim().length > 0 &&
    recording.interpretation.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4 p-4 border rounded-lg bg-card"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Record as Evidence</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Paper info */}
      <div className="p-3 bg-muted/50 rounded text-sm">
        <div className="font-medium">{recording.paper.title}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {recording.paper.authors.slice(0, 2).join(", ")}
          {recording.paper.authors.length > 2 && " et al."} ({recording.paper.year})
        </div>
      </div>

      {/* Result selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          How does this paper relate to your hypothesis?
        </label>
        <div className="flex flex-wrap gap-2">
          {RESULT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={recording.result === option.value ? "default" : "outline"}
              size="sm"
              className={cn(recording.result === option.value && option.color)}
              onClick={() => onUpdate({ result: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key finding */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Key finding from the paper</label>
        <Textarea
          placeholder="What specific finding from this paper is relevant to your hypothesis?"
          value={recording.keyFinding}
          onChange={(e) => onUpdate({ keyFinding: e.target.value })}
          className="h-20"
        />
      </div>

      {/* Interpretation */}
      <div className="space-y-2">
        <label className="text-sm font-medium">How does this apply to your hypothesis?</label>
        <Textarea
          placeholder="Explain how this evidence affects your belief in the hypothesis..."
          value={recording.interpretation}
          onChange={(e) => onUpdate({ interpretation: e.target.value })}
          className="h-20"
        />
      </div>

      {/* Discriminative power */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Evidence strength</label>
        <div className="flex flex-wrap gap-2">
          {POWER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={recording.discriminativePower === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdate({ discriminativePower: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button onClick={onSubmit} disabled={!isValid} className="w-full">
        <Plus className="size-4 mr-2" />
        Add to Evidence Ledger
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LiteratureSearch - Search for papers and record as evidence
 */
export function LiteratureSearch({
  sessionId,
  hypothesis,
  currentConfidence,
  onRecordEvidence,
  className,
}: LiteratureSearchProps) {
  const [activeTab, setActiveTab] = React.useState<SearchTab>("suggested");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [papers, setPapers] = React.useState<PaperResult[]>([]);
  const [selectedPaper, setSelectedPaper] = React.useState<PaperResult | null>(null);
  const [recording, setRecording] = React.useState<RecordingState | null>(null);

  // Generate suggested searches from hypothesis
  const suggestions = React.useMemo(() => generateSearchQueries(hypothesis), [hypothesis]);

  // Handle search (placeholder - actual search would need API)
  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    // In a real implementation, this would call an API
    // For now, we just set the query
  }, []);

  // Handle paper selection for recording
  const handleSelectPaper = (paper: PaperResult) => {
    if (selectedPaper?.id === paper.id) {
      // Toggle off
      setSelectedPaper(null);
      setRecording(null);
    } else {
      setSelectedPaper(paper);
      setRecording({
        paper,
        result: null,
        keyFinding: "",
        interpretation: "",
        discriminativePower: 3,
      });
    }
  };

  // Handle paper import
  const handlePaperImported = (paper: PaperResult) => {
    setPapers((prev) => [paper, ...prev]);
  };

  // Handle evidence recording
  const handleRecordEvidence = () => {
    if (!recording || !recording.result) return;

    onRecordEvidence?.({
      sessionId,
      hypothesisId: hypothesis.id,
      confidenceBefore: currentConfidence,
      paper: recording.paper,
      result: recording.result,
      keyFinding: recording.keyFinding,
      interpretation: recording.interpretation,
      discriminativePower: recording.discriminativePower,
    });

    // Reset state
    setSelectedPaper(null);
    setRecording(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Literature Search</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Search for relevant papers and record findings as evidence for your hypothesis.
      </p>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggested">
            <Sparkles className="size-4 mr-2" />
            Suggested
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Search className="size-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="import">
            <Import className="size-4 mr-2" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Suggested searches tab */}
        <TabsContent value="suggested" className="mt-4">
          <SuggestedSearchesPanel suggestions={suggestions} onSearch={handleSearch} />
        </TabsContent>

        {/* Manual search tab */}
        <TabsContent value="manual" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Search className="size-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Search info */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <AlertCircle className="size-3 inline mr-1" />
            Literature search requires API integration with Google Scholar, PubMed, or Semantic
            Scholar. For now, use the Import tab to add papers manually via BibTeX or DOI.
          </div>
        </TabsContent>

        {/* Import tab */}
        <TabsContent value="import" className="mt-4">
          <ImportPanel hypothesis={hypothesis} onPaperImported={handlePaperImported} />
        </TabsContent>
      </Tabs>

      {/* Results and recording panel */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Paper list */}
        {papers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Papers ({papers.length})</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onSelect={() => handleSelectPaper(paper)}
                  isSelected={selectedPaper?.id === paper.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recording panel */}
        <AnimatePresence>
          {recording && (
            <RecordEvidencePanel
              recording={recording}
              onUpdate={(updates) =>
                setRecording((prev) => (prev ? { ...prev, ...updates } : null))
              }
              onSubmit={handleRecordEvidence}
              onCancel={() => {
                setSelectedPaper(null);
                setRecording(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {papers.length === 0 && activeTab !== "suggested" && (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No papers yet</p>
          <p className="text-xs mt-1">Use the Import tab to add papers via BibTeX or DOI</p>
        </div>
      )}
    </div>
  );
}
