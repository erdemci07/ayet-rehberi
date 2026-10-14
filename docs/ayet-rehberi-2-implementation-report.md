# Ayet Rehberi 2.0 — implementation report

Date: 2026-09-17. Outcome: a functioning local static production build with redesigned core screens, independent proposed ontology, local library and review-gated Esmâ architecture. No deployment or final AI classification was executed.

## A. Current project audit

See `ayet-rehberi-2-audit.md` for the baseline runtime, every route, data/provenance structure, rendering, footnotes, sharing, persistence, responsive/navigation behavior, topic outputs/aliases, ingest and analysis scripts and validation entry points. Next.js 16.3.2/React 19.2.8/TypeScript/static export/Firebase Hosting remain in place.

The audit identified that the prior heuristic classifier automatically wrote reviewed labels. Structural validators do not establish independent human review or semantic accuracy. The 65 legacy production topics/3,541 mappings remain active and unchanged under the user's migration allowance. They are not final V2 classification.

## B. Architecture

See `ayet-rehberi-2-architecture.md`. Canonical data remains immutable; proposed/reviewed/published ontology and mapping layers remain distinct; the shared UI evolves over the current production adapter. `publishedOntology.ts` prepares a later approved-data switch, deduplicating display verses while retaining relation origins. No proposal is imported into production screens. The app remains static-first and capable of a later PWA; no service worker or runtime backend was added.

New routes: `/kesfet`, `/kuran`, `/kitapligim`, `/esma`, `/esma/inceleme`. Existing `/konular`, `/sureler`, `/konu/[slug]`, `/sure/[number]` and `/ayet/[sure]/[ayet]` work. Old topic `?sayfa=` links still expose the appropriate batch; explicit verse hash links take priority over memory.

## C. Files created

Authored files, grouped by responsibility:

- Documentation: `docs/ayet-rehberi-2-audit.md`, `ayet-rehberi-2-architecture.md`, `ayet-rehberi-2-implementation-report.md`, `topic-ontology-v2.md`, `topic-classification-methodology-v2.md`, `esma-review-workflow.md`.
- Routes/tokens: `app/tokens.css`, `app/kesfet/page.tsx`, `app/kuran/page.tsx`, `app/kitapligim/page.tsx`, `app/esma/page.tsx`, `app/esma/[slug]/page.tsx`.
- Types/navigation data: `src/types/discovery.ts`, `src/data/discovery.ts`.
- Esmâ data: `src/data/esma/index.ts`, `proposed.json`, `published.json`.
- Independent ontology stores: `src/data/ontology-v2/reviewed.json`, `published.json`, `future-ai-mappings.json`, `published-mappings.json`.
- Shared UI: `src/components/layout/ThemeControl.tsx`, `src/components/verses/VerseText.tsx`, `src/components/reading/ProgressiveReader.tsx`, `DailyVerse.tsx`, `DirectVerseMemory.tsx`, `src/components/topics/DiscoveryIntents.tsx`, `TopicSave.tsx`, `src/components/library/Library.tsx`, `src/components/esma/EsmaPreview.tsx`, `EsmaReadingPage.tsx`.
- Persistence/publication helpers: `src/lib/library.ts`, `useDialogFocus.ts`, `publishedOntology.ts`.
- Offline tools: `scripts/prepare-ontology-v2.mjs`, `validate-foundation-v2.mjs`, `plan-classification-v2.mjs`, `qa-foundation-v2.mjs`.

Generated artifacts: `data/generated/topic-ontology-v2.proposed.json`, `topic-ontology-v2.report.json`, `ayet-rehberi-2-mobile-qa.json`, and ten screenshots under `data/generated/qa-v2/`. Standard Next build outputs were also regenerated in `.next/` and `out/`.

## D. Files modified

