# OpenAI semantic calibration (unpublished)

This tool executes ONLY calibration, never the 130-topic full corpus classification. Existing legacy classifier/cache files are untouched; the previous V2 script was a plan, not an API executor.

Requirements: Node 24 (environment-file CLI support), explicit `AYET_CLASSIFIER_MODEL`, and `OPENAI_API_KEY` for uncached calls. There is no default/fallback model. Do not paste keys into chat, command arguments or reports. Revoke any key previously shared in chat and configure a replacement locally. `.env` is ignored by git and loaded by the npm command; existing process environment takes precedence.

Configure locally:

```dotenv
OPENAI_API_KEY=your-new-local-key
AYET_CLASSIFIER_MODEL=gpt-5.6-sol
```

No paid requests:

For compatibility, two literal `$env:NAME="value"` lines in `.env` are also read without evaluating PowerShell. Standard dotenv syntax is recommended. Existing process environment takes precedence; no key value is printed or rewritten.

```powershell
npm run classification:v2:test
npm run classification:v2:calibrate -- --prepare
```

Explicit calibration execution (normally 65 successful calls before context expansion/retries):

```powershell
npm run classification:v2:calibrate -- --execute
npm run classification:v2:calibrate:validate
```

An interrupted run resumes with the same command. Optional pause diagnostic:

```powershell
npm run classification:v2:calibrate -- --execute --stop-after-batches=1
npm run classification:v2:calibrate -- --execute
```

The final calibration automatically replays ALL completed jobs with `cacheOnly` and no extra API requests. Unit tests use synthetic, non-Quran fixtures and are not semantic calibration results.

Scope:

- Corpus-wide semantic retrieval for Sabır, Zekât, Adalet, Evlilik, Diriliş: 49 batches of up to 128 targets, five complete contracts in every call. All 31,180 topic/verse pairs are considered, no lexical prefilter.
- Independent 50-target curated sample: five batches with ALL 130 canonical + 36 subtopic contracts. Includes direct statements, long legal passages, quoted narrative, pronoun references, potential keyword traps, very short verses and the fallback translator.
- Context/adjudication for all 50 targets (five calls), radius three in the same surah; if requested, complete target surahs are supplied, never merged into target scripture.
- Five whole-candidate-set topic audits; explicit decision for every candidate. Not a certification that all full-run false negatives are absent.
- One final sample adversarial audit; explicit decisions, diagnostic hypothesis probes and review-required routing. No AI result is labeled humanReviewed.
- Nine-pass full-run API costs are NOT inferred as a falsely precise total: measured-stage subtotal and unmeasured-pass limitations are reported separately.

Requests use [Responses strict structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), `reasoning.effort=high`, `store=false`, disabled input truncation and explicit output allowance. Incomplete/refused responses never become valid checkpoints. Output tokens include reasoning usage. [Configured model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol) is metadata, not a model fallback; costs are estimates, not invoices.

Checkpoints are atomic temp/rename writes with result checksums, full schema/ID validation, content+ontology+prompt+classifier+model cache keys and per-attempt usage journals. Each completed batch persists the manifest. Transient failures retry up to three attempts with bounded exponential backoff; HTTP authentication/access errors do not retry. Invalid cache files cause a visible failure instead of silent re-download/replacement. Logs contain progress IDs/usage, never scripture, API keys, request headers or raw error bodies.

Run-specific files: `data/generated/topic-classification-calibration-v2/<runId>/` (frozen input bundle, manifest, checkpoints, request receipts, semantic outputs and report). Pointer: `latest.json`; human-readable report: `docs/topic-classification-v2-calibration-report.md`. No complete-looking empty mapping artifacts are emitted on blocked runs; semantic counts are null/not-executed.

STOP after calibration. No UI/Esma changes, production promotion or deploy is included.
