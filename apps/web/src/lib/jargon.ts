/**
 * Jargon Dictionary
 *
 * Comprehensive glossary system for making technical terms accessible.
 * Covers Brenner operators, scientific methodology, biology, Bayesian reasoning,
 * and project-specific terminology.
 *
 * @example
 * ```typescript
 * import { getJargon, jargonDictionary } from "./jargon";
 *
 * const term = getJargon("level-split");
 * if (term) {
 *   console.log(term.short);  // For tooltips
 *   console.log(term.long);   // For full explanation
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Categories for filtering and organizing glossary terms.
 */
export type JargonCategory =
  | "operators" // Brenner operators (⊘, 𝓛, etc.)
  | "brenner" // Core Brenner concepts
  | "biology" // Scientific/biology terms
  | "bayesian" // Bayesian/statistical terms
  | "method" // Scientific method terms
  | "project"; // BrennerBot-specific terms

/**
 * A single glossary term with progressive disclosure.
 */
export interface JargonTerm {
  /** The display term (e.g., "C. elegans", "Level-split") */
  term: string;

  /** One-line definition for quick tooltips (~100 chars) */
  short: string;

  /** Full explanation in plain English (2-4 sentences) */
  long: string;

  /** "Think of it like..." analogy for non-experts */
  analogy?: string;

  /** Why this term matters in the Brenner context */
  why?: string;

  /** Related term keys for discovery (2-4 terms max) */
  related?: string[];

  /** Category for filtering */
  category: JargonCategory;
}

// ============================================================================
// Dictionary
// ============================================================================

/**
 * The complete jargon dictionary.
 * Keys are lowercase with hyphens (e.g., "c-elegans", "level-split").
 */
