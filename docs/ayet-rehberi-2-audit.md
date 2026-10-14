# Ayet Rehberi 2.0 — current project audit

Audit date: 2026-09-17. This audit was performed before implementation, by reading every application route, the component/data/type/lib trees and ingestion, classification and validation entry points.

## Runtime and deployment

- Next.js 16.3.2, React/React DOM 19.2.8, TypeScript 5, Tailwind 4 and ESLint 9. App Router in `app/`; no runtime API routes or backend.
- `next.config.ts`: `output: "export"`, `trailingSlash: true`. Dynamic routes enumerate static params. Firebase Hosting serves `out/`; no application rewrites, Auth or Firestore dependencies. Deployment is outside this sprint.
- Routes: `/`, `/konular`, `/konu/[slug]`, `/sureler`, `/sure/[number]`, `/ayet/[sure]/[ayet]`. Keep their deep links. A PWA can be added later; an offline service worker does not exist today.

## Canonical data and provenance

- `src/data/quran.json` is an array of 6,236 independent Verse records: id, surahNumber/name, ayahNumber, plainTranslation, segments, footnotes, translator, isFallbackTranslation and optional fallbackReason.
- Exactly 6,230 Erhan Aktaş verses and six Yaşar Nuri Öztürk fallback verses (114:1–6). Rendering already labels fallback provenance. Source metadata and caches remain in ingestion files under `scripts/` and `data/raw/`.
- A segment is text or an inline footnote id/marker. Footnotes separately retain id/marker/text. Unavailable note bodies retain inline markers. The existing validation reports 58 missing/orphan-note warnings separately from completeness.
- Baseline SHA-256, Quran: `bef53e9693dd7b854c5810ef59d98f3272bd4a0365e8d50bb5988f8ccc5005b8`.
- Baseline SHA-256, reviewed topics: `2ba80e307852bca692552e41e5fa2bf85858a438534c077b6674fc9479b71d0b`.
- Baseline SHA-256, source topics: `2d2bd8f662b39ae2de121f56f24464c4aca7ee47b2203ad275d7d827d87662f3`.
- Unused `mockVerses.ts`/`mockTopics.ts` retain old sample/paraphrased text and noncanonical ids; no production import uses them. Keep them out of canonical rendering and future classification. `source.ts` has legacy Erhan-only metadata; production attribution must come from each Verse, not this constant.

## Topic layers and quality caveat

- `src/data/index.ts` exposes `topics-reviewed.json` as production and `source-topics.json` separately. 65 production topics, 3,541 relations; 66 source names.
- Topic fields: id/slug/name, aliases, verseIds, verseMappings (confidence/tier/source), relatedTopicIds, subtopics, source/status, oldSourceMappingCount.
- `topics.json` is the historic/source ingest output, not the production UI selection. `enriched-topics-reviewed.json` is empty. Draft files exist in both source and generated trees; the generated enrichment object is a report rather than a universal mapping schema.
- **The word reviewed does not prove human review:** `run-topic-analysis.mjs` uses normalized keywords/regular expressions, scores matches and automatically writes `reviewed-ai`/`reviewed` production records. There is no named human approval artifact. Its broad examples (e.g. a topic about believers among the People of the Book with hundreds of generic belief matches) require renewed semantic review. Preserve these records during migration; do not treat them as scripture or verified final V2 classification.
- `topic-intelligence.mjs discover` creates a plan only. `review-report` can overwrite the old report with a zero-draft summary. Do not run these mutating entry points in this sprint.
- `propose-topic-enrichment.mjs` prepares draft enrichment; no configured provider establishes theological verification.
- `fetch-source-topics-complete.mjs` uses cached ASP.NET topic pages, PageCount and __doPostBack targets/viewstate. It writes `topics.json` plus source-topic-audit.json. Do not rerun ingestion here or mistake classification of all 6,236 verses for source-pagination completeness.

## Interaction and rendering

- `VerseCard.tsx` is the existing canonical renderer, including segment positions, InlineFootnote and ShareSheet; there is no independent VerseText component initially. Preserve one renderer and extract the shared text primitive.
- SearchPanel uses normalized substring search over topic names/aliases and translation text. Entire Quran props currently cross the home client boundary; separate corpus search loading from initial hydration. Search aliases are editorial discovery inputs, not semantic proof of a verse relation.
- ShareSheet generates a full-text 1080×1350 canvas, includes translator, supports four themes, Web Share file/text and download/clipboard fallbacks. Mobile sheet / desktop modal; long verses reduce font size. Footnotes are indicated rather than copied into the graphic.
- InlineFootnote: 28px visible circle / 42px hit area, one-time hint, mobile sheet, desktop anchored popover, Escape/outside closing, body scroll lock. Existing implementation lacks a robust keyboard focus trap and right-edge popover placement.
- `readingProgress.ts`: version 1 localStorage with topic page/verse, surah verse and lastReading/timestamp; catches storage exceptions. TopicReader has 20-verse pagination, IntersectionObserver and 500ms write debounce. SurahReader mounts all verses. Explicit deep links can lose priority to automatic restoration. No library/bookmarks yet.
- DynamicTopicDiscovery: client-only random 10-topic choice with session history/category buckets. Most legacy slugs fall into general; random sort is biased and synonym avoidance is absent.

## Layout and accessibility

- AppShell provides a 620px canvas and fixed four-item bottom nav. Warm light colors, serif verse text/sans UI. No manual/system dark theme. Some literal white/green surfaces need tokens.
- CSS uses 16px mobile padding, 22px desktop; reader/card separators and sticky topic pager. Existing sheet layers are above bottom nav; page bottom padding includes safe area. Desktop frame has rounded corners resembling a phone-like enclosure.
- Focus affordances are partial, reduced-motion is supported, search uses incomplete listbox semantics, bottom nav lacks aria-current. Preserve working behaviors while correcting these gaps.

## Validation inventory

- `validate:data`: corpus count, fallback placement/provenance, duplicates, empty translations, historic topic references; footnote warnings separately reported.
- `topics:validate`: production status/provenance, identifiers, mapping/ref validity, duplicates, tiers/confidence, flattened mapping agreement, related/subtopic references and sample topics.
- `lint`, `build`: ESLint and Next production build/static generation. No dedicated browser QA dependency initially.
- Parser/ingest review: `parser.mjs` extracts named translator rows, inline font markers and separate numeric note bodies, reporting missing/orphan notes. `fetch-erhan-aktas.mjs` reads cached HTML before network fetches, generates Erhan records and narrowly appends six Nâs fallback records with metadata. Preserve these scripts and caches; the new UI is not a reason to reingest or reinterpret their text.
- Preserve these checks and add V2 proposal/schema/reference validation without claiming that structural validation establishes semantic correctness.

## Migration boundaries

Canonical Quran and existing topic/provenance outputs remain byte-for-byte intact. Evolve the domain layer using proposed-only ontology and empty reviewed/published stores. Rebuild the shared UI shell/screens using the existing production adapter. Extend local memory with a v1 migration. Prepare future context/mapping/review formats without executing final corpus classification. Esmâ starts empty and review-gated. End with local validation and static export, never deployment.