- `package.json`: added offline ontology preparation/validation and classification-plan commands; no new dependency.
- `next.config.ts`: kept export/trailingSlash, specified the actual project Turbopack root.
- `app/layout.tsx`, `globals.css`, `page.tsx`, `konular/page.tsx`, `sureler/page.tsx`, `konu/[slug]/page.tsx`, `ayet/[sure]/[ayet]/page.tsx`.
- `src/components/layout/AppShell.tsx`, `BottomNav.tsx`.
- `src/components/verses/VerseCard.tsx`, `ShareSheet.tsx`.
- `src/components/reading/ContinueReading.tsx`, `TopicReader.tsx`, `SurahReader.tsx`.
- `src/components/topics/DynamicTopicDiscovery.tsx`, `src/components/search/SearchPanel.tsx`, `src/components/footnotes/InlineFootnote.tsx`.
- `src/lib/readingProgress.ts`.

Canonical Quran, original translator/footnote metadata, original source-topic/production-topic files, old enrichment review files, ingestion infrastructure and Firebase configuration were preserved. SHA-256 checks confirm the three protected data files are byte-for-byte identical to the audit baseline.

## E. Design system

Central tokens define warm paper/surfaces, ink/muted/accent/divider/overlay/danger, spacing, radii, shadows, 680px reading width, navigation height and typography. Georgia/Times serif verse reading with existing Geist/Arial UI. Mobile gutters 18–22px; desktop centered reading canvas without a decorative phone frame. Plain surfaces and subtle separators replace dashboard-like containers.

System light/dark follows prefers-color-scheme. Manual override persists locally and applies before hydration. Warm dark colors avoid pure black/white. Important controls use 44px targets; inline markers retain 42px targets/28px circles. Visible focus, skip link, semantic headings, aria-current navigation and dialog focus management were added. Sheet entrances are 160ms; reduced motion disables animation/transitions.

## F. Bugün

Daily opening uses the canonical renderer and a small 14-record corpus pool selected by local date after hydration. It includes reference, translation, preserved markers, save/share/direct navigation. Date-dependent state does not cause hydration mismatch. Everyday queries, continuity, six balanced changing topics and the Esmâ preview follow the opening reading. There are no prayer-time/qibla/utility widgets.

## G. Keşfet and search

Search, twelve user-supplied everyday query intents and grouped existing production topics replace the flat-list entry. Intent disclosures lead to existing reviewed-labeled topics rather than introducing new verse assignments. Groups are navigational editorial metadata, not published theological taxonomy.

Search ranks exact existing aliases above everyday query matches and lexical fallback, and lazily loads translation search rather than serializing the whole corpus into home hydration. This is not advertised as a final semantic search engine. V2 reviewed aliases/intents have explicit schema and publication workflow. Dynamic discovery uses Fisher–Yates shuffling, bounded session history, category diversity, unique slugs and predefined overlapping-family avoidance; it does not promise a mathematically complete semantic synonym detector.

## H. Quran reading

Dedicated Quran/surah entry lists 114 surahs with accurate Nâs translator exception. Sure/direct verse URLs remain stable. Direct verses show translator and previous/next neighbors. Strong/primary existing topic links appear in a disclosure on the direct verse page. VerseCard delegates all segment/footnote rendering to VerseText, including unavailable source-note markers; no religious text was edited.

## I. Topic detail

Existing topic name, count, related-topic links and follow action precede continuous reading. No unreviewed description was invented. Shared ProgressiveReader initially renders 20 verses, appends batches by IntersectionObserver or explicit button, and restores a saved target's required batch before scrolling. Hundreds of heavy verse instances are not mounted on a fresh topic visit; restoring a late position may necessarily expose multiple prior batches.

## J. Kitaplığım

Functional local bookmarks, followed topics, last reading and bounded recent history. Data stores canonical verse ids/topic slugs, not modified translations. Library resolves full saved text lazily and displays saved verses in batches. No authentication or cloud sync; storage failures do not crash. Bookmark toggles work in memory during a storage-disabled visit; cross-session persistence then cannot be promised.

## K. Esmâ architecture

Typed schema includes Arabic/transliteration, Turkish name, separate meanings and reflection, Quran refs, related topics, citations/status and actual reviewer/date/notes. Proposed/published stores are empty. Public list/detail/daily components consume published records only; `inceleme` is an explicit pending information page, not an invented name. The detail component supports meanings, canonical Quran connections, related topics, reflection, sources and previous/next. No 99-name dataset, citation, repetition prescription or benefit guarantee was fabricated.

## L. Reading memory

