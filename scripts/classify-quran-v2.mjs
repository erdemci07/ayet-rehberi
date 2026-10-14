import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadClassifierEnv } from "./lib/classifier-env.mjs";
import { atomicJson, configuration, hash, readJson, ResponsesRunner } from "./lib/classification-responses.mjs";
import { costEstimate, loadInputs, protectedHashes, requestMetrics } from "./lib/calibration-v2.mjs";
import { BackgroundResponsesRunner } from "./lib/background-responses.mjs";
import { DEEP_SETTINGS, executeDeepClassification } from "./lib/deep-classification-v2.mjs";
import { DEEP_PROMPT_VERSION, DEEP_VERSION } from "./lib/deep-schema-v2.mjs";

const args = process.argv.slice(2);
if (args.length !== 1 || !["--prepare", "--execute"].includes(args[0])) throw new Error("Usage: node scripts/classify-quran-v2.mjs --prepare|--execute");
const execute = args[0] === "--execute";
await loadClassifierEnv();
const config = configuration(), inputs = await loadInputs();
const calibration = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
const implementationFiles = ["scripts/lib/deep-classification-v2.mjs", "scripts/lib/deep-schema-v2.mjs", "scripts/lib/background-responses.mjs"];
const implementationHashes = Object.fromEntries(await Promise.all(implementationFiles.map(async path => [path, hash(await readFile(path))])));
const runId = `deep-${hash({ inputs: inputs.hashes, protected: inputs.protected, config, settings: DEEP_SETTINGS, implementationHashes, classifierVersion: DEEP_VERSION, promptVersion: DEEP_PROMPT_VERSION }).slice(0, 20)}`;
const directory = join("data/generated/topic-classification-v2", runId);
await mkdir(directory, { recursive: true });
const freeze = { runId, classifierVersion: DEEP_VERSION, promptVersion: DEEP_PROMPT_VERSION, model: config.model, reasoningEffort: "high",
  ontologyVersion: inputs.ontology.version, ontologyHash: inputs.hashes.ontology, corpusHash: inputs.hashes.corpus, corpusVersion: `sha256:${inputs.hashes.corpus}`,
  inputHashes: inputs.hashes, protectedHashes: inputs.protected, implementationHashes, settings: DEEP_SETTINGS, calibrationRunId: calibration.runId };
