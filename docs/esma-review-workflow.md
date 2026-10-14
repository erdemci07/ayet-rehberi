# Esmâ dataset review workflow

`src/types/discovery.ts` defines EsmaEntry: id/slug, Arabic, transliteration, Turkish display name, short/long meaning, Quran references, related topics, separate reflection, source citations, reviewStatus and reviewer/date/notes. `src/data/esma/proposed.json` and `published.json` are deliberately empty. No 99-name dataset was synthesized from memory; no fabricated citations or religious promises were published.

1. Import a verifiable named source with exact URL/title/locator, checking licensing for explanations and Arabic/transliteration text.
2. Review meanings separately from editorial reflection. References must identify canonical verses whose context supports the connection. Read original translator notes; do not rewrite them.
3. Review name-list variations, spelling, translations and duplicate names. Neither a desired count nor traditional recitation claims establish validity.
4. Reject guaranteed material/medical outcomes or repetition-count prescriptions. Reflection should describe a responsible invitation to consider meaning, not assert scripture says an editorial inference.
5. Record actual reviewer/date/notes and promote to published explicitly. Published entries require citations, valid references and review artifacts. Unknown topic relationships stay empty pending ontology review.
6. Rebuild static routes. `EsmaReadingPage` supports book-like Arabic/display/meaning, Quran verses, related production topics, reflection, sources and previous/next. The current `inceleme` route is a pending information page, not an invented Esmâ entry. No daily name is displayed until reviewed records exist. EsmaPreview already selects from published records by local date once this reviewed pool is populated.

Production imports only published records. Proposed content never reaches the UI. The daily preview selects only a published record; it does not select an unreviewed generated name as a filler.