Version 2 migrates valid v1 topic/surah memory. Stores last direct Quran verse, surah position, topic/visible verse/batch, timestamp and up to 30 recent locations. Validates local payloads and catches disabled/private/quota storage errors. IntersectionObserver position writes use a 500ms debounce and flush pending progress when leaving/hiding. Explicit deep links beat automatic restoration. Home continuity receives 114 surah references rather than the complete corpus.

## M. Footnotes

Bodies and inline segment positions remain exact canonical data. Mobile bottom sheet, desktop fixed anchored popover, viewport-clamped desktop positioning, scrollable long notes, selected marker/reference/translator attribution, outside/Escape close, keyboard containment and explicit focus return. Mobile body scroll is locked; desktop page scrolling remains available. QA verified the 2,371-character Nûr 24:31 marker 5 body exactly, with internal scrolling at every target mobile width. The 58 existing source-note warnings remain separate from verse completeness.

## N. Sharing

Existing full-text 1080×1350 PNG canvas, Sade/Krem/Gece/Yeşil themes, translator, source footnote markers, canonical URL, native file/text share and download/clipboard fallbacks are preserved. The UI uses token-aware mobile bottom sheet/desktop centered dialog with keyboard focus handling. Long Bakara 2:282 is fully retained in preview and canvas; QA reconstructed every drawn translation line and confirmed its final baseline fits the reading region. Missing clipboard support reports failure instead of claiming a successful copy; share cancellation is handled quietly.

Native operating-system share dialogs were not automated in headless Edge. The fallback PNG generation path and UI/canvas completeness were tested. Share preview for the longest verses requires internal scrolling on small screens; content is not silently truncated.

## O. Ontology V2

Exact final counts:

| Item | Count |
| --- | ---: |
| Domains | 14 |
| Canonical topics | 130 |
| Subtopics | 36 |
| Topic aliases | 276 |
| Everyday discovery intents | 16 |
| Existing source names represented | 66 / 66 |
| Unrepresented source names | 0 |
| New topics relative to the 66 source-name references | 68 |
| Consolidation rule groups | 7 |
| Special interpretation-review flags | 12 |
| Final V2 verse mappings generated | 0 |

The first 125-topic draft was expanded after coverage review to include explicit Şeytan/vesvese, melekler, cinler, gayb and general Ahiret belief. Counts were not targets. The proposal gives definitions and exclusions rather than optimizing topic size. Corpus-wide lexical retrieval hints and selected exact passage examples support inspection; they do not constitute semantic validation or final assignments.

All 68 new proposed topics: Tevhid; Allah'ın rahmeti; Allah'ın bilgisi; Allah'ın kudreti; Allah'ın adaleti; Allah'ın isimleri; İman; İnkâr; Şirk; İkiyüzlülük ve münafıklık; Takva; Hidayet; Şeytan ve vesvese; Melekler; Cinler; Gayb; Tövbe; Vahiy; Kur’an üzerinde düşünmek; Allah'ı anmak; Kullukta içtenlik; Tevekkül; Ümit ve ümitsizlik; Korku ve güven; Öfke ve özdenetim; Hüzün ve teselli; İmtihan; İç huzur ve sükûnet; Şükür; Doğruluk ve dürüstlük; Merhamet; Affetmek; Tevazu; Kibir; Emanet ve güvenilirlik; Sözünde durmak ve ahit; Gösteriş; İsraf; Çocuklar ve bakım; Boşanma; Mahremiyet ve izin; Akrabalık bağları; Yardımlaşma; Barış ve uzlaşma; Gıybet ve kötüleme; Haber ve iddia doğrulama; Danışma; Yoksulluk ve ihtiyaç sahipleri; Rızık; Ticaret ve dürüst ölçü; Borç; Yetimler ve hakları; Kumar; Adalet; Zulüm ve haksızlık; Tanıklık; Ölüm; Diriliş; Hesap ve karşılık; Cehennem; Dünya hayatının geçiciliği; Peygamberlik; Peygamber anlatıları; Elçilere verilen işaretler; Bilgi ve delil; İnsanın yaratılışı; Hayvanlar ve canlılık; Hicret.

