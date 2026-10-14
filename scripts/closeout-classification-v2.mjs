import { mkdir, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { atomicJson, hash, readJson, ResponsesRunner } from "./lib/classification-responses.mjs";
import { CALIBRATION_TOPICS, costEstimate, initialJobs, loadInputs, mappingKey, protectedHashes, requestMetrics, SAMPLE } from "./lib/calibration-v2.mjs";

// Local-only closeout: NEVER imports an API key or permits a network request.
const inputs = await loadInputs();
const calibration = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
const full = await readJson("data/generated/topic-classification-v2/latest.json");
const original = await readJson(join(calibration.directory, "manifest.json"));
const config = { model: original.model, endpoint: "https://api.openai.com/v1/responses", maxOutputTokens: 24000 };
const runner = new ResponsesRunner({ directory: calibration.directory, config, apiKey: undefined, fetchFn: () => { throw new Error("Closeout must never make API calls."); } });
const records = [];
for (const job of initialJobs(inputs)) {
  try { records.push({ job, record: await runner.run(job, { cacheOnly: true }) }); }
  catch (error) { if (!error.message.includes("completed checkpoint missing")) throw error; }
}
const directory = join(full.directory, "closeout");
const annotate = (mapping, job, record) => ({ ...mapping, reviewStatus: "humanReviewRequired", classifierVersion: original.classifierVersion,
  ontologyVersion: original.ontologyVersion, ontologyHash: original.ontologyHash, corpusHash: original.corpusHash,
  runId: full.runId, sourceRunId: original.runId, stage: job.stage, sourceResponseId: record.responseId,
  reviewReasons: ["partialRun", "contextAdjudicationReverseAndGlobalQualityNotCompleted"],
  provenance: { source: "openai-semantic-classification", requestedModel: config.model, reasoningEffort: "high", production: false, partial: true } });
const candidates = records.filter(r => r.job.stage === "retrieval").flatMap(({ job, record }) => record.result.mappings.map(m => annotate(m, job, record)));
const sampleMappings = records.filter(r => r.job.stage === "verse").flatMap(({ job, record }) => record.result.mappings.map(m => annotate(m, job, record)));
for (const collection of [candidates, sampleMappings]) if (new Set(collection.map(mappingKey)).size !== collection.length) throw new Error("Duplicate partial mappings; closeout refused.");
const completedSampleIds = records.filter(r => r.job.stage === "verse").flatMap(r => r.job.verseIds);
const topics = CALIBRATION_TOPICS.map(topicId => ({ topicId, name: inputs.ontology.topics.find(t => t.id === topicId).name,
  corpusVerseTargetsCompleted: new Set(records.filter(r => r.job.stage === "retrieval" && r.job.topicIds.includes(topicId)).flatMap(r => r.job.verseIds)).size,
  corpusVerseTargetsExpected: 6236, candidateCount: candidates.filter(m => m.topicId === topicId).length,
  candidateVerseIds: candidates.filter(m => m.topicId === topicId).map(m => m.verseId), completeCorpusRetrieval: false }));
const protectedUnchanged = hash(await protectedHashes()) === hash(inputs.protected);
if (!protectedUnchanged) throw new Error("Protected canonical/production data changed; closeout refused.");
const warnings = await readJson("data/generated/erhan-report.json");
const calibrationMetrics = await requestMetrics(calibration.directory), fullMetrics = await requestMetrics(full.directory);
const report = { runId: full.runId, timestamp: new Date().toISOString(), status: "CLOSED_PARTIAL_BY_USER", newPaidCalls: 0,
  reason: "User requested a conclusion using existing work; no further paid analysis authorized in this closeout.",
  providerBlocker: "credit_balance_exhausted", model: config.model, reasoningEffort: "high", structuredOutputs: "strict JSON schema",
  canonicalVerses: 6236, erhanAktas: 6230, yasarNuriOzturk: 6, fallbackReferences: inputs.corpus.filter(v => v.isFallbackTranslation).map(v => v.id),
  ontologyCanonicalTopics: 130, ontologySubtopics: 36, successfulCompatibleBatches: records.length,
  retrievalBatches: records.filter(r => r.job.stage === "retrieval").length, retrievalTopics: topics,
  partialCandidateMappings: candidates.length, independentSampleBatches: records.filter(r => r.job.stage === "verse").length,
  independentSampleTargets: completedSampleIds.length, expectedDiagnosticSampleTargets: SAMPLE.length,
  sampleMappingDecisions: sampleMappings.length, sampleRelationshipsNotRejected: sampleMappings.filter(m => m.decision !== "reject").length,
  sampleInitialRejectedDecisions: sampleMappings.filter(m => m.decision === "reject").length,
  finalAdjudicatedAcceptedMappings: null, fullCorpusAnalysisCompleted: false, globalQualityCompleted: false, productionEligibleMappings: 0,
  unfinishedWork: ["Complete 6236×130 candidate retrieval", "Complete independent 6236-verse classification", "Context validation", "Mapping adjudication", "Complete-set reverse topic audits", "Corpus coverage audit", "All-pair semantic overlap audit", "Ontology-gap discovery", "Final adversarial quality audit"],
  usage: { calibration: calibrationMetrics, directFull: fullMetrics }, estimatedEarlierMeasuredCost: costEstimate(calibrationMetrics, config.model),
  costLimit: "Not an invoice. Earlier interrupted/transport-failed requests without usage may be billable. No cost fabricated for absent provider usage.",
  integrity: { protectedUnchanged, corpusHash: inputs.hashes.corpus, ontologyHash: inputs.hashes.ontology, textFootnotesAndProvenanceUnchanged: true },
  sourceWarningCount: warnings.warnings.length, footnoteWarningCount: warnings.warnings.filter(w => /missing note|orphan note/.test(w.warning)).length,
  resumeProof: { mode: "All available compatible successful checkpoints replayed with cacheOnly", validatedBatches: records.length, newRequests: runner.requests },
  publication: { productionMappingsChanged: false, uiChanged: false, esmaGenerated: false, deployed: false },
  validation: "PASS_PARTIAL_CHECKPOINTS_AND_INTEGRITY_ONLY_NOT_COMPLETE_CLASSIFICATION" };
for (const [name, value] of Object.entries({ report, "partial-candidates": candidates, "partial-sample-decisions": sampleMappings })) await atomicJson(join(directory, `${name}.json`), value);
const manifest = await readJson(join(full.directory, "manifest.json"));
manifest.status = "closed_partial"; manifest.closedByUser = true; manifest.closeoutReport = join(directory, "report.json").replaceAll("\\", "/");
await atomicJson(join(full.directory, "manifest.json"), manifest);
await atomicJson("data/generated/topic-classification-v2/latest.json", { ...full, status: "closed_partial", closeoutReport: manifest.closeoutReport });
await mkdir("docs", { recursive: true });
const markdown = `# Topic classification V2 — partial closeout\n\nStatus: CLOSED PARTIAL BY USER. No further paid calls. This is not a completed full-corpus classification or production-ready mapping set.\n\nModel: ${config.model}; reasoning: high; Responses API strict JSON schema.\n\n## Existing useful results\n\n${records.length} successful compatible batches independently replayed locally with no network.\n\n| Topic | Corpus targets considered | Partial candidates |\n| --- | --- | --- |\n${topics.map(t => `| ${t.name} | ${t.corpusVerseTargetsCompleted}/6236 | ${t.candidateCount} |`).join("\n")}\n\n50-target diagnostic sample: ${completedSampleIds.length} actually processed with the full 130 canonical + 36 subtopic contracts. Sample relationship decisions: ${sampleMappings.length}; non-rejected: ${report.sampleRelationshipsNotRejected}; initial rejections: ${report.sampleInitialRejectedDecisions}. These are initial semantic outputs, not final adjudications or human-reviewed results. All partial mappings are humanReviewRequired and unpublished.\n\nDirect full run: ${fullMetrics.requestCount} background submissions; all ended with provider credit_balance_exhausted, with no new full-generation success or reported token usage. The account-side blocker was verified through stored response IDs; no API key is logged.\n\n## Costs and limitations\n\nEarlier reported usage: input ${calibrationMetrics.inputTokens}; output including reasoning ${calibrationMetrics.outputTokens}; cached input ${calibrationMetrics.cachedInputTokens}. Measured base estimate: $${report.estimatedEarlierMeasuredCost.usdBaseEstimate?.toFixed(4) ?? "unknown"}; not an invoice, does not price unreported usage. [Official model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol).\n\nThe complete nine-pass analysis, final coverage/overlap metrics and final accepted counts were NOT produced. Null final counts mean unfinished work, not zero semantic relevance. No production mapping is approved or replaced.\n\n## Integrity and deliverables\n\n6236 verses unchanged: 6230 Erhan Aktaş + exactly 6 Yaşar Nuri Öztürk fallback records at 114:1–6. Quran text, footnotes, numbering, provenance and production mappings unchanged. Existing footnote warnings: ${report.footnoteWarningCount}; separate from classification completeness. No UI/Esma/deploy changes.\n\n[Closeout JSON](../${manifest.closeoutReport}) · [Partial candidates](../${directory.replaceAll("\\", "/")}/partial-candidates.json) · [Initial sample decisions](../${directory.replaceAll("\\", "/")}/partial-sample-decisions.json)\n\nValidation: actual available checkpoints, unique references, full ontology contracts for the sample, hashes and no-network replay passed. Full classification validation cannot pass because mandatory work is incomplete.\n`;
const temporary = `docs/topic-classification-v2-closeout.md.${randomUUID()}.tmp`;
await writeFile(temporary, markdown); await rename(temporary, "docs/topic-classification-v2-closeout.md");
console.log(JSON.stringify({ status: report.status, report: manifest.closeoutReport, successfulBatches: records.length, candidateMappings: candidates.length,
  sampleTargets: completedSampleIds.length, sampleDecisions: sampleMappings.length, topics, newRequests: runner.requests, protectedUnchanged }, null, 2));