let manifest;
try { manifest = await readJson(join(directory, "manifest.json")); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (!manifest) {
  manifest = { ...freeze, timestamp: new Date().toISOString(), status: "prepared", paidFullRunAuthorized: true,
    authorization: "User approved paid full analysis, then waived calibration: kalibrasyonu yapmadan direkt gerçeğe geç", calibrationPrerequisiteWaivedByUser: true, productionSwitch: false, deployment: false,
    passes: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, status: "pending" })), batches: [] };
  await atomicJson(join(directory, "frozen-inputs.json"), { freeze, corpus: inputs.corpus, ontology: inputs.ontology, ontologyReport: inputs.ontologyReport, source: inputs.source });
  await atomicJson(join(directory, "manifest.json"), manifest);
} else {
  const frozen = await readJson(join(directory, "frozen-inputs.json"));
  if (hash(frozen.freeze) !== hash(freeze) || hash(frozen.corpus) !== hash(inputs.corpus) || hash(frozen.ontology) !== hash(inputs.ontology) || hash(frozen.ontologyReport) !== hash(inputs.ontologyReport)) throw new Error("Frozen run inputs/implementation changed; resume refused.");
}
const progress = event => console.log(JSON.stringify(event));
const runner = new BackgroundResponsesRunner({ directory, config, maxAttempts: DEEP_SETTINGS.maxAttempts, onProgress: progress });
const calibrationRunner = new ResponsesRunner({ directory: calibration.directory, config, onProgress: progress });
let outputs = null, blocker = null;
if (execute) {
  try {
    const originalCalibrationManifest = await readJson(join(calibration.directory, "manifest.json"));
    if (originalCalibrationManifest.corpusHash !== inputs.hashes.corpus || originalCalibrationManifest.ontologyHash !== inputs.hashes.ontology || originalCalibrationManifest.model !== config.model) throw new Error("Prior cache must use the same model and frozen inputs; no unsafe result reuse.");
    manifest.status = "running"; await atomicJson(join(directory, "manifest.json"), manifest);
    outputs = await executeDeepClassification({ inputs, config, runner, calibrationRunner, manifest, directory });
    if (hash(await protectedHashes()) !== hash(inputs.protected)) throw new Error("Protected Quran/provenance/footnotes/production data changed.");
  } catch (error) {
    blocker = error.message.replaceAll(process.env.OPENAI_API_KEY ?? "__NO_KEY__", "[REDACTED]");
  }
}
const metrics = await requestMetrics(directory);
const calibrationMetrics = await requestMetrics(calibration.directory);
const topicMetrics = outputs ? [...inputs.ontology.topics, ...inputs.ontology.subtopics].map(topic => {
  const entries = outputs.mappings.filter(m => m.topicId === topic.id), accepted = entries.filter(m => m.decision === "accept");
  const sourceCount = new Set(inputs.source.filter(s => topic.provenance.sourceTopicIds.includes(s.id)).flatMap(s => s.verseIds)).size;
  return { topicId: topic.id, name: topic.name, kind: topic.parentTopicId ? "subtopic" : "canonical", sourceCount,
    candidateCount: new Set(outputs.candidates.filter(m => m.topicId === topic.id).map(m => m.verseId)).size,
    v2MappingCount: accepted.length, acceptedCount: accepted.length,
    strengths: Object.fromEntries(["primary", "strong", "supporting", "contextual"].map(key => [key, accepted.filter(m => m.relationshipStrength === key).length])),
    confidence: Object.fromEntries(["high", "medium", "low"].map(key => [key, accepted.filter(m => m.confidence === key).length])),
    machineAcceptedCount: entries.filter(m => m.reviewStatus === "machineAccepted").length,
    reviewRequiredCount: entries.filter(m => m.decision !== "reject" && m.reviewStatus === "humanReviewRequired").length,
    rejectedCount: entries.filter(m => m.decision === "reject").length,
    notableRejectedPatterns: entries.filter(m => m.decision === "reject").map(m => ({ verseId: m.verseId, rationale: m.rationale })) };
}) : null;
const warnings = await readJson("data/generated/erhan-report.json");
const protectedUnchanged = hash(await protectedHashes()) === hash(inputs.protected);
if (!protectedUnchanged) { outputs = null; blocker = "Protected data integrity failed; no final artifacts committed."; }
manifest.status = outputs ? "completed" : execute ? "incomplete" : manifest.status;
manifest.blocker = blocker; await atomicJson(join(directory, "manifest.json"), manifest);
const report = { ...freeze, timestamp: manifest.timestamp, updatedAt: new Date().toISOString(), status: manifest.status,
  fullCorpusClassificationExecuted: !!outputs, totalVerses: 6236, canonicalTopics: 130, subtopics: 36,
  ninePasses: manifest.passes, metrics, cost: costEstimate(metrics, config.model), calibrationMetrics, calibrationCost: costEstimate(calibrationMetrics, config.model),
  candidateMappings: outputs?.candidates.length ?? null, acceptedMappings: outputs?.mappings.filter(m => m.decision === "accept").length ?? null,
  machineAcceptedMappings: outputs?.mappings.filter(m => m.reviewStatus === "machineAccepted").length ?? null,
  rejectedMappings: outputs?.mappings.filter(m => m.decision === "reject").length ?? null,
  reviewRequiredMappings: outputs?.mappings.filter(m => m.decision !== "reject" && m.reviewStatus === "humanReviewRequired").length ?? null,
  coverage: outputs?.coverage ?? null, topics: topicMetrics, resumeTest: outputs?.resumeTest ?? { status: "NOT_EXECUTED" },
  requiredSpotChecks: topicMetrics?.filter(t => ["sabir", "dua", "zekat", "tevekkul", "rizik", "ahiret", "tevbe", "sukur", "adalet", "merhamet", "namaz"].includes(t.topicId)) ?? null,
  familySpotCheck: outputs ? { name: "Aile", kind: "domain-aggregate-not-invented-topic", topicIds: inputs.ontology.topics.filter(t => t.domainId === "aile").map(t => t.id), distinctAcceptedVerseIds: [...new Set(outputs.mappings.filter(m => m.decision === "accept" && inputs.ontology.topics.some(t => t.id === m.topicId && t.domainId === "aile")).map(m => m.verseId))] } : null,
  healthyOverlaps: outputs?.overlap.filter(p => p.assessment === "healthy").sort((a, b) => b.intersection - a.intersection) ?? null,
  suspiciousOverlaps: outputs?.overlap.filter(p => ["suspicious", "uncertain"].includes(p.assessment)) ?? null,
  ontologyGapProposals: outputs?.proposals ?? null, disagreements: outputs?.disagreements ?? null,
  cacheHitsThisInvocation: runner.cacheHits, calibrationCacheHitsThisInvocation: calibrationRunner.cacheHits,
  missingBatches: manifest.batches.filter(b => b.status !== "completed").map(({ id, stage, status }) => ({ id, stage, status })),
  integrity: { protectedUnchanged, corpusHash: inputs.hashes.corpus, erhanAktas: inputs.corpus.filter(v => v.translator === "Erhan Aktaş").length, yasarNuriOzturk: inputs.corpus.filter(v => v.translator === "Yaşar Nuri Öztürk").length, fallbackReferences: inputs.corpus.filter(v => v.isFallbackTranslation).map(v => v.id), footnotesUnchanged: protectedUnchanged },
  sourceWarnings: { total: warnings.warnings.length, footnotes: warnings.warnings.filter(w => /missing note|orphan note/.test(w.warning)).length, independentOfClassification: true, file: "data/generated/erhan-report.json" },
  publication: { productionMappingsChanged: false, v2SwitchedIntoProduction: false, deployed: false, esmaGenerated: false },
  validation: outputs ? "AWAITING_INDEPENDENT_VALIDATOR" : "INCOMPLETE_NOT_A_SEMANTIC_RESULT", blocker,
  limitations: ["Machine audits are not independent human review or measured precision/recall.", "Ontology remains proposed; review queues and expansion proposals are unpublished.", "Cost is estimated from provider usage, not an invoice; failed requests without usage may be billable."] };