Seven consolidation groups: sabır variations → aliases/contextual subtopics; ümit/umut/ümitsizlik → one canonical subject; infak/sadaka consolidate while zekât stays distinct; Ehl-i kitabın inananları/eleştiriler → explicit subtopics; dinde zorlama/inançlara saygı → reviewed freedom-of-belief proposal; davet/elçinin görevi → tebliğ subtopics; yazıcı melekler/yazılan kayıt → amel-kaydı subtopics. These are proposed rules, not destructive production merges. Existing names, mappings and provenance remain independently traceable.

## P. Future classification

See `topic-classification-methodology-v2.md`: discovery, per-topic full-corpus candidate retrieval, per-verse multi-label classification, passage-context validation, reverse topic review, coverage/overlap audit and human-review report. Typed mapping fields retain relationship/confidence/evidence/status/versions/origin/reviewer. Reviewed/published stores and final mapping arrays are empty.

`npm run classification:v2:plan` reports 6,236 verses, zero provider calls, seven passes and a review prerequisite. `--verse=2:153 --radius=1` previews exact independent target and adjacent canonical records/notes, without provider calls or text merging. A future executor, caching/checkpoints/cost estimation and approved provider remain next-sprint work; no full final classification was run here.

## Q. Validation

| Command / artifact | Result |
| --- | --- |
| `npm run validate:data` | PASS; 6,236 verses, 114 surahs, 6,230 Erhan Aktaş / 6 Yaşar Nuri Öztürk, only 114:1–6 fallback, 58 footnote warnings, zero errors |
| `npm run topics:validate` | PASS; 66 source seed names, 65 unchanged legacy production topics, 3,541 mappings, zero errors |
| `npm run ontology:validate` | PASS; exact counts/reference/provenance checks, zero errors, protected data hashes unchanged |
| `npm run lint` | PASS; zero errors/warnings in final run |
| `npm run build` | PASS; compiled, TypeScript passed, generated 6,426 static pages |
| Static export | `out/` generated; home/new core/deep verse/surah/topic HTML paths verified |
| Headless Edge mobile/desktop QA | PASS; 141 assertions, 90 route/width/theme findings, zero uncaught runtime errors |

QA explicitly covered 320/360/375/390/430px, nine screens in light/dark, 1000px desktop dialog behavior, no horizontal viewport overflow, no clipped verse text, five-item navigation/content clearance, exact inline note/body preservation, long-note scrolling, long-share text/canvas, keyboard/Escape/focus wrapping, reduced motion, system/manual theme persistence, bookmarks/followed topics, v1→v2 restoration/deep-link priority, progressive loading, aliases/lazy verse search, fallback attribution and storage-disabled reading/library.

Screenshots were visually inspected for narrow home, dark topic reading, longest-verse share and longest-note sheet. CSS includes safe-area-aware layout; headless emulation does not substitute for physical notched-device/screen-reader QA. The in-app browser was unavailable, so an isolated installed headless Edge profile tested the real export. The optional harness terminates its own browser/server; temporary browser-profile files remain in OS temp, not user data or production assets.

## R. Human review and remaining limits

- All ontology proposals/aliases/intents/consolidation/related edges still need actual human review; none was silently published. Special flags: nesih, isr, funeral context, moral self-evaluation, religious authority, war/cihad, slavery, authority, intercession, Ehl-i kitap, societal decline and sünnetullah.
- Esmâ requires verified source content, licensing/citation checks and recorded review before publication. Empty pending content is intentional.
- Current heuristic reviewed labels are not independent proof of human semantic approval. Retained legacy data should be re-evaluated by the future pipeline.
- Lexical hints and search are not the final semantic model. No completeness claim about source pagination follows from this sprint's 66-name ontology representation.
- Native mobile share dialogs, actual nonzero physical safe-area insets, private-mode browser variations and screen-reader experience need device testing; automated storage denial and keyboard behavior passed.
- No clinical treatment claims, guaranteed religious benefits, chain-of-thought exposure, Arabic Mushaf generation, runtime backend, cloud sync or final expensive classifier execution was added.

## S. Deployment

No `firebase deploy` was run. Firebase Hosting still points at the generated `out/` folder. This sprint ends with local production output and reviewable documentation/data.
