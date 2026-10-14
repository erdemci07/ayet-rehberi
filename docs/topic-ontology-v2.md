# Quran topic ontology V2 — review proposal

The generated proposal is editorial discovery metadata, never Quran text or a settled theological taxonomy. Its vocabulary is informed by existing source names and an offline scan of all 6,236 canonical translations. No final mapping is populated. Corpus evidence in the report is exact canonical text, copied for inspection with verse identity and translator; lexical counts are retrieval hints and neither semantic validation nor quality targets.

## Layers and relationships

Domain → canonical topic → optional subtopic. Verses may relate to multiple topics. Domain grouping does not force exclusive verse membership. Everyday queries and aliases point to topics but never create verse assignments. Modern language such as kaygı is query language, not a claim of a Quranic clinical diagnosis or treatment.

Topic definitions contain inclusion/exclusion boundaries, stable id/slug, domain/parent, aliases, related topic ids, everyday-intent ids, source-name correspondence, provenance, version and review notes. All are proposed. Separate reviewed/published stores are empty until approval. Original source names/mappings and current production data remain intact.

## Consolidation rules

- Grammatical variations and verb forms become aliases (sabır/sabretmek/sabırlılık).
- A meaningful contextual restriction becomes a subtopic (musibet karşısında sabır).
- Do not merge materially different obligations: zekât is not synonymous with every infak/sadaka.
- Split polysemy by context: dünya bahçesi ≠ ahiret cenneti; doğru yol ≠ dürüst söz; cehennem ateşi ≠ insan öfkesi; ilahi rahmet ≠ insan merhameti.
- Pair broader topics with precision: kıyamet is not a generic bucket for every believer or every afterlife verse. Ehl-i kitap requires explicit passage context rather than an isolated inanan keyword.
- Preserve all source names even when consolidated. Ehl-i kitap believers/criticisms and recording angels/records become subtopics of their respective canonical topic. Source questions do not imply their premise is endorsed.
- Counts describe scope; neither a high nor a low count proves quality. Numbers do not need to total 6,236.

## Human review

Every definition/alias/intent/edge needs review. Special attention: nesih, isr, funeral prayer context, religious authority, war/cihad, slavery, authority/obedience, intercession, Ehl-i kitap, societal decline, sünnetullah and self-proclaimed purity. Ahiret has an explicit general-belief topic; diriliş, kıyamet, hesap, cennet and cehennem remain distinct for precise discovery. Name correspondence never transfers or verifies original mappings.

Review workflow: compare canonical text and original footnotes; check contextual evidence; revise definition; consolidate/split; record reviewer/date/decision; move accepted records to reviewed; publish only a coherent approved graph. Rejecting a proposal does not delete source provenance. New proposed topics are enumerated exactly in the report, including justice, peace, consultation, privacy, divorce, debt, news verification, hope/fear, Quran understanding and distinct afterlife concepts. Coverage review also added explicit topics for Şeytan/vesvese, angels, jinn and gayb, rather than leaving these major corpus concepts only under a generic iman label.

## Outputs

`data/generated/topic-ontology-v2.proposed.json`, `topic-ontology-v2.report.json`: definitions, exact counts, all 66 source-name correspondences, consolidation, new topics, review flags and corpus retrieval hints. `src/data/ontology-v2/`: independent empty reviewed/published ontology and future/published mapping stores. None of these proposals is imported by production routes.

Run `npm run ontology:prepare` to reproduce the offline proposal. Run `npm run ontology:validate` for structural/reference/integrity checks. This never invokes an AI provider or writes canonical/legacy data.
