# Changelog

All notable changes to BrennerBot are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project does not follow semver; version numbers reflect capability milestones.

Repository: <https://github.com/Dicklesworthstone/brenner_bot>

---

## [v0.5.0] - 2026-11-21

**Full Web Lab Wiring, Command Palette, Installer Hardening & Security Updates**

Compare: [v0.4.1...v0.5.0](https://github.com/Dicklesworthstone/brenner_bot/compare/v0.4.1...v0.5.0)

### Web App & Brenner Loop Cockpit

- Mount global Command Palette in root layout with routes for sessions, operators, glossary, tutorials, and analytics ([5e3ffa8](https://github.com/Dicklesworthstone/brenner_bot/commit/5e3ffa8), [01518d9](https://github.com/Dicklesworthstone/brenner_bot/commit/01518d9))
- Add dedicated `/corpus/[doc]` document page with cross-reference navigation and tighten `/method`, glossary, hypothesis, and tutorial example pages ([01e0537](https://github.com/Dicklesworthstone/brenner_bot/commit/01e0537), [1b9fd70](https://github.com/Dicklesworthstone/brenner_bot/commit/1b9fd70))
- Wire local Brenner Loop cockpit, tribunal prompts, operator wizards, session subpages, 7-dimension Brenner scorecard, program storage, and cross-session intervention summaries into live routes ([344064c](https://github.com/Dicklesworthstone/brenner_bot/commit/344064c), [83dee66](https://github.com/Dicklesworthstone/brenner_bot/commit/83dee66), [02941d7](https://github.com/Dicklesworthstone/brenner_bot/commit/02941d7))
- Wire hypothesis lifecycle, confounds & evolution diff, literature evidence, LaTeX/PDF/JSON brief export, persona inspector, ExcerptBasket + SessionMachine diagnostics, anomaly quarantine, critique ledger, operator audit, multi-round debate, robustness/test-binding, roster audit, Coach checkpoints, UndoRedo, semantic hypothesis similarity, and failure/calibration analytics ([890304b](https://github.com/Dicklesworthstone/brenner_bot/commit/890304b), [d790041](https://github.com/Dicklesworthstone/brenner_bot/commit/d790041), [dfaac85](https://github.com/Dicklesworthstone/brenner_bot/commit/dfaac85), [5b2a730](https://github.com/Dicklesworthstone/brenner_bot/commit/5b2a730), [9cb0667](https://github.com/Dicklesworthstone/brenner_bot/commit/9cb0667), [d994b98](https://github.com/Dicklesworthstone/brenner_bot/commit/d994b98))
- Feature `/brennerbot-with-ntm` skill and NTM control plane on homepage & docs ([c900e84](https://github.com/Dicklesworthstone/brenner_bot/commit/c900e84))
- Fix `SessionsListPage` demo/fresh-workspace crash when non-`RS*` thread IDs (e.g. `demo-*` fixtures) were passed into `createResearchProgram()`

### Installer Reliability

- Fix `install.sh` continuing with an empty version when GitHub latest-release lookup fails (bash command-substitution `errexit` loss), preventing spurious 404 requests to `releases/download/v/` (fixes [#18](https://github.com/Dicklesworthstone/brenner_bot/issues/18))
- Add explicit empty-version guards in version resolution, URL builders, and argument parsing, plus subprocess regression tests in `brenner.test.ts`

### Dependencies & Security

- Upgrade `next` `16.1.1 -> 16.4.6` (patching critical/high Next.js advisories), `react`/`react-dom` `19.2.3 -> 19.3.1`, `tailwindcss`/`@tailwindcss/postcss` `4.1.18 -> 4.3.5`
- Upgrade `@huggingface/transformers` `3.8.1 -> 4.3.2`, `@google-analytics/admin` `9.0.1 -> 10.2.0`, `@google-analytics/data` `5.2.1 -> 7.3.0`, `vitest`/`@vitest/coverage-v8` `4.0.16 -> 5.1.1`, `happy-dom` `20.0.11 -> 21.0.4`, `jsdom` `27.4.0 -> 31.0.1`, `lucide-react` `0.562.0 -> 1.77.0`, `@testing-library/jest-dom` `6.9.1 -> 8.0.0`, `@types/node` `20 -> 26.6.6`, plus Radix UI, TanStack Query/Form/Virtual/Store, Playwright, and transitive security refreshes (`bun audit` reduced from 147 vulnerabilities / 7 critical to 2 / 0 critical)

### Testing & Quality

- Web unit tests: 4,548 passed / 12 skipped / 0 failed across 187 test files (`vitest 5.1.1`)
- CLI & installer tests: 186 passed / 0 failed across `brenner.test.ts` and `evidence-pack.test.ts`
- `tsc --noEmit`, ESLint, Oxlint, Next.js 16.4.6 production build, `bash -n install.sh`, and `shellcheck install.sh` all pass

---

## [v0.4.1] - 2026-08-16

**Doctor Status Rollup, Installer Domain Rewrite & Cockpit Update**

Compare: [v0.4.0...v0.4.1](https://github.com/Dicklesworthstone/brenner_bot/compare/v0.4.0...v0.4.1)

- Degrade `brenner doctor` overall status and exit code when `--agent-mail` fails ([34a59a8](https://github.com/Dicklesworthstone/brenner_bot/commit/34a59a8), fixes [#17](https://github.com/Dicklesworthstone/brenner_bot/issues/17))
- Update cockpit default swarm spec from legacy `gmi` to Antigravity `agy` ([6e4403e](https://github.com/Dicklesworthstone/brenner_bot/commit/6e4403e))
- Rewrite `https://brennerbot.org/install.sh` to GitHub raw `main/install.sh` ([f08d7e0](https://github.com/Dicklesworthstone/brenner_bot/commit/f08d7e0), fixes [#15](https://github.com/Dicklesworthstone/brenner_bot/issues/15))
- Remove broken async `skipIf` in `agentMail.test.ts` ([a79cef7](https://github.com/Dicklesworthstone/brenner_bot/commit/a79cef7))

---

## [v0.4.0] - 2026-03-31

**Robot Mode, Session Replay, Scoring CLI & Web Integration**

### Robot Mode & Multi-Agent Orchestration

- HITL step mode: run one robot round then exit for human review; resume by re-running ([3493705](https://github.com/Dicklesworthstone/brenner_bot/commit/3493705))
- Robot-stress command: adversarial stress testing on surviving hypotheses ([3493705](https://github.com/Dicklesworthstone/brenner_bot/commit/3493705))
- Per-agent health reporting with timeout tracking and SIGKILL escalation ([3493705](https://github.com/Dicklesworthstone/brenner_bot/commit/3493705))
- Fix four robot mode bugs: partial merge, SIGKILL escalation, convergence, unused import ([41e83c0](https://github.com/Dicklesworthstone/brenner_bot/commit/41e83c0))
- Clear timeout timers in spawn error handler ([02cb44a](https://github.com/Dicklesworthstone/brenner_bot/commit/02cb44a))
- Switch from --sandbox to --yolo flag for Gemini CLI invocation ([2cf2cf7](https://github.com/Dicklesworthstone/brenner_bot/commit/2cf2cf7))
- Warn when operator notes file not found instead of failing silently ([fbdfdb8](https://github.com/Dicklesworthstone/brenner_bot/commit/fbdfdb8))

### Session Replay Infrastructure

- Add `session record` CLI command: converts robot session directories into reproducible SessionRecord JSON with content hashes, agent roster, and trace metadata
- Add `session replay --mode trace` CLI command: step-through replay of recorded sessions showing round-by-round message summaries

### Web App: Robot Session Viewer

- Robot sessions (from `brenner session robot`) now appear in the web app sessions list
- Dedicated robot session detail view with round timeline, agent health, convergence status, and artifact rendering
- Robot sessions load from `BRENNER_ROBOT_SESSIONS_DIR` or `<repo>/artifacts/` — no Agent Mail needed

### Scoring CLI (Documentation Fix)

- `brenner score`, `brenner feedback`, and `brenner leaderboard` were already implemented — corrected README which incorrectly stated they were planned

### Multi-Agent Tutorial Data

- Centralized multi-agent cockpit tutorial data file with path metadata, 10 step definitions, code blocks, troubleshooting, and checkpoints
- Added exports to tutorial-data index for the multi-agent-cockpit track

### Artifact Merge & Delta Pipeline

- Promote "reason" to first-class system field, remove kill_reason alias ([1d860fb](https://github.com/Dicklesworthstone/brenner_bot/commit/1d860fb))
- Expand array payloads into individual ADD deltas and track field corrections ([9e4ddb1](https://github.com/Dicklesworthstone/brenner_bot/commit/9e4ddb1))
- Surface field correction warnings during EDIT operations ([3b5636c](https://github.com/Dicklesworthstone/brenner_bot/commit/3b5636c))
- Catch delta runtime errors and coerce domain strings on research threads ([44319ab](https://github.com/Dicklesworthstone/brenner_bot/commit/44319ab))
- Fix delta fence leak, field aliasing, and KILL reason normalization ([5606c92](https://github.com/Dicklesworthstone/brenner_bot/commit/5606c92))
- Resolve three crash/compat bugs in memory context and artifact merge ([b43ed40](https://github.com/Dicklesworthstone/brenner_bot/commit/b43ed40))

### Toolchain & Dependencies

- Update toolchain manifest pins to match tested versions ([3534cbb](https://github.com/Dicklesworthstone/brenner_bot/commit/3534cbb))
- Update stale NTM and CASS version pins in toolchain manifest ([18bc01b](https://github.com/Dicklesworthstone/brenner_bot/commit/18bc01b))

### Code Quality & Testing

- TypeScript: 0 errors, 4,505 tests passing, production build clean
- Resolve ESLint set-state-in-effect errors in React hooks ([bc4acf8](https://github.com/Dicklesworthstone/brenner_bot/commit/bc4acf8))
- Update tests and regex for operator-library parsing ([d2ff760](https://github.com/Dicklesworthstone/brenner_bot/commit/d2ff760))
- Add afterEach cleanup to prevent /tmp inode exhaustion in tests ([44b5b67](https://github.com/Dicklesworthstone/brenner_bot/commit/44b5b67))

### Licensing & Metadata

- Update license to MIT with OpenAI/Anthropic Rider ([1b67af2](https://github.com/Dicklesworthstone/brenner_bot/commit/1b67af2))
- Add MIT License file ([5d5a99e](https://github.com/Dicklesworthstone/brenner_bot/commit/5d5a99e))
- Add GitHub social preview image ([5abfd0e](https://github.com/Dicklesworthstone/brenner_bot/commit/5abfd0e))

### CI/CD

- Add notify-acfs workflow for ACFS lesson registry sync ([b4c3273](https://github.com/Dicklesworthstone/brenner_bot/commit/b4c3273))
- Improve GitHub Actions workflows with best practices ([66d01ac](https://github.com/Dicklesworthstone/brenner_bot/commit/66d01ac))

---

## [v0.3.0] - 2026-01-07

**Security Hardening, Demo Mode & Storage Optimizations**

52 commits since v0.2.0. Published release: [v0.3.0 on GitHub](https://github.com/Dicklesworthstone/brenner_bot/releases/tag/v0.3.0).

Compare: [v0.2.0...v0.3.0](https://github.com/Dicklesworthstone/brenner_bot/compare/v0.2.0...v0.3.0)

### Security

- Defense-in-depth authentication with HMAC-based timing-safe secret comparison ([8e3415b](https://github.com/Dicklesworthstone/brenner_bot/commit/8e3415bef29e47398a7867ed64f19efc1b973a01))
- Prevent command whitelist bypass via path injection in experiment execution API ([4cdffbd](https://github.com/Dicklesworthstone/brenner_bot/commit/4cdffbdde1ac725a4164ecf3b9beb4f7f31f440e))
- Rate-limited server-side analytics (60 req/min per IP) to bypass ad blockers while preventing abuse

### Demo Mode

Public demonstration capability for [brennerbot.org](https://brennerbot.org) visitors who are not authenticated, with isolated `demo-` prefixed sessions and auto-generated sample data.

- Add demo session fixtures for public website ([f5d2411](https://github.com/Dicklesworthstone/brenner_bot/commit/f5d2411a93916ff01c5a1e0188a4684557a8dd98))
- Add DemoSessionsView component ([ba53531](https://github.com/Dicklesworthstone/brenner_bot/commit/ba535319d47442ca509c6579a0178c475c10d549))
- Integrate demo mode into sessions list and detail pages ([db30253](https://github.com/Dicklesworthstone/brenner_bot/commit/db302536aeeb754a5064f09a9661804fab64b3f6), [5d8eca5](https://github.com/Dicklesworthstone/brenner_bot/commit/5d8eca5ff5bf62501c8fe1cd15661df94cc74485))
- Complete demo mode for all session pages ([c18040b](https://github.com/Dicklesworthstone/brenner_bot/commit/c18040b97d076d5cb68e8b40035b541a5817957a))
- Auto-detect public host to force demo mode ([6deb4d9](https://github.com/Dicklesworthstone/brenner_bot/commit/6deb4d9156e106d3d5f141f7ac3d11d4de86847e))

### Storage & Performance

- Incremental index updates: O(1) updates vs O(n) full rebuilds for session saves ([97920fd](https://github.com/Dicklesworthstone/brenner_bot/commit/97920fd13191fa50a0e11cb24ef20894e31e5bbc))
- Optimized ID lookups with normalized patterns supporting dots and simple H1/T1 formats ([fb49e36](https://github.com/Dicklesworthstone/brenner_bot/commit/fb49e361a07ce0c99c8bb6a7437a1653755afbdf))

### Session State Machine & Undo

- Add backward transitions and refactor agent mail client ([519f58a](https://github.com/Dicklesworthstone/brenner_bot/commit/519f58a813ff6ef8723c1536c392408dddec4e96))
- Add apply_operator command type for operator undo/redo ([cb6f045](https://github.com/Dicklesworthstone/brenner_bot/commit/cb6f04578fd903c326b93a17446f4b796de5860b))
- Support simple H{n} ID format alongside H-{session}-{seq} ([fe4b68d](https://github.com/Dicklesworthstone/brenner_bot/commit/fe4b68d2babe37076f7069ae2f2911b44ee5ccd6))

### Parser Robustness

- Lenient delta parsing that tolerates agent hallucinations and partial syntax ([e27dc0d](https://github.com/Dicklesworthstone/brenner_bot/commit/e27dc0d9eb2b7fc4e3b5dfd8d4e6cdbfed21031b))
- Resolve React hydration mismatches across components ([9108704](https://github.com/Dicklesworthstone/brenner_bot/commit/910870427f17eb174eaf45120ebf505ef44c250b))
- Correct arena, history, lifecycle, and dispatch logic in brenner-loop ([21a15b6](https://github.com/Dicklesworthstone/brenner_bot/commit/21a15b6df0c9e8e7d51cf362e871493edbcb7e24))
- Resolve Zod SSR import failures in schema tests ([14196f7](https://github.com/Dicklesworthstone/brenner_bot/commit/14196f71540dc53a2a6209489c9a0af8b12e674d))

### Bug Fixes

- Allow public host page routes for demo content in proxy ([9d04efe](https://github.com/Dicklesworthstone/brenner_bot/commit/9d04efe157e56129771521ee0fa8ca1b43326a1f))
- Use type-safe pattern for operator applications in undo-manager ([c7c9d58](https://github.com/Dicklesworthstone/brenner_bot/commit/c7c9d582918034eb9ad03bfeeb0656fa3219f9d6))
- Rewrite parseExcerpt for multi-line quote support ([3699f72](https://github.com/Dicklesworthstone/brenner_bot/commit/3699f720c082dbe0af973bb4511adad012b3c70c))
- Handle direct Agent Mail MCP response formats in sessions API ([45b0c4b](https://github.com/Dicklesworthstone/brenner_bot/commit/45b0c4b54558e06e18eec773ce4a97a554189c7a))
- Fix threadStatus loop variable shadowing and critique timing ([ee6ad62](https://github.com/Dicklesworthstone/brenner_bot/commit/ee6ad62418bfd98f8f097cfb18522bc4818ab6d7), [7a1ed89](https://github.com/Dicklesworthstone/brenner_bot/commit/7a1ed89bc9e06c18c40bf0b7596c7e8ed249fe2e))
- Quote User-Agent key in PowerShell installer hash literals ([d13ff47](https://github.com/Dicklesworthstone/brenner_bot/commit/d13ff47c20fe955f1e5b880fa8f8e5cee139f93e))
- Use native Bun build on Windows to avoid CDN download failures ([6f7bc80](https://github.com/Dicklesworthstone/brenner_bot/commit/6f7bc801d15f5a11e8d3ed4892df9db0520c6607))
- Treat agent CLI checks as optional in doctor exit code logic ([99a9e91](https://github.com/Dicklesworthstone/brenner_bot/commit/99a9e9140f7ede63ee3acf539a5893c64db5830c))
- Consolidate reduced motion preference into shared hook ([959e644](https://github.com/Dicklesworthstone/brenner_bot/commit/959e64495785a6fca075b165d80a4afe46711ab0))

### Testing

- Regression tests for parser and storage fixes ([2b16a26](https://github.com/Dicklesworthstone/brenner_bot/commit/2b16a262e22c0e3b489e14ee638b677ecb26744e))
- Update operators test for new operator count and quote coverage ([0a38ef4](https://github.com/Dicklesworthstone/brenner_bot/commit/0a38ef4b57e9350baf280ca794efe33037255629))

---

## [v0.2.0] - 2026-01-06

**Brenner Lab Research Platform**

163 commits since v0.1.0. Published release: [v0.2.0 on GitHub](https://github.com/Dicklesworthstone/brenner_bot/releases/tag/v0.2.0).

Compare: [v0.1.0...v0.2.0](https://github.com/Dicklesworthstone/brenner_bot/compare/v0.1.0...v0.2.0)

### Research Intelligence

Features that advance the core scientific reasoning engine -- the "Brenner Loop" that drives hypothesis refinement through structured multi-agent deliberation.

- Implement Agent Debate Mode for multi-agent hypothesis evaluation ([48e06d6](https://github.com/Dicklesworthstone/brenner_bot/commit/48e06d675db7efd6f65c5358921ec39a282ca23a))
- Add failure mode analytics module to detect and track hypothesis outcome patterns ([154fbdb](https://github.com/Dicklesworthstone/brenner_bot/commit/154fbdbd04dcc8a62fb901a1dc836159fce2491a), [9f1f328](https://github.com/Dicklesworthstone/brenner_bot/commit/9f1f328cbd80b8029f260493a71bc1dbe20c87b0))
- Add confidence calibration tracking across research sessions ([562e77b](https://github.com/Dicklesworthstone/brenner_bot/commit/562e77bfc6273352a5ab05afa3338a1e188eb7cb))
- Implement domain-aware confound detection ([bc9693f](https://github.com/Dicklesworthstone/brenner_bot/commit/bc9693fb2e1b2570e1eb96a564ed74d06e0713f0))
- Add citation manager for Brenner references with proper attribution ([d343b1e](https://github.com/Dicklesworthstone/brenner_bot/commit/d343b1e7b3cf1ffca5c31afd9a642b4facd8b988))
- Add sharpening and revision editors to brenner-loop ([9dfbb7b](https://github.com/Dicklesworthstone/brenner_bot/commit/9dfbb7b3c6311a7629f63e374700e7e50ec40bc9))
- Wire SessionDashboard PhaseContent for live session visualization ([e5070d9](https://github.com/Dicklesworthstone/brenner_bot/commit/e5070d9294ff3031a5e9bf5cbdb10c6cb9afb74d))

### Search & Discovery

- Add hypothesis similarity search with vector-based semantic matching ([7944774](https://github.com/Dicklesworthstone/brenner_bot/commit/79447746021342c1ed9337c5c8184060dce77b0d))
- Add storage integration for hypothesis similarity ([8111058](https://github.com/Dicklesworthstone/brenner_bot/commit/8111058201dffbf4e7f8754251fd976cf4a3cd62))
- Add operator-aware quote matching ([934f613](https://github.com/Dicklesworthstone/brenner_bot/commit/934f6134d50a8f89ec686334fea6824fd887d876))
- Add quote-matcher module for semantic Brenner quote search ([838311f](https://github.com/Dicklesworthstone/brenner_bot/commit/838311f4a730b4ea09e06c5fdb8faa97c6306b17))
- Integrate semantic quote matching sidebar into session pages ([33cca15](https://github.com/Dicklesworthstone/brenner_bot/commit/33cca15b062d9f1844130d677e8f6b134f1b9ab3))

### Evidence & Visualization

- Implement What-If Scenario Explorer for counterfactual reasoning ([a1d51f1](https://github.com/Dicklesworthstone/brenner_bot/commit/a1d51f16fda3615bc92238ca116821e50aa1ecc1))
- Add LiteratureSearch UI component with tests ([d9a5a16](https://github.com/Dicklesworthstone/brenner_bot/commit/d9a5a16d0e534714f6d434acf6c6334205904e1c))
- Add literature integration module to evidence-ledger ([83c2458](https://github.com/Dicklesworthstone/brenner_bot/commit/83c2458ffff99340b83861a2f4f90307f966ce85))
- Add personal analytics dashboard ([48b8a89](https://github.com/Dicklesworthstone/brenner_bot/commit/48b8a899f4ba3df595b24f7419a27b542cb8ad78))
- Add hypothesis outcomes + objection/revision metrics tracking ([df5262b](https://github.com/Dicklesworthstone/brenner_bot/commit/df5262b3e88af67555cd8b6a271b9cb78d2f6eb9))

### Tribunal System

The multi-agent "tribunal" that provides adversarial review of hypotheses before they can be resolved.

- Add objection register for tracking unresolved objections ([85a0907](https://github.com/Dicklesworthstone/brenner_bot/commit/85a0907c4390600b61f18273007c5b441a3aa051))
- Block session completion when unresolved objections remain ([081b2cf](https://github.com/Dicklesworthstone/brenner_bot/commit/081b2cfdda908a779bb3eb039a7648f16aba14b3))
- Include objection register status in research briefs ([106ab8b](https://github.com/Dicklesworthstone/brenner_bot/commit/106ab8b6cc09aa125c6547cd36764ae9ede1f7f1))
- Load tribunal role prompts from spec files with caching and fallback ([94ecb47](https://github.com/Dicklesworthstone/brenner_bot/commit/94ecb47060aada76d845b402fa295685bebe51d4), [943589b](https://github.com/Dicklesworthstone/brenner_bot/commit/943589b1f6042e273342509c528960500c00c939))

### Export & Templates

- Implement multi-format Research Brief export (Markdown, DOCX-compatible) ([0a49ac2](https://github.com/Dicklesworthstone/brenner_bot/commit/0a49ac269f57381092d1e026071c8b2d914a7d22))
- Add session template system for configurable workflows ([dea1ce3](https://github.com/Dicklesworthstone/brenner_bot/commit/dea1ce39150d0e1dcbe559ff8fc7f6109066dc93))
- Add template library for domain-specific hypothesis examples ([013c0b8](https://github.com/Dicklesworthstone/brenner_bot/commit/013c0b8f6792b57b01cb3c18248f71fa77186506))
- Add domain templates for field-specific research guidance ([8f9894f](https://github.com/Dicklesworthstone/brenner_bot/commit/8f9894f70b19f1ab0a5976402248028d730ef7dc))

### Landing Page Redesign

Complete homepage overhaul with showcase sections for all major capabilities.

- Multi-Agent Orchestration and Operator Framework showcase sections ([3f77c84](https://github.com/Dicklesworthstone/brenner_bot/commit/3f77c8475ef80842aae81d754c87998e0a736b50))
- Technical Architecture section ([ed061ba](https://github.com/Dicklesworthstone/brenner_bot/commit/ed061bab38c087a010b0b74fde2bfc0317d72d04))
- Quality Assurance section ([c05e6a8](https://github.com/Dicklesworthstone/brenner_bot/commit/c05e6a8f62b6de0fe99bf615eea842d310f653ee))
- Get Started & CTA section ([9709eb5](https://github.com/Dicklesworthstone/brenner_bot/commit/9709eb519a24ce7537aa8ea3c16dd7bde5f89552))
- Multi-agent orchestration showcase on homepage ([8754556](https://github.com/Dicklesworthstone/brenner_bot/commit/8754556b83f7bb1f266c8ca70cca616a5d0da1b0))

### Animation System

- Framer Motion animation system with scroll-reveal, parallax, and hover effects ([0993a71](https://github.com/Dicklesworthstone/brenner_bot/commit/0993a71c8e121bac4ff40d893e456f520fd087ae))
- Reduced motion preference detection via useSyncExternalStore ([e4e3178](https://github.com/Dicklesworthstone/brenner_bot/commit/e4e3178826997a8fccc129e5a4d3006cb3132583))

### CLI

- Add `session diagnose` command for troubleshooting research sessions ([2a5f01e](https://github.com/Dicklesworthstone/brenner_bot/commit/2a5f01e9fab3cbf7b18eaba46da07a650c176bd8))
- Add stdin/interactive testing capability to runCli ([581f04b](https://github.com/Dicklesworthstone/brenner_bot/commit/581f04b96d12184c432acb0c801180efb4263964))

### UX

- Mobile responsive session + tutorial UX gate ([aca7063](https://github.com/Dicklesworthstone/brenner_bot/commit/aca706344e42373008949abb1e89f0f6b55dd65d))
- First-run onboarding for /sessions ([4008ea2](https://github.com/Dicklesworthstone/brenner_bot/commit/4008ea2655f1dc625074b58754b27c1c1b524960))
- iOS safe area inset handling for mobile CTA ([d2539fe](https://github.com/Dicklesworthstone/brenner_bot/commit/d2539febfd10d23429b98479831db6517fe53ded))

### Bug Fixes

- Correct delta calculation when confidence is clamped ([083cca1](https://github.com/Dicklesworthstone/brenner_bot/commit/083cca1bea11da42d4244ededae3f903a96aa69e))
- Browser-safe UUID generation with crypto fallbacks ([ab3f998](https://github.com/Dicklesworthstone/brenner_bot/commit/ab3f998b346c6b443162c22f13c5d4f3112f8887), [2c6262c](https://github.com/Dicklesworthstone/brenner_bot/commit/2c6262cb382efffff27736f73153551ff0c36ea7))
- Prevent concurrent index builds with shared promise in search ([0e7557d](https://github.com/Dicklesworthstone/brenner_bot/commit/0e7557d9fe198fd19e7b2b46201831da86471628))
- Add JSON sanitization for common LLM errors in delta-parser ([2d4e68b](https://github.com/Dicklesworthstone/brenner_bot/commit/2d4e68b128e80f9cdbe2dca8f91ba1f28528b73e))
- Add reference array deduplication and fix replace flag in artifact-merge ([f985ec7](https://github.com/Dicklesworthstone/brenner_bot/commit/f985ec785b6b9a386d56fab0a9e8a654f8f5f4b8))
- Fail-fast on missing delta fences in compile ([c505d77](https://github.com/Dicklesworthstone/brenner_bot/commit/c505d77028d2c6565a330926003f566493844474))
- Handle nested formatting and mixed list types in export ([eebd408](https://github.com/Dicklesworthstone/brenner_bot/commit/eebd408a66c1c5ea36fead1926cf960c837f0cd6))
- Harden offline queue parsing ([4f42fd6](https://github.com/Dicklesworthstone/brenner_bot/commit/4f42fd67e9cf2e2b6087c9c27e15c035da5afa6b))
- Harden objection extraction in tribunal ([c3f297d](https://github.com/Dicklesworthstone/brenner_bot/commit/c3f297d5524a66f992d631d9437a891aa3424d56))
- Resolve bugs in coach mode implementation ([69ca33a](https://github.com/Dicklesworthstone/brenner_bot/commit/69ca33a20c5c7e58d0e7a12db284528bb592b1a4))
- Add runtime validation and defensive coding to brenner-loop ([47c62a8](https://github.com/Dicklesworthstone/brenner_bot/commit/47c62a8a231d3b9a8754b72efea5959a71c903fc))

### Testing

- Storage integration tests for hypothesis similarity ([4d7a3ec](https://github.com/Dicklesworthstone/brenner_bot/commit/4d7a3ec6d049538a7340e66dfad9a6cf041a1b6e))
- SessionDashboard accessibility e2e tests ([fdf1583](https://github.com/Dicklesworthstone/brenner_bot/commit/fdf158300e45d298bfc7577c2b046e3fdddda63b))
- Coverage tests for research-brief-template ([e19966a](https://github.com/Dicklesworthstone/brenner_bot/commit/e19966a42a7e13b1f8c3a43f203445bbe3f64fb9))
- Comprehensive brenner-loop module coverage: hypothesis lifecycle, session machine, graveyard, operators, agents
- Branch coverage for sessionHypothesis, session-kickoff, and threadStatus

### Documentation

- Comprehensive README documentation for 12 new features ([9e65800](https://github.com/Dicklesworthstone/brenner_bot/commit/9e65800d499d7cc7009b16ddc03a119d4dcdcec2))
- Add delta formatting failure modes and remediation template spec ([c738d54](https://github.com/Dicklesworthstone/brenner_bot/commit/c738d54282df50b7d5a84fdb0b419fbb2fef1180))

---

## [v0.1.0] - 2026-01-05

**Initial Release**

~870 substantive commits (1243 total including beads syncs). Published release with cross-platform binaries: [v0.1.0 on GitHub](https://github.com/Dicklesworthstone/brenner_bot/releases/tag/v0.1.0).

Browse: [all commits up to v0.1.0](https://github.com/Dicklesworthstone/brenner_bot/commits/v0.1.0)

### Corpus & Source Material (2025-12-29)

The foundation of BrennerBot: 236 Sydney Brenner interview transcripts from Web of Stories, ingested as the primary-source corpus for the entire research platform.

- Add complete transcript collection (transcripts 1--236) covering Brenner's life from Eastern European origins through C. elegans, the Fugu genome, and reflections on creativity ([3d289c9](https://github.com/Dicklesworthstone/brenner_bot/commit/3d289c97398815e65cb6d2926626255035f0caab)...[3db98aa](https://github.com/Dicklesworthstone/brenner_bot/commit/3db98aab9537318dd13e569f533be845d366a1de))
- Fix truncated transcripts across multiple batches to restore full verbatim content ([9b1e228](https://github.com/Dicklesworthstone/brenner_bot/commit/9b1e228c077f6e48db113cb5f302e6ebf8f0e5b2), [2c3a35e](https://github.com/Dicklesworthstone/brenner_bot/commit/2c3a35e21a463476e17aede5eb00f7613a78b443), [143be90](https://github.com/Dicklesworthstone/brenner_bot/commit/143be9072dca6326c21077f93ae41d891fe9eca0))
- Sync complete Brenner transcript to public corpus ([c3d10a5](https://github.com/Dicklesworthstone/brenner_bot/commit/c3d10a5c6b1db85b88153516baffb7b59ca4504a))

### Multi-Model Distillations

Three independent AI model distillations of the Brenner method, each extracting complementary insights from the corpus.

- GPT-5.2 unified Brenner-method distillation ([c665929](https://github.com/Dicklesworthstone/brenner_bot/commit/c66592968aa21273ce36151cd56c8aa2b9beb103))
- Opus 4.5 "unified distillation" of the Brenner method ([25fe5fb](https://github.com/Dicklesworthstone/brenner_bot/commit/25fe5fbdc7d29f7a3418a3161c993468607b67e6))
- Gemini 3 "Brenner Kernel" distillation (mnemonic/metaphor focus) ([85c5103](https://github.com/Dicklesworthstone/brenner_bot/commit/85c51032e5b306573aec528643de31e67415191b))
- Cross-pollinate key insights across model distillations ([e667447](https://github.com/Dicklesworthstone/brenner_bot/commit/e667447d34d41e476099aca0ae2a904daa632f7b))

### Protocol Specifications

Formal specifications defining how multi-agent research sessions communicate, produce, and validate artifacts.

- Artifact schema v0.1 and security threat model ([e2cd336](https://github.com/Dicklesworthstone/brenner_bot/commit/e2cd336168a4787eb2be34c5a61eea299d567490))
- Artifact delta and merge specification v0.1 ([c3016fd](https://github.com/Dicklesworthstone/brenner_bot/commit/c3016fdac308d30c27a847df1888dc78d2fc8f0c))
- Thread and subject conventions specification v0.1 ([fc4ac7a](https://github.com/Dicklesworthstone/brenner_bot/commit/fc4ac7a64a992829c51267ac5f6eab5c957cc2dc))
- Delta output format specification v0.1 ([14fe94d](https://github.com/Dicklesworthstone/brenner_bot/commit/14fe94da253d8453dbe8522a33260aa559017420))
- Agent Mail integration contracts v0.1 ([0e8a944](https://github.com/Dicklesworthstone/brenner_bot/commit/0e8a9440950f5c8a0f7265da025e2cf83594a5af))
- Artifact linter specification v0.1 ([7f86386](https://github.com/Dicklesworthstone/brenner_bot/commit/7f863864690bc1ab144fda5b2d5c43505740e5f4))
- Message body schema and ACK semantics v0.1 ([e3ced39](https://github.com/Dicklesworthstone/brenner_bot/commit/e3ced39cbe6c2bced597656ab90c46017c107e45))
- Role prompts for Codex, Opus, and Gemini agents v0.1 ([fdf414e](https://github.com/Dicklesworthstone/brenner_bot/commit/fdf414ed36a1173afc881a7936306f3aefe630ce))
- Evaluation rubric for role outputs ([b2921ce](https://github.com/Dicklesworthstone/brenner_bot/commit/b2921ce93a6cdb1b9b25f0754ad51bec9c3a2657))
- Toolchain manifest format and initial manifest ([1c6d122](https://github.com/Dicklesworthstone/brenner_bot/commit/1c6d122120a3202afa743ad6766fc2af128c9556))

### Web Application (Next.js 16 + React 19)

The human-facing interface at [brennerbot.org](https://brennerbot.org) for corpus browsing, session viewing, and research exploration.

#### Design System & Foundation

- Set up shadcn/ui with dark theme and base components ([20d20ff](https://github.com/Dicklesworthstone/brenner_bot/commit/20d20ff4efc60f13c67c349066e66b8bf56a53ad))
- Design system foundation: layout, typography, spacing, shadows ([d6d4d10](https://github.com/Dicklesworthstone/brenner_bot/commit/d6d4d10294e5e9b4f147133c35370784bb1b03df))
- Complete UI/UX redesign for Method and Sessions pages ([d89e796](https://github.com/Dicklesworthstone/brenner_bot/commit/d89e796a51c901dd5d34fc73b9032c6f88e91f46))
- Stripe-level redesign of distillation hero sections ([71da1b1](https://github.com/Dicklesworthstone/brenner_bot/commit/71da1b1e03bc67875b9a5b46dac39e270416bdd3))
- Stunning OG images and bacteriophage favicon ([3cfc7e1](https://github.com/Dicklesworthstone/brenner_bot/commit/3cfc7e12690f3e3a22643fe3b1da06dda7059761))
- Comprehensive mobile optimization ([2945c46](https://github.com/Dicklesworthstone/brenner_bot/commit/2945c460248c1da619ce4b190d34ea5bd0740f52))

#### Corpus & Content

- Beautiful markdown renderer + unrestricted corpus browsing ([ee95794](https://github.com/Dicklesworthstone/brenner_bot/commit/ee9579473b3a440dec40f5f3c1851e5315aa3116))
- Specialized parsers and viewers for corpus rendering (transcript, distillation, quote bank, metaprompt) ([74b4741](https://github.com/Dicklesworthstone/brenner_bot/commit/74b4741e9869a11c9772b1bffdffb2d38a1aea02))
- World-class corpus page UI/UX overhaul ([0ae1407](https://github.com/Dicklesworthstone/brenner_bot/commit/0ae1407cd7055d0938ce1d8ba1bcb5c53cdcf5f7))
- Corpus search API with caching and relevance scoring ([2d7d8d0](https://github.com/Dicklesworthstone/brenner_bot/commit/2d7d8d08a3138c04a42e7b7674eea42fae04f1e4))
- Jargon dictionary with 100+ seed terms and inline tooltips ([aa3ffa6](https://github.com/Dicklesworthstone/brenner_bot/commit/aa3ffa6af37d718713f6c1abba8fea1128475f35), [0840f6c](https://github.com/Dicklesworthstone/brenner_bot/commit/0840f6c77f45d05197f71b1bae58984d665ccbb2))
- 261+ curated high-signal Brenner quotes in the quote bank ([6a80151](https://github.com/Dicklesworthstone/brenner_bot/commit/6a80151209d2530116c4dce069e33dad382d7a8a))

#### Interactive Features

- Implement comprehensive global search system ([f517365](https://github.com/Dicklesworthstone/brenner_bot/commit/f51736521fe3c6c9a94fdec3487d80122628d4eb))
- Interactive Brenner loop diagram ([6edb106](https://github.com/Dicklesworthstone/brenner_bot/commit/6edb106ff889ddad35b80e191b3accf99e8cdf3b))
- Distillation comparison view with sync scroll ([323e2d0](https://github.com/Dicklesworthstone/brenner_bot/commit/323e2d0bf675f05ab7263cae20f763e9a474c2da))
- Interactive crosswalk comparison table ([4cb0d65](https://github.com/Dicklesworthstone/brenner_bot/commit/4cb0d652082b98873a949d2067ec7d3f85d2a163))
- Command palette with keyboard navigation ([ea97999](https://github.com/Dicklesworthstone/brenner_bot/commit/ea97999af43cbedde4af87297a814c2bb002aecd))
- Toast notification system ([40f4590](https://github.com/Dicklesworthstone/brenner_bot/commit/40f4590034b2bf86cf37ec1a00004439254f28e3))
- Scroll reveal + copy micro-interactions ([59d9360](https://github.com/Dicklesworthstone/brenner_bot/commit/59d9360b2fff80fd639de26b968887eaeccfd225))
- TanStack library foundation (Table, Form, Virtual, Store) ([db9e33a](https://github.com/Dicklesworthstone/brenner_bot/commit/db9e33a9a4f85302fbaa279350ede5f4332608f3))
- Cloudflare Access header detection + security hardening ([d71eec2](https://github.com/Dicklesworthstone/brenner_bot/commit/d71eec20549d4a2f0ebfc172e1fbeaa25be80190))
- Reading position persistence with TanStack Store ([bc59946](https://github.com/Dicklesworthstone/brenner_bot/commit/bc5994695a5ea472947e36aa6a2b5a4eafe03bc9))
- Bayesian crosswalk visualization on Method page ([a6ffdc1](https://github.com/Dicklesworthstone/brenner_bot/commit/a6ffdc180b27f2f9e0ab7e6a44b8fff7f0939c6b))
- First-time user onboarding section ([c59e15b](https://github.com/Dicklesworthstone/brenner_bot/commit/c59e15bc750e183b87d1c3010d43ba98ef0e1e66))

### Brenner Loop (Research Engine)

The core research workflow engine implementing Brenner's discriminative hypothesis methodology as a four-phase pipeline: Intake, Sharpening, Testing, Resolution.

#### Hypothesis Management

- Implement HypothesisCard interface & validation ([4af6efa](https://github.com/Dicklesworthstone/brenner_bot/commit/4af6efaa4291c44414ff713933f1296225ccca25))
- Hypothesis version history & evolution graph ([2cec358](https://github.com/Dicklesworthstone/brenner_bot/commit/2cec3585027f963ca5c3256cd739d1cd1462f6e6))
- HypothesisIntake wizard component ([806e253](https://github.com/Dicklesworthstone/brenner_bot/commit/806e253d1001c4826ac645fe66382dbe37f2ff9a))
- Hypothesis Arena for competing hypotheses ([19aad80](https://github.com/Dicklesworthstone/brenner_bot/commit/19aad80f2184922e415779428b619192f8f516d5))
- Hypothesis Lifecycle State Machine ([a424147](https://github.com/Dicklesworthstone/brenner_bot/commit/a42414795da877f5a873abee3758e89a3ea7bd7a), [e16a355](https://github.com/Dicklesworthstone/brenner_bot/commit/e16a355cd74fbf5348b93495b0b11198bd6fc5e3))
- Session-hypothesis containment model ([8d5d739](https://github.com/Dicklesworthstone/brenner_bot/commit/8d5d7396af5fca6bea5d3aadac655a167f487a15))
- Prediction-lock / pre-registration system ([2b8f614](https://github.com/Dicklesworthstone/brenner_bot/commit/2b8f614be0240b0cb51a332c37518f6e470fbf84))
- Hypothesis storage layer with full CRUD ([508935b](https://github.com/Dicklesworthstone/brenner_bot/commit/508935b14a7899a4430beaf65209a6b5e1b05bd1))

#### Session Infrastructure

- Session State Machine ([176a6d3](https://github.com/Dicklesworthstone/brenner_bot/commit/176a6d393d16ee4e9ca8169314f1b152542902ed))
- Session Dashboard Layout ([598b8e7](https://github.com/Dicklesworthstone/brenner_bot/commit/598b8e78762e6e7b4e1dc596cb3a0da9299db51c))
- Session Context Provider & Hooks ([0f27908](https://github.com/Dicklesworthstone/brenner_bot/commit/0f27908fe8427e8fab4c8f415f78e55a6479725e))
- Undo/redo system for session actions ([28bfe72](https://github.com/Dicklesworthstone/brenner_bot/commit/28bfe72ee931687dc63b745d441ce8bb326ada5e))
- Realtime SSE + assumption ladder intake ([ef67808](https://github.com/Dicklesworthstone/brenner_bot/commit/ef67808e364e8f565c6e3199af7f5c318e44f0aa))
- Session schema migrations + backups ([450dd77](https://github.com/Dicklesworthstone/brenner_bot/commit/450dd77ef9f66733a6b4e5ed47c18f9aad0fa19c))
- Local session hub at /sessions/[id] ([1523ef1](https://github.com/Dicklesworthstone/brenner_bot/commit/1523ef17d9d9a32e3b839c269ff28ea985cd4c75))
- Session search (local) ([bbc75e3](https://github.com/Dicklesworthstone/brenner_bot/commit/bbc75e30d0189a5a076527e9b20409aa98b64512))
- Local session archival + storage usage tracking ([0226aab](https://github.com/Dicklesworthstone/brenner_bot/commit/0226aab9ef69b2b563061bb2c4bd6a23f5e9247d))
- Session resume intelligence ([1b68015](https://github.com/Dicklesworthstone/brenner_bot/commit/1b68015ac9e0abb7f9853a201e57ce5c8b9ac9d1))
- Serialize HypothesisStorage writes to prevent corruption ([86d5f56](https://github.com/Dicklesworthstone/brenner_bot/commit/86d5f56a0bce8cc83d06a6b5669689e2a4b16ced))
- Storage adapter concurrency fix ([dd568d2](https://github.com/Dicklesworthstone/brenner_bot/commit/dd568d22c1a483242c7fe1bd3627de6a1b989e25))
- Storage corruption recovery ([be241ae](https://github.com/Dicklesworthstone/brenner_bot/commit/be241aead94adb176150de35293bbf3db1813392))

#### Evidence & Testing Pipeline

- EvidenceEntry data model ([f07b5bb](https://github.com/Dicklesworthstone/brenner_bot/commit/f07b5bb2f0b6fe8370dd12da8c202c8213af354f))
- Confidence Update Algorithm ([b443e23](https://github.com/Dicklesworthstone/brenner_bot/commit/b443e2379cbc32130bb1a1c1f952502a3105e1bb))
- Evidence Recording UI component ([7f1c64f](https://github.com/Dicklesworthstone/brenner_bot/commit/7f1c64fdf2c126f998d0a0d5be0af1eb7a903f04))
- Session Test Queue ([72ed805](https://github.com/Dicklesworthstone/brenner_bot/commit/72ed8051dc1a41885dbbdcbc49080ab9f76be1d3))
- Heuristic tribunal synthesis ([d70c1e9](https://github.com/Dicklesworthstone/brenner_bot/commit/d70c1e93f521de7caff88e502ec5d1c485f9aba5))
- Robustness score calculation ([91692ec](https://github.com/Dicklesworthstone/brenner_bot/commit/91692eccd28a7902a5193daa35fb81003b10475b))
- Delta parser for Brenner Protocol artifacts ([f113c3d](https://github.com/Dicklesworthstone/brenner_bot/commit/f113c3da71fd0fe73ea881e5bfeffbdc9e196365))

### Operator Framework

Cognitive operators derived from Brenner's methodology -- structured thinking tools that agents apply to refine hypotheses.

- Operator Session Framework ([0d3fc71](https://github.com/Dicklesworthstone/brenner_bot/commit/0d3fc7169a17075260267625358a0a47593e78bc))
- Operator Session UI Shell ([f4c9f6f](https://github.com/Dicklesworthstone/brenner_bot/commit/f4c9f6f4a4f8aee7744e5b749543c239744ba002))
- Level Split (Sigma) operator ([8021bbe](https://github.com/Dicklesworthstone/brenner_bot/commit/8021bbe11beb91a2a90b79a650e82742035a2082))
- Exclusion Test operator ([2ffbe26](https://github.com/Dicklesworthstone/brenner_bot/commit/2ffbe26332e9bbac942903d8058e4cf67fa7dc4b))
- Object Transpose operator ([6bbf324](https://github.com/Dicklesworthstone/brenner_bot/commit/6bbf3244c48b11526ef665be9fcce7f4b6f41b39))
- Scale Check operator ([81c8fbd](https://github.com/Dicklesworthstone/brenner_bot/commit/81c8fbd34d5795e9f47ea1e79e9b49892a183961))
- Deep integration with operator cards, role prompts, and kickoff wiring ([e267e67](https://github.com/Dicklesworthstone/brenner_bot/commit/e267e67c33f02cc295d93254817ce3b5b601dce8))
- Operator documentation and in-session help ([d079f16](https://github.com/Dicklesworthstone/brenner_bot/commit/d079f16dfd41ca58949aa5713c814a9e6935815b))
- Semantic operator quotes ([a2a579f](https://github.com/Dicklesworthstone/brenner_bot/commit/a2a579ffe65943bf42a123dc509db9df5aea8c40))

### Agent System

Multi-agent orchestration via Agent Mail, coordinating Claude (Opus 4.5), Codex (GPT-5.2), and Gemini 3 as a virtual research tribunal.

- Agent Dispatch via Agent Mail ([57a20bf](https://github.com/Dicklesworthstone/brenner_bot/commit/57a20bf6ac7c3374e795438db762068b4d044025))
- AgentTribunalPanel UI ([d3e624b](https://github.com/Dicklesworthstone/brenner_bot/commit/d3e624bd5c07ea93850d250b29ee8d41138cee0f))
- Statistician tribunal persona ([f2854da](https://github.com/Dicklesworthstone/brenner_bot/commit/f2854da83c3e36b7e08dcb0f75f2c0ecef709048))
- Agent progress simulation + cancel ([6dd64e7](https://github.com/Dicklesworthstone/brenner_bot/commit/6dd64e7eca41a17514b3593eb68bff1cbd748d47))
- Brenner Channeler prompt strengthening ([5ef9826](https://github.com/Dicklesworthstone/brenner_bot/commit/5ef98263dbc348ae2533569c108883163f64fc16))
- Triangulated kernel injection into kickoffs ([5cab997](https://github.com/Dicklesworthstone/brenner_bot/commit/5cab9979b5e1d7699242d72ff63be4bf0773105d))
- SSE endpoint for realtime agent responses ([8e71ce4](https://github.com/Dicklesworthstone/brenner_bot/commit/8e71ce41560723a378a078356ee16f5c604f0b97))
- Agent Mail test server harness ([a99604e](https://github.com/Dicklesworthstone/brenner_bot/commit/a99604eccaac63bcb19c5dee72439ab34fe86172))

### Research Artifact Schemas

Zod-validated schemas for the data structures that power research sessions.

- Hypothesis Registry Schema ([697bd81](https://github.com/Dicklesworthstone/brenner_bot/commit/697bd81ea9983f4b6c6ae2d464819091e56f19fb))
- Prediction and TestRecord schemas ([c2d5ef7](https://github.com/Dicklesworthstone/brenner_bot/commit/c2d5ef7550e55e0fec472b9f5c41b5a0056aa6c3))
- Assumption schema and lifecycle state machine ([fc886d3](https://github.com/Dicklesworthstone/brenner_bot/commit/fc886d3695af72da990d0b1530a98fc9428aaf12), [8a8953e](https://github.com/Dicklesworthstone/brenner_bot/commit/8a8953eff985370a73ba3c80cd04de06f8e52ede))
- Anomaly Registry schema and storage layer ([49175dc](https://github.com/Dicklesworthstone/brenner_bot/commit/49175dcccd6893227fc141545b98f27f657e1227))
- Test Storage Layer with full CRUD ([bfe5a54](https://github.com/Dicklesworthstone/brenner_bot/commit/bfe5a5499668c49c076958aea8568b9e37c9c845))
- Assumption Storage Layer with full CRUD ([8f0c646](https://github.com/Dicklesworthstone/brenner_bot/commit/8f0c646e7352c3d13e8f02ae23f6214da05144e1))
- Brenner Method Scorecard with 14-criterion evaluation ([71e553c](https://github.com/Dicklesworthstone/brenner_bot/commit/71e553cf8be97051c5039ea598e2d1b930a04fe0))

### Experiment Capture & Encoding

- Experiment capture protocol: run/record ([d1a627c](https://github.com/Dicklesworthstone/brenner_bot/commit/d1a627c4573f99891f4c0a63d99463d739c30d1a))
- Experiment encode and post CLI commands ([3944ebc](https://github.com/Dicklesworthstone/brenner_bot/commit/3944ebc6de0441690a234357f1e9a5b9dc0254f6), [a98c934](https://github.com/Dicklesworthstone/brenner_bot/commit/a98c934bbdfdc518bcc76470372c84af339f000c))
- Evidence pack v0.1 spec and viewer ([94bb790](https://github.com/Dicklesworthstone/brenner_bot/commit/94bb7901cd0310f19f59a6f0d359ddc0ac4aacc4), [cefb209](https://github.com/Dicklesworthstone/brenner_bot/commit/cefb20967595e35e4c1355427e21c3eebfc05955))
- Experiments run endpoint for web lab ([3097533](https://github.com/Dicklesworthstone/brenner_bot/commit/3097533c5fc392287a7bded663312b32dd7c15d8))
- Semantic diff between artifact versions ([7459a16](https://github.com/Dicklesworthstone/brenner_bot/commit/7459a16253681289868de5662d8dadabfd21896e))
- Operator intervention audit trail ([6277f39](https://github.com/Dicklesworthstone/brenner_bot/commit/6277f398d689bc18181b9047901da40842f5b8d3))
- Session Replay spec implementation ([f9f4295](https://github.com/Dicklesworthstone/brenner_bot/commit/f9f4295c8a830ac469431ee9e458749e1d5bd863))

### Scoring & Evaluation

- 7-dimension session scoring with 32 tests ([220a2f9](https://github.com/Dicklesworthstone/brenner_bot/commit/220a2f901d79040c97b59d10ef10618607d1f6aa))
- Dashboard aggregation with health warnings ([3a8834f](https://github.com/Dicklesworthstone/brenner_bot/commit/3a8834fb49ebedce13852a9659a61b97248c6738))
- Score, feedback, and leaderboard CLI commands ([771b17c](https://github.com/Dicklesworthstone/brenner_bot/commit/771b17c930e45954d97c37e80638d9039f192b0a))

### Tutorial & Onboarding

Multi-path tutorial system guiding users through Quick Start, Agent-Assisted, and Multi-Agent Cockpit workflows.

- Tutorial infrastructure component library ([771271b](https://github.com/Dicklesworthstone/brenner_bot/commit/771271b094bb9b335be8700a4db5bb6c41d1e20b))
- Tutorial landing page with path selector ([de48a36](https://github.com/Dicklesworthstone/brenner_bot/commit/de48a366a06e066324ef15056c9d0d1a963af21b))
- Agent-Assisted path steps 1--8 ([94d6f7c](https://github.com/Dicklesworthstone/brenner_bot/commit/94d6f7cc46211069d7664899a6e792897a94c796))
- Multi-Agent Cockpit tutorial (10 steps) ([7887a35](https://github.com/Dicklesworthstone/brenner_bot/commit/7887a35fb14881356b228bcf69044d4fb179d5d2))
- Domain-specific tutorial examples ([f910d23](https://github.com/Dicklesworthstone/brenner_bot/commit/f910d2339d27b654837c9c04433006449016f8d6))
- Prompt Templates Library ([76af8e4](https://github.com/Dicklesworthstone/brenner_bot/commit/76af8e4ec592ca53f4de7ae3db7efcece08653f6))
- Quick Start steps completion flow ([ccff24a](https://github.com/Dicklesworthstone/brenner_bot/commit/ccff24a48905d61a14a8d034d6c7afeb9c3bbf0b))

### CLI (`@brennerbot/cli`)

Standalone Bun CLI for terminal-first research workflows, distributed as cross-platform binaries.

- Agent Mail inbox/read/ack/thread commands ([d10a646](https://github.com/Dicklesworthstone/brenner_bot/commit/d10a646b8f76a805fdc995bdce59d00dcae0bc83))
- Hypothesis CLI: list, show, create, search, link, stats ([d3b0de3](https://github.com/Dicklesworthstone/brenner_bot/commit/d3b0de3d6f2ed3bc91b01ae65a22656b9c3d3060))
- Hypothesis state transition commands ([a201ccc](https://github.com/Dicklesworthstone/brenner_bot/commit/a201ccc3137c84da2d8ccd38b7c224bdbc523670))
- Assumption registry commands ([5d4e17e](https://github.com/Dicklesworthstone/brenner_bot/commit/5d4e17e0c84cbd2f02a3274f44b4579369c96369))
- Anomaly CLI commands ([468abd5](https://github.com/Dicklesworthstone/brenner_bot/commit/468abd542a09b373dff233917d6317951bb295c1))
- Critique registry commands ([eb470f3](https://github.com/Dicklesworthstone/brenner_bot/commit/eb470f3fe31d259add8f9be340ddf8e255ffade9))
- Test commands ([fc4136e](https://github.com/Dicklesworthstone/brenner_bot/commit/fc4136ecab2b09d080013ab693c831becb04a6f0))
- Evidence post helper ([8e32ea3](https://github.com/Dicklesworthstone/brenner_bot/commit/8e32ea3277625cc1c7203b7d1ff8490f0b4b3d51))
- Session status --watch ([6b0cd26](https://github.com/Dicklesworthstone/brenner_bot/commit/6b0cd260724f73aede8bfc73245af623f7bef3b7))
- Lint-to-operator guidance and session nudge ([d560adf](https://github.com/Dicklesworthstone/brenner_bot/commit/d560adfbc76c6a3c073e5f7ae0151123a431df90))
- Toolchain manifest parser and `plan` command ([366d3d8](https://github.com/Dicklesworthstone/brenner_bot/commit/366d3d81ecece312bbc62a9815e8aa4b298e75bc))
- Doctor: agent CLI presence checks ([40b22f1](https://github.com/Dicklesworthstone/brenner_bot/commit/40b22f1755935792b01da442e23a1022ca052e3c))
- Cockpit start command ([1dfae36](https://github.com/Dicklesworthstone/brenner_bot/commit/1dfae369f3b65134aae2ad6bd01ec74dff47b445))

### Embeddings & Semantic Search

- Vector embeddings infrastructure for semantic search ([416f46c](https://github.com/Dicklesworthstone/brenner_bot/commit/416f46cfdd488f08ae3c9289ff741afb22d9aa93))
- Local corpus embedding index ([ec0e752](https://github.com/Dicklesworthstone/brenner_bot/commit/ec0e752ab154285c86d5ac639227290f6b00c308))

### Offline Resilience

- Offline mode queue, indicators, and service worker ([3dac785](https://github.com/Dicklesworthstone/brenner_bot/commit/3dac785374366f34691a0c06bf2ecc90e6e91427))
- Service worker always returns a Response when offline ([95efe53](https://github.com/Dicklesworthstone/brenner_bot/commit/95efe53ef9d4ef97bbbba5a07de2851426f90aa1))

### Analytics & Observability

- GA4 analytics infrastructure ([47b75c9](https://github.com/Dicklesworthstone/brenner_bot/commit/47b75c9d796902ce53a01ad241399da2a56203f4))
- User acquisition tracking ([117dc77](https://github.com/Dicklesworthstone/brenner_bot/commit/117dc776afba8cca801be8a266ec79dd71dd3f15))
- System health analytics instrumentation ([dd09dc6](https://github.com/Dicklesworthstone/brenner_bot/commit/dd09dc6c9c2824fa7665e8c8ceedae5f47b5afaa))
- INP/CLS + LCP element tracking in E2E tests ([5526d8d](https://github.com/Dicklesworthstone/brenner_bot/commit/5526d8df2d49f025d28532aab95c8532d6fdf7e6))

### Security

- Harden readingStore persistence ([9c452e4](https://github.com/Dicklesworthstone/brenner_bot/commit/9c452e4682a71ff0409095aba26e8de4fddbc405))
- Prevent directory traversal via thread ID in evidence endpoints ([551ab37](https://github.com/Dicklesworthstone/brenner_bot/commit/551ab37a6ce24561dc3bf8e92ed580733b354530))
- Lab auth tightening + intervention audit coverage ([cc62cf8](https://github.com/Dicklesworthstone/brenner_bot/commit/cc62cf8fede00b7d33bd029a826598be969eccf6))

### Testing Infrastructure

Comprehensive test suite spanning unit, integration, E2E, visual regression, accessibility, and performance testing.

- Vitest for unit testing + delta-parser tests ([052c232](https://github.com/Dicklesworthstone/brenner_bot/commit/052c23253cbfb5f6a252da8683a54c8182f77900))
- Playwright E2E tests for sessions, search, authentication, and multi-agent orchestration ([28864e0](https://github.com/Dicklesworthstone/brenner_bot/commit/28864e02edfa68e32876aee7e313bce8cca0b1be), [073efa5](https://github.com/Dicklesworthstone/brenner_bot/commit/073efa54f1fd5a746f5c8c7654e7faeeb4b1f822), [8096178](https://github.com/Dicklesworthstone/brenner_bot/commit/8096178a7a3e6d00225b5b085948562db8f4a31a), [f46d93b](https://github.com/Dicklesworthstone/brenner_bot/commit/f46d93b00fc918c9a97ac68f68234ef44f28a9a4))
- Visual regression testing with Playwright snapshots ([c6244a6](https://github.com/Dicklesworthstone/brenner_bot/commit/c6244a6d367ccc8287b1ca289c2e4bec715e86dd))
- Accessibility testing with axe-core ([091ce8b](https://github.com/Dicklesworthstone/brenner_bot/commit/091ce8bce1b5fff3ff9d0e160042df0ae2388f66))
- Coverage threshold enforcement ([71f3de2](https://github.com/Dicklesworthstone/brenner_bot/commit/71f3de2fbd053c1da6bd42e0914385ce9ddfb1e4))
- Agent Mail integration tests with test server seeding ([0e02609](https://github.com/Dicklesworthstone/brenner_bot/commit/0e0260998df9d0433af56d3ac45d7869e085d9c1))
- GitHub Actions CI workflow ([8f0d850](https://github.com/Dicklesworthstone/brenner_bot/commit/8f0d850586ba90cd2f53770df5bed46b66907637))
- Unit tests across all major modules: artifact merge (21), utils (21), CommandPalette (35), SessionForm (38), navigation (58), collapsible (48), SpotlightSearch (34), operators, viewers, and more

### Documentation

- Comprehensive README with Brenner Method framework, operator algebra, and system architecture ([6d73cab](https://github.com/Dicklesworthstone/brenner_bot/commit/6d73cab565e9a62457b4d219b4625ee9e0967ad8))
- Quick Install section with curl one-liner ([90e087c](https://github.com/Dicklesworthstone/brenner_bot/commit/90e087c3801e806e593727210b8f0b59a74dd1ad))
- End-to-end analysis of BrennerBot with bio-inspired nanochat research question ([9098a87](https://github.com/Dicklesworthstone/brenner_bot/commit/9098a876e356d59407282fd22f2a5ab52d8cc36d))
- Cockpit runbook with full session workflow ([7b7d3c8](https://github.com/Dicklesworthstone/brenner_bot/commit/7b7d3c84a2ad10da9960eea52a54d4d107e2dbef))
- Deployment runbook for Vercel + Cloudflare ([880e57e](https://github.com/Dicklesworthstone/brenner_bot/commit/880e57e2419e92eed6e87c5f868e0027c2f14fc6))
- Testing best practices guide ([19a6dbc](https://github.com/Dicklesworthstone/brenner_bot/commit/19a6dbc4fd7f4f1bf6c848d14c3e8cd65b20c577))

### Cross-Platform Distribution

Release binaries for darwin-arm64, darwin-x64, linux-arm64, linux-x64, and win-x64, each with SHA256 checksums. Includes `install.sh` and `install.ps1` installer scripts.

---

[Unreleased]: https://github.com/Dicklesworthstone/brenner_bot/compare/v0.3.0...HEAD
[v0.3.0]: https://github.com/Dicklesworthstone/brenner_bot/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/Dicklesworthstone/brenner_bot/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/Dicklesworthstone/brenner_bot/releases/tag/v0.1.0
