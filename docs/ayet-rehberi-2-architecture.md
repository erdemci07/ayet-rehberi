# Ayet Rehberi 2.0 architecture and migration

## Boundaries

Data → domain adapter → static route → small interactive reading/action islands.

The immutable Quran array and original ingest caches/reports remain the canonical layer. Existing production topic mappings continue through `src/data/index.ts`. `src/data/discovery.ts` is a navigation grouping/query layer, not theological truth and not a new mapping source. V2 proposals live exclusively in `data/generated`; empty reviewed/published stores do not supersede legacy production. Topic descriptions are withheld until reviewed.

## Screens and routes

- `/` Bugün: client-date daily selection, canonical literary verse, everyday queries, reading continuity, balanced topic discovery, Esmâ review-gated preview.
- `/kesfet`: search, everyday queries and editorial navigation groups of existing production topics. `/konular` remains a working alias.
- `/kuran` and `/sureler`: dedicated Quran entry/list, 114 surahs, translator attribution accurate about Nâs fallback.
- `/sure/[number]`, `/ayet/[sure]/[ayet]`, `/konu/[slug]`: preserve canonical links; shared VerseCard/VerseText. Topic and surah readers mount 20 records at a time with progressive loading and memory restoration.
- `/kitapligim`: local bookmarks, followed topics, recent reading and last position. No login/cloud sync.
- `/esma`: empty reviewed-content shell. `/esma/[slug]`: shared reading detail architecture and an explicit `inceleme` pending route; verified published entries can later enumerate static params. No fabricated 99-name list.

## Design system

Central CSS tokens describe warm light/dark paper, ink/muted/accent/dividers/overlays, spacing, radius, shadow, widths and navigation height. Georgia/Times serif reading, existing Geist/Arial sans controls. Mobile uses 18–22px padding; desktop 680px canvas without decorative phone enclosure. Five-item safe-area navigation. Theme follows system until a persisted manual choice; pre-hydration script prevents a light-theme flash. Focus and reduced-motion rules apply centrally.

## Local persistence

Reading schema v2 migrates v1 in memory; safe wrappers validate input and catch storage failures. IntersectionObserver debounces position writes and flushes meaningful pending progress on exit. Explicit hash links win over saved memory. Restoration exposes the target batch before scrolling. Library schema v1 stores only canonical verse ids/topic slugs and bounded history, leaving room for future optional sync.

## Performance and review

Search lazily imports the Quran only when translation search is requested. Home continuity receives small reference records rather than the full corpus. Library resolves canonical text only when needed. Static route generation and existing validators remain intact. Existing production topic review labels are not independent proof of human semantic review; the audit records this limitation. New ontology and Esmâ content require explicit review/publication artifacts.

## Later migration

1. Audit/preserve immutable data and hashes.
2. Ship one shared token/shell/renderer system across the existing routes.
3. Review proposed topic definitions/aliases/intents and Esmâ evidence.
4. Run the documented future seven-pass classification with approved provider/budget, retaining separate source/AI/reviewed relations.
5. Publish only reviewed ontology and mappings through the adapter. Deduplicate `(verseId, topicId)` while keeping all origin records. Preserve old slugs via an explicit reviewed redirect/alias table.
6. Add a PWA manifest/offline caching in a separate sprint; never cache draft religious content for public use.

This sprint has no deployment, runtime backend, full final classification, authentication or synchronization.
