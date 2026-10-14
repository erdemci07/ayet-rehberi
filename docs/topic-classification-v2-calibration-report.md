# Topic classification V2 calibration report

Status: incomplete. Full 130-topic corpus classification: NOT started.

## Execution

Model: gpt-5.6-sol; reasoning: high; OpenAI Responses API; strict JSON schema.

Real API call succeeded: true. Successful/attempted requests: 6/11. Retries: 4. Schema failures: 5.

Input tokens: 581594; output tokens (including reasoning): 149687; cached input: 109622; reasoning: 83514; requests with unknown usage: 1.

Estimated cost (not invoice): {"usdBaseEstimate":4.925476799999999,"usdIfAllUncachedInputWereCacheWrites":5.397448799999999,"inputPerMillion":4,"cachedInputPerMillion":0.4,"outputPerMillion":20,"priceChecked":"2026-09-17","source":"https://developers.openai.com/api/docs/models/gpt-5.6-sol","caveats":["Estimate, not an invoice; absent usage from failed/uncertain calls may be billable.","Cache-write quantities may not be exposed; upper scenario applies 1.25x to all uncached input.","Requests >272K input tokens use 2x input and 1.5x output rates; check per-request receipts before extrapolation.","No Batch API discount assumed; standard service tier, no tools."]}. Rates: [official model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

Blocker: Run manifest job content changed; resume refused..

## Corpus-wide candidate retrieval: five topics only

| Topic | targets examined | candidates | accepted after machine audit | rejected |
| --- | --- | --- | --- | --- |
| Sabır | 128/6236 | not executed | not executed | not executed |
| Zekât | 128/6236 | not executed | not executed | not executed |
| Adalet | 128/6236 | not executed | not executed | not executed |
| Evlilik | 128/6236 | not executed | not executed | not executed |
| Diriliş | 128/6236 | not executed | not executed | not executed |

All candidate IDs and reasons are in the run JSON files; counts are not predetermined. Complete candidate sets are audited as a whole, not certified human-reviewed.

## Independent sample and context

50 curated easy/difficult/context-sensitive targets; full 130 canonical + 36 subtopic contracts. Findings, all sample mappings and context examples: [JSON report](../data/generated/topic-classification-calibration-v2/calibration-cd560afff01774bcd697/report.json).

No sample-precision claim: sample is diagnostic, not random ground truth. Missing or not-executed results are null, not a zero-mapping semantic conclusion.

## Positive/negative diagnostic hypotheses

| Verse | topic | hypothesis | retrieval found | final sample decision |
| --- | --- | --- | --- | --- |
No diagnostic result: API calibration has not completed.

These are explicit ontology-contract probes, not human review approvals. False-positive and false-negative examples also come from independent machine audits in the JSON report.

## Checkpoint / resume

{"status":"NOT_EXECUTED","reason":"Real checkpoint replay awaits successful calibration."}

Cache key includes full canonical evidence/footnotes, ontology contracts/hash, classifier/prompt versions, schema, model, reasoning effort and output settings. Cache checksums and complete considered-ID sets are validated on replay. No requests allowed during cache-only replay.

## Full-run volume estimate — NOT executed or authorized

{
  "fullRunExecuted": false,
  "retrievalTopicVerseComparisons": 810680,
  "deterministicRetrievalRequests": 1274,
  "verseCentricRequests": 624,
  "measuredStageProjections": [
    {
      "stage": "1-topic-retrieval",
      "projectedRequests": 1274,
      "projectedInputTokens": 4799782,
      "projectedOutputTokens": 2072252,
      "projectedCachedInputTokens": 2850172,
      "scaleFactor": 26
    },
    {
      "stage": "2-verse-centric",
      "projectedRequests": 624,
      "projectedInputTokens": 49512218.64,
      "projectedOutputTokens": 8728529.2,
      "projectedCachedInputTokens": 0,
      "scaleFactor": 124.72
    },
    {
      "stage": "3-context-validation",
      "projectedRequests": 624,
      "projectedInputTokens": null,
      "projectedOutputTokens": null,
      "projectedCachedInputTokens": null,
      "scaleFactor": 124.72
    },
    {
      "stage": "5-reverse-topic-audit",
      "projectedRequests": 130,
      "projectedInputTokens": null,
      "projectedOutputTokens": null,
      "projectedCachedInputTokens": null,
      "scaleFactor": 26
    },
    {
      "stage": "9-adversarial-quality",
      "projectedRequests": 125,
      "projectedInputTokens": null,
      "projectedOutputTokens": null,
      "projectedCachedInputTokens": null,
      "scaleFactor": 124.72
    }
  ],
  "requestSubtotal": 2777,
  "fullNinePassCost": null,
  "reason": "Passes 4/6/7/8, variable ambiguities, 8385 canonical topic pairs and expansion/consolidation calls require separate measurement. This subtotal is not a full-run quote or authorization.",
  "assumptions": [
    "Five topic contracts per retrieval call; 128 target verses; all topics individually considered.",
    "Full ontology in each 10-target verse-centric/context call; final quality calls have 50 targets as in calibration.",
    "Conservative scenario context-validates all verses; actual ambiguity rate may differ.",
    "One complete-set reverse call per canonical topic; no arbitrary truncation.",
    "Per-target/per-topic linear token extrapolation including observed retries/expansions; volume changes with topic density.",
    "Calibration sample is diagnostic/curated, not statistically representative; density and output cost vary.",
    "No default model substitution, no request initiated by this projection."
  ],
  "sampleMappingsObserved": null,
  "measuredStageSubtotalCost": null
}

Full nine-pass cost is unknown until unmeasured adjudication/coverage/pairwise/discovery passes are profiled. Measured-stage subtotal is not a full quote.

## Data integrity / publication

6236 verses; translators: 6230 Erhan Aktaş + 6 Yaşar Nuri Öztürk (114:1–6). Protected files unchanged: true.

Corpus SHA256: `bef53e9693dd7b854c5810ef59d98f3272bd4a0365e8d50bb5988f8ccc5005b8`. Ontology SHA256: `357b65815ca87d5c75bd386a7457c3a77e33ef36452a323c742d57c8c20405ba`.

Existing source/footnote warning total: 64; unchanged, separate from calibration QA.

Validation: INCOMPLETE_NOT_A_SEMANTIC_RESULT. Production mappings, Quran text/provenance/footnotes, UI and Esma unchanged. No deploy. STOP after calibration.
