# Future 6,236-verse classification methodology

This sprint prepares schemas/context inputs and an offline plan only. Executing the next sprint requires a reviewed ontology, approved model/provider/budget and explicit run authorization. The current heuristic classifier is not the final pipeline and must not automatically assign reviewed status.

## Seven passes

1. Corpus/topic discovery: review the proposed ontology against the whole corpus, source name references and passages. Freeze versioned definitions, inclusion/exclusion criteria, synonyms, stable IDs and corpus hash.
2. Per-topic retrieval: search **all** 6,236 verses for each canonical definition, using lexical, semantic and reviewed source candidates. Keep origin and retrieval rank separate. Retrieval is not assignment; no minimum desired topic size.
3. Per-verse multi-label classification: evaluate target verse against candidate topic definitions. Permit primary, strong, supporting and contextual relationships; abstain on weak evidence. Store finite confidence, concise evidence references/notes and classifier/ontology version. No hidden model reasoning or generated scripture.
4. Context validation: previous/target/next verses, optionally bounded larger passage within the same surah. Decide relation for the independently identified target; do not merge neighbor text into translation. Record supporting passage ids and whether context was necessary. Check relevant original translator notes when interpreting ambiguity.
5. Reverse per-topic validation: evaluate all candidates together against that topic's definition. For Sabır, reassess every candidate for actual sebat rather than generic hardship words. Remove false positives, distinguish direct vs contextual relevance and compare Ehl-i kitap/cennet/kıyamet/polysemous examples explicitly.
6. Coverage audit: unmapped verses, sparse/broad topics, relation strength, suspiciously similar pairs and excessive overlap. Use per-topic Jaccard/intersection analysis with review flags, not automatic rejection or target counts. Unmapped verses may legitimately remain; context-only relations must not become generic fillers.
7. Human review: topic definition, exact target and passage evidence, concise note, confidence/relationship, origin, duplicate-origin records, uncertainties and reviewer decision. Only approved records can publish; proposed AI relations must never be silently promoted.

## Resumability and cost

Key a run by corpus hash + frozen ontology hash/version + prompt/classifier/model versions. Chunk work by topic/target, cache retrieval and context records, retry failed chunks only, persist completed identities atomically and make repeated runs idempotent. Estimate input/output tokens before provider calls. Keep failures distinct from abstentions. Add rate limiting, bounded retries and request identifiers. Use separate quality review samples, not topic count as success.

`scripts/plan-classification-v2.mjs` prints a no-provider plan by default. `--verse=2:153 --radius=1` prints a context payload using canonical data and original footnotes. It cannot trigger provider calls. A future executor must refuse to run while the reviewed ontology is empty.

## Mapping and publication

`VerseTopicRelation` separates target verseId/topicId, relationship, confidence, concise evidence, reviewStatus, classifierVersion, ontologyVersion, provenance and reviewer decision. Source mappings remain `mealler.org`; AI proposals remain `ai-proposed`; approved editorial relations become `human-reviewed`. Retain original evidence instead of rewriting origin.

Publication deduplicates `(verseId, topicId)` for display while retaining an origin list referencing all contributing records. Source + approved additions may appear together; unreviewed additions never appear. Validate all target/passage/topic ids, strengths, finite confidence, duplicate keys within each origin, versions and approval artifacts. Publication does not assert that every original source relation has been semantically approved; source relations must be displayed with their correct provenance.

Topic aliases/intents require their own review; they influence retrieval/navigation, not theological claims. An adapter will switch production from legacy topics to approved V2 domains/topics/mappings without breaking canonical verse or legacy topic deep links. Keep internal evidence notes out of production presentation unless an editor prepares an approved summary.
