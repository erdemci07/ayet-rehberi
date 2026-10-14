# Paid full Quran classification V2

The user explicitly authorized paid full analysis and then waived the calibration prerequisite. Calibration completion is NOT required. No new calibration calls are launched by the full runner.

Run `npm run classification:v2:run -- --execute`. Configure `OPENAI_API_KEY` and `AYET_CLASSIFIER_MODEL` locally; there is no fallback model. Reasoning is high, Responses API outputs use strict JSON schema, and all source/Quran/production files are protected by hashes.

Nine actual semantic passes: full-corpus retrieval for every canonical topic, independent full-ontology verse analysis, context validation, explicit adjudication, mandatory complete-set topic-family reverse audits, corpus coverage audit, all 8,385 canonical overlap calculations with semantic auditing of positive intersections, corpus-wide ontology-gap discovery, and final adversarial audit followed by whole-topic and overlap rechecks.

Successful compatible earlier responses are independently validated and reused. They are not human-reviewed mappings. Subtopics are classified independently; everyday intents are not direct labels. Zero mappings and unlimited justified labels are permitted.

Background response IDs and provider usage are persisted. Polling interruptions resume the same response without another paid POST. Unknown POST outcomes are not automatically redispatched. JSON/coverage failures never become final mappings. Provider credit/quota failures require account-side correction; do not change the requested model to evade them.

After completion run `npm run classification:v2:validate`, `npm run validate:data`, `npm run topics:validate`, `npm run ontology:validate`, `npm run lint` and `npm run build`. The independent classification validator replays actual checkpoints without network and commits developer artifacts only after all mandatory passes, coverage, hashes, references, graph statistics and provenance checks pass.

Run-specific manifests, checkpoints, pending responses, receipts and artifacts live in `data/generated/topic-classification-v2/<runId>`. No UI, Quran text/footnotes/provenance, source mappings, production mappings, Esma or deployment changes are part of this workflow.

Current blocker: the initial direct full-analysis responses were accepted as background jobs but all four ended with provider error `credit_balance_exhausted`. No new full-analysis generation succeeded. The canonical/production integrity checks and transport tests passed; the complete classification remains INCOMPLETE, not a successful semantic result.