if (outputs) {
  const artifacts = { candidates: outputs.candidates, "machine-accepted": outputs.mappings.filter(m => m.reviewStatus === "machineAccepted"), "review-required": outputs.mappings.filter(m => m.decision !== "reject" && m.reviewStatus === "humanReviewRequired"), rejected: outputs.mappings.filter(m => m.decision === "reject"), "all-decisions": outputs.mappings, "coverage-notes": outputs.coverageNotes, findings: outputs.findings };
  for (const [name, value] of Object.entries(artifacts)) await atomicJson(join(directory, `${name}.json`), value);
  await atomicJson(join(directory, "overlap.json"), outputs.overlap);
  await atomicJson(join(directory, "expansion.proposed.json"), { runId, ontologyHash: inputs.hashes.ontology, status: "proposed", proposals: outputs.proposals });
  await atomicJson(join(directory, "completed-jobs.json"), outputs.jobs);
}
await atomicJson(join(directory, "report.json"), report);
await atomicJson("data/generated/topic-classification-v2/latest.json", { runId, directory: directory.replaceAll("\\", "/"), status: manifest.status });
console.log(JSON.stringify({ runId, status: manifest.status, report: join(directory, "report.json"), requests: metrics.requestCount, blocker, protectedUnchanged, productionChanged: false, deployed: false }));
process.exitCode = execute && !outputs ? 1 : 0;
