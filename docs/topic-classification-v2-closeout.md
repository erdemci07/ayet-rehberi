# Topic classification V2 — partial closeout

Status: CLOSED PARTIAL BY USER. No further paid calls. This is not a completed full-corpus classification or production-ready mapping set.

Model: gpt-5.6-sol; reasoning: high; Responses API strict JSON schema.

## Existing useful results

8 successful compatible batches independently replayed locally with no network.

| Topic | Corpus targets considered | Partial candidates |
| --- | --- | --- |
| Sabır | 384/6236 | 21 |
| Zekât | 384/6236 | 7 |
| Adalet | 384/6236 | 45 |
| Evlilik | 384/6236 | 22 |
| Diriliş | 384/6236 | 12 |

50-target diagnostic sample: 50 actually processed with the full 130 canonical + 36 subtopic contracts. Sample relationship decisions: 325; non-rejected: 325; initial rejections: 0. These are initial semantic outputs, not final adjudications or human-reviewed results. All partial mappings are humanReviewRequired and unpublished.

Direct full run: 4 background submissions; all ended with provider credit_balance_exhausted, with no new full-generation success or reported token usage. The account-side blocker was verified through stored response IDs; no API key is logged.

## Costs and limitations

Earlier reported usage: input 657798; output including reasoning 168925; cached input 109622. Measured base estimate: $5.6151; not an invoice, does not price unreported usage. [Official model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

The complete nine-pass analysis, final coverage/overlap metrics and final accepted counts were NOT produced. Null final counts mean unfinished work, not zero semantic relevance. No production mapping is approved or replaced.

## Integrity and deliverables

6236 verses unchanged: 6230 Erhan Aktaş + exactly 6 Yaşar Nuri Öztürk fallback records at 114:1–6. Quran text, footnotes, numbering, provenance and production mappings unchanged. Existing footnote warnings: 58; separate from classification completeness. No UI/Esma/deploy changes.

[Closeout JSON](../data/generated/topic-classification-v2/deep-8b8d066fcd82d82a5b1b/closeout/report.json) · [Partial candidates](../data/generated/topic-classification-v2/deep-8b8d066fcd82d82a5b1b/closeout/partial-candidates.json) · [Initial sample decisions](../data/generated/topic-classification-v2/deep-8b8d066fcd82d82a5b1b/closeout/partial-sample-decisions.json)

Validation: actual available checkpoints, unique references, full ontology contracts for the sample, hashes and no-network replay passed. Full classification validation cannot pass because mandatory work is incomplete.
