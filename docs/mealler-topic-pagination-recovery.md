# Mealler.org topic pagination recovery

The historical source-topic layer is recovered independently from the Quran corpus, the V2 ontology, and published topic mappings.

## Source behavior

`mealler.org/Konu.aspx?id=...` is an ASP.NET page using a Telerik server-side grid. The page embeds `PageCount` and exposes page buttons as `__doPostBack` targets. Page changes therefore require a POST containing the current hidden form fields, `__EVENTTARGET`, and `__EVENTARGUMENT`; a guessed `?page=2` URL is not sufficient.

## Recovery command

```text
npm run source-topics:recover:execute
```

The command reads `src/data/source-topics.json`, reuses `data/raw/mealler-topics-complete/{topicId}-{page}.html`, fetches only missing pages, retries transient failures up to three times, and waits between requests. It never replaces `src/data/topics.json` or any V2 mapping file.

Cache-only inspection is available with:

```text
npm run source-topics:recover
npm run source-topics:recover:validate
```

## Outputs

- `data/generated/mealler-topic-mappings-complete.json`: deduplicated source references with topic, page, URL, and retrieval provenance.
- `data/generated/mealler-topic-recovery-report.json`: per-topic pages, failures, duplicate counts, old/new comparison, and completeness status.
- `data/raw/mealler-topics-complete/{topicId}-{page}.html`: raw page cache.

Only references matching the local canonical `surah:ayah` corpus are emitted as recovered mappings. Source pages are never used to replace local translation text or footnotes.

## Completeness policy

A topic is complete only when every advertised page has a cached/fetched HTML record and no pagination or request failure was recorded. Incomplete topics remain explicitly flagged in the report; they are not silently treated as complete and are not promoted into the production topic layer.