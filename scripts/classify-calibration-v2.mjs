import { mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadClassifierEnv } from "./lib/classifier-env.mjs";
import { atomicJson, configuration, hash, readJson, ResponsesRunner } from "./lib/classification-responses.mjs";
import { CALIBRATION_TOPICS, costEstimate, executeCalibration, initialJobs, loadInputs, mappingKey, PROBES, protectedHashes, requestMetrics, SAMPLE, SETTINGS, VERSION_METADATA, volumeEstimate } from "./lib/calibration-v2.mjs";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const prepare = args.includes("--prepare");
const stopArg = args.find(arg => arg.startsWith("--stop-after-batches="));
const stopAfterBatches = stopArg ? Number(stopArg.split("=")[1]) : Infinity;
if (args.some(arg => !["--execute", "--prepare"].includes(arg) && !arg.startsWith("--stop-after-batches=")) || (execute && prepare) || (stopArg && (!Number.isInteger(stopAfterBatches) || stopAfterBatches < 1))) {
  console.error("Usage: node scripts/classify-calibration-v2.mjs --prepare|--execute [--stop-after-batches=N]");
  process.exit(1);
}

await loadClassifierEnv();
const inputs = await loadInputs();
let config; let configurationBlocker = null;
try { config = configuration(); } catch (error) { configurationBlocker = error.message; }
const runConfig = config ?? { model: null, reasoningEffort: "high", endpoint: "https://api.openai.com/v1/responses", maxOutputTokens: 24000 };
const runId = `calibration-${hash({ hashes: inputs.hashes, protected: inputs.protected, config: runConfig, versions: VERSION_METADATA, settings: SETTINGS, topics: CALIBRATION_TOPICS, sample: SAMPLE }).slice(0, 20)}`;
const directory = join("data/generated/topic-classification-calibration-v2", runId);
await mkdir(directory, { recursive: true });
const manifestPath = join(directory, "manifest.json");
let manifest;
try { manifest = await readJson(manifestPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
const freeze = { runId, ...VERSION_METADATA, model: runConfig.model, ontologyVersion: inputs.ontology.version, ontologyHash: inputs.hashes.ontology, corpusVersion: `sha256:${inputs.hashes.corpus}`, corpusHash: inputs.hashes.corpus, ontologyReportHash: inputs.hashes.ontologyReport, protectedHashes: inputs.protected, settings: SETTINGS, calibrationTopicIds: CALIBRATION_TOPICS, sample: SAMPLE };
if (!manifest) {
  manifest = { ...freeze, timestamp: new Date().toISOString(), status: "prepared", fullRunAuthorized: false, productionSwitch: false, batches: [] };
  // Freeze the exact authoritative data, including report/review notes. Never edit canonical files.
  await atomicJson(join(directory, "frozen-inputs.json"), { freeze, corpus: inputs.corpus, ontology: inputs.ontology, ontologyReport: inputs.ontologyReport, source: inputs.source });
  await atomicJson(manifestPath, manifest);
} else {
  const frozen = await readJson(join(directory, "frozen-inputs.json"));
  if (hash(frozen.freeze) !== hash(freeze) || hash(frozen.corpus) !== hash(inputs.corpus) || hash(frozen.ontology) !== hash(inputs.ontology) || hash(frozen.ontologyReport) !== hash(inputs.ontologyReport) || hash(frozen.source) !== hash(inputs.source)) throw new Error("Frozen run inputs changed; resume refused.");
}

let outputs = null; let blocker = configurationBlocker; let runner = null;
const wasComplete = manifest.status === "completed";
if (execute && !blocker) {
  runner = new ResponsesRunner({ directory, config, maxAttempts: SETTINGS.maxAttempts, onProgress: progress => console.log(JSON.stringify(progress)) });
  try {
    manifest.status = "running"; await atomicJson(manifestPath, manifest);
    outputs = await executeCalibration(inputs, config, runner, manifest, directory, { stopAfterBatches });
  } catch (error) {
    // Provider details are already sanitized by the adapter. No input text or secrets in logs.
    blocker = error.message;
    if (process.env.OPENAI_API_KEY) blocker = blocker.replaceAll(process.env.OPENAI_API_KEY, "[REDACTED]");
  }
}
const currentProtected = await protectedHashes();
const integrity = { allCanonicalDataUnchanged: hash(currentProtected) === hash(inputs.protected), corpusHash: inputs.hashes.corpus, translators: Object.fromEntries([...new Set(inputs.corpus.map(v => v.translator))].map(t => [t, inputs.corpus.filter(v => v.translator === t).length])), fallbackReferences: inputs.corpus.filter(v => v.isFallbackTranslation).map(v => v.id), protectedFiles: Object.keys(inputs.protected).length };
if (!integrity.allCanonicalDataUnchanged) { blocker = "Protected canonical/production data changed during calibration."; outputs = null; }

// Do not downgrade or overwrite a previously completed run by issuing --prepare.
if (!execute && wasComplete) {
  console.log(JSON.stringify({ runId, status: "completed", report: join(directory, "report.json"), note: "Preparation only; existing completed artifacts preserved, no requests." }));
  process.exit(0);
}
const metrics = await requestMetrics(directory);
const initial = initialJobs(inputs);
const warningReport = await readJson("data/generated/erhan-report.json");
const footnoteWarnings = warningReport.warnings.filter(w => /missing note|orphan note/.test(w.warning));
const topicResults = CALIBRATION_TOPICS.map(topicId => {
  const topic = inputs.ontology.topics.find(t => t.id === topicId);
  const relatedSource = inputs.source.filter(t => topic.provenance.sourceTopicIds.includes(t.id));
  const candidates = outputs?.candidates.filter(m => m.topicId === topicId);
  const audited = outputs?.auditedCandidates.filter(m => m.topicId === topicId);
  return {
    topicId, name: topic.name, sourceCount: new Set(relatedSource.flatMap(t => t.verseIds)).size,
    sourceCountMeaning: "Existing source layer only; not ground truth or a retrieval limit.",
    corpusTargetsExpected: 6236,
    corpusTargetsCompleted: new Set(manifest.batches.filter(b => b.stage === "retrieval" && b.status === "completed" && b.topicIds.includes(topicId)).flatMap(b => b.verseIds)).size,
    candidateCount: candidates?.length ?? null, candidateVerseIds: candidates?.map(m => m.verseId) ?? null,
    acceptedAfterTopicAudit: audited?.filter(m => m.decision === "accept").length ?? null,
    reviewRequiredAfterTopicAudit: audited?.filter(m => m.decision === "reviewRequired").length ?? null,
    rejectedAfterTopicAudit: audited?.filter(m => m.decision === "reject").length ?? null,
  };
});
const probeResults = outputs ? PROBES.map(probe => {
  const key = mappingKey(probe);
  const candidate = outputs.candidates.find(m => mappingKey(m) === key);
  const initialSample = outputs.initialSample.find(m => mappingKey(m) === key);
  const final = outputs.sampleMappings.find(m => mappingKey(m) === key);
  return { ...probe, retrievalFound: !!candidate, initialDecision: initialSample?.decision ?? "noMapping", finalDecision: final?.decision ?? "noMapping", finalRationale: final?.rationale ?? null, potentialFalsePositive: !probe.expectedRelevant && !!candidate, potentialFalseNegative: probe.expectedRelevant && (!candidate || !final || final.decision !== "accept") };
}) : null;
const projection = volumeEstimate(metrics, inputs, outputs);
const projectedTotals = projection.measuredStageProjections.every(s => s.projectedInputTokens !== null) ? { inputTokens: projection.measuredStageProjections.reduce((sum, s) => sum + s.projectedInputTokens, 0), outputTokens: projection.measuredStageProjections.reduce((sum, s) => sum + s.projectedOutputTokens, 0), cachedInputTokens: projection.measuredStageProjections.reduce((sum, s) => sum + s.projectedCachedInputTokens, 0), usageReceipts: metrics.usageReceipts.map(receipt => { const scale = projection.measuredStageProjections.find(stage => ({ retrieval: "1-topic-retrieval", verse: "2-verse-centric", context: "3-context-validation", audit: "5-reverse-topic-audit", quality: "9-adversarial-quality" })[receipt.stage] === stage.stage)?.scaleFactor ?? 0; const long = receipt.usage.inputTokens > 272000; return { usage: { inputTokens: receipt.usage.inputTokens * scale, outputTokens: receipt.usage.outputTokens * scale, cachedInputTokens: receipt.usage.cachedInputTokens * scale, longContext: long } }; }) } : null;
projection.measuredStageSubtotalCost = projectedTotals ? costEstimate(projectedTotals, config?.model) : null;
manifest.status = outputs ? "completed" : execute ? "incomplete" : "prepared";
manifest.blocker = blocker;
await atomicJson(manifestPath, manifest);
const report = {
  ...freeze, timestamp: manifest.timestamp, lastUpdated: new Date().toISOString(), status: manifest.status,
  actualOpenAICallSucceeded: metrics.successfulRequests > 0,
  calibrationComplete: !!outputs, fullCorpusClassificationStarted: false,
  metrics, localCacheHitsThisInvocation: runner?.cacheHits ?? 0,
  cost: metrics.requestCount ? costEstimate(metrics, config?.model) : { usd: null, reason: "No paid request executed; no measured cost." },
  topics: topicResults, sampleSize: SAMPLE.length, sampleMappings: outputs?.sampleMappings ?? null,
  contextExamples: outputs?.contextResults.filter(m => m.contextUsed).map(m => ({ ...m, stage: "context" })) ?? null,
  qualityFindings: outputs?.findings ?? null,
  potentialFalsePositiveExamples: probeResults?.filter(p => p.potentialFalsePositive) ?? null,
  potentialFalseNegativeExamples: probeResults?.filter(p => p.potentialFalseNegative) ?? null,
  diagnosticProbes: probeResults, disagreements: outputs?.disagreements ?? null,
  falsePositiveNegativeLimit: "Diagnostic hypotheses and independent machine audits are not exhaustive human ground truth; no measured precision/recall claim.",
  resumeTest: outputs?.resumeTest ?? { status: "NOT_EXECUTED", reason: "Real checkpoint replay awaits successful calibration." },
  initialPlannedBatches: initial.length, totalPlannedBatches: manifest.batches.length,
  missingBatches: manifest.batches.filter(b => b.status !== "completed").map(b => ({ id: b.id, status: b.status })),
  integrity, existingSourceFootnoteWarnings: { total: warningReport.warnings.length, footnoteWarningCount: footnoteWarnings.length, sourceWarningCount: warningReport.warnings.length - footnoteWarnings.length, warningFile: "data/generated/erhan-report.json", unchanged: true, independentOfClassification: true },
  projection, blocker, validation: outputs ? "PASS_CALIBRATION_ONLY" : "INCOMPLETE_NOT_A_SEMANTIC_RESULT",
  publication: { switchedToV2: false, productionMappingsChanged: false, deployment: false },
};
if (outputs) {
  for (const [name, value] of Object.entries({ candidates: outputs.candidates, "initial-sample": outputs.initialSample, "context-decisions": outputs.contextResults, "topic-audit": outputs.auditedCandidates, "sample-mappings": outputs.sampleMappings, "review-required": outputs.sampleMappings.filter(m => m.decision !== "reject" && m.reviewStatus === "humanReviewRequired"), rejected: [...outputs.auditedCandidates, ...outputs.sampleMappings].filter(m => m.decision === "reject") })) await atomicJson(join(directory, `${name}.json`), value);
  // Retain descriptors for independent validator/checkpoint replay. No credentials in job bodies.
  await atomicJson(join(directory, "completed-jobs.json"), outputs.jobs);
}
await atomicJson(join(directory, "report.json"), report);
await atomicJson("data/generated/topic-classification-calibration-v2/latest.json", { runId, directory: directory.replaceAll("\\", "/"), status: manifest.status });

const topicRows = topicResults.map(t => `| ${t.name} | ${t.corpusTargetsCompleted}/6236 | ${t.candidateCount ?? "not executed"} | ${t.acceptedAfterTopicAudit ?? "not executed"} | ${t.rejectedAfterTopicAudit ?? "not executed"} |`).join("\n");
const probeRows = probeResults?.map(p => `| ${p.verseId} | ${p.topicId} | ${p.expectedRelevant ? "positive hypothesis" : "negative hypothesis"} | ${p.retrievalFound} | ${p.finalDecision} |`).join("\n") ?? "No diagnostic result: API calibration has not completed.";
const markdown = `# Topic classification V2 calibration report\n\nStatus: ${manifest.status}. Full 130-topic corpus classification: NOT started.\n\n## Execution\n\nModel: ${config?.model ?? "not configured"}; reasoning: high; OpenAI Responses API; strict JSON schema.\n\nReal API call succeeded: ${report.actualOpenAICallSucceeded}. Successful/attempted requests: ${metrics.successfulRequests}/${metrics.requestCount}. Retries: ${metrics.retryCount}. Schema failures: ${metrics.jsonSchemaFailureCount}.\n\nInput tokens: ${metrics.inputTokens}; output tokens (including reasoning): ${metrics.outputTokens}; cached input: ${metrics.cachedInputTokens}; reasoning: ${metrics.reasoningTokens}; requests with unknown usage: ${metrics.requestsWithoutUsage}.\n\nEstimated cost (not invoice): ${JSON.stringify(report.cost)}. Rates: [official model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol).\n\nBlocker: ${blocker ?? "none"}.\n\n## Corpus-wide candidate retrieval: five topics only\n\n| Topic | targets examined | candidates | accepted after machine audit | rejected |\n| --- | --- | --- | --- | --- |\n${topicRows}\n\nAll candidate IDs and reasons are in the run JSON files; counts are not predetermined. Complete candidate sets are audited as a whole, not certified human-reviewed.\n\n## Independent sample and context\n\n50 curated easy/difficult/context-sensitive targets; full 130 canonical + 36 subtopic contracts. Findings, all sample mappings and context examples: [JSON report](../${directory.replaceAll("\\", "/")}/report.json).\n\nNo sample-precision claim: sample is diagnostic, not random ground truth. Missing or not-executed results are null, not a zero-mapping semantic conclusion.\n\n## Positive/negative diagnostic hypotheses\n\n| Verse | topic | hypothesis | retrieval found | final sample decision |\n| --- | --- | --- | --- | --- |\n${probeRows}\n\nThese are explicit ontology-contract probes, not human review approvals. False-positive and false-negative examples also come from independent machine audits in the JSON report.\n\n## Checkpoint / resume\n\n${JSON.stringify(report.resumeTest)}\n\nCache key includes full canonical evidence/footnotes, ontology contracts/hash, classifier/prompt versions, schema, model, reasoning effort and output settings. Cache checksums and complete considered-ID sets are validated on replay. No requests allowed during cache-only replay.\n\n## Full-run volume estimate — NOT executed or authorized\n\n${JSON.stringify(projection, null, 2)}\n\nFull nine-pass cost is unknown until unmeasured adjudication/coverage/pairwise/discovery passes are profiled. Measured-stage subtotal is not a full quote.\n\n## Data integrity / publication\n\n6236 verses; translators: 6230 Erhan Aktaş + 6 Yaşar Nuri Öztürk (114:1–6). Protected files unchanged: ${integrity.allCanonicalDataUnchanged}.\n\nCorpus SHA256: \`${inputs.hashes.corpus}\`. Ontology SHA256: \`${inputs.hashes.ontology}\`.\n\nExisting source/footnote warning total: ${warningReport.warnings.length}; unchanged, separate from calibration QA.\n\nValidation: ${report.validation}. Production mappings, Quran text/provenance/footnotes, UI and Esma unchanged. No deploy. STOP after calibration.\n`;
await mkdir("docs", { recursive: true });
const docTemporary = `docs/topic-classification-v2-calibration-report.md.${randomUUID()}.tmp`;
await writeFile(docTemporary, markdown); await rename(docTemporary, "docs/topic-classification-v2-calibration-report.md");
console.log(JSON.stringify({ status: manifest.status, report: join(directory, "report.json"), model: config?.model ?? null, reasoningEffort: "high", requests: metrics.requestCount, blocker, fullRunStarted: false, protectedDataUnchanged: integrity.allCanonicalDataUnchanged }, null, 2));
process.exitCode = execute && !outputs ? 1 : 0;