export const jargonDictionary: Record<string, JargonTerm> = {
  // -------------------------------------------------------------------------
  // Brenner Operators
  // -------------------------------------------------------------------------
  "level-split": {
    term: "Level-split",
    short: "Decompose a problem into distinct levels of organization (⊘).",
    long: "The operator ⊘ separates a problem into levels (e.g., atoms → molecules → cells → organisms). Each level has its own rules. Confusion arises when you mix levels or try to explain one level purely in terms of another. Distinguish program from interpreter, message from machine, specification from execution.",
    analogy:
      "Separate a building into floors. Plumbing problems on floor 3 don't require knowing every brick in the foundation.",
    why: "Brenner emphasizes that biology operates across multiple levels. Failing to level-split leads to confused explanations. Transcript anchors: §45-46 (Von Neumann insight), §50 (chastity vs impotence), §59 (logic vs machinery), §105 (message vs machine), §147 (proper vs improper simulation), §205 (construction vs performance).",
    related: ["recode", "scale-prison", "object-transpose"],
    category: "operators",
  },
  recode: {
    term: "Recode",
    short: "Change representation to make patterns visible (𝓛).",
    long: "The operator 𝓛 transforms data or problems into a different representation where the answer becomes obvious. What's hidden in one encoding may be obvious in another. Especially powerful: reduce dimensionality from 3D to 1D when possible.",
    analogy:
      "The shift from Roman to Arabic numerals made arithmetic tractable; the shift from chemistry to information theory made the genetic code tractable.",
    why: "Brenner solved the genetic code by recoding the problem from chemistry to information theory. Transcript anchors: §34 (wordplay as alternative interpretations), §58 (dimensional reduction: 'reduction to one dimension... absolute crucial step'), §147 (machine language constraint), §161 (European vs American plan), §175 (junk vs garbage definitional cleanup), §197 (digital/analogue sanity), §205 (gradients vs lineage), §208 (machine language of development).",
    related: ["level-split", "invariant-extract", "digital-handle"],
    category: "operators",
  },
  "invariant-extract": {
    term: "Invariant Extract",
    short: "Find what stays the same across transformations (≡).",
    long: "The operator ≡ identifies properties that remain constant despite changes. These invariants are often the key to understanding a system. Find what survives coarse operations, what must hold regardless of specifics.",
    analogy:
      "Noether's theorem: every symmetry implies a conservation law. Find the symmetries and you find the invariants.",
    why: "Brenner used invariants to identify the essential features of genetic systems that any solution must preserve. Transcript anchors: §66 (scale constraints), §88-89 (phase problem), §100 (dominant-variable rescue: magnesium vs caesium), §109 (topology-level inference), §134 (topological proof of co-linearity), §163 (combinatorial constraints), §178 (feasibility units).",
    related: ["level-split", "recode", "scale-prison"],
    category: "operators",
  },
  "exclusion-test": {
    term: "Exclusion Test",
    short: "Design tests that rule out hypotheses, not confirm them (✂).",
    long: "The operator ✂ focuses on what can be eliminated. A discriminative experiment asks: 'What result would prove this hypothesis wrong?' If you can't answer that, the experiment is impotent. Derive what patterns are forbidden under each hypothesis, then design cheap tests that probe those forbidden patterns.",
    analogy:
      "Sherlock Holmes: 'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.' Exclusion is stronger than confirmation.",
    why: "Brenner insisted on 'potent' experiments that could actually falsify theories, not just add confirming data. Transcript anchors: §69 (overlapping code elimination via forbidden amino-acid pairs), §103 ('Both could be wrong'; the third alternative), §147 ('Exclusion is always a tremendously good thing in science').",
    related: ["potency", "forbidden-pattern", "theory-kill", "potency-check"],
    category: "operators",
  },
  "object-transpose": {
    term: "Object Transpose",
    short: "Switch which entity you're experimenting on (⟂).",
    long: "The operator ⟂ changes what counts as the experimental object. Sometimes the organism isn't what you should vary; it might be the environment, the tool, or the question itself. Treat the Tree of Life as a component library to be raided.",
    analogy:
      "Darwin studied barnacles, not humans, to understand evolution. The right object makes intractable questions tractable.",
    why: "Brenner chose C. elegans specifically because its properties as an object (small, fast, transparent) enabled experiments impossible in other organisms. Transcript anchors: §91 ('choice of the experimental object remains one of the most important things'), §128-129 (C. elegans specification), §145-146 (EM window forcing function), §191 ('kitchen table' genome mapping), §199 ('Somewhere there is the ideal organism'), §221-222 (Fugu as discount genome).",
    related: ["level-split", "scale-prison", "c-elegans"],
    category: "operators",
  },
  amplify: {
    term: "Amplify",
    short: "Enhance weak signals until they become measurable (↑).",
    long: "The operator ↑ uses biological amplification mechanisms (selection, replication, dominance, abundance) to make signals large and robust. Let biology do the work rather than fighting noise with statistics.",
    analogy:
      "PCR amplifies DNA exponentially; genetics amplifies molecular events to organismal phenotypes. Nature provides gain if you know where to find it.",
    why: "Brenner's genetics work required amplifying molecular effects to organism-level phenotypes that could be scored by eye. Transcript anchors: §62 ('genetics is digital; it's all or none... a thousand times, a million times'), §94 (abundance trick: 'single protein accounted for 70% of all protein synthesis'), §138 (abundance dominates background), §154 (selection for rare worm mutants via tracks).",
    related: ["digital-handle", "abundance-trick"],
    category: "operators",
  },
  democratize: {
    term: "Democratize",
    short: "Make expensive techniques cheap and accessible (⇓).",
    long: "The operator ⇓ spreads capability. Technology that only a few labs can do is less valuable than technology any lab can use. Related to DIY: build simple tools that others can replicate.",
    analogy:
      "Negative staining democratized electron microscopy. PCR democratized molecular biology. Cheap methods compound faster than expensive ones.",
    why: "Brenner valued methods that could be adopted by the whole field, not just elite labs with special equipment. Transcript anchor: §86 (negative staining democratizes EM: 'now anybody could do it').",
    related: ["diy", "abundance-trick"],
    category: "operators",
  },
  "exception-quarantine": {
    term: "Exception Quarantine",
    short: "Isolate anomalies so they don't corrupt the main theory (ΔE).",
    long: "The operator ΔE acknowledges that some observations don't fit current theory, but rather than abandoning the theory, you quarantine the exceptions for later investigation. Preserve a high-coherence core model while isolating anomalies; put them in an appendix and resolve them later.",
    analogy:
      "Mendeleev left gaps in the periodic table for undiscovered elements. Quarantine the anomalies; let the pattern stand.",
    why: "Brenner understood that exceptions often reveal deeper truths, but only after the main theory is solid enough to define what counts as exceptional. Transcript anchors: §57 ('Don't Worry hypothesis'), §106, §229 (Occam's broom: 'minimize swept-under-the-carpet facts'), §110 ('we didn't conceal them; we put them in an appendix'), §111 ('house of cards... all or nothing theory').",
    related: ["forbidden-pattern", "exclusion-test", "occams-broom"],
    category: "operators",
  },
  dephase: {
    term: "Dephase",
    short: "Move out of phase with fashion to find open territory (∿).",
    long: "The operator ∿ means working half a wavelength ahead or behind the crowd. Avoid crowded priors and industrialized midgames. The 'opening game' has tremendous freedom of choice.",
    analogy:
      "Brenner entered molecular biology before it was a field. By the time crowds arrived, he had moved on to neuroscience.",
    why: "Brenner warns against fighting crowded competitions. Transcript anchors: §143 ('the best thing in science is to work out of phase'), §192 ('opening game... tremendous freedom of choice'), §210 (heroic → classical transition).",
    related: ["productive-ignorance", "paradox-hunt", "cross-domain-import"],
    category: "operators",
  },
  unentrain: {
    term: "Unentrain",
    short: "Deliberately ignore conventional wisdom to see fresh (⊙).",
    long: "The operator ⊙ involves productive ignorance: not knowing the 'standard' approach lets you see possibilities experts miss. The best people to push a science forward often come from outside it.",
    analogy:
      "Feynman solved physics problems by inventing his own notation. Fresh formalism reveals hidden structure.",
    why: "Brenner's outsider status gave him advantages. Transcript anchors: §63 ('spreading ignorance rather than knowledge'), §65 ('Don't equip yourself'), §157 ('the émigrés are always the best people'), §192 ('strong believer in the value of ignorance').",
    related: ["dephase", "productive-ignorance", "cross-domain-import"],
    category: "operators",
  },
  "cross-domain-import": {
    term: "Cross-Domain Import",
    short: "Borrow techniques or concepts from other fields (⊕).",
    long: "The operator ⊕ transfers ideas across disciplinary boundaries. Solutions in one field may already exist in another. Import patterns from unrelated fields; maintain 'fresh eyes' by resisting expert entrainment.",
    analogy:
      "Shannon imported Boolean algebra into circuit design. Brenner imported information theory into genetics. The borrowed tool often works better than the native one.",
    why: "Brenner imported information theory from engineering to crack the genetic code. Transcript anchors: §86 (cross-domain pattern: syphilis staining → negative staining), §200 (paper triage to protect bandwidth), §230 (move fields while carrying invariants).",
    related: ["recode", "level-split", "unentrain", "productive-ignorance"],
    category: "operators",
  },
  "paradox-hunt": {
    term: "Paradox Hunt",
    short: "Actively seek contradictions; they mark discovery zones (◊).",
    long: "The operator ◊ treats paradoxes as valuable. Where your theory predicts one thing and reality shows another, there's something important to learn. Paradox is not a nuisance; it's a beacon pointing to missing production rules.",
    analogy:
      "The UV catastrophe led to quantum mechanics. The perihelion of Mercury led to general relativity. Paradoxes are not bugs but features.",
    why: "Brenner actively sought paradoxes. Transcript anchors: §95 (paradox of prodigious synthesis rate → led to messenger RNA discovery), §106 ('how can these two things exist and not be explained').",
    related: ["forbidden-pattern", "exception-quarantine"],
    category: "operators",
  },
  "theory-kill": {
    term: "Theory Kill",
    short: "Deliberately attempt to destroy your own hypothesis (†).",
    long: "The operator † requires trying to falsify your own ideas before publishing. If you can't kill your theory, maybe it's true. If you can, better to find out now. Don't fall in love with theories.",
    analogy:
      "Feynman: 'The first principle is that you must not fool yourself, and you are the easiest person to fool.' Kill your darlings.",
    why: "Brenner's harsh self-criticism prevented him from publishing weak ideas. Transcript anchor: §229 ('When they go ugly, kill them. Get rid of them').",
    related: ["exclusion-test", "potency", "forbidden-pattern"],
    category: "operators",
  },
  materialize: {
    term: "Materialize",
    short: "Turn abstract theory into concrete, testable predictions (⌂).",
    long: "The operator ⌂ grounds speculation in reality. A theory that can't be materialized into experiments isn't science; it's philosophy. Ask: 'If this were true, what would I see?'",
    analogy:
      "Einstein's equivalence principle predicted gravitational light bending. Materialize the abstraction into a measurable prediction.",
    why: "Brenner despised armchair theorizing. Transcript anchors: §42 ('Let the imagination go... but... direct it by experiment'), §66 ('Materialise the question').",
    related: ["scale-prison", "potency", "quickie"],
    category: "operators",
  },
  diy: {
    term: "DIY",
    short: "Build your own tools when commercial ones don't exist (🔧).",
    long: "The operator 🔧 means building custom equipment or methods. Sometimes the right tool doesn't exist, so you make it. Don't let missing tools define your pace.",
    analogy:
      "Galileo ground his own lenses. Brenner built his own ultracentrifuge components. The tool is part of the discovery.",
    why: "Brenner and colleagues built custom equipment. Transcript anchors: §23 (build Warburg manometer), §37, §41 (heliostat), §51 ('This is something you can always do... open to you'), §86 (negative staining democratizes EM).",
    related: ["democratize", "abundance-trick"],
    category: "operators",
  },
  "scale-prison": {
    term: "Scale Prison",
    short: "Physics constrains what's possible at each size (⊞).",
    long: "The operator ⊞ reminds us that scale matters. Diffusion, surface area, heat: everything changes with size. What works at one scale may be impossible at another. Calculate actual numbers.",
    analogy:
      "A flea can jump 100x its body length; a human cannot. Reynolds number determines whether viscosity or inertia dominates. Scale changes the rules.",
    why: "Brenner emphasized that biological imagination must be 'imprisoned by physics'. Transcript anchor: §66 ('get the scale of everything right... the DNA in a bacterium is 1mm long... folded up a thousand times').",
    related: ["level-split", "materialize", "invariant-extract"],
    category: "operators",
  },

  // -------------------------------------------------------------------------
  // Derived Operators (compositions of core operators)
  // -------------------------------------------------------------------------
  quickie: {
    term: "Quickie",
    short: "Run a cheap pilot test to de-risk before committing to the full experiment (⚡).",
    long: "The operator ⚡ asks: before investing months in the flagship experiment, can you run a cheap pilot that would kill the key alternative? De-risk before committing major resources.",
    analogy:
      "Check whether the restaurant is open before driving across town. The cost of a phone call is negligible compared to the cost of a wasted trip.",
    why: "Brenner valued efficiency: why commit months of work when a quick test could rule out the hypothesis? Transcript anchor: §99 ('I'll do a quickie').",
    related: ["materialize", "exclusion-test", "potency"],
    category: "operators",
  },
  hal: {
    term: "HAL",
    short: "Have A Look: directly observe before elaborate inference (👁).",
    long: "The operator 👁 (HAL = Have A Look) says: before doing complex analysis, consider if you could just look. Each link in an inference chain has error probability; direct observation is often faster.",
    analogy:
      "Open the box instead of weighing it, shaking it, and running statistical tests on the sounds. Direct observation trumps indirect inference.",
    why: "Brenner preferred direct observation over elaborate inference when possible. Transcript anchor: §198 ('I had invented something called HAL biology. HAL... stood for Have A Look biology').",
    related: ["materialize", "amplify", "quickie"],
    category: "operators",
  },
  "potency-check": {
    term: "Potency Check",
    short: "Verify your intervention actually worked before trusting results (🎭).",
    long: "The operator 🎭 distinguishes 'won't' from 'can't'. Before concluding a hypothesis is wrong based on a negative result, verify that your intervention actually worked. Chaste vs impotent.",
    analogy:
      "Check whether the light switch is connected before concluding the bulb is burned out. Negative results require positive controls.",
    why: "Brenner emphasized that negative results only mean something if you've verified the positive control. Transcript anchor: §50 (chastity vs impotence: same outcome, different reasons).",
    related: ["exclusion-test", "potency", "decision-experiment"],
    category: "operators",
  },

  // -------------------------------------------------------------------------
  // Core Brenner Concepts
  // -------------------------------------------------------------------------
  "brenner-move": {
    term: "Brenner Move",
    short: "A strategic intervention that transforms a stuck problem into a tractable one.",
    long: "A Brenner move isn't just clever; it reframes the entire problem space so that what was intractable becomes solvable. It often involves changing levels, representations, or experimental objects.",
    why: "The goal of BrennerBot is to help researchers recognize and execute these moves.",
    related: ["level-split", "recode", "object-transpose"],
    category: "brenner",
  },
  "decision-experiment": {
    term: "Decision Experiment",
    short: "An experiment whose result forces a choice between hypotheses.",
    long: "A decision experiment is designed to discriminate: it produces different results depending on which hypothesis is true. Impotent experiments confirm everything; decision experiments decide.",
    analogy:
      "A fork in the road where the signs point clearly in different directions. Each outcome rules something out.",
    why: "Brenner insisted experiments should make decisions, not just collect data.",
    related: ["potency", "exclusion-test", "forbidden-pattern"],
    category: "brenner",
  },
  "digital-handle": {
    term: "Digital Handle",
    short: "Discrete, countable markers that make a system tractable.",
    long: "Genetics provides digital handles: mutations, genes, markers that turn continuous biology into discrete problems. Without digital handles, you're measuring gradients; with them, you can count.",
    analogy:
      "Serial numbers let you track individual items instead of measuring bulk properties. Discrete beats continuous for experimental tractability.",
    why: "Brenner's choice of genetics over biochemistry was partly because genetics gave digital handles to molecular problems.",
    related: ["amplify", "recode", "abundance-trick"],
    category: "brenner",
  },
  potency: {
    term: "Potency",
    short: "An experiment's power to discriminate between hypotheses.",
    long: "Potency measures whether an experiment can actually distinguish between competing ideas. A potent experiment has results that would differ depending on which hypothesis is correct. An impotent experiment gives the same result no matter what's true.",
    analogy:
      "Asking someone's name discriminates identity; asking if they're human does not. Design for discrimination.",
    why: "Brenner repeatedly criticized 'impotent' experiments that couldn't falsify anything.",
    related: ["decision-experiment", "exclusion-test", "theory-kill"],
    category: "brenner",
  },
  "productive-ignorance": {
    term: "Productive Ignorance",
    short: "Not knowing the standard approach lets you see alternatives.",
    long: "Productive ignorance is the advantage of not being trained in a field's conventions. Experts often can't see past their assumptions; outsiders ask naive questions that reveal hidden possibilities.",
    why: "Brenner credited some of his best insights to entering fields as an outsider.",
    related: ["unentrain", "dephase"],
    category: "brenner",
  },
  "forbidden-pattern": {
    term: "Forbidden Pattern",
    short: "Results that your theory says cannot occur.",
    long: "A forbidden pattern is what a theory rules out. If you observe a forbidden pattern, the theory is wrong. Good theories make bold forbidden predictions; weak theories forbid nothing.",
    analogy:
      "A vegetarian eating meat falsifies the claim. Theories gain power from what they forbid, not from what they allow.",
    why: "Brenner designed experiments around what should be impossible, not just what should happen.",
    related: ["exclusion-test", "potency", "theory-kill"],
    category: "brenner",
  },
  "representation-change": {
    term: "Representation Change",
    short: "Restate the problem in a domain where constraints are clearer.",
    long: "A representation change transforms a problem from one language or framework to another where the solution becomes more tractable. What's hard in chemistry might be obvious in information theory; what's confusing in 3D might be simple in 1D.",
    analogy:
      "Rotating a 3D object reveals its shadow; some projections reveal structure, others hide it. Choose the right representation.",
    why: "Brenner's shift from thinking about the genetic code as chemistry to thinking about it as information was a pivotal representation change.",
    related: ["recode", "level-split", "brenner-move"],
    category: "brenner",
  },
  "assumption-ledger": {
    term: "Assumption Ledger",
    short: "Explicit list of load-bearing assumptions and what would break them.",
    long: "An assumption ledger makes hidden premises visible. Every theory rests on assumptions, some explicit, most implicit. Listing them and identifying tests that would break each one turns vague theories into falsifiable claims.",
    analogy:
      "An engineering stress test identifies which joints are load-bearing and at what weight they fail. Know your theory's failure modes.",
    why: "Brenner insisted on surfacing assumptions that are usually hidden inside theoretical frameworks.",
    related: ["forbidden-pattern", "theory-kill", "potency"],
    category: "brenner",
  },
  "third-alternative": {
    term: "Third Alternative",
    short: "The 'both models are wrong' escape from false dichotomies.",
    long: "The third alternative reminds us that when two theories compete, we shouldn't assume one must be right. Often both are wrong, or the question itself is malformed. The real answer may require reframing the problem entirely.",
    analogy:
      "'Is light a wave or a particle?' The third alternative: the question assumes classical categories that don't apply.",
    why: "Brenner repeatedly warned against false dichotomies and premature theory commitment.",
    related: ["decision-experiment", "representation-change", "productive-ignorance"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Biology Terms
  // -------------------------------------------------------------------------
  "c-elegans": {
    term: "C. elegans",
    short:
      "A tiny transparent worm (~1mm) that became a model organism for genetics and neuroscience.",
    long: "Caenorhabditis elegans is a nematode with exactly 959 somatic cells (302 neurons). Its transparency, fast reproduction (3 days), and simple nervous system made it ideal for Brenner's developmental genetics work.",
    why: "Brenner chose this organism because its properties matched the experiments he wanted to do, an example of object-transpose thinking.",
    related: ["object-transpose", "model-organism", "scale-prison"],
    category: "biology",
  },
  "model-organism": {
    term: "Model Organism",
    short: "A species chosen for study because its properties make experiments tractable.",
    long: "Model organisms (E. coli, yeast, flies, worms, mice) are chosen not because they're interesting in themselves, but because they enable experiments impossible in other species. The choice of model is itself a research decision.",
    analogy:
      "You don't need the tallest mountain to study climbing, you need one that's accessible. The right model organism makes intractable problems tractable.",
    why: "Brenner's choice of C. elegans was strategic: the organism's properties determined what experiments became possible.",
    related: ["c-elegans", "object-transpose"],
    category: "biology",
  },
  "genetic-code": {
    term: "Genetic Code",
    short: "The mapping from DNA triplets (codons) to amino acids.",
    long: "The genetic code translates 64 possible three-letter DNA words into 20 amino acids (plus stop signals). Brenner helped prove that the code uses non-overlapping triplets and identify the reading frame.",
    why: "Cracking the genetic code was Brenner's first major achievement, done through clever genetics rather than sequencing.",
    related: ["recode", "digital-handle", "mrna"],
    category: "biology",
  },
  mrna: {
    term: "mRNA",
    short:
      "Messenger RNA: the intermediate that carries genetic information from DNA to ribosomes.",
    long: "mRNA (messenger RNA) is copied from DNA and carries instructions to ribosomes for protein synthesis. Brenner co-discovered mRNA, proving that genetic information flows through an unstable intermediate.",
    why: "The mRNA discovery was a key piece in understanding how cells express genetic information.",
    related: ["genetic-code", "ribosome"],
    category: "biology",
  },
  ribosome: {
    term: "Ribosome",
    short: "The cellular machine that reads mRNA and builds proteins.",
    long: "Ribosomes are molecular machines made of RNA and protein that translate mRNA into protein. They read the genetic code three letters at a time and assemble amino acids into chains.",
    related: ["mrna", "genetic-code"],
    category: "biology",
  },
  phenotype: {
    term: "Phenotype",
    short: "The observable characteristics of an organism.",
    long: "A phenotype is what you can see or measure: behavior, color, size, disease. Genetics works by linking phenotypes to genotypes (DNA sequences). Brenner chose C. elegans partly because behavioral phenotypes were easy to score.",
    analogy: "Symptoms versus underlying cause. Phenotype is the readout; genotype is the program.",
    related: ["genotype", "digital-handle"],
    category: "biology",
  },
  genotype: {
    term: "Genotype",
    short: "The genetic makeup (DNA sequence) of an organism.",
    long: "A genotype is the DNA sequence information, what's actually encoded in the genes. Connecting genotype to phenotype is the central problem of genetics.",
    related: ["phenotype", "genetic-code"],
    category: "biology",
  },
  mutagenesis: {
    term: "Mutagenesis",
    short: "Deliberately inducing mutations to study gene function.",
    long: "Mutagenesis uses chemicals, radiation, or other methods to create random mutations. By studying what breaks when genes are mutated, geneticists infer what those genes normally do.",
    analogy:
      "Understand a machine by breaking parts and seeing what stops working. Genetics as reverse engineering.",
    why: "Brenner used mutagenesis extensively in C. elegans to map the genes controlling development and behavior.",
    related: ["phenotype", "genetic-code", "c-elegans"],
    category: "biology",
  },
  allele: {
    term: "Allele",
    short: "A particular version of a gene at a specific position in the genome.",
    long: "Alleles are alternative forms of the same gene. Most genes have a 'wild-type' (normal) allele and various mutant alleles. An organism can be homozygous (two identical alleles) or heterozygous (two different alleles).",
    analogy: "Different editions of the same book: same story, different typos or corrections.",
    related: ["gene", "wild-type", "homozygous", "heterozygous"],
    category: "biology",
  },
  gene: {
    term: "Gene",
    short: "A segment of DNA that encodes a functional product (usually a protein).",
    long: "Genes are the fundamental units of heredity. Each gene contains instructions for making one or more proteins. Mutations in genes alter protein function, producing phenotypic changes that geneticists can study.",
    analogy: "A recipe in a cookbook. DNA is the cookbook, genes are individual recipes.",
    related: ["allele", "genetic-code", "phenotype", "genotype"],
    category: "biology",
  },
  dna: {
    term: "DNA",
    short: "Deoxyribonucleic acid: the molecule that stores genetic information.",
    long: "DNA is a double-helix molecule made of four nucleotide bases (A, T, G, C). The sequence of bases encodes all genetic information. DNA is transcribed to RNA and ultimately translated into proteins.",
    why: "Brenner's work helped establish that DNA's sequence (not its chemistry) carries the genetic message.",
    related: ["rna", "genetic-code", "gene"],
    category: "biology",
  },
  rna: {
    term: "RNA",
    short:
      "Ribonucleic acid: single-stranded molecule that carries and implements genetic information.",
    long: "RNA comes in several forms: mRNA carries genetic messages, tRNA brings amino acids to ribosomes, rRNA forms the ribosome structure. RNA is the intermediary between DNA and proteins.",
    related: ["dna", "mrna", "ribosome"],
    category: "biology",
  },
  codon: {
    term: "Codon",
    short: "A three-nucleotide sequence that specifies one amino acid.",
    long: "Codons are the 'words' of the genetic code. Each three-letter combination (like AUG or GCA) corresponds to a specific amino acid or stop signal. Brenner helped prove the code uses non-overlapping triplets.",
    why: "Brenner's genetic code work established that codons are read sequentially without overlap.",
    related: ["genetic-code", "amino-acid", "mrna"],
    category: "biology",
  },
  "amino-acid": {
    term: "Amino Acid",
    short: "The building blocks of proteins: 20 standard types coded by DNA.",
    long: "Amino acids are linked together to form proteins. The sequence of amino acids determines the protein's 3D structure and function. The genetic code maps 64 codons to 20 amino acids plus stop signals.",
    related: ["codon", "genetic-code", "protein"],
    category: "biology",
  },
  protein: {
    term: "Protein",
    short: "A molecular machine made of amino acids that performs cellular functions.",
    long: "Proteins are chains of amino acids folded into specific 3D shapes. They catalyze reactions (enzymes), provide structure, transport molecules, and send signals. Most genes encode proteins.",
    analogy:
      "The amino acid sequence is blueprint; the folded protein is the working machine. Sequence determines function through structure.",
    related: ["amino-acid", "gene", "ribosome"],
    category: "biology",
  },
  transcription: {
    term: "Transcription",
    short: "The process of copying DNA into RNA.",
    long: "Transcription is the first step of gene expression. An enzyme (RNA polymerase) reads DNA and produces a complementary RNA strand. This RNA is then processed and translated into protein.",
    related: ["dna", "rna", "mrna", "translation"],
    category: "biology",
  },
  translation: {
    term: "Translation",
    short: "The process of reading mRNA to build proteins at the ribosome.",
    long: "Translation is the second step of gene expression. Ribosomes read mRNA codons and link corresponding amino acids into a protein chain. Transfer RNAs (tRNAs) bring amino acids to the ribosome.",
    related: ["transcription", "mrna", "ribosome", "codon"],
    category: "biology",
  },
  mutation: {
    term: "Mutation",
    short: "A change in DNA sequence that may alter gene function.",
    long: "Mutations can be insertions, deletions, or substitutions of nucleotides. Some mutations are harmless, others cause loss or gain of function. Forward genetics uses mutations to understand gene function.",
    analogy:
      "A typo in code: some are silent, others crash the program, a few accidentally improve it. Context determines consequence.",
    related: ["mutagenesis", "allele", "phenotype"],
    category: "biology",
  },
  "wild-type": {
    term: "Wild-type",
    short: "The normal, non-mutant version of an organism or gene.",
    long: "Wild-type refers to the standard reference strain or allele. In C. elegans, the N2 Bristol strain is wild-type. Mutant phenotypes are described as deviations from wild-type.",
    related: ["mutation", "allele", "c-elegans"],
    category: "biology",
  },
  homozygous: {
    term: "Homozygous",
    short: "Having two identical alleles of a gene.",
    long: "A homozygous organism has inherited the same allele from both parents. Homozygotes express the allele's phenotype directly, making them useful for genetic analysis.",
    related: ["heterozygous", "allele", "genotype"],
    category: "biology",
  },
  heterozygous: {
    term: "Heterozygous",
    short: "Having two different alleles of a gene.",
    long: "A heterozygous organism carries one copy each of two different alleles. The phenotype depends on whether alleles are dominant or recessive. Heterozygotes reveal genetic dominance relationships.",
    related: ["homozygous", "dominant", "recessive", "allele"],
    category: "biology",
  },
  dominant: {
    term: "Dominant",
    short: "An allele whose phenotype shows even when heterozygous.",
    long: "A dominant allele produces its phenotype whether there's one copy or two. Dominant mutations often represent gain-of-function or interference with normal protein.",
    analogy:
      "One broken copy poisons the whole system. Gain-of-function or dominant-negative interference.",
    related: ["recessive", "heterozygous", "allele"],
    category: "biology",
  },
  recessive: {
    term: "Recessive",
    short: "An allele whose phenotype only shows when homozygous.",
    long: "A recessive allele is masked by a dominant allele in heterozygotes. Recessive mutations typically represent loss-of-function: both copies must be non-functional to show the phenotype.",
    analogy:
      "One working copy suffices. Both must fail before the system breaks. Classic loss-of-function pattern.",
    related: ["dominant", "homozygous", "allele"],
    category: "biology",
  },
  "cell-lineage": {
    term: "Cell Lineage",
    short: "The complete ancestral history of a cell, tracing back to the fertilized egg.",
    long: "Cell lineage maps show which cells divide to produce which daughter cells throughout development. In C. elegans, the entire lineage of all 959 cells is known, a major achievement enabled by the worm's transparency.",
    why: "Brenner chose C. elegans partly because its invariant cell lineage made developmental genetics tractable.",
    related: ["c-elegans", "apoptosis", "neuron"],
    category: "biology",
  },
  apoptosis: {
    term: "Apoptosis",
    short: "Programmed cell death: cells that deliberately kill themselves.",
    long: "Apoptosis is controlled suicide of cells. In C. elegans, exactly 131 cells die during development. The genes controlling apoptosis (ced genes) were discovered in C. elegans and are conserved in humans.",
    why: "The C. elegans apoptosis pathway (ced-3, ced-4, ced-9) became a model for understanding human programmed cell death.",
    related: ["cell-lineage", "c-elegans"],
    category: "biology",
  },
  neuron: {
    term: "Neuron",
    short: "A nerve cell specialized for transmitting electrical and chemical signals.",
    long: "Neurons process and transmit information through electrical signals and chemical neurotransmitters. C. elegans has exactly 302 neurons, and their complete wiring diagram (connectome) is mapped.",
    why: "Brenner chose C. elegans partly to understand the genetic basis of behavior through its simple nervous system.",
    related: ["synapse", "c-elegans", "connectome"],
    category: "biology",
  },
  synapse: {
    term: "Synapse",
    short: "A junction where neurons communicate with each other or with muscles.",
    long: "Synapses are the connection points between neurons. Signals cross synapses via chemical neurotransmitters or (rarely) direct electrical coupling. C. elegans has about 7,000 synapses.",
    related: ["neuron", "c-elegans"],
    category: "biology",
  },
  connectome: {
    term: "Connectome",
    short: "The complete wiring diagram of all neural connections in a nervous system.",
    long: "A connectome maps every neuron and every synapse in a brain. C. elegans was the first organism with a complete connectome (mapped from electron microscopy in the 1980s by White, Brenner, and colleagues).",
    why: "The C. elegans connectome was a landmark achievement, enabling computational models of neural circuits.",
    related: ["neuron", "synapse", "c-elegans"],
    category: "biology",
  },
  hermaphrodite: {
    term: "Hermaphrodite",
    short: "An organism with both male and female reproductive organs.",
    long: "C. elegans hermaphrodites can self-fertilize, producing genetically identical offspring. This makes genetics simpler: you can maintain pure genetic lines without crossing. Males exist but are rare (0.1%).",
    why: "Self-fertilization was key to Brenner's choice of C. elegans. It simplified maintaining and crossing genetic strains.",
    related: ["c-elegans", "wild-type"],
    category: "biology",
  },
  ems: {
    term: "EMS",
    short: "Ethyl methanesulfonate: a chemical mutagen widely used in genetics.",
    long: "EMS causes point mutations by modifying guanine bases. It's the workhorse mutagen for forward genetic screens because it produces many single-nucleotide changes distributed across the genome.",
    why: "Brenner used EMS mutagenesis to create the first C. elegans mutant collection, enabling genetic dissection of development and behavior.",
    related: ["mutagenesis", "mutation", "c-elegans"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Bayesian / Statistical Terms
  // -------------------------------------------------------------------------
  prior: {
    term: "Prior",
    short: "Your beliefs about a hypothesis before seeing new evidence.",
    long: "In Bayesian reasoning, the prior represents what you believed before the experiment. It gets updated by evidence to produce the posterior (your new belief).",
    analogy:
      "The starting point of inference. Your prior encodes everything you knew before the current experiment.",
    related: ["posterior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  posterior: {
    term: "Posterior",
    short: "Your updated beliefs after seeing new evidence.",
    long: "The posterior is what you believe after incorporating new evidence. It combines your prior beliefs with the likelihood of the evidence under each hypothesis.",
    analogy:
      "The endpoint of inference. Prior × likelihood ratio = posterior odds. Learning is updating.",
    related: ["prior", "likelihood-ratio", "bayesian-update"],
    category: "bayesian",
  },
  "likelihood-ratio": {
    term: "Likelihood Ratio",
    short: "How much more likely the evidence is under one hypothesis versus another.",
    long: "The likelihood ratio compares P(evidence|H1) to P(evidence|H2). A ratio of 10 means the evidence is 10x more likely if H1 is true. This is the discriminative power of an experiment.",
    why: "Brenner's 'potent' experiments have high likelihood ratios: they strongly favor one hypothesis over another.",
    related: ["potency", "decision-experiment", "bayesian-update"],
    category: "bayesian",
  },
  "bayesian-update": {
    term: "Bayesian Update",
    short: "Revising beliefs by combining prior probability with new evidence.",
    long: "Bayesian updating multiplies your prior odds by the likelihood ratio to get posterior odds. It's the mathematically correct way to learn from evidence.",
    analogy:
      "Prior odds × likelihood ratio = posterior odds. The multiplication rule of rational belief revision.",
    related: ["prior", "posterior", "likelihood-ratio"],
    category: "bayesian",
  },
  "kl-divergence": {
    term: "KL Divergence",
    short: "Measures how different two probability distributions are.",
    long: "Kullback-Leibler divergence quantifies the information lost when approximating one distribution with another. It's used to measure how much an experiment could teach you.",
    analogy:
      "The expected surprise when reality follows one distribution but you predicted another. Asymmetric: KL(P||Q) ≠ KL(Q||P).",
    related: ["likelihood-ratio", "prior", "posterior"],
    category: "bayesian",
  },
  odds: {
    term: "Odds",
    short: "The ratio of probability of an event to probability it doesn't happen.",
    long: "Odds express probability differently: if probability is 75%, odds are 3:1 (three times more likely to happen than not). Bayesian updating is often cleaner using odds than probabilities.",
    analogy:
      "Probability 0.75 = odds 3:1. Odds multiply cleanly under Bayes; probabilities require normalization.",
    related: ["prior", "posterior", "bayesian-update"],
    category: "bayesian",
  },
  "bayes-factor": {
    term: "Bayes Factor",
    short: "A ratio measuring the evidence for one hypothesis versus another.",
    long: "The Bayes factor is the likelihood ratio integrated over parameter uncertainty. A Bayes factor of 10 means the data are 10 times more likely under one hypothesis. It's used for model comparison.",
    why: "Bayes factors quantify 'potency' in statistical terms: how much the data should shift beliefs.",
    related: ["likelihood-ratio", "potency", "decision-experiment"],
    category: "bayesian",
  },
  "base-rate": {
    term: "Base Rate",
    short: "The prior probability of something in a population before specific evidence.",
    long: "The base rate is how common something is overall. Ignoring base rates leads to bad inferences: a positive medical test doesn't mean disease if the disease is rare (base rate neglect).",
    analogy:
      "If 1 in 10,000 have a disease, even a 99% accurate test yields mostly false positives. Base rates dominate.",
    why: "Brenner's emphasis on priors aligns with paying attention to base rates when interpreting experiments.",
    related: ["prior", "posterior", "bayesian-update"],
    category: "bayesian",
  },
  sensitivity: {
    term: "Sensitivity",
    short: "The probability a test correctly detects a condition when present.",
    long: "Sensitivity (true positive rate) measures how often a test correctly identifies positives. High sensitivity means few false negatives. A sensitive test catches most cases but may have false alarms.",
    related: ["specificity", "likelihood-ratio"],
    category: "bayesian",
  },
  specificity: {
    term: "Specificity",
    short: "The probability a test correctly rules out a condition when absent.",
    long: "Specificity (true negative rate) measures how often a test correctly identifies negatives. High specificity means few false positives. A specific test rules out with confidence.",
    analogy:
      "High specificity = few false alarms. When the test says no, believe it. Exclusion with confidence.",
    related: ["sensitivity", "likelihood-ratio"],
    category: "bayesian",
  },
  evidence: {
    term: "Evidence",
    short: "Data or observations that update beliefs about hypotheses.",
    long: "In Bayesian terms, evidence is information that changes the probability of hypotheses. Strong evidence shifts beliefs substantially; weak evidence shifts them little. Evidence strength is measured by likelihood ratios.",
    related: ["likelihood-ratio", "bayesian-update", "posterior"],
    category: "bayesian",
  },
  "information-gain": {
    term: "Information Gain",
    short: "How much an experiment reduces uncertainty about a question.",
    long: "Information gain measures the expected reduction in entropy (uncertainty) from an observation. High information gain experiments are 'potent': they teach you a lot regardless of outcome.",
    why: "Brenner's discriminative experiments maximize information gain by having different predictions under each hypothesis.",
    related: ["kl-divergence", "potency", "decision-experiment"],
    category: "bayesian",
  },
  hypothesis: {
    term: "Hypothesis",
    short: "A proposed explanation for phenomena, to be tested by experiment.",
    long: "A hypothesis is a specific, testable claim about how something works. Good hypotheses make predictions that could be falsified. Experiments arbitrate between competing hypotheses.",
    analogy:
      "A hypothesis is the defendant; evidence is testimony; the experiment is the trial. Verdict: supported or refuted.",
    related: ["falsification", "exclusion-test", "decision-experiment"],
    category: "bayesian",
  },

  // -------------------------------------------------------------------------
  // Scientific Method Terms
  // -------------------------------------------------------------------------
  falsification: {
    term: "Falsification",
    short: "Proving a hypothesis wrong rather than confirming it.",
    long: "Falsification is the Popperian principle that scientific theories should make risky predictions that could prove them false. Confirmation is easy; falsification is informative.",
    why: "Brenner's emphasis on exclusion tests and forbidden patterns is deeply Popperian.",
    related: ["exclusion-test", "theory-kill", "potency"],
    category: "method",
  },
  "null-hypothesis": {
    term: "Null Hypothesis",
    short: "The default assumption that there's no effect or difference.",
    long: "The null hypothesis states that nothing interesting is happening: no treatment effect, no correlation, no difference between groups. Experiments try to reject the null.",
    analogy:
      "Innocent until proven guilty. The burden of proof lies on the alternative hypothesis.",
    related: ["falsification", "potency"],
    category: "method",
  },
  control: {
    term: "Control",
    short: "The baseline condition an experiment compares against.",
    long: "A control group or condition is identical to the experimental condition except for the variable being tested. Without proper controls, you can't attribute results to your manipulation.",
    why: "Brenner emphasized 'chastity controls,' controls that verify your assay actually works.",
    related: ["potency", "null-hypothesis"],
    category: "method",
  },
  replication: {
    term: "Replication",
    short: "Repeating an experiment to verify results are real.",
    long: "Replication means getting the same results when an experiment is repeated. Results that don't replicate are likely spurious: noise, error, or fraud.",
    related: ["control", "null-hypothesis"],
    category: "method",
  },
  paradigm: {
    term: "Paradigm",
    short: "A framework of assumptions, methods, and problems that defines a scientific field.",
    long: "A paradigm (in Kuhn's sense) is the shared worldview of a scientific community. It determines what counts as a good question, valid evidence, and acceptable explanation. Paradigm shifts revolutionize fields.",
    analogy:
      "A lens that makes certain things visible while hiding others. Different paradigms reveal different phenomena.",
    why: "Brenner operated across paradigms (biochemistry, information theory, genetics), importing methods between them.",
    related: ["representation-change", "cross-domain-import"],
    category: "method",
  },
  induction: {
    term: "Induction",
    short: "Generalizing from specific observations to broader principles.",
    long: "Induction moves from particular instances to general rules. Observing many white swans leads to 'all swans are white' (until you see a black one). Induction is fallible but essential for discovery.",
    analogy:
      "Pattern recognition elevated to principle. Powerful but defeasible: one black swan refutes the generalization.",
    related: ["hypothesis", "falsification"],
    category: "method",
  },
  deduction: {
    term: "Deduction",
    short: "Deriving specific conclusions from general principles.",
    long: "Deduction moves from general rules to specific predictions. If all DNA is made of ATGC, then this DNA must be made of ATGC. Deduction is logically certain if premises are true.",
    analogy:
      "If the premises are true, the conclusion must follow. Certainty purchased by assuming the general rule.",
    related: ["hypothesis", "falsification", "induction"],
    category: "method",
  },
  operationalization: {
    term: "Operationalization",
    short: "Defining abstract concepts in terms of measurable procedures.",
    long: "Operationalization turns vague ideas into specific measurements. 'Intelligence' becomes 'IQ test score.' 'Movement defect' becomes 'thrashes per minute.' Without operationalization, experiments are impossible.",
    why: "Brenner's experiments required operationalizing abstract concepts like 'behavior' into scorable phenotypes.",
    related: ["phenotype", "materialize"],
    category: "method",
  },
  "blind-experiment": {
    term: "Blind Experiment",
    short: "A design where the experimenter doesn't know treatment assignments.",
    long: "A blind experiment hides treatment assignment from the experimenter. This prevents unconscious bias in measurement or interpretation.",
    related: ["control", "double-blind"],
    category: "method",
  },
  "double-blind": {
    term: "Double-blind",
    short: "Neither experimenter nor subject knows treatment assignment.",
    long: "Double-blind designs hide treatment assignment from both experimenters and subjects. This prevents both unconscious experimenter bias and placebo effects in subjects.",
    analogy:
      "Neither the taster nor the pourer knows which cup is which. Maximum protection against bias.",
    related: ["blind-experiment", "control"],
    category: "method",
  },
  confound: {
    term: "Confound",
    short: "A hidden variable that varies with treatment and could explain results.",
    long: "A confound is something that changes along with your manipulation, making it impossible to know which caused the effect. Good experimental design eliminates or controls for confounds.",
    analogy:
      "Testing whether exercise improves mood while only studying outdoor exercisers confounds exercise with sunlight exposure. You cannot attribute the effect.",
    why: "Brenner's experimental designs were careful to isolate variables. A confounded experiment is impotent.",
    related: ["control", "replication"],
    category: "method",
  },
  "p-hacking": {
    term: "P-hacking",
    short: "Manipulating analysis until results appear statistically significant.",
    long: "P-hacking includes trying many analyses and only reporting ones that 'work,' optional stopping, or post-hoc hypothesis changes. It inflates false positive rates and undermines science.",
    why: "Brenner's emphasis on designing discriminative experiments upfront is an antidote to p-hacking.",
    related: ["null-hypothesis", "falsification", "replication"],
    category: "method",
  },
  reproducibility: {
    term: "Reproducibility",
    short: "Whether results can be obtained again using the same methods.",
    long: "Reproducibility means another lab can get the same results following your protocol. Irreproducible results are a crisis in science: they may reflect error, fraud, or insufficient detail in methods.",
    related: ["replication", "operationalization"],
    category: "method",
  },
  "forward-genetics": {
    term: "Forward Genetics",
    short: "Starting with a phenotype and working backward to find the gene.",
    long: "Forward genetics screens for mutants with interesting phenotypes, then identifies which genes are affected. This is the classical approach Brenner used in C. elegans.",
    why: "Brenner's C. elegans screens exemplify forward genetics: start with behavior, find mutations, map genes.",
    related: ["mutagenesis", "phenotype", "c-elegans"],
    category: "method",
  },
  "reverse-genetics": {
    term: "Reverse Genetics",
    short: "Starting with a gene and asking what phenotype its mutation causes.",
    long: "Reverse genetics deliberately mutates a known gene and observes the resulting phenotype. This became possible with molecular biology tools and complements forward genetics.",
    related: ["forward-genetics", "genotype", "phenotype"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // Project-Specific Terms
  // -------------------------------------------------------------------------
  "agent-mail": {
    term: "Agent Mail",
    short: "The coordination substrate for multi-agent research sessions.",
    long: "Agent Mail is a messaging system that lets multiple AI agents (Claude, Codex, Gemini) communicate via threads, inbox/outbox, and acknowledgements. It enables durable, auditable collaboration without direct API calls.",
    why: "BrennerBot uses Agent Mail to coordinate research sessions across multiple models.",
    related: ["thread", "kickoff", "artifact"],
    category: "project",
  },
  thread: {
    term: "Thread",
    short: "A conversation stream in Agent Mail identified by a unique ID.",
    long: "A thread groups related messages together. In BrennerBot, the thread ID is the join key across Agent Mail, session artifacts, and beads issues.",
    related: ["agent-mail", "kickoff", "artifact"],
    category: "project",
  },
  kickoff: {
    term: "Kickoff",
    short: "The initial prompt that starts a research session.",
    long: "A kickoff message defines the research question, includes corpus excerpts, sets roles for each agent, and specifies what artifacts to produce. It's composed in the web UI or CLI.",
    related: ["thread", "artifact", "excerpt"],
    category: "project",
  },
  artifact: {
    term: "Artifact",
    short: "A structured output from a research session (hypotheses, tests, etc.).",
    long: "Artifacts are the tangible outputs of research sessions: hypothesis slates, discriminative tests, assumption ledgers. They follow a canonical schema and can be compiled from agent deltas.",
    related: ["thread", "kickoff", "delta"],
    category: "project",
  },
  delta: {
    term: "Delta",
    short: "A structured update to an artifact from an agent.",
    long: "Deltas are mergeable updates that agents produce during research sessions. Multiple deltas from different agents are compiled into the final artifact.",
    related: ["artifact", "thread"],
    category: "project",
  },
  corpus: {
    term: "Corpus",
    short: "The primary source documents in BrennerBot (transcripts + distillations).",
    long: "The corpus includes the complete Sydney Brenner transcript and derived distillations. It's the 'ground truth' that anchors all research sessions.",
    related: ["excerpt", "anchor"],
    category: "project",
  },
  excerpt: {
    term: "Excerpt",
    short: "A curated selection of corpus sections for a kickoff prompt.",
    long: "Excerpts are formatted blocks of transcript quotes with stable §n anchors. They ground research sessions in Brenner's actual words.",
    related: ["corpus", "anchor", "kickoff"],
    category: "project",
  },
  anchor: {
    term: "Anchor",
    short: "A stable reference to a transcript section (§n format).",
    long: "Anchors like §42, §127 provide stable, citable references to specific sections of the Brenner transcript. They don't change when formatting changes.",
    related: ["corpus", "excerpt"],
    category: "project",
  },
  beads: {
    term: "Beads",
    short: "The issue tracking system used in BrennerBot development.",
    long: "Beads (bd command) tracks development issues in a .beads/ directory. Issue IDs like brenner_bot-5so serve as join keys with Agent Mail threads.",
    related: ["thread", "agent-mail"],
    category: "project",
  },
  distillation: {
    term: "Distillation",
    short: "A processed, structured summary derived from the raw corpus.",
    long: "Distillations extract and organize key insights from Brenner's transcript: operator definitions, methodology principles, and thematic summaries. They make the corpus more accessible.",
    related: ["corpus", "excerpt"],
    category: "project",
  },
  "hypothesis-slate": {
    term: "Hypothesis Slate",
    short: "A structured list of competing hypotheses to be evaluated.",
    long: "A hypothesis slate is a core artifact type listing competing explanations for a phenomenon. Each hypothesis includes predictions, testable claims, and links to supporting/contradicting evidence.",
    related: ["artifact", "discriminative-test", "assumption-ledger"],
    category: "project",
  },
  "discriminative-test": {
    term: "Discriminative Test",
    short: "An experiment designed to distinguish between competing hypotheses.",
    long: "A discriminative test is an artifact type describing experiments that would give different results under different hypotheses. It operationalizes Brenner's emphasis on potent experiments.",
    related: ["hypothesis-slate", "artifact", "potency"],
    category: "project",
  },
  session: {
    term: "Session",
    short: "A research interaction between human and AI agents on a specific question.",
    long: "A session is a bounded research conversation that produces artifacts. Sessions start with kickoff prompts, involve multiple agent turns, and end with compiled outputs.",
    related: ["kickoff", "thread", "artifact"],
    category: "project",
  },
  metaprompt: {
    term: "Metaprompt",
    short: "A template that generates specific prompts for different research contexts.",
    long: "Metaprompts are parameterized templates that produce tailored prompts based on corpus excerpts, operator focus, and research questions. They enable consistent, high-quality kickoffs.",
    related: ["kickoff", "session", "excerpt"],
    category: "project",
  },
  "operator-library": {
    term: "Operator Library",
    short: "The collection of Brenner operators defined in the system.",
    long: "The operator library defines the set of cognitive moves Brenner used. Each operator has a symbol, definition, examples, and anti-patterns. It's the core intellectual content of BrennerBot.",
    related: ["level-split", "recode", "exclusion-test"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Additional Brenner Vocabulary
  // -------------------------------------------------------------------------
  "abundance-trick": {
    term: "Abundance Trick",
    short: "Exploit naturally high quantities to avoid purification.",
    long: "The abundance trick uses organisms or systems where your target molecule is already present in large amounts, avoiding costly purification steps. E. coli ribosomes, for instance, are abundant enough to study without enrichment.",
    why: "Brenner and colleagues chose experimental systems partly based on what was naturally abundant.",
    related: ["amplify", "diy", "democratize"],
    category: "brenner",
  },
  "gedanken-organism": {
    term: "Gedanken Organism",
    short: "An imaginary organism designed to think through what's possible.",
    long: "A Gedanken organism is a thought experiment, a hypothetical creature with exactly the properties needed to answer your question. It clarifies what you're really asking.",
    analogy:
      "The physicist's frictionless pulley or spherical cow. Simplify to isolate the essential question.",
    why: "Brenner used Gedanken organisms to reason about what properties an ideal experimental system would need.",
    related: ["object-transpose", "model-organism"],
    category: "brenner",
  },
  "occams-broom": {
    term: "Occam's Broom",
    short: "Sweeping inconvenient facts under the rug.",
    long: "Occam's broom (coined by Sydney Brenner) is the opposite of Occam's razor. Instead of choosing the simplest explanation, people brush aside data that doesn't fit their theory.",
    why: "Brenner warned against this tendency to ignore contradictory evidence.",
    related: ["exception-quarantine", "paradox-hunt"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Alias for quote-bank (hyphenated version)
  // -------------------------------------------------------------------------
  "quote-bank": {
    term: "Quote Bank",
    short: "A curated collection of Brenner quotes organized by theme.",
    long: "The quote bank is a structured collection of excerpts from the Brenner transcript, organized by operator, theme, or principle. It serves as raw material for distillations and provides anchors for claims.",
    related: ["anchor", "excerpt", "corpus"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Additional aliases and missing terms
  // -------------------------------------------------------------------------
  "brenner-loop": {
    term: "Brenner Loop",
    short: "The iterative research cycle: hypothesize, design discriminative test, run, update.",
    long: "The Brenner Loop is the core research methodology: generate competing hypotheses, design experiments that discriminate between them, run the simplest adequate test, and update beliefs based on results. It operationalizes Brenner's emphasis on potent, discriminative experiments.",
    analogy:
      "The scientific method optimized for maximum information gain per experiment. Each iteration should discriminate.",
    why: "BrennerBot sessions follow this loop structure to ensure research stays focused on discriminative tests rather than confirmation-seeking.",
    related: ["discriminative-test", "hypothesis-slate", "potency", "bayesian-update"],
    category: "brenner",
  },
  "brenner-method": {
    term: "Brenner Method",
    short: "Sydney Brenner's approach to scientific research: function before mechanism.",
    long: "The Brenner method prioritizes understanding what a system does (function) before how it does it (mechanism). It emphasizes choosing the right experimental object, designing discriminative tests, and maintaining productive ignorance of conventional approaches.",
    why: "The entire BrennerBot project aims to make this methodology accessible and teachable.",
    related: ["brenner-loop", "object-transpose", "productive-ignorance", "discriminative-test"],
    category: "brenner",
  },
  operators: {
    term: "Operators",
    short: "Reusable cognitive moves for transforming stuck problems into tractable ones.",
    long: "Brenner operators are named patterns of scientific reasoning, such as level-split (⊘), recode (𝓛), and exclusion-test (✂), that can be composed to tackle complex problems. They form the 'operator algebra' of scientific methodology.",
    related: ["level-split", "recode", "exclusion-test", "operator-library"],
    category: "brenner",
  },
  "discriminative-experiment": {
    term: "Discriminative Experiment",
    short: "An experiment designed to distinguish between competing hypotheses.",
    long: "A discriminative experiment gives different results depending on which hypothesis is true. It's the opposite of an 'impotent' experiment that confirms everything. Designing discriminative experiments is the core skill Brenner emphasized.",
    related: ["discriminative-test", "potency", "exclusion-test", "decision-experiment"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Tier 1: Critical Core Concepts
  // -------------------------------------------------------------------------
  "dont-worry-hypothesis": {
    term: "Don't Worry Hypothesis",
    short: "Assume a mechanism exists and proceed; don't block on seeming impossibilities.",
    long: "When a theory has strong evidence but one component 'seems impossible,' assume that component has some solution and proceed. Nature has had billions of years to solve engineering problems. 'Seems impossible' usually means 'I can't currently imagine how.' This lets theory development proceed productively.",
    analogy:
      "Like assuming your package will arrive even though you don't know the exact route the delivery truck takes.",
    why: "Brenner applied this to DNA unwinding (§57), energy in protein synthesis, and repeatedly to avoid blocking on tractable-but-secondary problems. It's 'very important in biology' because it permits productive work despite apparent difficulties.",
    related: ["exception-quarantine", "house-of-cards", "theory-kill", "third-alternative"],
    category: "brenner",
  },
  "generative-grammar": {
    term: "Generative Grammar",
    short: "The discoverable causal rules that produce phenomena, reality's 'source code.'",
    long: "Brenner's first axiom: the world is not merely patterns and correlations but is produced by causal machinery operating according to discoverable rules. Biology is literally computation: DNA is source code, development is execution, mutation is debugging, evolution is version control. Science is reverse-engineering these production rules.",
    analogy:
      "A grammar generates infinite sentences from finite rules. Source code compiles into a running program. Reality has structure, not just pattern.",
    why: "This ontology, learned from Von Neumann's work on self-reproducing automata, underlies Brenner's entire approach. 'The moment I saw the DNA molecule, then I knew it.' Transcript anchors: §23-36 (DNA as information), §126 (gedanken mouse), §147 (proper simulation).",
    related: ["two-axioms", "machine-language", "level-split", "recode"],
    category: "brenner",
  },
  "house-of-cards": {
    term: "House of Cards",
    short: "Theory architecture where all components mutually constrain: all or nothing.",
    long: "Build theories where every prediction depends on others. You can't accept one part and reject the rest. If N independent predictions each have probability p of being true by chance, the whole theory has probability p^N. This makes theories fragile in principle but extremely well-confirmed when they survive testing.",
    analogy:
      "A jigsaw puzzle where every piece interlocks. You can't remove one piece and claim the rest still work.",
    why: "The genetic code theory was 'the real house of cards theory; you had to buy everything... it was all or nothing theory' (§111). Attack any part and the whole falls. This architecture multiplies evidential weight exponentially.",
    related: ["exception-quarantine", "occams-broom", "forbidden-pattern", "assumption-ledger"],
    category: "brenner",
  },
  "chastity-impotence": {
    term: "Chastity vs Impotence",
    short: "Distinguish 'won't happen' (chaste) from 'can't detect' (impotent).",
    long: "Same null result, fundamentally different reasons. A chaste experiment correctly shows an effect doesn't exist. An impotent experiment fails to detect an effect that exists. Before interpreting negative results, verify your intervention actually worked (potency check). The outcome is the same; the reasons are fundamentally different.",
    analogy:
      "'The suspect has an alibi' (chaste, truly innocent) versus 'we couldn't reach the witness' (impotent, uninformative).",
    why: "Brenner's wordplay crystallizes a fundamental experimental distinction (§50). Science must distinguish true negatives from false negatives. Many failed replications are impotent, not chaste.",
    related: ["potency-check", "potency", "exclusion-test", "decision-experiment"],
    category: "brenner",
  },
  "cheap-loop": {
    term: "Cheap Loop",
    short: "Minimize time between hypothesis and test; optimize for iteration speed.",
    long: "Research productivity depends on loop time: how fast you can propose, test, and update. Bureaucracy, expensive equipment, and slow assays are taxes on discrimination. Choose systems where experiments are cheap and fast. The 'quickie' is a cheap loop strategy.",
    analogy:
      "Prefer a whiteboard over a formal proposal process. Speed of iteration beats perfection of planning.",
    why: "Brenner valued arriving at a lab and doing an experiment immediately (§80). 'What was so interesting in those times was you could arrive at a lab and do an experiment.' The quickie (§99) exemplifies cheap loop thinking.",
    related: ["quickie", "hal", "diy", "materialize", "brenner-loop"],
    category: "brenner",
  },
  "two-axioms": {
    term: "Two Axioms",
    short:
      "Brenner's foundational commitments: reality has grammar, understanding = reconstruction.",
    long: "Everything in Brenner's method derives from two axioms. Axiom 1: Reality has a generative grammar, with phenomena produced by causal machinery operating according to discoverable rules. Axiom 2: To understand is to be able to reconstruct; you haven't explained something until you can specify how to build it from primitives (the Gedanken Organism Standard).",
    analogy:
      "Euclid's axioms generate all of geometry. From these two commitments, the entire Brenner method unfolds with logical necessity.",
    why: "These axioms are the generative core from which all Brenner operators and strategies derive. Understand them and the rest follows as corollary.",
    related: ["generative-grammar", "gedanken-organism", "machine-language", "level-split"],
    category: "brenner",
  },
  satisficing: {
    term: "Satisficing",
    short: "Evolution satisfies constraints rather than optimizing: good enough beats best.",
    long: "A key insight from Herbert Simon applied to biology: evolution doesn't find optimal solutions, it finds solutions that satisfy the relevant constraints. 'Function precedes mechanism': what matters is that something works, not that it works optimally. This explains why biological systems often look 'messy' rather than elegant.",
    analogy:
      "Buy the first apartment that meets your requirements rather than viewing every apartment in the city. Evolution is a satisficer, not an optimizer.",
    why: "This axiom liberates thinking from teleological optimization assumptions. Evolution tinkers; it doesn't engineer. Transcript anchors: Part I distillation (Axiom 1 discussion).",
    related: ["two-axioms", "generative-grammar", "gedanken-organism"],
    category: "brenner",
  },
  "imprisoned-imagination": {
    term: "Imprisoned Imagination",
    short: "Constrain theorizing by physical reality: calculate before speculating.",
    long: "Stay 'imprisoned within the physical context of everything.' Before theorizing, get the scale right. The DNA in a bacterium is 1mm long, folded up a thousand times in a 1μ cell. Ribosomes are packed so tightly that messengers thread through them 'like hysterical snakes.' Pictures showing a bacterium with 'a little circle in it' are ridiculous.",
    analogy:
      "An architect must specify actual materials and loads, not just draw pretty pictures. Imagination constrained by physics becomes powerful.",
    why: "This 'imprisonment' is actually liberation: it prevents theorizing that can't possibly work physically. Brenner and Crick 'tried very hard to stay imprisoned within the physical context of everything' (§229).",
    related: ["scale-prison", "materialize", "gedanken-organism"],
    category: "brenner",
  },
  "conversational-science": {
    term: "Conversational Science",
    short: "Thinking out loud as cognitive technology: externalize half-formed ideas.",
    long: "Never restrain yourself; say it, even if it's completely stupid and ridiculous and wrong. Uttering an idea gets it into the open where others can pick up something from it. Ideas are 'at least 50% wrong the first time' they appear. Speaking externalizes thought, enabling self-correction, combinatorial recombination with other minds, and creation of an 'extended cognitive system.'",
    analogy:
      "Pair programming catches errors that solo coding misses. The blackboard discussions weren't social niceties but thinking technology.",
    why: "The 20 years sharing an office with Crick, the Talmudic readings of textbooks aloud, the late nights talking science till 4am were research methods, not recreation. Transcript anchor: §167.",
    related: ["productive-ignorance", "cross-domain-import", "brenner-loop"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Tier 2: Important Methodology Terms
  // -------------------------------------------------------------------------
  "machine-language": {
    term: "Machine Language",
    short: "The primitives a system actually computes with, not metaphors but real operations.",
    long: "Every system computes in its own primitives. For genetics: genes, alleles, recombination events. For development: cells, divisions, recognition proteins. For behavior: neurons, synapses, connection strengths. If your explanation uses vocabulary the system cannot 'execute,' you have made a category error.",
    analogy:
      "Describing what a program does in English is not the same as the actual CPU instructions. Only the instructions are what the machine executes.",
    why: "'The machine language of development is in terms of cells and the recognition proteins they carry... not gradients and not differential equations' (§208). Brenner insisted explanations must be expressible in the system's actual primitives.",
    related: ["level-split", "generative-grammar", "two-axioms", "recode"],
    category: "brenner",
  },
  "negative-staining": {
    term: "Negative Staining",
    short: "A democratizing EM technique discovered via cross-domain pattern recognition.",
    long: "A technique that 'took electron microscopy out of the hands of the elite and gave it to the people.' Instead of staining the object, you surround it with dense stain so it appears light against a dark background. Brenner recognized this from medical training (viewing syphilis spirochetes) and applied it to electron microscopy.",
    analogy:
      "See the shadow, not the object. Illuminate everything around it so the object stands out as an absence.",
    why: "'Now anybody could do it' (§86). This exemplifies the democratize operator: breaking infrastructure monopolies by turning elite craft into cheap, teachable procedures via cross-domain pattern recognition.",
    related: ["democratize", "cross-domain-import", "diy", "cheap-loop"],
    category: "method",
  },
  "opening-game": {
    term: "Opening Game",
    short: "Early research phase with maximum freedom: develop position before committing.",
    long: "The operator ∿ means working half a wavelength ahead or behind the crowd. Avoid crowded priors and industrialized midgames. The 'opening game' has tremendous freedom of choice.",
    analogy:
      "In chess, the opening develops pieces and controls space before launching a specific attack. Research has openings too.",
    why: "'The opening game... tremendous freedom of choice' (§192). Brenner warned against jumping into crowded competitions. Work 'out of phase' with fashion to find open territory.",
    related: ["dephase", "productive-ignorance", "cheap-loop"],
    category: "brenner",
  },
  "co-linearity": {
    term: "Co-linearity",
    short: "The correspondence between gene sequence and protein sequence order.",
    long: "The principle that the order of mutations in a gene corresponds to the order of amino acid changes in its protein. Proving co-linearity was a major goal: it established that genes encode proteins in a simple sequential mapping, not a scrambled or overlapping code.",
    analogy:
      "The order of words in a telegram corresponds to the order in the original message. No scrambling, no codes within codes.",
    why: "'We could give a topological proof of co-linearity; we wouldn't have to do any protein sequencing' (§134). This was a key bridge between genetics and biochemistry, proven by clever genetic logic before sequencing was available.",
    related: ["genetic-code", "reading-frame", "recode", "digital-handle"],
    category: "biology",
  },
  "reading-frame": {
    term: "Reading Frame",
    short: "The triplet grouping that determines how DNA is decoded into protein.",
    long: "DNA is read in non-overlapping triplets (codons), and the 'frame' is which nucleotide you start counting from. Shift the frame by one or two bases and you get a completely different (usually nonsense) protein. The reading frame is a discrete, integer quantity, not continuous.",
    analogy:
      "'THE CAT ATE' versus 'HEC ATA TE': same letters, completely different meaning depending on where you start grouping.",
    why: "Brenner's frameshift experiments (§109) proved the code was triplet and non-overlapping by showing that +1 and -1 frameshifts could cancel out and restore function.",
    related: ["frameshift", "genetic-code", "mutation", "codon"],
    category: "biology",
  },
  frameshift: {
    term: "Frameshift",
    short: "A mutation that shifts the reading frame, scrambling all downstream codons.",
    long: "An insertion or deletion of nucleotides (not multiples of 3) shifts the reading frame, causing all subsequent codons to be misread. The result is usually a completely non-functional protein. Crucially, two frameshifts in opposite directions can cancel out and restore function.",
    analogy:
      "Deleting one space in a sentence makes everything after it gibberish, until you add another space to restore the frame.",
    why: "Frameshift analysis was central to proving the triplet code (§90). Though ultimately superseded by direct methods, it exemplifies the Brenner approach of extracting maximum information from pattern.",
    related: ["reading-frame", "genetic-code", "mutation", "codon"],
    category: "biology",
  },
  "anatomical-dissection": {
    term: "Anatomical Dissection",
    short: "Isolate gross parts first before fine purification: chunk before fractionate.",
    long: "Instead of treating a complex structure as 'a mixture of proteins to go on columns and separate,' first isolate gross anatomical chunks. Make structure legible before investing in 'proper' purification. Brenner could isolate bacteriophage parts by simple pH tricks before others could by column chromatography.",
    analogy:
      "Separate a car into engine, chassis, and body before analyzing individual bolts. Gross structure guides fine analysis.",
    why: "'The whole idea that you could actually isolate chunks as a preliminary was something no one accepted at the time' (§85). This prototype-first approach enabled faster progress with simpler tools.",
    related: ["diy", "cheap-loop", "level-split"],
    category: "method",
  },
  "mutational-spectra": {
    term: "Mutational Spectra",
    short: "Patterns across many mutants that reveal mechanism class and code structure.",
    long: "Use a spectrum (pattern over many mutants) to type causal mechanisms. If a chemical mutagen changes G to A, observing which amino acids change constrains the genetic code. The dream: 'we'd actually decode the protein this way' by correlating mutagen chemistry with amino acid changes.",
    analogy:
      "Use the pattern of errors from a broken typewriter to deduce which key is stuck. The spectrum of mistakes reveals the mechanism.",
    why: "This was an attempt to crack the genetic code through mutagen logic rather than sequencing (§90). Though ultimately superseded by direct methods, it exemplifies the Brenner approach of extracting maximum information from pattern.",
    related: ["genetic-code", "mutation", "forbidden-pattern", "digital-handle"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // Tier 3: Project/UI Terms
  // -------------------------------------------------------------------------
  crosswalk: {
    term: "Crosswalk",
    short: "Comparison table showing how different model distillations map the same concepts.",
    long: "A structured comparison of how Opus 4.5, GPT-5.2, and Gemini 3 each articulate the same underlying Brenner concepts. The crosswalk reveals convergent insights (multiple models independently identify the same pattern) and divergent framings (different models emphasize different aspects).",
    why: "Multi-model consensus is more robust than single-model output. The crosswalk helps identify which insights are model-independent (probably real) versus model-specific (possibly artifacts).",
    related: ["distillation", "corpus", "metaprompt"],
    category: "project",
  },
  transcript: {
    term: "Transcript",
    short: "The raw 236-section Brenner interview: the primary source material.",
    long: "The complete transcript of Sydney Brenner's oral history interviews, organized into 236 numbered sections. This is the authoritative source from which all distillations, operators, and quote-bank entries derive. Section references use the §n format (e.g., §57, §86).",
    why: "Every claim about Brenner's method should be traceable to specific transcript sections. The §n anchors ensure distillations remain grounded in primary evidence rather than drifting into interpretation.",
    related: ["section", "corpus", "anchor", "quote-bank"],
    category: "project",
  },
  section: {
    term: "Section",
    short: "A numbered unit of the Brenner transcript, referenced as §n.",
    long: "The transcript is divided into numbered sections (§1 through §236). Each section typically covers a single topic, story, or methodological point. Section references (§57, §86, §109, etc.) provide precise attribution for Brenner quotes and concepts.",
    analogy:
      "Verse numbers in a sacred text: precise citation and cross-referencing regardless of page layout or edition.",
    why: "Section numbers enable granular references that survive reformatting. When a definition cites '§57,' you can locate the exact passage in the transcript.",
    related: ["transcript", "anchor", "quote-bank"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Molecular Biology: Core Organisms and Systems
  // -------------------------------------------------------------------------
  bacteriophage: {
    term: "Bacteriophage",
    short: "Viruses that infect bacteria; the workhorse of early molecular biology.",
    long: "Bacteriophages (or simply 'phage') are viruses that infect and replicate within bacteria. Their simplicity (just DNA or RNA in a protein coat) and rapid reproduction made them ideal for genetic experiments. The 'Phage Group' centered around Delbrück used them to establish the foundations of molecular biology.",
    analogy:
      "A stripped-down car with only engine and wheels: complex enough to study inheritance, simple enough to understand completely.",
    why: "Brenner's early work on the genetic code, mRNA discovery, and nonsense mutations all used bacteriophage T4. Phage genetics provided the first rigorous framework for molecular analysis. Transcript anchors: §50, §73, §81, §85-86.",
    related: ["phage-group", "genetic-code", "mrna", "nonsense-codon"],
    category: "biology",
  },
  phage: {
    term: "Phage",
    short: "Short for bacteriophage; the model system for early molecular genetics.",
    long: "Phage is the common abbreviation for bacteriophage. T4 phage (which infects E. coli) was central to cracking the genetic code. The phage life cycle takes only 20-30 minutes, enabling rapid genetic experiments impossible with slower-growing organisms.",
    related: ["bacteriophage", "phage-group", "t4-phage"],
    category: "biology",
  },
  "t4-phage": {
    term: "T4 Phage",
    short: "The specific bacteriophage used for genetic code and fine-structure mapping work.",
    long: "Bacteriophage T4 infects E. coli and was the primary experimental system for Benzer's fine-structure mapping and Brenner's genetic code work. Its rII region became the proving ground for understanding gene structure at the molecular level.",
    why: "T4's rII region was where Benzer mapped mutations to single nucleotides and Brenner proved the triplet nature of the code through frameshift analysis.",
    related: ["bacteriophage", "rii-region", "fine-structure-mapping"],
    category: "biology",
  },
  "phage-group": {
    term: "Phage Group",
    short: "The intellectual community around Delbrück that founded molecular biology.",
    long: "The Phage Group was an informal network of scientists centered around Max Delbrück at Cold Spring Harbor and Caltech. They established the conventions, methods, and social norms of molecular biology. Annual phage meetings at Cold Spring Harbor were intellectual crucibles where ideas were rigorously tested.",
    why: "Brenner was 'injected into the whole of modern science' when he joined this community (§67). The Phage Group's culture of open criticism and collaborative competition shaped his scientific style.",
    related: ["bacteriophage", "cold-spring-harbor", "max-delbruck"],
    category: "biology",
  },
  "rna-tie-club": {
    term: "RNA Tie Club",
    short: "Gamow's exclusive club of 20 scientists working on the genetic code.",
    long: "Founded by physicist George Gamow, the RNA Tie Club had exactly 20 members, one for each amino acid. Members received ties and tie pins with their amino acid name. The club circulated informal papers on coding theory. Brenner was 'valine,' Crick was 'tryptophan.'",
    analogy:
      "A secret society for code-breakers, complete with membership tokens and private communications.",
    why: "The club exemplified how the genetic code problem attracted outsiders (physicists like Gamow) and operated at the fringe of established biology. Transcript anchor: §79.",
    related: ["genetic-code", "george-gamow", "cross-domain-import"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Molecular Biology: Genetic Code Concepts
  // -------------------------------------------------------------------------
  "nonsense-codon": {
    term: "Nonsense Codon",
    short: "A triplet that signals 'stop translation' rather than coding for an amino acid.",
    long: "Nonsense codons (UAG/amber, UAA/ochre, UGA/opal) terminate protein synthesis. Mutations that create nonsense codons truncate proteins. The discovery of nonsense suppressors (tRNAs that read through stop codons) was crucial for understanding the code.",
    why: "Brenner's work on amber and ochre mutations (§106-107) was central to understanding how the genetic code works and how it could be manipulated experimentally.",
    related: ["amber-mutation", "suppressor-mutation", "genetic-code", "codon"],
    category: "biology",
  },
  "amber-mutation": {
    term: "Amber Mutation",
    short: "A mutation creating the UAG stop codon, named for its discoverer's translation.",
    long: "Amber mutations create the UAG stop codon, causing premature termination of protein synthesis. The name comes from a pun: discoverer Harris Bernstein's surname means 'amber' in German. Amber suppressors are tRNA mutations that insert an amino acid at UAG instead of stopping.",
    why: "Amber mutations became a fundamental tool for genetic analysis. Brenner and colleagues used them extensively to study gene function. Transcript anchor: §106.",
    related: ["nonsense-codon", "suppressor-mutation", "ochre-mutation"],
    category: "biology",
  },
  "ochre-mutation": {
    term: "Ochre Mutation",
    short: "A mutation creating the UAA stop codon.",
    long: "Ochre mutations create the UAA stop codon. Like amber, ochre mutations truncate proteins and can be suppressed by specific tRNA mutations. The color name continued the amber naming convention.",
    related: ["nonsense-codon", "amber-mutation", "suppressor-mutation"],
    category: "biology",
  },
  "suppressor-mutation": {
    term: "Suppressor Mutation",
    short: "A second mutation that rescues the phenotype caused by a first mutation.",
    long: "Suppressor mutations compensate for other mutations. Nonsense suppressors are mutant tRNAs that read stop codons as amino acids, restoring (partial) protein function. Intragenic suppressors are second mutations in the same gene that restore function.",
    analogy:
      "Two wrongs making a right: the second error compensates for the first, restoring function.",
    why: "Suppressor analysis was a powerful genetic tool. Brenner used frameshift suppressors (+ and - mutations canceling out) to prove the triplet code. Transcript anchor: §106-109.",
    related: ["nonsense-codon", "amber-mutation", "frameshift"],
    category: "biology",
  },
  "conditional-lethal": {
    term: "Conditional Lethal",
    short:
      "A mutation that kills only under specific conditions, enabling study of essential genes.",
    long: "Conditional lethal mutations are lethal under restrictive conditions but viable under permissive conditions. Temperature-sensitive mutants work at low temperature but fail at high temperature. This allows isolation and study of mutations in essential genes that would otherwise be impossible to recover.",
    analogy:
      "A car that runs fine in summer but won't start in winter: the defect exists but only manifests under specific conditions.",
    why: "Conditional lethals revolutionized genetics by making essential genes accessible to mutational analysis. Brenner used them extensively in C. elegans. Transcript anchor: §123.",
    related: ["temperature-sensitive", "mutagenesis", "genetic-screen"],
    category: "biology",
  },
  "rii-region": {
    term: "rII Region",
    short: "The phage T4 genetic region where Benzer mapped mutations to single nucleotides.",
    long: "The rII region of bacteriophage T4 was Seymour Benzer's experimental system for fine-structure genetic mapping. By analyzing recombination between closely spaced mutations, Benzer achieved resolution down to single nucleotides, demonstrating that genes have internal structure.",
    why: "Benzer's rII work ended the classical concept of the indivisible gene and opened molecular genetics. Brenner built on this foundation for his code work. Transcript anchor: §70, §94.",
    related: ["t4-phage", "fine-structure-mapping", "seymour-benzer"],
    category: "biology",
  },
  operon: {
    term: "Operon",
    short: "A cluster of genes transcribed together and regulated as a unit.",
    long: "The operon model (Jacob and Monod) explains how bacteria coordinate expression of related genes. An operon includes structural genes, an operator site, and is controlled by a repressor protein. The lac operon (lactose metabolism) was the paradigm case.",
    why: "The operon concept was developed during the same period as mRNA discovery. Brenner collaborated with Jacob on understanding gene regulation. Transcript anchor: §96-97, §123.",
    related: ["gene", "transcription", "francois-jacob"],
    category: "biology",
  },
  replicon: {
    term: "Replicon",
    short: "A unit of DNA that replicates from a single origin; Brenner's term with Jacob.",
    long: "A replicon is a DNA molecule or segment that replicates as a unit from one origin of replication. Brenner and François Jacob coined this term to describe the fundamental unit of chromosome replication. Bacterial chromosomes are single replicons; eukaryotic chromosomes have multiple replicons.",
    why: "The replicon concept unified thinking about DNA replication across different organisms. Transcript anchor: §121.",
    related: ["dna", "gene", "francois-jacob"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Experimental Methods: Genetic Techniques
  // -------------------------------------------------------------------------
  "fine-structure-mapping": {
    term: "Fine-Structure Mapping",
    short:
      "Benzer's technique for mapping mutations within a gene to single-nucleotide resolution.",
    long: "Fine-structure mapping uses recombination frequencies between closely spaced mutations to order them within a gene. Benzer's work on phage T4 rII achieved resolution limited only by the distance between adjacent nucleotides, proving genes have internal structure.",
    why: "Fine-structure mapping demonstrated that the gene was not indivisible, paving the way for molecular analysis. Brenner used similar logic in his code work. Transcript anchor: §70.",
    related: ["rii-region", "seymour-benzer", "mutation", "recombination"],
    category: "method",
  },
  "saturation-mutagenesis": {
    term: "Saturation Mutagenesis",
    short: "Mutagenize until you've found all genes controlling a phenotype.",
    long: "Saturation mutagenesis involves generating enough mutants to recover mutations in every gene affecting a trait. When new screens yield only alleles of already-known genes, saturation is approached. This systematic approach ensures comprehensive genetic coverage.",
    analogy:
      "Fishing a pond until you stop catching new species. When you only recatch known fish, you've likely found them all.",
    why: "Brenner applied this approach to C. elegans, systematically identifying genes controlling movement, development, and behavior. Transcript anchor: §166.",
    related: ["mutagenesis", "genetic-screen", "allele", "c-elegans"],
    category: "method",
  },
  complementation: {
    term: "Complementation",
    short: "Test whether two mutations affect the same or different genes.",
    long: "Complementation analysis places two recessive mutations in the same cell (in trans). If the phenotype is wild-type, the mutations are in different genes (they complement). If the phenotype is mutant, they are in the same gene (they fail to complement).",
    analogy:
      "If two broken cars can be combined to make one working car, they have different broken parts. If combining them still produces a broken car, they share the same defect.",
    why: "Complementation is the operational definition of a gene. Brenner used it extensively in C. elegans to organize mutations into genes.",
    related: ["allele", "gene", "mutation", "genetic-screen"],
    category: "method",
  },
  epistasis: {
    term: "Epistasis",
    short: "When one gene's phenotype masks another's, revealing pathway order.",
    long: "Epistasis occurs when the phenotype of one mutation overrides another. If gene A is upstream of gene B in a pathway, mutations in A may mask mutations in B. Epistasis analysis reveals the order of gene action in biological pathways.",
    analogy:
      "If breaking the power supply masks whether the light bulb works: power is epistatic to bulb function because it acts upstream.",
    why: "Brenner used epistasis to order genes in developmental and behavioral pathways in C. elegans. Transcript anchor: §172.",
    related: ["genetic-pathway", "gene", "phenotype"],
    category: "method",
  },
  "genetic-pathway": {
    term: "Genetic Pathway",
    short: "The ordered sequence of gene products that execute a biological process.",
    long: "A genetic pathway is determined by epistasis analysis: testing double mutants to see which phenotype dominates. The gene whose phenotype 'wins' acts downstream. This builds an ordered map of gene action from genetics alone, without knowing the biochemistry.",
    why: "Pathway analysis was central to C. elegans genetics. Brenner and colleagues used it to order genes controlling cell fate, apoptosis, and behavior. Transcript anchor: §172.",
    related: ["epistasis", "gene", "phenotype", "c-elegans"],
    category: "method",
  },
  "genetic-screen": {
    term: "Genetic Screen",
    short: "Systematic mutagenesis followed by selection for a phenotype of interest.",
    long: "A genetic screen involves mutagenizing organisms, then selecting or screening for individuals with altered phenotypes. Forward screens find genes by phenotype; saturation screens aim to find all genes affecting a trait. The power comes from systematic, unbiased coverage.",
    why: "Brenner's C. elegans screens for behavioral and developmental mutants exemplify this approach. The mutant collection became a community resource. Transcript anchors: §154, §158, §166.",
    related: ["mutagenesis", "saturation-mutagenesis", "forward-genetics", "c-elegans"],
    category: "method",
  },
  proflavine: {
    term: "Proflavine",
    short: "An acridine dye that causes frameshift mutations by inserting between DNA bases.",
    long: "Proflavine and related acridines intercalate between DNA base pairs, causing insertion or deletion mutations during replication. These frameshift mutations were crucial for proving the triplet nature of the genetic code: +1 and -1 shifts cancel out to restore reading frame.",
    why: "Brenner and colleagues used proflavine-induced frameshifts to prove the code was triplet and non-overlapping. The logic: if adding one base (shifting +1) is rescued by removing one base (shifting -1), the code reads in fixed triplets. Transcript anchor: §90, §106-109.",
    related: ["frameshift", "mutation", "genetic-code", "reading-frame"],
    category: "biology",
  },
  "base-analogue": {
    term: "Base Analogue",
    short: "A chemical mimicking a DNA base that causes point mutations when incorporated.",
    long: "Base analogues like 5-bromouracil resemble normal DNA bases closely enough to be incorporated during replication, but pair differently, causing point mutations. Unlike proflavine (which causes frameshifts), base analogues cause single-nucleotide substitutions.",
    why: "The contrast between base-analogue mutants (point mutations) and proflavine mutants (frameshifts) helped distinguish mutation types and prove the triplet code structure. Transcript anchor: §90.",
    related: ["mutation", "proflavine", "genetic-code"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Experimental Methods: Structural Biology
  // -------------------------------------------------------------------------
  "phase-problem": {
    term: "Phase Problem",
    short:
      "The fundamental obstacle in X-ray crystallography: diffraction loses phase information.",
    long: "X-ray crystallography measures diffraction intensities but not phases. Without phases, you cannot compute electron density maps. The phase problem is computationally intractable by brute force (too many combinations). Solutions include isomorphous replacement and molecular replacement.",
    analogy:
      "Knowing the brightness of each speaker in a room but not when they spoke: you have amplitudes but lost the timing that would let you reconstruct the conversation.",
    why: "Brenner understood the phase problem from Cambridge crystallographers. It exemplifies how some problems require clever tricks rather than brute computation. Transcript anchor: §88-89.",
    related: ["isomorphous-replacement", "invariant-extract"],
    category: "method",
  },
  "isomorphous-replacement": {
    term: "Isomorphous Replacement",
    short: "Solving the phase problem by comparing crystals with and without heavy atoms.",
    long: "Isomorphous replacement introduces heavy atoms (like mercury or gold) into protein crystals without changing their structure. Comparing diffraction with and without heavy atoms constrains the phases. Multiple heavy-atom derivatives give unambiguous phases.",
    why: "Max Perutz used this method to solve hemoglobin structure. Brenner understood that some problems require such indirect approaches: you cannot measure phases directly, so you triangulate from perturbations. Transcript anchor: §89.",
    related: ["phase-problem", "cross-domain-import"],
    category: "method",
  },
  "seven-cycle-test": {
    term: "Seven-Cycle Test",
    short: "If an effect isn't visible across seven log cycles, it's probably not real.",
    long: "A pragmatic statistical heuristic: plot your data on log paper spanning seven orders of magnitude. If the effect is not visible from across the room, it is probably not biologically significant. This guards against over-interpreting small effects that require elaborate statistics to detect.",
    analogy:
      "If you need a magnifying glass to see the difference, the difference may not matter in the real world.",
    why: "This reflects Brenner's emphasis on robust, obvious effects over statistically-significant-but-tiny ones. Biology should produce effects you can see, not effects you need p-values to believe.",
    related: ["amplify", "potency", "materialize"],
    category: "brenner",
  },
  "tape-rna": {
    term: "Tape RNA",
    short: "Brenner's original name for mRNA, invoking the Turing machine metaphor.",
    long: "Before 'messenger RNA' became standard, Brenner called the intermediate 'tape RNA,' explicitly invoking the tape of a Turing machine. This framing emphasized that genetic information is read sequentially, like a program tape, rather than serving as a structural template.",
    why: "The naming reflects Brenner's computational view of biology: DNA is source code, mRNA is the tape fed to the ribosome machine. Transcript anchor: §99.",
    related: ["mrna", "genetic-code", "machine-language", "recode"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Key Institutions
  // -------------------------------------------------------------------------
  "cold-spring-harbor": {
    term: "Cold Spring Harbor",
    short:
      "The Long Island laboratory that hosted the phage meetings and shaped molecular biology.",
    long: "Cold Spring Harbor Laboratory on Long Island, New York, was the intellectual home of the Phage Group. Annual phage meetings brought together the pioneers of molecular biology. The summer courses and symposia established standards for the field.",
    why: "Brenner was 'injected into the whole of modern science' at Cold Spring Harbor in 1954. The culture of rigorous discussion he encountered there shaped his scientific style. Transcript anchor: §67, §73.",
    related: ["phage-group", "max-delbruck", "bacteriophage"],
    category: "project",
  },
  "mrc-lab": {
    term: "MRC Laboratory",
    short: "The Medical Research Council lab in Cambridge where Brenner spent his career.",
    long: "The MRC Laboratory of Molecular Biology in Cambridge, England, was Brenner's scientific home from 1957. Founded by Max Perutz, it became a powerhouse of structural and molecular biology, producing multiple Nobel laureates including Brenner himself.",
    why: "The MRC lab's culture of long-term, curiosity-driven research enabled Brenner's C. elegans work. 'We were talking the same language' drew him there. Transcript anchor: §82, §87.",
    related: ["francis-crick", "c-elegans"],
    category: "project",
  },

  // -------------------------------------------------------------------------
  // Key Scientists
  // -------------------------------------------------------------------------
  "francis-crick": {
    term: "Francis Crick",
    short: "Co-discoverer of DNA structure; Brenner's intellectual partner for 20 years.",
    long: "Francis Crick, with James Watson, determined the double-helix structure of DNA in 1953. Brenner shared an office with Crick for 20 years at the MRC Laboratory. Their daily conversations shaped both scientists' thinking about the genetic code, protein synthesis, and development.",
    why: "Brenner credits Crick with teaching him to 'stay imprisoned within the physical context of everything' and to articulate half-formed ideas aloud. Transcript anchors: §55-56, §60, §66.",
    related: ["james-watson", "genetic-code", "mrc-lab"],
    category: "biology",
  },
  "james-watson": {
    term: "James Watson",
    short: "Co-discoverer of DNA structure; drove Brenner across America in a Chevy convertible.",
    long: "James Watson, with Francis Crick, solved the DNA structure. Watson and Brenner traveled across America together in 1954, discussing the gene-protein problem. Watson's aggressive, competitive style contrasted with but complemented Brenner's approach.",
    why: "The cross-country trip with Watson exemplifies science as adventure and friendship. Their discussions during the trip helped crystallize the experimental program for cracking the code. Transcript anchors: §75-78.",
    related: ["francis-crick", "genetic-code", "cold-spring-harbor"],
    category: "biology",
  },
  "seymour-benzer": {
    term: "Seymour Benzer",
    short: "Pioneer of fine-structure genetics who later founded behavioral genetics.",
    long: "Seymour Benzer's fine-structure mapping of phage T4 rII demonstrated that genes have internal structure resolvable to single nucleotides. He later switched to Drosophila behavioral genetics, pioneering the genetic analysis of behavior.",
    why: "Benzer's work 'ended the classical gene' and opened molecular genetics. Brenner admired his ability to create new fields by switching organisms and questions. Transcript anchors: §64, §70.",
    related: ["rii-region", "fine-structure-mapping", "bacteriophage"],
    category: "biology",
  },
  "max-delbruck": {
    term: "Max Delbrück",
    short: "Physicist who founded the Phage Group and established molecular biology's culture.",
    long: "Max Delbrück, originally a physicist, founded the Phage Group and established the intellectual culture of molecular biology. His emphasis on simple systems, rigorous quantitation, and collaborative competition shaped a generation of scientists.",
    why: "Delbrück's influence pervades Brenner's approach: choose simple systems, be quantitative, attack problems at the right level. Transcript anchors: §65, §73-74.",
    related: ["phage-group", "cold-spring-harbor", "bacteriophage"],
    category: "biology",
  },
  "francois-jacob": {
    term: "François Jacob",
    short: "Co-developer of the operon model; collaborated with Brenner on mRNA discovery.",
    long: "François Jacob, with Jacques Monod, developed the operon model of gene regulation. Jacob collaborated with Brenner and Meselson on the famous 1961 experiment proving the existence of messenger RNA.",
    why: "The Jacob-Brenner-Meselson experiment was a paradigm of decisive experimental design. Brenner and Jacob also coined 'replicon.' Transcript anchors: §96-97, §121.",
    related: ["operon", "mrna", "replicon"],
    category: "biology",
  },
  "george-gamow": {
    term: "George Gamow",
    short: "Cosmologist who founded the RNA Tie Club and catalyzed coding theory.",
    long: "George Gamow was a theoretical physicist and cosmologist who became fascinated by the genetic code. He proposed the first coding theories (the Diamond Code) and founded the RNA Tie Club to coordinate thinking about the problem.",
    analogy:
      "An outsider with fresh eyes: his physics background let him see the coding problem as information theory when biologists still thought in chemical terms.",
    why: "Gamow exemplifies cross-domain import. Though his specific theories were wrong, his framing of the problem as 'cracking a code' shaped how everyone approached it. Transcript anchors: §68, §72, §79.",
    related: ["rna-tie-club", "genetic-code", "cross-domain-import"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Additional Brenner Concepts
  // -------------------------------------------------------------------------
  recombination: {
    term: "Recombination",
    short: "The exchange of genetic material between chromosomes during meiosis.",
    long: "Recombination shuffles genetic material between homologous chromosomes. The frequency of recombination between two markers indicates their physical distance: rarely recombining markers are close together. This enables genetic mapping without sequencing.",
    why: "Recombination was the workhorse of classical genetics. Brenner used recombination frequencies to map genes in phage and C. elegans before sequencing was available.",
    related: ["gene", "allele", "fine-structure-mapping"],
    category: "biology",
  },
  "overlapping-code": {
    term: "Overlapping Code",
    short: "A hypothetical genetic code where adjacent codons share nucleotides.",
    long: "In an overlapping code, consecutive amino acids would share nucleotides: ABC codes the first amino acid, BCD the second. This would restrict which amino acids could be adjacent. Brenner proved all overlapping triplet codes impossible by showing that observed protein sequences violate the restrictions.",
    why: "Brenner's 1955 paper 'On the Impossibility of All Overlapping Triplet Codes' was a key theoretical contribution, ruling out an entire class of solutions. Transcript anchor: §69, §83.",
    related: ["genetic-code", "codon", "forbidden-pattern", "exclusion-test"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Key Experiments and Techniques
  // -------------------------------------------------------------------------
  "pajamo-experiment": {
    term: "PaJaMo Experiment",
    short: "The Pardee-Jacob-Monod experiment that revealed gene regulation dynamics.",
    long: "The PaJaMo experiment (1959) by Pardee, Jacob, and Monod used bacterial conjugation to study when genes became active after transfer. It showed that enzyme synthesis began immediately, suggesting the existence of a short-lived intermediate between DNA and protein.",
    why: "Brenner discussed PaJaMo with Jacob, and the puzzle it created led directly to the concept of messenger RNA. The experiment showed information transfer was rapid, ruling out stable intermediates. Transcript anchor: §96-97.",
    related: ["mrna", "operon", "francois-jacob", "tape-rna"],
    category: "biology",
  },
  "volkin-astrachan-rna": {
    term: "Volkin-Astrachan RNA",
    short: "The mysterious RNA fraction with DNA-like composition found after phage infection.",
    long: "Volkin and Astrachan discovered a small RNA fraction made after phage infection whose base composition matched the phage DNA rather than ribosomal RNA. This 'mystery RNA' was later recognized as messenger RNA.",
    why: "The mystery of Volkin-Astrachan RNA lingered until Brenner, Jacob, and Meselson showed it was the messenger carrying information from DNA to ribosomes. Transcript anchor: §97.",
    related: ["mrna", "tape-rna", "pajamo-experiment", "ribosome"],
    category: "biology",
  },
  "density-gradient": {
    term: "Density Gradient Centrifugation",
    short: "Separating molecules by mass using heavy isotopes and centrifugation.",
    long: "Density gradient centrifugation (developed by Meselson and Stahl) separates molecules based on buoyant density. By labeling with heavy isotopes like 13C and 15N, you can distinguish old from new molecules by their weight, enabling experiments that track molecular inheritance.",
    why: "Brenner used this technique in the definitive mRNA experiment: showing new RNA appeared on old ribosomes by weighing them. The trick of using magnesium to compete with caesium was essential. Transcript anchors: §99-101.",
    related: ["mrna", "ribosome", "meselson-stahl"],
    category: "method",
  },
  "sequence-hypothesis": {
    term: "Sequence Hypothesis",
    short: "Crick's principle that DNA sequence determines protein sequence.",
    long: "The Sequence Hypothesis (Crick, 1958) states that the sequence of bases in DNA specifies the sequence of amino acids in proteins. This seemingly obvious idea was revolutionary: it meant genetic information was digital, encoded in a linear sequence that could be read and decoded.",
    why: "Brenner identifies this as one of the three foundations of molecular biology, alongside Sanger's proof of protein structure and the Watson-Crick DNA model. Transcript anchor: §71.",
    related: ["genetic-code", "co-linearity", "central-dogma", "francis-crick"],
    category: "biology",
  },
  "central-dogma": {
    term: "Central Dogma",
    short: "Information flows from DNA to RNA to protein, never backward to DNA.",
    long: "The Central Dogma (Crick, 1958) describes the flow of sequence information: DNA can be copied to DNA, transcribed to RNA, and RNA translated to protein, but sequence information cannot flow backward from protein to nucleic acid. This constrains how organisms store and transmit information.",
    why: "The Central Dogma defined the logical structure of molecular biology. Brenner's work on mRNA, the genetic code, and gene-protein relationships all operated within this framework.",
    related: ["sequence-hypothesis", "genetic-code", "transcription", "translation"],
    category: "biology",
  },
  "self-assembly": {
    term: "Self-Assembly",
    short: "Complex structures that build themselves from their component parts.",
    long: "Self-assembly is the spontaneous organization of components into ordered structures without external direction. Virus capsids, ribosomes, and membranes all self-assemble from their protein and nucleic acid parts according to information encoded in their sequences.",
    why: "Brenner emphasized self-assembly as fundamental to understanding how genomes encode organisms. If structures self-assemble, the genome need only specify the parts; the instructions for building are implicit in the parts themselves. Transcript anchor: §115.",
    related: ["protein", "ribosome", "phenotype"],
    category: "biology",
  },
  "serial-section": {
    term: "Serial Section",
    short: "Cutting tissue into sequential thin slices for 3D reconstruction.",
    long: "Serial sectioning cuts a specimen into hundreds or thousands of sequential ultrathin slices (typically 50-70nm thick) for electron microscopy. By imaging each section and aligning them, you can reconstruct the complete 3D structure of cells and tissues.",
    why: "Brenner and colleagues used serial-section electron microscopy to reconstruct the complete C. elegans nervous system, producing the first connectome. This heroic effort took over a decade.",
    related: ["electron-microscopy", "connectome", "c-elegans", "reconstruction"],
    category: "method",
  },
  "electron-microscopy": {
    term: "Electron Microscopy",
    short: "Imaging with electrons to achieve nanometer resolution.",
    long: "Electron microscopy uses electron beams instead of light to image specimens, achieving resolution down to individual atoms. For biology, transmission EM reveals internal cell structure while scanning EM shows surface topology.",
    why: "EM was essential for C. elegans work: seeing muscle structure in mutants, tracing neural connections via serial sections, and understanding cell ultrastructure. Brenner democratized EM by taking it out of elite hands. Transcript anchors: §86, §159.",
    related: ["serial-section", "negative-staining", "connectome", "democratize"],
    category: "method",
  },
  "laser-ablation": {
    term: "Laser Ablation",
    short: "Killing specific cells with a focused laser beam to test their function.",
    long: "Laser ablation uses a focused laser microbeam to kill individual cells in a living organism. By removing specific cells and observing the consequences, you can determine what each cell does. In C. elegans, the transparent body allows targeting any cell.",
    why: "Laser ablation enabled functional analysis of the C. elegans nervous system: kill a neuron and see what behavior is lost. This connected the anatomical connectome to function.",
    related: ["c-elegans", "neuron", "connectome", "cell-lineage"],
    category: "method",
  },
  cistron: {
    term: "Cistron",
    short: "Benzer's term for the functional unit of the gene defined by complementation.",
    long: "A cistron is a genetic unit defined operationally by the cis-trans test (complementation test). Two mutations are in the same cistron if they fail to complement when in trans (on different chromosomes). The cistron roughly corresponds to a single protein-coding gene.",
    why: "Benzer introduced 'cistron' to distinguish the functional unit (defined by complementation) from the unit of mutation (muton) and recombination (recon). This clarified confusion about what 'gene' meant. Transcript anchor: §70.",
    related: ["complementation", "gene", "seymour-benzer", "rii-region"],
    category: "biology",
  },
  "deletion-mapping": {
    term: "Deletion Mapping",
    short: "Using chromosomal deletions to rapidly localize mutations.",
    long: "Deletion mapping uses strains carrying defined chromosomal deletions. If a mutation fails to recombine with a deletion, it must lie within the deleted region. A set of overlapping deletions can quickly map mutations to small intervals without extensive recombination analysis.",
    why: "Benzer used deletion mapping to efficiently localize thousands of rII mutations. Brenner applied similar logic: use coarse methods first (anatomical dissection) before fine resolution.",
    related: ["fine-structure-mapping", "recombination", "seymour-benzer"],
    category: "method",
  },
  "intragenic-suppressor": {
    term: "Intragenic Suppressor",
    short: "A second mutation within the same gene that restores function.",
    long: "An intragenic suppressor is a mutation that compensates for another mutation within the same gene. Frameshift suppressors are the classic example: a +1 insertion combined with a -1 deletion restores the reading frame, producing functional protein.",
    why: "Brenner used intragenic suppressors to prove the triplet nature of the genetic code. If +1 and -1 mutations in the same gene restore function, the code must read in fixed triplets that can be shifted and restored. Transcript anchor: §107-109.",
    related: ["suppressor-mutation", "frameshift", "reading-frame", "genetic-code"],
    category: "biology",
  },
  reconstruction: {
    term: "Reconstruction",
    short: "Building 3D structure from serial section images.",
    long: "Reconstruction is the process of tracing structures through serial sections and assembling them into a 3D model. For the C. elegans connectome, this meant tracing every neuron through thousands of sections and identifying every synaptic connection.",
    why: "The C. elegans reconstruction was a decade-long effort that produced the first complete wiring diagram of a nervous system. Brenner initiated this work, which John White and colleagues completed.",
    related: ["serial-section", "connectome", "electron-microscopy"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // C. elegans Specific Terms
  // -------------------------------------------------------------------------
  "unc-mutant": {
    term: "Unc Mutant",
    short: "Uncoordinated mutants with defective movement in C. elegans.",
    long: "Unc (uncoordinated) mutants have abnormal movement: paralysis, twitching, coiling, or uncoordinated locomotion. The unc genes encode proteins required for muscle function, neural transmission, or neuromuscular connectivity. There are over 100 unc genes.",
    why: "Movement mutants were Brenner's entry point into C. elegans genetics. You could see them: 'paralysed mutants had defective muscles that we could see in the electron microscope.' Transcript anchors: §163, §165.",
    related: ["c-elegans", "behavioral-mutant", "genetic-screen", "neuron"],
    category: "biology",
  },
  "behavioral-mutant": {
    term: "Behavioral Mutant",
    short: "A mutant with altered behavior rather than altered structure.",
    long: "Behavioral mutants have normal anatomy but abnormal behavior: defective chemotaxis, altered feeding, abnormal egg-laying, or disrupted mating. These reveal genes required for neural function rather than neural development.",
    why: "Brenner saw behavioral mutants as the key to understanding the nervous system genetically. The phenotype is visible (you watch the worm), heritable, and genetically tractable. Transcript anchor: §164, §170.",
    related: ["unc-mutant", "c-elegans", "chemotaxis", "genetic-screen"],
    category: "biology",
  },
  chemotaxis: {
    term: "Chemotaxis",
    short: "Movement toward or away from chemical signals.",
    long: "Chemotaxis is directed movement in response to chemical gradients. C. elegans chemotaxes toward food (bacteria) and away from noxious chemicals. Chemotaxis assays on petri dishes provided quantitative behavioral phenotypes for genetic screens.",
    why: "Chemotaxis was an ideal behavioral assay: quantitative, reproducible, and revealing of sensory and motor function. Mutants with chemotaxis defects identified genes for sensory neurons, signal transduction, and motor control.",
    related: ["behavioral-mutant", "c-elegans", "genetic-screen"],
    category: "biology",
  },
  tracks: {
    term: "Tracks",
    short: "The trails C. elegans worms leave on bacterial lawns.",
    long: "C. elegans worms crawling on bacterial lawns leave visible tracks in the bacteria. The pattern of tracks reveals movement phenotypes: wild-type worms leave sinusoidal tracks, while movement mutants leave characteristic abnormal patterns.",
    why: "Brenner used tracks as a rapid screen for movement mutants: 'I had picked up the plate and it caught the light and I noticed that there were tracks where the worms had crawled and that these did look different.' Transcript anchor: §154, §158.",
    related: ["unc-mutant", "c-elegans", "behavioral-mutant"],
    category: "biology",
  },
  n2: {
    term: "N2",
    short: "The standard wild-type C. elegans strain used worldwide.",
    long: "N2 is the reference wild-type strain of C. elegans, originally isolated by Brenner in Bristol, England. All standard genetics compares mutants to N2. The N2 genome was the first animal genome sequenced.",
    why: "Choosing and standardizing on a single wild-type strain was essential for reproducibility. N2 became the 'E. coli' of animal genetics: the universal reference.",
    related: ["c-elegans", "wild-type", "model-organism"],
    category: "biology",
  },
  dauer: {
    term: "Dauer",
    short: "A stress-resistant dormant larval stage in C. elegans.",
    long: "Dauer (German for 'enduring') is an alternative third larval stage entered under starvation or crowding. Dauer larvae are stress-resistant, long-lived, and non-feeding. When conditions improve, they resume development. Dauer genetics revealed conserved longevity pathways.",
    why: "Dauer provided a model for understanding how organisms sense and respond to environmental conditions. The insulin/IGF-1 pathway controlling dauer entry is conserved to humans and affects aging.",
    related: ["c-elegans", "phenotype", "genetic-pathway"],
    category: "biology",
  },
  vulva: {
    term: "Vulva",
    short: "The C. elegans egg-laying structure; a model for cell fate decisions.",
    long: "The C. elegans vulva is formed from six precursor cells that adopt different fates based on signaling. Vulval development became a paradigm for studying cell-cell signaling, fate specification, and the genetics of development.",
    why: "Vulval development exemplified how C. elegans genetics could dissect developmental mechanisms. The same signaling pathways (Ras, Notch, Wnt) operate in humans.",
    related: ["c-elegans", "cell-lineage", "genetic-pathway", "phenotype"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Additional Historical/Conceptual Terms
  // -------------------------------------------------------------------------
  "meselson-stahl": {
    term: "Meselson-Stahl Experiment",
    short: "The 'most beautiful experiment in biology' proving semiconservative DNA replication.",
    long: "Meselson and Stahl (1958) used density gradient centrifugation with heavy nitrogen to show that DNA replicates semiconservatively: each daughter molecule contains one old and one new strand. The elegant experimental design became a model for decisive experiments.",
    why: "Brenner used the Meselson-Stahl technique (density labeling) for the mRNA experiment. The approach exemplifies using physical chemistry to answer biological questions.",
    related: ["density-gradient", "dna", "decision-experiment"],
    category: "biology",
  },
  "sanger-sequencing": {
    term: "Sanger Sequencing",
    short: "Fred Sanger's method for reading DNA sequences using chain termination.",
    long: "Sanger sequencing (dideoxy method) uses chain-terminating nucleotides to generate DNA fragments of every length, which when separated by size reveal the sequence. This technology enabled the genomic era, including the C. elegans and human genome projects.",
    why: "Brenner recognized that 'genetics just turned out to be the poor man's way of doing the DNA sequence.' Sanger sequencing eventually made classical genetics unnecessary for many purposes. Transcript anchor: §78.",
    related: ["dna", "genetic-code", "c-elegans"],
    category: "method",
  },
  "genetic-map": {
    term: "Genetic Map",
    short: "A diagram showing the relative positions of genes based on recombination frequency.",
    long: "A genetic map orders genes along chromosomes based on how frequently they recombine. Genes that rarely recombine are close together; genes that recombine freely are far apart. Genetic maps preceded physical maps and enabled positional cloning.",
    why: "Brenner built the first genetic map of C. elegans, essential infrastructure for the field. Mapping was the prerequisite for cloning genes and understanding their molecular nature.",
    related: ["recombination", "gene", "c-elegans", "fine-structure-mapping"],
    category: "method",
  },
  "positional-cloning": {
    term: "Positional Cloning",
    short: "Isolating a gene by walking along the chromosome from nearby markers.",
    long: "Positional cloning identifies a gene by its chromosomal position rather than its biochemical function. Starting from linked genetic markers, you 'walk' along overlapping clones until you reach the gene. This enabled cloning genes known only by their mutant phenotype.",
    why: "Positional cloning connected classical genetics to molecular biology. You could go from a mutant phenotype to the gene sequence without knowing the protein. This was essential for C. elegans molecular genetics.",
    related: ["genetic-map", "gene", "mutation", "forward-genetics"],
    category: "method",
  },
  "two-dimensional-world": {
    term: "Two-Dimensional World",
    short: "The advantage of organisms that live on surfaces rather than in volumes.",
    long: "Brenner wanted an organism with a two-dimensional world: 'like bacteria, which can live on the surface of a petri dish.' Organisms in 2D are easier to observe, manipulate, and screen. C. elegans crawls on agar surfaces, enabling visual screens impossible with swimming organisms.",
    why: "This criterion was decisive in choosing C. elegans over rotifers (which swim in 3D). The practical advantage of 2D life enabled the large-scale genetic screens that made C. elegans powerful. Transcript anchor: §129.",
    related: ["c-elegans", "genetic-screen", "model-organism", "gedanken-organism"],
    category: "brenner",
  },
  "invariant-cell-number": {
    term: "Invariant Cell Number",
    short: "The fixed number of cells in C. elegans adults: exactly 959 somatic cells.",
    long: "Adult C. elegans hermaphrodites have exactly 959 somatic cells (plus germline). This invariance means every cell can be identified and its lineage traced. The same cells appear in the same positions in every individual, enabling complete anatomical description.",
    why: "Invariant cell number was one of C. elegans' key advantages: 'these had a small number of cells, they were limited.' This made complete description possible. Transcript anchor: §130.",
    related: ["c-elegans", "cell-lineage", "connectome", "model-organism"],
    category: "biology",
  },
  "complete-description": {
    term: "Complete Description",
    short: "The goal of exhaustively describing an organism at cellular resolution.",
    long: "Complete description means knowing every cell, every connection, every gene. For C. elegans, this included the complete cell lineage (every cell division), the complete connectome (every neural connection), and eventually the complete genome sequence.",
    why: "Brenner's strategy was to achieve complete description as the foundation for understanding. 'The important thing is to choose a tractable problem that is complete in itself.' Complete description makes nothing hidden.",
    related: ["c-elegans", "connectome", "cell-lineage", "invariant-cell-number"],
    category: "brenner",
  },

  // -------------------------------------------------------------------------
  // Genetic Code: Additional Concepts
  // -------------------------------------------------------------------------
  degeneracy: {
    term: "Degeneracy",
    short: "Multiple codons specifying the same amino acid.",
    long: "The genetic code is degenerate: most amino acids are encoded by more than one codon. Leucine has six codons; methionine has only one. Degeneracy means you cannot deduce the DNA sequence from a protein sequence alone, only the reverse.",
    why: "Crick and Brenner realized the code must be degenerate because there are 64 codons but only 20 amino acids. 'We can't deduce it from first principles. We just have to go and find out what it is.' Transcript anchor: §82.",
    related: ["genetic-code", "codon", "amino-acid", "wobble"],
    category: "biology",
  },
  wobble: {
    term: "Wobble",
    short:
      "Flexible base-pairing at the third codon position allowing one tRNA to read multiple codons.",
    long: "Wobble (Crick, 1966) explains how fewer than 61 tRNAs can read all 61 sense codons. The third position of the codon pairs loosely, allowing G-U and other non-Watson-Crick pairs. This accounts for degeneracy without requiring 61 different tRNAs.",
    why: "Wobble explained a puzzle: how could 20-40 tRNA species read 61 codons? The relaxed pairing at position 3 was both the answer and a constraint on code evolution.",
    related: ["degeneracy", "codon", "genetic-code", "trna"],
    category: "biology",
  },
  trna: {
    term: "tRNA",
    short: "Transfer RNA: the adaptor molecule that brings amino acids to the ribosome.",
    long: "Transfer RNA (tRNA) molecules are the physical realization of Crick's adaptor hypothesis. Each tRNA has an anticodon that recognizes mRNA codons and carries the corresponding amino acid. Suppressor mutations are often tRNA mutations that misread stop codons.",
    why: "Brenner's work on suppressor mutations revealed that suppressors were often tRNA mutations. 'The simplest idea of genetic suppression was that they were mutations of transfer RNA.' Transcript anchor: §112.",
    related: ["adaptor-hypothesis", "ribosome", "suppressor-mutation", "genetic-code"],
    category: "biology",
  },
  "adaptor-hypothesis": {
    term: "Adaptor Hypothesis",
    short: "Crick's prediction that small molecules would link codons to amino acids.",
    long: "The adaptor hypothesis (Crick, 1955) predicted that amino acids do not directly recognize codons. Instead, small adaptor molecules would carry amino acids and recognize codons via complementary base-pairing. Transfer RNA turned out to be these adaptors.",
    why: "The adaptor hypothesis was a theoretical prediction later confirmed experimentally. It exemplifies how theoretical reasoning can guide experimental discovery.",
    related: ["trna", "genetic-code", "francis-crick", "ribosome"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Key Collaborators
  // -------------------------------------------------------------------------
  "john-sulston": {
    term: "John Sulston",
    short: "Brenner's colleague who traced the complete C. elegans cell lineage.",
    long: "John Sulston joined Brenner's lab and made two transformative contributions: tracing the complete cell lineage of C. elegans (every cell division from egg to adult) and later leading the C. elegans genome sequencing project. He shared the 2002 Nobel Prize with Brenner.",
    why: "Sulston's lineage work provided the 'complete description' Brenner sought. His freezing method for storing worm strains was also essential infrastructure. Transcript anchors: §151, §191.",
    related: ["c-elegans", "cell-lineage", "complete-description", "mrc-lab"],
    category: "biology",
  },
  "john-white": {
    term: "John White",
    short: "Reconstructed the C. elegans nervous system from serial sections.",
    long: "John White led the heroic effort to reconstruct the complete C. elegans nervous system from serial electron micrograph sections. This produced the first connectome: the complete wiring diagram of a nervous system.",
    why: "White's reconstruction was essential for understanding how neural circuits produce behavior. The connectome became a foundation for C. elegans neurobiology. Transcript anchor: §157.",
    related: ["connectome", "serial-section", "c-elegans", "electron-microscopy"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Later Brenner Projects
  // -------------------------------------------------------------------------
  fugu: {
    term: "Fugu",
    short: "The pufferfish with a compact genome; Brenner's 'discount genome' project.",
    long: "Fugu rubripes (Japanese pufferfish) has a genome one-eighth the size of the human genome but similar gene content. Brenner championed Fugu as a model for finding human genes efficiently: 'the discount genome, because you get 90% discount on sequencing.'",
    why: "Fugu exemplifies Brenner's principle of choosing the right organism. By selecting a compact genome, you get the same information with less sequencing. 'I've fulfilled the great technical requirement just by choosing the right organism.' Transcript anchors: §221-222.",
    related: ["model-organism", "gedanken-organism", "genome-project"],
    category: "biology",
  },
  "genome-project": {
    term: "Genome Project",
    short: "Large-scale effort to sequence an organism's complete DNA.",
    long: "A genome project aims to determine the complete DNA sequence of an organism. The C. elegans genome project, which Brenner initiated, was the first animal genome completed (1998). It demonstrated that systematic sequencing was feasible for complex organisms.",
    why: "Brenner saw genome sequencing as the ultimate 'complete description': knowing every base of DNA. The C. elegans project proved the approach and led to the Human Genome Project. Transcript anchors: §191, §219.",
    related: ["c-elegans", "sanger-sequencing", "fugu", "complete-description"],
    category: "method",
  },
  intron: {
    term: "Intron",
    short: "Non-coding sequences within genes that are spliced out of mRNA.",
    long: "Introns are sequences within genes that are transcribed but removed (spliced out) before translation. Their discovery (1977) surprised molecular biologists who expected genes to be continuous. Introns explain why eukaryotic genes are much larger than their protein products.",
    why: "Brenner noted that introns would have blocked early gene transfer experiments: 'that experiment wouldn't had a hope in hell of working... these nematode genes have introns in them.' Transcript anchor: §174.",
    related: ["gene", "mrna", "transcription", "splicing"],
    category: "biology",
  },
  splicing: {
    term: "Splicing",
    short: "Removing introns from pre-mRNA to produce mature mRNA.",
    long: "Splicing is the process that removes introns from precursor mRNA and joins exons together. Alternative splicing can produce different proteins from the same gene by including or excluding different exons.",
    related: ["intron", "mrna", "gene", "transcription"],
    category: "biology",
  },
  isogenic: {
    term: "Isogenic",
    short: "Genetically identical individuals, like a clone.",
    long: "Isogenic organisms have identical genomes. C. elegans hermaphrodites self-fertilize, producing isogenic offspring. This eliminates genetic variation as a confound, making phenotypic differences attributable to specific mutations.",
    why: "Brenner valued C. elegans being 'completely isogenic, because each animal would have a uniform genetic constitution.' This simplified genetic analysis. Transcript anchor: §150.",
    related: ["c-elegans", "hermaphrodite", "wild-type", "n2"],
    category: "biology",
  },
  transgenic: {
    term: "Transgenic",
    short: "An organism carrying foreign DNA inserted into its genome.",
    long: "A transgenic organism has had DNA from another source integrated into its genome. This enables testing gene function by adding genes, expressing reporters, or creating disease models. Brenner noted that 'a transgenic animal is just a cross of a genome with a gene.'",
    why: "Transgenic technology transformed genetics from loss-of-function (mutations) to gain-of-function experiments. You can add genes, not just break them. Transcript anchor: §229.",
    related: ["gene", "mutation", "c-elegans", "forward-genetics"],
    category: "method",
  },
  "molecular-cloning": {
    term: "Molecular Cloning",
    short: "Isolating and copying a specific DNA fragment in bacteria.",
    long: "Molecular cloning uses restriction enzymes and plasmid vectors to isolate specific DNA fragments and amplify them in bacteria. This enables studying individual genes, sequencing them, and manipulating them. Cloning 'opened up large areas of biology to everybody.'",
    why: "Brenner recognized that cloning transformed biology: 'now it's banal. Everybody can do it, they can clone a gene, they can sequence it.' This democratized molecular biology. Transcript anchor: §190.",
    related: ["gene", "dna", "sanger-sequencing", "positional-cloning"],
    category: "method",
  },

  // -------------------------------------------------------------------------
  // Methodological Concepts
  // -------------------------------------------------------------------------
  "future-proofing": {
    term: "Future-Proofing",
    short: "Choosing problems and methods that will remain relevant as technology advances.",
    long: "Future-proofing means selecting research directions that will benefit from, rather than be obsoleted by, technological progress. Brenner's choice of C. elegans was future-proof: its small genome meant sequencing would eventually be feasible.",
    why: "Brenner explicitly sought 'future-proof sciences' when choosing his research direction. The choice of C. elegans was validated when genome sequencing became possible. Transcript anchor: §44.",
    related: ["gedanken-organism", "model-organism", "opening-game"],
    category: "brenner",
  },
  "exhaustive-enumeration": {
    term: "Exhaustive Enumeration",
    short: "Systematically listing all possibilities before testing them.",
    long: "Exhaustive enumeration means considering all logical possibilities before designing experiments. For the mRNA experiment, Brenner and colleagues proposed three models and designed tests to distinguish them. The danger: forgetting that 'both could be wrong.'",
    why: "Brenner's approach to the genetic code and mRNA involved systematically enumerating possibilities and eliminating them. But he warns against false confidence: always remember the third alternative. Transcript anchor: §102.",
    related: ["third-alternative", "exclusion-test", "decision-experiment"],
    category: "brenner",
  },
  "kitchen-table-science": {
    term: "Kitchen Table Science",
    short: "Science that can be done with minimal equipment and resources.",
    long: "Kitchen table science means research achievable without massive infrastructure. Brenner aspired to make genomics accessible: 'someone could make a map of a higher organism on the kitchen table.' This democratizes science beyond wealthy institutions.",
    why: "Brenner valued methods that didn't require expensive equipment or large teams. His early work used simple genetic crosses, and he sought genomic methods that would be broadly accessible. Transcript anchor: §191.",
    related: ["democratize", "diy", "cheap-loop"],
    category: "brenner",
  },
  protoplast: {
    term: "Protoplast",
    short: "A bacterial cell with its cell wall removed.",
    long: "Protoplasts are bacteria stripped of their rigid cell wall, leaving only the cell membrane. They were used to study what happens inside cells without the barrier of the wall. Brenner showed protoplasts could continue producing phage.",
    why: "Protoplast experiments represented an early attempt at subcellular systems: 'the first steps to a sub-cellular system on which you could do biochemistry.' Transcript anchor: §80.",
    related: ["bacteriophage", "anatomical-dissection"],
    category: "biology",
  },

  // -------------------------------------------------------------------------
  // Philosophy of Science
  // -------------------------------------------------------------------------
  "flash-of-insight": {
    term: "Flash of Insight",
    short: "The moment when a solution becomes suddenly obvious.",
    long: "A flash of insight is the experience of sudden understanding, when confusion resolves into clarity. Brenner described seeing the DNA model: 'In a flash you could just see that everything... this was the fundamental... the curtain had been lifted.'",
    why: "Brenner's description of seeing the DNA model captures how good science should feel: obvious in retrospect. If a solution requires elaborate justification, it may be wrong. Transcript anchor: §55.",
    related: ["decision-experiment", "materialize"],
    category: "brenner",
  },
  "table-of-transformation": {
    term: "Table of Transformation",
    short: "The genetic code as a lookup table from codons to amino acids.",
    long: "The genetic code is a table of transformation: given a codon (three nucleotides), look up the corresponding amino acid. Brenner emphasized this is what 'code' really means, not the genome sequence itself. The table is universal across life.",
    why: "Brenner noted confusion about what 'code' means: 'most people will still talk about the complete apparatus of the genome as the genetic code for an organism, and that is wrong. It's the table of transformation.' Transcript anchor: §72.",
    related: ["genetic-code", "codon", "amino-acid"],
    category: "biology",
  },
  "testing-ground": {
    term: "Testing Ground",
    short: "The intellectual center where scientists prove themselves against the best.",
    long: "The testing ground is where you measure yourself against international competition. Brenner left South Africa because 'the testing ground is at the centre... you've got to go to the metropolis, and you've got to test yourself at the international level.'",
    why: "Brenner believed you cannot know if you're good without competing at the highest level. Provincial success means nothing if you haven't faced the best. Transcript anchor: §83.",
    related: ["mrc-lab", "cold-spring-harbor", "phage-group"],
    category: "brenner",
  },

  // ============================================================================
  // Fourth Batch: Additional Terms from Transcript (December 2025)
  // ============================================================================

  // --- Mutation Types ---

  missense: {
    term: "Missense Mutation",
    short: "A mutation that changes one amino acid to another.",
    long: "A missense mutation substitutes one nucleotide for another, resulting in a different amino acid in the protein. Unlike nonsense mutations (which create stop codons), missense mutations produce full-length proteins with altered function.",
    why: "The distinction between missense and nonsense was crucial for understanding the genetic code. Missense mutations proved that codons specify amino acids; nonsense mutations revealed chain termination signals. Transcript anchor: §107.",
    related: ["nonsense-codon", "amber-mutation", "suppressor-mutation", "chain-termination"],
    category: "biology",
  },
  "chain-termination": {
    term: "Chain Termination",
    short: "The mechanism by which protein synthesis stops at stop codons.",
    long: "Chain termination occurs when a ribosome encounters a stop codon (UAG, UAA, or UGA). Brenner hypothesized that amber mutants did not simply 'get stuck' but actively terminated chains, and that suppressor mutations allowed read-through.",
    why: "Brenner proposed 'there were two kinds of nonsense, one got stuck and one actually chain-terminated. And if this is the case, then when you suppress it, you just carry on the chain.' Transcript anchor: §132.",
    related: ["nonsense-codon", "amber-mutation", "ochre-mutation", "suppressor-mutation"],
    category: "biology",
  },

  // --- Bacteriophage Concepts ---

  "lambda-phage": {
    term: "Lambda Phage",
    short: "A temperate bacteriophage that can integrate into the host chromosome.",
    long: "Lambda (λ) phage can either lyse cells or integrate into the E. coli chromosome as a prophage. Lambda became a key tool for genetic engineering, particularly through 'lambda DG' variants that carried bacterial genes picked up during excision.",
    why: "Brenner used lambda variants for 'genetic steam engineering.' Lambda DGs carrying tryptophan genes (lambda dG-trp) were particularly useful for studying nonsense suppressors. Transcript anchor: §142.",
    related: ["bacteriophage", "lysogeny", "prophage", "transduction"],
    category: "biology",
  },
  lysogeny: {
    term: "Lysogeny",
    short: "The integration of phage DNA into the host chromosome.",
    long: "In lysogeny, a temperate phage inserts its DNA into the bacterial chromosome, becoming a prophage. The phage genes are replicated with the host DNA and can later be induced to enter the lytic cycle.",
    why: "Understanding lysogeny was essential for using phages as genetic tools. Lambda's ability to pick up adjacent bacterial genes during excision led to specialized transduction. Transcript anchor: §142.",
    related: ["lambda-phage", "prophage", "transduction", "bacteriophage"],
    category: "biology",
  },
  prophage: {
    term: "Prophage",
    short: "Phage DNA integrated into the host bacterial chromosome.",
    long: "A prophage is the dormant form of a temperate phage, integrated into the host genome. It replicates with the host and can remain silent for many generations before induction triggers the lytic cycle.",
    related: ["lysogeny", "lambda-phage", "transduction"],
    category: "biology",
  },
  transduction: {
    term: "Transduction",
    short: "Transfer of bacterial genes from one cell to another via phage.",
    long: "Transduction occurs when a bacteriophage accidentally packages bacterial DNA and transfers it to a new host. Specialized transduction (as with lambda) transfers specific genes adjacent to the integration site.",
    why: "Transduction was a powerful tool for mapping genes and moving genetic material before modern cloning. Lambda transducing phages carrying specific genes enabled detailed biochemical analysis.",
    related: ["lambda-phage", "lysogeny", "prophage", "bacteriophage"],
    category: "biology",
  },

  // --- Key People ---

  "jacques-monod": {
    term: "Jacques Monod",
    short: "Co-discoverer of the operon model and mRNA concept.",
    long: "Jacques Monod, working with Francois Jacob at the Pasteur Institute, developed the operon model of gene regulation. Their work on enzyme induction led to the concept of messenger RNA and earned them the 1965 Nobel Prize.",
    why: "Brenner's collaboration with Jacob on the messenger RNA experiment was catalyzed by the PaJaMo work. Monod's kinetic studies of enzyme induction demanded an intermediate information carrier. Transcript anchor: §96.",
    related: ["francois-jacob", "operon", "pajamo-experiment", "mrna"],
    category: "biology",
  },
  "matthew-meselson": {
    term: "Matthew Meselson",
    short: "Demonstrated semiconservative DNA replication with Franklin Stahl.",
    long: "Matthew Meselson and Franklin Stahl used density gradient centrifugation with heavy nitrogen (N-15) to prove DNA replicates semiconservatively. Their technique was adapted by Brenner and Jacob for the messenger RNA experiment.",
    why: "Brenner and Jacob used 'the tricks developed by Meselson and Stahl' to distinguish old ribosomes from new RNA, labeling with C-13 and N-15. Transcript anchor: §99.",
    related: ["meselson-stahl", "density-gradient", "ultracentrifuge"],
    category: "biology",
  },

  // --- Experimental Techniques ---

  "pulse-chase": {
    term: "Pulse-Chase",
    short: "Labeling molecules briefly, then following their fate over time.",
    long: "In pulse-chase experiments, radioactive precursors are added briefly (pulse), then replaced with unlabeled molecules (chase). Following the labeled molecules reveals synthesis, processing, and degradation kinetics.",
    why: "Pulse-chase experiments were essential for demonstrating mRNA turnover. The messenger RNA experiment showed that newly synthesized (pulse) RNA associated with pre-existing ribosomes.",
    related: ["autoradiography", "density-gradient", "ultracentrifuge"],
    category: "method",
  },
  "sucrose-gradient": {
    term: "Sucrose Gradient",
    short: "A density gradient technique for separating molecules by size.",
    long: "Sucrose gradient centrifugation separates molecules based on sedimentation rate, which depends on size and shape. Ribosomes, RNA, and other macromolecules can be fractionated by layering samples on sucrose solutions.",
    why: "Brenner noted that 'there was a time that unless you had a sucrose gradient of something, you couldn't publish a paper.' The technique became ubiquitous for ribosome and RNA studies. Transcript anchor: §103.",
    related: ["density-gradient", "ultracentrifuge", "ribosome"],
    category: "method",
  },
  ultracentrifuge: {
    term: "Ultracentrifuge",
    short: "High-speed centrifuge for separating molecules by density or size.",
    long: "The ultracentrifuge generates forces up to 1,000,000 g, enabling separation of macromolecules by sedimentation. Analytical ultracentrifuges measure sedimentation in real-time; preparative ultracentrifuges collect fractions.",
    why: "The ultracentrifuge was essential for the messenger RNA experiment. Brenner recalls carrying the rotor through cold hallways while 'drenched from water condensation' during the critical gradient run. Transcript anchor: §101.",
    related: ["density-gradient", "sucrose-gradient", "meselson-stahl"],
    category: "method",
  },
  autoradiography: {
    term: "Autoradiography",
    short: "Detecting radioactive molecules by exposing photographic film.",
    long: "Autoradiography localizes radioactive isotopes by placing samples against photographic emulsion. The radiation exposes the film, revealing where labeled molecules are located. Used for both biochemical gels and tissue sections.",
    related: ["pulse-chase", "ultracentrifuge"],
    category: "method",
  },
  "gene-fusion": {
    term: "Gene Fusion",
    short: "Joining two genes so one's expression reports on the other.",
    long: "Gene fusions link genes together so that mutations in one affect expression of the other. Seymour Benzer invented a gene fusion trick to detect nonsense mutants: mutations in gene A could turn off gene B in the fusion.",
    why: "Brenner used gene fusions extensively: 'Seymour Benzer invented a little trick where he had a gene fusion and he could show he could turn off, in this gene fusion, the function of gene B, by some mutants in gene A.' Transcript anchor: §130.",
    related: ["nonsense-codon", "seymour-benzer", "rii-region"],
    category: "method",
  },

  // --- Brenner Philosophy ---

  "power-of-ignorance": {
    term: "Power of Ignorance",
    short: "The creative advantage of not knowing too much about a field.",
    long: "Brenner believed that 'you can always know too much' and that experience in a field can curtail creativity. Fresh perspectives from outsiders often drive breakthroughs because they aren't constrained by conventional wisdom.",
    why: "Brenner advocated strategic ignorance: 'I'm a great believer in the power of ignorance. I think you can always know too much. Being an experienced scientist in a subject curtails creativity, because you know what won't work.' Transcript anchor: §63.",
    analogy:
      "Like a child solving a puzzle their own way because they haven't learned the 'correct' approach that gets everyone stuck.",
    related: ["productive-ignorance", "third-alternative", "opening-game"],
    category: "brenner",
  },
  "brute-force": {
    term: "Brute Force",
    short: "Genetic steam engineering: solving problems by exhaustive screening.",
    long: "Brute force approaches screen through thousands of mutants or variants to find rare events. Before recombinant DNA, many genetic engineering tasks required 'genetic steam engineering' with massive screens.",
    why: "Brenner called early genetic manipulation 'genetic steam engineering, because we had to do things by brute force.' The isolation of amber mutants required 'a few thousand R2 mutants to get the subset of amber mutants only.' Transcript anchor: §136.",
    related: ["saturation-mutagenesis", "genetic-screen", "exhaustive-enumeration"],
    category: "method",
  },
  "genetics-by-composition": {
    term: "Genetics by Composition",
    short: "Building function by adding genes rather than removing them.",
    long: "Genetics by composition adds genes to organisms (transgenics) rather than analyzing mutants that lack function. It asks: what happens when we add this gene? This complements genetics by decomposition (mutagenesis).",
    why: "Brenner coined this distinction: 'I called this genetics by composition rather than genetics by decomposition.' Transgenics are 'just a cross of a genome with a gene.' Transcript anchor: §206.",
    related: ["transgenic", "forward-genetics", "reverse-genetics"],
    category: "method",
  },
  "one-dimensional-sequence": {
    term: "One-Dimensional Sequence",
    short: "The insight that biological information is encoded in linear chains.",
    long: "The reduction of biology to one-dimensional sequences (DNA, RNA, protein) is the foundational insight of molecular biology. Linear sequences make copying, expression, mapping, and mutation conceptually tractable.",
    why: "Brenner emphasized 'the reduction of biology to one dimension in terms of information is the absolute crucial step. Biology had been three-dimensional... but the whole idea that you could reduce it to one dimension is a very powerful idea.' Transcript anchor: §60.",
    analogy:
      "Like compressing a three-dimensional sculpture into assembly instructions that can be written on a tape.",
    related: ["genetic-code", "sequence-hypothesis", "central-dogma", "turing-machine"],
    category: "brenner",
  },

  // --- Theoretical Influences ---

  "von-neumann": {
    term: "John von Neumann",
    short: "Mathematician whose self-replicating automata influenced Brenner's thinking.",
    long: "Von Neumann's theory of self-replicating automata showed that a machine could contain instructions for building copies of itself. He noted that 'the instruction I is roughly effecting the functions of a gene.'",
    why: "Brenner was deeply influenced by von Neumann: 'the program has to build the machinery to execute the program.' Von Neumann's automata theory provided a conceptual framework for understanding how genes work. Transcript anchor: §47.",
    related: ["turing-machine", "one-dimensional-sequence", "sequence-hypothesis"],
    category: "brenner",
  },
  "turing-machine": {
    term: "Turing Machine",
    short: "Abstract computing device operating on a one-dimensional tape.",
    long: "A Turing machine is a mathematical model of computation that reads and writes symbols on an infinite tape. Turing machines process linear sequences of instructions, analogous to how ribosomes read mRNA.",
    why: "Brenner connected Turing machines to molecular biology: 'I was very much intrigued by computers and the von Neumann thing, these are one-dimensional sequences as well; tapes, the Turing machine is a one-dimensional sequence.' Transcript anchor: §60.",
    related: ["von-neumann", "one-dimensional-sequence", "tape-rna"],
    category: "brenner",
  },

  // --- Technical Concepts ---

  auxotroph: {
    term: "Auxotroph",
    short: "A mutant organism requiring a specific nutrient to grow.",
    long: "An auxotroph cannot synthesize an essential nutrient (amino acid, vitamin, nucleotide) and must obtain it from the growth medium. Auxotrophs are valuable genetic markers and selection tools.",
    why: "Brenner discovered that 'some phage mutants were also tryptophan deficient' and used this connection to study biosynthesis pathways. Auxotrophic markers enabled countless genetic selections. Transcript anchor: §53.",
    related: ["wild-type", "conditional-lethal", "genetic-screen"],
    category: "biology",
  },
  "aminoacyl-trna-synthetase": {
    term: "Aminoacyl-tRNA Synthetase",
    short: "Enzyme that attaches the correct amino acid to its tRNA.",
    long: "Aminoacyl-tRNA synthetases charge each tRNA with its cognate amino acid. There are typically 20 synthetases, one for each amino acid. They embody half of the genetic code: matching amino acids to tRNAs.",
    why: "The synthetases are the physical implementation of Crick's adaptor hypothesis. When suppressor mutations change tRNA specificity, 'we've changed a normal transfer RNA... and allow it to read this and make a misprint.' Transcript anchor: §139.",
    related: ["trna", "adaptor-hypothesis", "genetic-code", "wobble"],
    category: "biology",
  },

  // --- C. elegans Specifics ---

  "self-fertilizing-hermaphrodite": {
    term: "Self-Fertilizing Hermaphrodite",
    short: "An organism that produces both sperm and eggs and can self-cross.",
    long: "C. elegans hermaphrodites first produce sperm, then switch to producing oocytes, and fertilize themselves. This allows each animal to be 'a cross of itself with itself.'",
    why: "Brenner chose C. elegans partly because of its 'beautiful sex life... there's no better inbreeding than to cross yourselves with yourself all the time.' Self-fertilization simplifies genetics enormously. Transcript anchor: §148.",
    related: ["c-elegans", "hermaphrodite", "n2", "isogenic"],
    category: "biology",
  },
  "unc-54": {
    term: "unc-54",
    short: "The gene encoding the major myosin heavy chain in C. elegans muscle.",
    long: "unc-54 mutants are paralyzed because they lack functional myosin in body wall muscle. This was one of the first C. elegans genes whose protein product was identified biochemically.",
    why: "Brenner's group discovered that 'unc-54 apparently controlled a major component of the body musculature: the heavy chain of myosin.' This proved that genetic mutants corresponded to specific proteins. Transcript anchor: §163.",
    related: ["unc-mutant", "c-elegans", "behavioral-mutant"],
    category: "biology",
  },

  // --- Historical Context ---

  "saturday-morning-coffee": {
    term: "Saturday Morning Coffee",
    short: "The informal LMB discussion group where ideas flowed freely.",
    long: "The Saturday morning coffee at the LMB was an informal gathering in the sterilizing kitchen where scientists discussed 'molecular structure, embryology, psychology, sometimes politics, just anything.'",
    why: "These informal discussions were crucial for cross-pollination of ideas. The open, conversational atmosphere fostered the kind of lateral thinking Brenner valued. Transcript anchor: §158.",
    related: ["mrc-lab", "conversational-science", "kitchen-table-science"],
    category: "brenner",
  },

  // ============================================================================
  // Fifth Batch: Additional Terms from Transcript (December 2025)
  // ============================================================================

  // --- Key People ---

  "erwin-schrodinger": {
    term: "Erwin Schrodinger",
    short: "Physicist whose book 'What Is Life?' influenced a generation of molecular biologists.",
    long: "Schrodinger's 1944 book asked how physics could explain heredity and life. Many molecular biologists cite it as their inspiration for entering the field, though Brenner identified a 'fundamental error' in Schrodinger's thinking.",
    why: "Brenner noted that 'every one of one's colleagues has always said that the book that influenced them most is What Is Life.' But he saw that Schrodinger missed the need for a program to build the machinery. Transcript anchor: §44.",
    related: ["von-neumann", "what-is-life", "schrodingers-error"],
    category: "biology",
  },
  "what-is-life": {
    term: "What Is Life?",
    short: "Schrodinger's influential 1944 book on the physical basis of heredity.",
    long: "Schrodinger's book asked how the stability of genetic information could be explained by physics. It introduced the concept of 'aperiodic crystals' (now understood as DNA) and inspired many physicists to enter biology.",
    why: "While influential, Brenner saw that Schrodinger's framework was incomplete. Von Neumann's automata theory provided the missing piece: the distinction between program and machine. Transcript anchor: §44.",
    related: ["erwin-schrodinger", "von-neumann", "schrodingers-error"],
    category: "biology",
  },
  "schrodingers-error": {
    term: "Schrodinger's Error",
    short: "The mistaken belief that you can calculate an organism directly from its chromosomes.",
    long: "Brenner identified Schrodinger's 'fundamental error': assuming you could compute an organism from its genetic sequence alone. Von Neumann showed that you need both the program (DNA) AND the machinery (ribosomes, etc.) to execute it.",
    why: "Brenner contrasted Schrodinger with von Neumann: 'the program has to build the machinery to execute the program.' You cannot predict the phenotype from genotype without knowing the cellular context. Transcript anchor: §46.",
    analogy:
      "Like expecting to run software without a computer. The program is necessary but not sufficient; you need the execution environment too.",
    related: ["von-neumann", "erwin-schrodinger", "what-is-life"],
    category: "brenner",
  },
  "jack-dunitz": {
    term: "Jack Dunitz",
    short: "Crystallographer who first told Brenner about the DNA structure.",
    long: "Jack Dunitz was a crystallographer Brenner met at Oxford. In April 1953, Dunitz told Brenner that Watson and Crick had solved the structure of DNA, prompting their trip to Cambridge to see the model.",
    why: "This moment was pivotal: 'Jack Dunitz then told me... that Francis Crick and Jim Watson had solved the structure of DNA... we decided to go across to see it.' Transcript anchor: §55.",
    related: ["francis-crick", "james-watson", "cavendish-laboratory"],
    category: "biology",
  },
  "aaron-klug": {
    term: "Aaron Klug",
    short: "Structural biologist who came to the LMB and worked on virus structures.",
    long: "Aaron Klug joined the LMB and made fundamental contributions to understanding virus structure and the development of image reconstruction methods in electron microscopy. He won the Nobel Prize in Chemistry in 1982.",
    why: "Brenner mentioned Klug as one of the important people who joined the LMB in the 1960s, along with Hugh Huxley working on muscle proteins. Transcript anchor: §89.",
    related: ["mrc-lab", "electron-microscopy", "max-perutz"],
    category: "biology",
  },
  "max-perutz": {
    term: "Max Perutz",
    short: "Crystallographer who determined the first protein structure (hemoglobin).",
    long: "Max Perutz led the MRC unit that became the Laboratory of Molecular Biology. He solved the structure of hemoglobin using X-ray crystallography, sharing the 1962 Nobel Prize with John Kendrew.",
    why: "Perutz's work on hemoglobin was foundational for structural biology. Brenner described the excitement when 'Max got this' structure after years of work. Transcript anchor: §89.",
    related: ["mrc-lab", "john-kendrew", "phase-problem", "isomorphous-replacement"],
    category: "biology",
  },
  "john-kendrew": {
    term: "John Kendrew",
    short: "Crystallographer who solved the first protein structure (myoglobin).",
    long: "John Kendrew determined the structure of myoglobin, the first protein structure ever solved. He shared the 1962 Nobel Prize with Max Perutz. The first low-resolution structure 'looked like just a roll of sausages.'",
    why: "Brenner recalled 'when John got the first 6A structure of myoglobin and it looked like just a roll of sausages.' This was a landmark achievement in structural biology. Transcript anchor: §89.",
    related: ["mrc-lab", "max-perutz", "phase-problem"],
    category: "biology",
  },

  // --- Key Concepts ---

  "wiring-diagram": {
    term: "Wiring Diagram",
    short: "The complete map of neural connections in a nervous system.",
    long: "A wiring diagram shows every neuron and every synapse in a nervous system. Brenner and colleagues reconstructed the complete C. elegans wiring diagram from serial section electron microscopy, enabling computational analysis of neural circuits.",
    why: "Brenner emphasized that 'obtaining a complete wiring diagram is essential to understand complex biological systems. So the big job was: find the wiring diagram.' Transcript anchor: §146.",
    related: ["connectome", "serial-section", "electron-microscopy", "neuron"],
    category: "biology",
  },
  heteroduplex: {
    term: "Heteroduplex",
    short: "A double-stranded DNA molecule with strands from different sources.",
    long: "Heteroduplexes form when DNA from two different sources is denatured and reannealed. Mismatches or deletions appear as bubbles or loops in electron microscopy, revealing sequence differences.",
    why: "Brenner joked about the ubiquity of the technique: 'I thought one day that I would make one of these things out of rope on a beach and just photograph it.' Transcript anchor: §103.",
    related: ["electron-microscopy", "deletion-mapping", "dna"],
    category: "method",
  },
  "enzyme-induction": {
    term: "Enzyme Induction",
    short: "The rapid synthesis of enzymes in response to a signal.",
    long: "Enzyme induction occurs when adding a substrate or inducer triggers rapid synthesis of the enzymes needed to metabolize it. Jacob and Monod studied the kinetics of induction, which led to the operon model.",
    why: "The speed of enzyme induction was puzzling: 'they had been studying the kinetics of enzyme induction after you add the gene to a cell and found that this happened extremely rapidly.' Transcript anchor: §96.",
    related: ["operon", "jacques-monod", "francois-jacob", "pajamo-experiment"],
    category: "biology",
  },
  chemoaffinity: {
    term: "Chemoaffinity",
    short: "Sperry's theory that neurons find targets through molecular matching.",
    long: "Roger Sperry proposed that each neuron has specific molecular markers that match with its target. This 'chemoaffinity hypothesis' explained how neural wiring could be specified genetically.",
    why: "Brenner discussed how 'Sperry had put forward what was called the chemoaffinity... each recipient had a molecule and each donor had a molecule, and only when they matched could the nerves wire up.' Transcript anchor: §163.",
    related: ["wiring-diagram", "neuron", "synapse", "connectome"],
    category: "biology",
  },
  "commaless-code": {
    term: "Commaless Code",
    short: "Crick's hypothesis that overlapping frames would produce nonsense.",
    long: "Crick proposed a 'commaless code' where only 20 of the 64 possible triplets would be sense codons, automatically preventing out-of-frame reading. This elegant idea turned out to be wrong when the real code was deciphered.",
    why: "Brenner discussed how 'sense and nonsense' thinking led to the commaless code concept, which was a beautiful but incorrect theory about how the genetic code might work. Transcript anchor: §108.",
    related: ["genetic-code", "codon", "reading-frame", "frameshift"],
    category: "biology",
  },
  "diamond-code": {
    term: "Diamond Code",
    short: "Gamow's overlapping triplet code hypothesis.",
    long: "George Gamow proposed that amino acids fit into diamond-shaped holes in the DNA major groove, with overlapping triplets specifying the sequence. This was an early attempt to solve the coding problem.",
    why: "Brenner discussed eliminating 'all overlapping triplet code' including Gamow's proposal. Sequence data from proteins eventually ruled out overlapping codes. Transcript anchor: §68-69.",
    related: ["genetic-code", "george-gamow", "overlapping-code", "rna-tie-club"],
    category: "biology",
  },
  "vacuous-theory": {
    term: "Vacuous Theory",
    short: "Brenner's critique: the more general the theory, the more empty it is.",
    long: "Brenner warned against overly general theories that explain everything and nothing. When Gunther Stent claimed development was 'solved' by the operon model, Brenner countered that 'the more general the theory the more vacuous it is.'",
    why: "This is a key Brenner principle: general frameworks may feel satisfying but lack predictive power. Real biology requires specific, testable mechanisms. Transcript anchor: §126.",
    analogy:
      "Like saying 'evolution explains everything' without specifying the actual selection pressures, mutations, and mechanisms at work.",
    related: ["theory-kill", "discriminative-experiment", "third-alternative"],
    category: "brenner",
  },
  "sb-educational-society": {
    term: "SB Educational Society",
    short:
      "Brenner's method of learning: colleagues must explain their work with 5 minutes notice.",
    long: "Brenner formed the 'SB Educational Society' where colleagues had to explain their research with only 5 minutes notice. His reasoning: 'if you had to prepare anything on what you were doing at the moment you'd better get worried, because it means you don't know what you're doing.'",
    why: "This reflects Brenner's belief that scientists should always be ready to articulate their work clearly. It also kept him educated across diverse fields. Transcript anchor: §158.",
    related: ["saturday-morning-coffee", "conversational-science", "mrc-lab"],
    category: "brenner",
  },

  // --- Historical Places ---

  "cavendish-laboratory": {
    term: "Cavendish Laboratory",
    short: "The Cambridge physics lab where Brenner first saw the DNA model.",
    long: "The Cavendish Laboratory at Cambridge was where Watson and Crick built the DNA model. In April 1953, Brenner traveled there with Jack Dunitz and 'saw the DNA model for the first time... that's when I saw that this was it.'",
    why: "The moment of seeing the model was transformative: 'In a flash you could just see that everything... the curtain had been lifted and everything was now clear what to do.' Transcript anchor: §55.",
    related: ["francis-crick", "james-watson", "jack-dunitz", "mrc-lab"],
    category: "biology",
  },
  germiston: {
    term: "Germiston",
    short: "The South African town where Sydney Brenner was born and raised.",
    long: "Germiston is a town near Johannesburg where Brenner grew up. His father was a cobbler and they lived 'in two rooms at the back of his shop.' Despite the provincial setting, Brenner's early chemistry experiments in a garage launched his scientific career.",
    why: "Brenner's origins in a 'provincial place in a provincial country' shaped his drive to reach 'the testing ground at the centre.' Transcript anchor: §1-5.",
    related: ["testing-ground", "power-of-ignorance"],
    category: "brenner",
  },

  // --- Experimental Concepts ---

  revertant: {
    term: "Revertant",
    short: "A mutant that has regained the wild-type phenotype.",
    long: "A revertant is a mutant that recovers normal function, either by back-mutation to the original sequence or by a second-site suppressor mutation. Revertants are valuable for studying gene function and interactions.",
    why: "Selecting for revertants was a powerful genetic tool. Brenner used reversion analysis extensively to understand suppressor mutations and genetic interactions.",
    related: ["suppressor-mutation", "wild-type", "mutation", "genetic-screen"],
    category: "biology",
  },
  "neuron-hypothesis": {
    term: "Neuron Hypothesis",
    short:
      "The principle that nervous systems are built from discrete cells connected by synapses.",
    long: "The neuron hypothesis, established by Cajal and others, showed that nervous systems are composed of individual cells (neurons) connected at synapses, not continuous networks. This was a foundational breakthrough.",
    why: "Brenner told a student asking about 'the next breakthrough in the nervous system': 'you are 50 years too late, it's already happened, it's called the neuron hypothesis.' Transcript anchor: §184.",
    related: ["neuron", "synapse", "connectome", "wiring-diagram"],
    category: "biology",
  },
  "machine-language-of-biology": {
    term: "Machine Language of Biology",
    short: "The low-level instructions that actually execute biological programs.",
    long: "Brenner distinguished between high-level descriptions of behavior and the actual 'machine language' of biology: the specific neurons, connections, and molecular mechanisms that implement function.",
    why: "Brenner criticized simulations in Fortran: 'a proper simulation must be done in the machine language of the object being simulated.' You need lists of neurons, connections, and operations. Transcript anchor: §147.",
    related: ["wiring-diagram", "von-neumann", "turing-machine", "one-dimensional-sequence"],
    category: "brenner",
  },

  // --- C. elegans Specifics ---

  male: {
    term: "Male (C. elegans)",
    short: "Rare males used for genetic crosses in C. elegans.",
    long: "C. elegans hermaphrodites occasionally produce males (about 0.1% of progeny). Males can mate with hermaphrodites, enabling genetic crosses to move mutations between strains. Males arise from X chromosome nondisjunction.",
    why: "Brenner noted that 'these nematodes have occasional males which crop up in cultures and you can use these males to move genes from one animal to another.' Transcript anchor: §148.",
    related: ["c-elegans", "hermaphrodite", "self-fertilizing-hermaphrodite", "isogenic"],
    category: "biology",
  },
  "behavioral-screen": {
    term: "Behavioral Screen",
    short: "A genetic screen that selects mutants based on abnormal behavior.",
    long: "Behavioral screens identify mutants by how they move, feed, mate, or respond to stimuli. In C. elegans, Brenner selected movement mutants by placing animals on one side of a plate and bacteria on the other: only animals that could move would reach the food.",
    why: "Brenner developed elegant behavioral screens: 'taking a petri dish and putting a few thousand nematodes on one side of it and giving some bacteria on the other side... only the ones that can move will get there very efficiently.' Transcript anchor: §153.",
    related: ["unc-mutant", "behavioral-mutant", "genetic-screen", "chemotaxis"],
    category: "method",
  },

  // --- Philosophical Principles ---

  "program-builds-machine": {
    term: "Program Builds Machine",
    short: "Von Neumann's insight: the genetic program must construct its own execution machinery.",
    long: "Von Neumann showed that in self-replicating systems, the program (genome) must encode instructions for building the machine (cell) that executes the program. This is fundamentally different from computer programs that run on pre-existing hardware.",
    why: "Brenner quoted von Neumann: 'the program has to build the machinery to execute the program.' This distinguishes biology from conventional computation. Transcript anchor: §47.",
    analogy:
      "A Python script runs on pre-built hardware. DNA must first build the ribosome that reads it. The genome is both blueprint and bootstrap.",
    related: ["von-neumann", "schrodingers-error", "turing-machine"],
    category: "brenner",
  },
  "cultivation-of-organisms": {
    term: "Cultivation of Organisms",
    short: "The craft of growing and maintaining experimental organisms.",
    long: "Brenner emphasized that he 'did all of these experiments with my own hands, for the simple reason that I loved the cultivation of organisms.' Mastering the practical craft of growing organisms was essential for doing good experimental biology.",
    why: "Brenner saw cultivation as both art and necessity: 'I just loved the idea of growing all these strange bacteria... to bring it to the stage that in fact other people can take it over.' Transcript anchor: §143.",
    related: ["c-elegans", "model-organism", "n2", "bacteriophage"],
    category: "brenner",
  },

  // ============================================================================
  // Sixth Batch: Additional Terms from Transcript (December 2025)
  // ============================================================================

  // --- Brenner Philosophy on Ignorance ---

  "spreading-ignorance": {
    term: "Spreading Ignorance",
    short: "Brenner's provocative idea that we should spread ignorance rather than knowledge.",
    long: "Brenner argued that too much knowledge constrains creativity. He advocated 'spreading ignorance rather than knowledge, because it's ignorance that allows you to do things.' Outsiders who haven't been 'entrained into the standard approach' make breakthroughs.",
    why: "This connects to his belief in the power of ignorance: 'people who come from the outside, who have not been entrained into the standard approach, can see things from a different way.' Transcript anchor: §63.",
    related: ["power-of-ignorance", "productive-ignorance", "knowledge-is-dangerous"],
    category: "brenner",
  },
  "knowledge-is-dangerous": {
    term: "Knowledge Is Dangerous",
    short: "Brenner's warning that excessive knowledge harms research creativity.",
    long: "Brenner believed that knowing too much prevents scientists from trying new things. When saturated with knowledge, you dismiss novel ideas with 'don't be silly, that'll never work.' A modicum of ignorance is essential for discovery.",
    why: "Brenner stated: 'knowledge is dangerous to research. I really think that a modicum of ignorance is absolutely essential. Because otherwise you don't try anything.' Transcript anchor: §200.",
    related: ["spreading-ignorance", "power-of-ignorance", "productive-ignorance"],
    category: "brenner",
  },
  "stay-imprisoned": {
    term: "Stay Imprisoned",
    short: "Brenner's principle: keep your thinking within physical constraints.",
    long: "Brenner and Crick tried to 'stay imprisoned within the physical context of everything.' This means respecting molecular scales, diffusion rates, and physical laws when imagining biological processes. Fantasy must be constrained by physics.",
    why: "Brenner noted that 'people don't teach them some scales of anything and how molecules reach things. Francis and I tried very hard to stay imprisoned within the physical context of everything.' Transcript anchor: §70.",
    related: ["von-neumann", "machine-language-of-biology", "one-dimensional-sequence"],
    category: "brenner",
  },

  // --- Key People ---

  "gunther-stent": {
    term: "Gunther Stent",
    short:
      "Phage biologist who proclaimed molecular biology 'solved' and later wrote its obituary.",
    long: "Gunther Stent was a phage biologist at Berkeley's Virus Lab who became famous for declaring development was 'solved' by Jacob and Monod, and later writing what Brenner called 'The End of Molecular Biology.'",
    why: "Brenner used Stent as an example of vacuous theorizing: 'Gunther Stent wrote an article saying development was a solved problem... But the more general the theory the more vacuous it is.' Transcript anchor: §126.",
    related: ["vacuous-theory", "virus-lab", "phage-group"],
    category: "biology",
  },
  "arthur-kornberg": {
    term: "Arthur Kornberg",
    short: "Biochemist who discovered DNA polymerase and lectured Brenner on metabolism.",
    long: "Arthur Kornberg discovered DNA polymerase, for which he won the Nobel Prize. He represented the biochemist view that DNA replication was 'straightforward': DNA + polymerase + triphosphates = more DNA.",
    why: "Brenner recalled receiving 'a fatherly lecture from Arthur Kornberg, which irritated me, telling me I didn't understand intermediary metabolism.' This represented the clash between genetics and biochemistry. Transcript anchor: §104.",
    related: ["dna", "meselson-stahl", "replication"],
    category: "biology",
  },
  "erwin-chargaff": {
    term: "Erwin Chargaff",
    short: "Biochemist famous for base-pairing rules and acerbic wit about molecular biology.",
    long: "Erwin Chargaff discovered the base-pairing rules (A=T, G=C) that helped solve DNA structure. He was famously critical of the new molecular biologists, calling them 'people who practised biochemistry without a licence.'",
    why: "When 'messenger' was proposed for mRNA, Chargaff quipped: 'Mercury may have been the messenger of the gods, but he was also the god of the thieves.' Brenner responded: 'I think it's right to steal from nature.' Transcript anchor: §106.",
    related: ["mrna", "biochemistry-without-license", "dna"],
    category: "biology",
  },

  // --- Places and Institutions ---

  "phage-church": {
    term: "Phage Church",
    short: "The tight-knit community of phage biologists centered at Cal Tech.",
    long: "The 'Phage Church' was the informal name for the community of phage biologists who gathered at Cal Tech, Cold Spring Harbor, and other centers. They shared a rigorous, quantitative approach to biology pioneered by Delbruck.",
    why: "Brenner wrote: 'We came to Cal Tech, and that brought me in direct contact with the Phage Group, the Phage Church, at which I met many people who had become lifelong friends.' Transcript anchor: §79.",
    related: ["phage-group", "max-delbruck", "cold-spring-harbor", "bacteriophage"],
    category: "biology",
  },
  "virus-lab": {
    term: "Virus Lab",
    short: "The Berkeley laboratory where Brenner worked with Gunther Stent.",
    long: "The Virus Laboratory at UC Berkeley was a major center for phage research. Brenner visited there after Cold Spring Harbor and Cal Tech, working with Gunther Stent on phage genetics.",
    why: "Brenner 'went up to Berkeley to see the Virus Lab where I actually started to work with Gunther Stent.' This was part of his immersion in American phage biology. Transcript anchor: §79.",
    related: ["phage-church", "gunther-stent", "bacteriophage"],
    category: "biology",
  },
  "woods-hole": {
    term: "Woods Hole",
    short: "Marine biology laboratory where secret developmental biology seminars were held.",
    long: "Woods Hole is a marine biology laboratory in Massachusetts. Brenner attended a 'secret seminar' there where developmental biologists debated whether differentiation was 'a state or a process.'",
    why: "Brenner recalled 'a secret seminar held in the house of one of the... of a very high class exclusive' discussing differentiation. This shows how developmental biology was grappling with fundamental questions. Transcript anchor: §153.",
    related: ["cold-spring-harbor", "mrc-lab", "cell-lineage"],
    category: "biology",
  },

  // --- Key Concepts and Metaphors ---

  "hysterical-snakes": {
    term: "Hysterical Snakes",
    short: "Brenner's vivid metaphor for mRNA threading through ribosomes.",
    long: "Brenner corrected the common image of ribosomes moving along mRNA. Since ribosomes are large and diffuse slowly, 'the messengers must be moving through the cell like a lot of hysterical snakes, threading their way through the ribosomes.'",
    why: "This metaphor captures the dynamic reality of translation and Brenner's insistence on staying 'imprisoned within the physical context.' The image helps visualize molecular scales correctly. Transcript anchor: §70.",
    related: ["mrna", "ribosome", "stay-imprisoned", "translation"],
    category: "brenner",
  },
  "biochemistry-without-license": {
    term: "Biochemistry Without a License",
    short: "Chargaff's dismissive description of molecular biologists.",
    long: "Erwin Chargaff famously complained that 'molecular biologists were people who practised biochemistry without a licence.' This captured the tension between traditional biochemists and the new molecular geneticists.",
    why: "Brenner used this quote to illustrate how the old guard didn't understand that 'you could have a structure which is a theory, that you could go from this theory to something that was biology.' Transcript anchor: §61.",
    related: ["erwin-chargaff", "francis-crick", "james-watson"],
    category: "brenner",
  },
  "theory-of-mutagenesis": {
    term: "Theory of Mutagenesis",
    short: "Brenner's paper proposing two classes of mutations: substitutions and frameshifts.",
    long: "Brenner and colleagues wrote 'The Theory of Mutagenesis' proposing that mutations fell into two classes: substitution mutants (induced by base analogues) and addition/deletion mutants (induced by acridines, causing frameshifts).",
    why: "This theoretical framework was crucial: 'we showed we could induce those mutants with base analogues, but we could not induce them with acridines.' The distinction enabled the frameshift experiments. Transcript anchor: §107.",
    related: ["frameshift", "proflavine", "base-analogue", "acridine"],
    category: "method",
  },
  acridine: {
    term: "Acridine",
    short: "A class of mutagens that cause frameshift mutations by intercalating into DNA.",
    long: "Acridine dyes like proflavine intercalate between DNA base pairs, causing insertions or deletions during replication. Unlike base analogues that cause substitutions, acridines cause frameshifts.",
    why: "The key distinction: 'we showed we could induce those mutants with base analogues, but we could not induce them with acridines.' This proved the existence of two mutation classes. Transcript anchor: §107.",
    related: ["proflavine", "frameshift", "theory-of-mutagenesis", "base-analogue"],
    category: "biology",
  },

  // --- Experimental Concepts ---

  "old-ribosomes-new-rna": {
    term: "Old Ribosomes, New RNA",
    short:
      "The key prediction of messenger RNA: new genetic information on pre-existing ribosomes.",
    long: "The messenger RNA hypothesis predicted that after phage infection, new RNA would appear on old ribosomes (not new ribosomes as previously thought). Brenner and Jacob designed their experiment specifically to demonstrate this.",
    why: "Brenner emphasized: 'we realise we have to show that this new RNA is on old ribosomes' and 'what we had decided to go for was a really definitive one which would demonstrate that new RNA was added to old ribosomes.' Transcript anchor: §98.",
    related: ["mrna", "ribosome", "pajamo-experiment", "francois-jacob"],
    category: "biology",
  },
  "state-or-process": {
    term: "State or Process",
    short:
      "The fundamental question: is cell differentiation a stable state or an ongoing process?",
    long: "Early developmental biologists debated whether differentiation was 'a state' (stable, self-maintaining) or 'a process' (requiring continuous signals). This question shaped thinking about gene regulation and cell fate.",
    why: "Brenner attended 'a secret seminar' at Woods Hole where 'they had discussed the question of whether differentiation was a state or a process.' Transcript anchor: §153.",
    related: ["cell-lineage", "apoptosis", "operon", "woods-hole"],
    category: "biology",
  },

  // --- Historical Context ---

  "end-of-molecular-biology": {
    term: "End of Molecular Biology",
    short: "Gunther Stent's premature obituary for the field.",
    long: "Around the time molecular biology was entering its most productive phase, Gunther Stent wrote an article declaring the field essentially complete. Brenner and colleagues called it 'The End of Molecular Biology' (later part of a more general 'End of Everything').",
    why: "Brenner recalled 'Gunther Stent had written this famous paper... it used to be called by us The End of Molecular Biology.' This premature closure is a cautionary tale about declaring science finished. Transcript anchor: §178.",
    related: ["gunther-stent", "vacuous-theory", "phage-group"],
    category: "brenner",
  },
  "steal-from-nature": {
    term: "Steal from Nature",
    short: "Brenner's response to Chargaff's quip about Mercury being god of thieves.",
    long: "When Chargaff noted that Mercury (messenger of the gods) was also 'the god of the thieves,' Brenner responded: 'I think it's right to steal from nature.' This captures the molecular biologist's ethos of extracting nature's secrets.",
    why: "Brenner's retort shows his irreverent approach to science and willingness to take what works from any source. Transcript anchor: §106.",
    related: ["erwin-chargaff", "mrna", "conversational-science"],
    category: "brenner",
  },

  // --- Technical Terms ---

  hydroxylamine: {
    term: "Hydroxylamine",
    short: "A chemical mutagen that causes specific C-to-T transitions.",
    long: "Hydroxylamine causes deamination of cytosine, leading to C-to-T (and G-to-A) transitions. Its specificity allowed Brenner to determine which DNA strand carried specific mutations.",
    why: "Brenner used hydroxylamine to decode nonsense codons: 'only by that experiment, hydroxylamine mutation, and a lot of knowledge about what amino acids these were, did we fulfil the original program of sequencing DNA.' Transcript anchor: §134.",
    related: ["mutation", "base-analogue", "theory-of-mutagenesis", "genetic-code"],
    category: "method",
  },
  "binary-code": {
    term: "Binary Code",
    short: "Sinsheimer's proposal that the genetic code might use only purines vs pyrimidines.",
    long: "Robert Sinsheimer proposed that the genetic code might be a 'binary code' distinguishing only purines from pyrimidines, not individual bases. This was wrong, but represented early attempts to explain why ribosomal RNA composition seemed invariant.",
    why: "Brenner noted that 'Sinsheimer did make a suggestion that essentially the code would have to be a pyrimidine purine code. That of course is wrong, but that is what we had to face.' Transcript anchor: §95.",
    related: ["genetic-code", "codon", "diamond-code", "commaless-code"],
    category: "biology",
  },

  // ============================================================================
  // Seventh Batch: Additional Terms from Transcript (December 2025)
  // ============================================================================

  // --- Genetics Methods ---

  "genetic-dissection": {
    term: "Genetic Dissection",
    short: "Breaking down a phenotype by finding all the genes that can break it.",
    long: "A concept championed by Seymour Benzer: take a phenotype, find all the ways to break it with mutations, and thereby identify all the genes specifying that function. Each mutant class represents a gene required for the phenotype.",
    why: "Brenner explained that Benzer 'had this view of genetic dissection which is take the phenotype, find out how many ways there are of breaking it, and now you have all the genes specifying this.' Transcript anchor: §131.",
    analogy:
      "Reverse-engineering a machine by breaking one part at a time to see what stops working.",
    related: ["conditional-lethal", "behavioral-screen", "forward-genetics"],
    category: "method",
  },
  "temperature-sensitive": {
    term: "Temperature-Sensitive Mutant",
    short: "A mutant that functions at one temperature but fails at another.",
    long: "Temperature-sensitive (ts) mutants typically encode proteins that fold correctly at permissive temperatures but misfold at restrictive temperatures. This allows essential genes to be studied by growing organisms at permissive temperature and shifting to restrictive temperature to observe phenotype.",
    why: "Brenner started 'a rather large project together with François to look for temperature-sensitive mutants of E. coli' and later sought nematodes from the equator hoping to find organisms with higher temperature tolerance. Transcript anchor: §122.",
    related: ["conditional-lethal", "genetic-dissection", "forward-genetics"],
    category: "method",
  },
  "analysis-of-epistasis": {
    term: "Analysis of Epistasis",
    short: "Ordering genes in a pathway by combining mutations.",
    long: "When you put two mutations together and the double mutant looks like one single mutant, the other gene must act 'downstream' in the pathway. This allows you to order genes into genetic pathways without knowing their molecular identities.",
    why: "Brenner described how 'we could analyse these mutants by putting them in combinations, the so-called analysis of epistasis. Namely if you put two mutations together and the phenotype was like A, then it meant that B had no extra effect and therefore acted after A.' Transcript anchor: §172.",
    analogy:
      "If breaking Step 3 of a recipe produces the same result whether Step 5 is broken or not, Step 5 must come after Step 3.",
    related: ["genetic-pathway", "genetic-dissection", "suppressor-mutation"],
    category: "method",
  },

  // --- Nonsense Mutations ---

  "amber-mutant": {
    term: "Amber Mutant",
    short: "A mutation creating a UAG stop codon, named after Bernstein (German for 'amber').",
    long: "Amber mutants create premature UAG stop codons, terminating translation early. Named because the first student to find one was Hilliard Bernstein, and 'Bernstein' is German for 'amber.' These became crucial tools for studying the genetic code.",
    why: "Brenner explained: 'the first student to find the mutant was a man called Hilliard Bernstein. All right, now you couldn't call them Bernstein mutants, but amber, Bernstein is the German for amber.' Transcript anchor: §133.",
    related: ["ochre", "nonsense-suppressor", "chain-termination", "genetic-code"],
    category: "biology",
  },
  ochre: {
    term: "Ochre Mutant",
    short: "A mutation creating a UAA stop codon.",
    long: "Ochre mutants create premature UAA stop codons. Named to continue the color theme from amber mutants. Together with amber and opal (UGA), these three nonsense codons were crucial for understanding the genetic code.",
    why: "Brenner 'was able to prove, knowing that ambers and ochres and UGAs were connected, I was able to say that the nonsense mutants had a U, that one of them had a U and two As [UAA].' Transcript anchor: §135.",
    related: ["amber-mutant", "nonsense-suppressor", "chain-termination"],
    category: "biology",
  },
  "nonsense-suppressor": {
    term: "Nonsense Suppressor",
    short: "A mutation that allows read-through of stop codons.",
    long: "Nonsense suppressors are typically mutant tRNAs that recognize stop codons and insert an amino acid instead of terminating translation. They allow continued protein synthesis past what would otherwise be a premature stop.",
    why: "Brenner reasoned that 'if this is the case, then when you suppress it, then we think you just carry on the chain.' These suppressors became essential tools for genetic analysis. Transcript anchor: §134.",
    related: ["amber-mutant", "ochre", "chain-termination", "trna"],
    category: "biology",
  },

  // --- Brenner Philosophy ---

  "being-a-rebel": {
    term: "Being a Rebel",
    short: "Brenner's preference for working against conventional wisdom.",
    long: "Brenner consciously positioned himself against mainstream scientific fashion, believing that the 'standard parts of any activity are already petrified at the core.' Rebellion wasn't contrarianism but a strategy for finding unexplored territory.",
    why: "Brenner stated: 'Being a rebel has always appealed to me, largely because I'm convinced that the standard parts of any activity are already petrified at the core.' Transcript anchor: §233.",
    related: ["out-of-phase", "power-of-ignorance", "spreading-ignorance"],
    category: "brenner",
  },
  "out-of-phase": {
    term: "Out of Phase",
    short: "Brenner's strategy of working either ahead of or behind scientific fashion.",
    long: "Brenner advocated working 'out of phase' with mainstream science: 'either half a wavelength ahead or half a wavelength behind. It doesn't matter. But if you're out of phase with the fashion you can do new things.'",
    why: "Brenner said 'the best thing in science is to work out of phase' to avoid the 'scientific/industrial complex' where topics get 'industrialised, exploited to the hilt, and remarkably, they vanish.' Transcript anchor: §143.",
    analogy:
      "Arriving at a party either before the crowd arrives (set the agenda) or after it leaves (pick up what was missed).",
    related: ["being-a-rebel", "project-research", "power-of-ignorance"],
    category: "brenner",
  },
  "project-research": {
    term: "Project Research",
    short: "Industrial-style science where a 'general' directs troops.",
    long: "Brenner used this term dismissively for research where 'a general could plan a campaign and then just get the cavalry to do this and the artillery to do that.' He felt this approach missed what science should be about.",
    why: "Brenner said 'that was a kind of project research' and 'that didn't seem to me to be what one wants to do in science.' He preferred exploratory, curiosity-driven work. Transcript anchor: §178.",
    related: ["out-of-phase", "hal-biology", "conversational-science"],
    category: "brenner",
  },
  "hal-biology": {
    term: "HAL Biology",
    short: "Have A Look biology: Brenner's term for observation-first science.",
    long: "H-A-L stood for 'Have A Look.' Brenner emphasized direct observation over blind experimentation: 'what's the use of doing a lot of biochemistry when you can just see what happened?' This approach informed the entire C. elegans program.",
    why: "Brenner 'had invented something called HAL biology. HAL, that's H-A-L, it stood for Have A Look biology.' This observational approach was central to nematode development studies. Transcript anchor: §198.",
    analogy: "A mechanic who opens the hood and looks before running diagnostic tests.",
    related: ["cell-lineage", "serial-sectioning", "electron-microscopy"],
    category: "brenner",
  },
  "computable-organism": {
    term: "Computable Organism",
    short: "Brenner's claim that organisms can be computed from their DNA.",
    long: "Brenner's 'most outrageous statement': 'one day people will be able to compute a mouse from the DNA sequences alone.' The test of understanding is the ability to compute the outcome from the inputs. DNA sequences plus initial conditions should suffice.",
    why: "Brenner used this as his 'criterion' for understanding biology: 'the total or final explanation of everything is to be able to compute animals from DNA sequences alone. If you can get that, then we have an explanation of everything.' Transcript anchor: §206.",
    analogy:
      "Understanding a program means being able to predict its output from its source code and inputs.",
    related: ["initial-conditions", "general-appendage-equation", "biological-plausibility"],
    category: "brenner",
  },
  "initial-conditions": {
    term: "Initial Conditions",
    short: "The starting state required alongside DNA to compute an organism.",
    long: "Brenner clarified that computing an organism requires 'DNA sequences plus some initial conditions which good physicists would always include.' The egg's cytoplasm, maternal RNAs, and spatial organization are essential starting data.",
    why: "Brenner added this caveat: 'I should have added into that description: that is, DNA sequences plus some initial conditions which good physicists would always include. And of course it's in the definition of the initial conditions, that's the important thing.' Transcript anchor: §124.",
    related: ["computable-organism", "cell-lineage", "program-builds-machine"],
    category: "brenner",
  },
  "general-appendage-equation": {
    term: "General Appendage Equation",
    short: "Brenner's hypothetical equations governing limb development.",
    long: "Brenner imagined that a physicist would want equations where variables determine appendage type: 'You could get wings with feathers, you could get feet with scales, and you could get legs with hair.' The equations would have 'eigenvalues and forbidden areas' explaining why we don't have 'wings with hair' or 'feet with feathers.'",
    why: "Brenner described how 'if you were a physicist, what you would want to do is to have a set of equations. These equations would be called almost certainly the general appendage equation.' Transcript anchor: §206.",
    related: ["computable-organism", "biological-plausibility", "turing-machine"],
    category: "brenner",
  },
  "biological-plausibility": {
    term: "Biological Plausibility",
    short: "The requirement that theories must be biochemically realistic.",
    long: "Brenner insisted that theories must be biologically plausible, not just logically valid. He criticized theories that assumed 'prime numbers existed in nature' or required more specificity than DNA could encode. 'Many theories are correct in a logical sense but they're untrue because they don't refer to the natural thing we're all interested in.'",
    why: "Brenner stated that 'it is so important in trying to make theories, is that they should always contain some biological plausibility estimate.' Transcript anchor: §165.",
    related: ["vacuous-theory", "computable-organism", "chemoaffinity"],
    category: "brenner",
  },

  // --- Techniques and Methods ---

  "serial-sectioning": {
    term: "Serial Sectioning",
    short: "Cutting tissue into sequential thin slices for 3D reconstruction.",
    long: "Serial sectioning involves cutting tissue into hundreds or thousands of sequential thin slices, imaging each, then computationally reconstructing the 3D structure. This was how Brenner's team mapped the entire C. elegans nervous system.",
    why: "Brenner 'started to master the techniques of serial sectioning' and earlier had done 'three-dimensional reconstruction of embryos from serial sections' in medical school. Transcript anchor: §153.",
    related: ["wiring-diagram", "electron-microscopy", "hal-biology"],
    category: "method",
  },
  "computers-as-servants": {
    term: "Computers as Servants",
    short: "Brenner's philosophy that computers should serve scientists, not dominate them.",
    long: "In an era when computing meant batch processing at centralized facilities, Brenner insisted that 'computers should be servants and not masters.' He advocated for dedicated machines that scientists controlled directly.",
    why: "Brenner recalled that 'we tried to tell them that we don't want to do computing this way, computers should be servants and not masters.' He also coined 'ad hoc' for his style, meaning 'hands-on computing.' Transcript anchor: §158.",
    related: ["hal-biology", "wiring-diagram"],
    category: "brenner",
  },

  // --- Development and Cell Biology ---

  "digital-vs-analogue": {
    term: "Digital vs Analogue Development",
    short: "Cell fate determined by lineage (digital) versus gradients (analogue).",
    long: "Brenner framed developmental mechanisms as either digital (cell fate determined by division history/lineage) or analogue (fate determined by position in morphogen gradients). C. elegans development proved largely digital.",
    why: "Brenner noted that 'gradients would be the analogue way of doing it, and lineage would be the digital way of doing it.' Both mechanisms exist but in different proportions across organisms. Transcript anchor: §201.",
    related: ["cell-lineage", "density-gradient", "chemoaffinity"],
    category: "biology",
  },
  "descriptive-level": {
    term: "Descriptive Level",
    short: "Pure description of phenotypes without mechanistic understanding.",
    long: "The descriptive level means cataloging what happens without understanding how or why. Early genetics could find mutants and describe their effects but couldn't 'get any deeper.' Moving beyond description requires connecting phenotypes to molecular mechanisms.",
    why: "Brenner noted that 'it was extremely difficult to get any deeper than just finding a mutant and finding out what it does. That is the purely descriptive level.' The fusion of genetics and biochemistry broke this barrier. Transcript anchor: §62.",
    related: ["computable-organism", "brenner-method", "hal-biology"],
    category: "method",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a jargon term by key.
 *
 * @param termKey - The dictionary key (lowercase, hyphenated)
 * @returns The jargon term or undefined if not found
 *
 * @example
 * const term = getJargon("c-elegans");
 * if (term) console.log(term.short);
 */
export function getJargon(termKey: string): JargonTerm | undefined {
  return jargonDictionary[termKey];
}

/**
 * Get all terms in a specific category.
 *
 * @param category - The category to filter by
 * @returns Array of [key, term] tuples
 */
export function getTermsByCategory(category: JargonCategory): [string, JargonTerm][] {
  return Object.entries(jargonDictionary).filter(([, term]) => term.category === category);
}

/**
 * Get all category names with term counts.
 *
 * @returns Array of [category, count] tuples
 */
export function getCategoryCounts(): [JargonCategory, number][] {
  const counts: Record<JargonCategory, number> = {
    operators: 0,
    brenner: 0,
    biology: 0,
    bayesian: 0,
    method: 0,
    project: 0,
  };

  for (const term of Object.values(jargonDictionary)) {
    counts[term.category]++;
  }

  return Object.entries(counts) as [JargonCategory, number][];
}

/**
 * Search for terms matching a query.
 *
 * @param query - Search query
 * @returns Array of [key, term] tuples matching the query
 */
export function searchJargon(query: string): [string, JargonTerm][] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return Object.entries(jargonDictionary);

  const parts = lowerQuery.split(/\s+/).filter(Boolean);

  return Object.entries(jargonDictionary).filter(([key, term]) => {
    const haystack = [
      key,
      term.term,
      term.short,
      term.long,
      term.analogy ?? "",
      term.why ?? "",
      ...(term.related ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return parts.every((part) => haystack.includes(part));
  });
}

/**
 * Get the total number of terms in the dictionary.
 */
export function getTermCount(): number {
  return Object.keys(jargonDictionary).length;
}

// ============================================================================
// Auto-Matching for Text Processing
// ============================================================================

/**
 * A match found in text with its position and term key.
 */
export interface JargonMatch {
  /** Start index in the original text */
  start: number;
  /** End index in the original text */
  end: number;
  /** The matched text as it appears */
  matchedText: string;
  /** The dictionary key for this term */
  termKey: string;
}

// Cache for the compiled regex and term map
let _matcherCache: {
  regex: RegExp;
  termMap: Map<string, string>;
} | null = null;

/**
 * Build a matcher that can find jargon terms in text.
 * Results are cached for performance.
 */
function buildJargonMatcher(): { regex: RegExp; termMap: Map<string, string> } {
  if (_matcherCache) return _matcherCache;

  // Build a map from lowercase display terms to their keys
  const termMap = new Map<string, string>();

  for (const [key, term] of Object.entries(jargonDictionary)) {
    // Add the display term
    termMap.set(term.term.toLowerCase(), key);

    // Add the key itself (handles hyphenated keys)
    termMap.set(key.toLowerCase(), key);

    // Add common variations
    const termLower = term.term.toLowerCase();

    // Handle "C. elegans" variations: "c elegans", "c.elegans"
    if (termLower.includes(". ")) {
      termMap.set(termLower.replace(/\. /g, " "), key); // "c elegans"
      termMap.set(termLower.replace(/\. /g, "."), key); // "c.elegans" (no space)
    }

    // Handle hyphenated terms: "level-split" -> "level split"
    if (key.includes("-")) {
      termMap.set(key.replace(/-/g, " "), key);
    }
  }

  // Sort by length (longest first) to match longer terms before shorter ones
  const sortedTerms = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);

  // Build regex pattern - escape special chars and require word boundaries
  const escapedTerms = sortedTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  // Use word boundaries, case-insensitive
  const pattern = `\\b(${escapedTerms.join("|")})\\b`;
  const regex = new RegExp(pattern, "gi");

  _matcherCache = { regex, termMap };
  return _matcherCache;
}

/**
 * Find all jargon terms in a piece of text.
 *
 * @param text - The text to search
 * @returns Array of matches with positions and term keys
 *
 * @example
 * const matches = findJargonInText("C. elegans uses potency checks.");
 * // Returns matches for "C. elegans" and "potency"
 */
export function findJargonInText(text: string): JargonMatch[] {
  const { regex, termMap } = buildJargonMatcher();
  const matches: JargonMatch[] = [];

  // Reset regex state
  regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const termKey = termMap.get(matchedText.toLowerCase());

    if (termKey) {
      matches.push({
        start: match.index,
        end: match.index + matchedText.length,
        matchedText,
        termKey,
      });
    }
  }

  return matches;
}

/**
 * Get the set of all matchable term patterns (for debugging/testing).
 */
export function getMatchableTerms(): string[] {
  const { termMap } = buildJargonMatcher();
  return Array.from(termMap.keys());
}
