import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { atomicJson, cacheKey, hash, readJson, ResponsesRunner } from "./lib/classification-responses.mjs";
import { loadInputs, mappingKey, protectedHashes } from "./lib/calibration-v2.mjs";
import { coverageStats, topicPairs } from "./lib/deep-classification-v2.mjs";
import { hydrateDeepJob } from "./lib/deep-schema-v2.mjs";

const latest = await readJson("data/generated/topic-classification-v2/latest.json");
const directory = latest.directory, manifest = await readJson(join(directory, "manifest.json")), report = await readJson(join(directory, "report.json"));
const inputs = await loadInputs(), errors = [];
if (manifest.status !== "completed" || !report.fullCorpusClassificationExecuted) errors.push("Full nine-pass classification incomplete.");
if (hash(await protectedHashes()) !== hash(manifest.protectedHashes)) errors.push("Protected canonical/production data changed.");
if (manifest.corpusHash !== inputs.hashes.corpus || manifest.ontologyHash !== inputs.hashes.ontology) errors.push("Frozen canonical/ontology hashes changed.");
if (manifest.passes.length !== 9 || manifest.passes.some(p => p.status !== "completed")) errors.push("Missing mandatory completed pass.");
if (report.publication.v2SwitchedIntoProduction || report.publication.deployed || report.publication.productionMappingsChanged) errors.push("Unauthorized publication/deployment.");
if (!manifest.model || manifest.reasoningEffort !== "high" || !manifest.paidFullRunAuthorized) errors.push("Missing explicit model/high reasoning/full-run authorization.");
for (const [path, expected] of Object.entries(manifest.implementationHashes)) if (hash(await readFile(path)) !== expected) errors.push(`Implementation changed: ${path}`);
if (manifest.status === "completed") {
  const config = { model: manifest.model, endpoint: "https://api.openai.com/v1/responses", maxOutputTokens: 24000 };
  const calibration = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
  const noNetwork = () => { throw new Error("Validator must never make API requests."); };
  const runner = new ResponsesRunner({ directory, config, apiKey: undefined, fetchFn: noNetwork });
  const calibrationRunner = new ResponsesRunner({ directory: calibration.directory, config, apiKey: undefined, fetchFn: noNetwork });
  const descriptors = await readJson(join(directory, "completed-jobs.json"));
  const jobs = descriptors.map(d => d.cacheOrigin === "calibration" ? d.job : hydrateDeepJob(d.job));
  if (new Set(jobs.map(j => j.id)).size !== jobs.length || jobs.length !== manifest.batches.length || manifest.batches.some(b => b.status !== "completed")) errors.push("Missing/duplicate/failed batches.");
  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index], batch = manifest.batches.find(b => b.id === job.id);
    if (batch?.key !== cacheKey(config, job)) errors.push(`Batch key mismatch: ${job.id}`);
    try { const record = await (descriptors[index].cacheOrigin === "calibration" ? calibrationRunner : runner).run(job, { cacheOnly: true }); if (record.checksum !== batch.checksum) errors.push(`Batch checksum mismatch: ${job.id}`); }
    catch { errors.push(`Checkpoint invalid: ${job.id}`); }
  }
  for (const topic of inputs.ontology.topics) {
    const ids = jobs.filter(j => j.stage === "retrieval" && !j.id.endsWith("expanded") && j.topicIds.includes(topic.id)).flatMap(j => j.verseIds);
    if (ids.length !== 6236 || new Set(ids).size !== 6236) errors.push(`Topic retrieval incomplete: ${topic.id}`);
    if (!jobs.some(j => j.id === `reverse-${topic.id}`) || !jobs.some(j => j.id === `final-reverse-${topic.id}`)) errors.push(`Missing complete-set reverse audit: ${topic.id}`);
  }
  for (const stage of ["verse", "context", "adjudication", "coverage", "discovery", "quality"]) {
    const stageJobs = jobs.filter(j => j.stage === stage && !j.id.endsWith("expanded"));
    const ids = stageJobs.flatMap(j => j.verseIds);
    if (ids.length !== 6236 || new Set(ids).size !== 6236 || stageJobs.some(j => j.topicIds.length !== 166)) errors.push(`Complete corpus/full-ontology coverage missing: ${stage}`);
  }
  for (const pass of manifest.passes) if (hash(await readJson(join(directory, `pass-${pass.number}.json`))) !== pass.checksum) errors.push(`Pass artifact checksum mismatch: ${pass.number}`);
  const mappings = await readJson(join(directory, "all-decisions.json"));
  const verseIds = new Set(inputs.corpus.map(v => v.id)), topicIds = new Set([...inputs.ontology.topics, ...inputs.ontology.subtopics].map(t => t.id));
  if (new Set(mappings.map(mappingKey)).size !== mappings.length) errors.push("Duplicate final verse-topic decisions.");
  for (const m of mappings) {
    if (!verseIds.has(m.verseId) || !topicIds.has(m.topicId) || !m.evidenceVerseIds.includes(m.verseId) || m.evidenceVerseIds.some(id => !verseIds.has(id))) errors.push("Broken final mapping/evidence reference.");
    if (!["primary", "strong", "supporting", "contextual"].includes(m.relationshipStrength) || !["high", "medium", "low"].includes(m.confidence) || !["machineAccepted", "humanReviewRequired"].includes(m.reviewStatus) || !["accept", "reject", "reviewRequired"].includes(m.decision)) errors.push("Invalid decision/strength/confidence or AI humanReviewed status.");
    if (m.reviewStatus === "machineAccepted" && (m.decision !== "accept" || m.confidence !== "high" || m.reviewReasons.length)) errors.push("Invalid automatic candidate eligibility.");
    if (m.runId !== manifest.runId || m.corpusHash !== manifest.corpusHash || m.ontologyHash !== manifest.ontologyHash || m.provenance.production) errors.push("Mapping provenance/hash mismatch.");
  }
  const quality = await readJson(join(directory, "pass-9.json"));
  if (hash(quality.mappings) !== hash(mappings) || hash(coverageStats(inputs, mappings)) !== hash(report.coverage)) errors.push("Final graph/coverage report mismatch.");
  const overlap = await readJson(join(directory, "overlap.json")), recalculated = topicPairs(inputs, mappings);
  if (overlap.length !== 8385 || new Set(overlap.map(p => p.key)).size !== 8385) errors.push("Incomplete/duplicate canonical topic pairs.");
  for (const pair of overlap) {
    const computed = recalculated.find(p => p.key === pair.key);
    if (!computed || ["countA", "countB", "intersection", "jaccard", "containmentA", "containmentB"].some(key => pair[key] !== computed[key]) || hash(pair.intersectionVerseIds) !== hash(computed.intersectionVerseIds)) errors.push("Stale overlap metrics/evidence.");
    if (pair.intersection && !["healthy", "suspicious", "uncertain"].includes(pair.assessment)) errors.push("Positive intersection lacks semantic audit.");
  }
  if (hash(overlap) !== quality.finalOverlapChecksum) errors.push("Final overlap checksum mismatch.");
  const expansion = await readJson(join(directory, "expansion.proposed.json"));
  if (expansion.status !== "proposed" || expansion.proposals.some(p => p.status !== "proposed" || p.humanReviewed !== false || !p.evidenceVerseIds.length || p.evidenceVerseIds.some(id => !verseIds.has(id)))) errors.push("Invalid/unapproved expansion provenance/evidence.");
  if (report.resumeTest.status !== "PASS" || report.resumeTest.newRequests || runner.requests || calibrationRunner.requests) errors.push("Actual no-network resume replay did not pass.");
}
const validation = { runId: manifest.runId, result: errors.length ? "FAIL" : "PASS_UNPUBLISHED_MACHINE_ANALYSIS", errors: [...new Set(errors)], apiRequests: 0, productionChanged: false, deployed: false, reportChecksum: hash(report) };
await atomicJson(join(directory, "validation.json"), validation);
if (!errors.length) {
  // Commit public developer artifacts only AFTER independent validation. Application data is untouched.
  for (const name of ["candidates", "machine-accepted", "review-required", "rejected"]) await atomicJson(`data/generated/topic-mappings-v2.${name}.json`, await readJson(join(directory, `${name}.json`)));
  await atomicJson("data/generated/topic-mappings-v2.report.json", { ...report, validation: validation.result });
  await atomicJson("data/generated/topic-overlap-v2.report.json", await readJson(join(directory, "overlap.json")));
  await atomicJson("data/generated/topic-ontology-v2-expansion.proposed.json", await readJson(join(directory, "expansion.proposed.json")));
  const markdown = `# Quran deep topic classification V2\n\nResult: ${validation.result}. Nine passes completed; unpublished machine analysis, not human-reviewed mappings.\n\nModel: ${manifest.model}; reasoning: high; classifier: ${manifest.classifierVersion}; ontology: ${manifest.ontologyVersion}.\n\n6236 verses unchanged. Corpus SHA256: ${manifest.corpusHash}. Ontology SHA256: ${manifest.ontologyHash}.\n\nCandidates: ${report.candidateMappings}; accepted semantic decisions: ${report.acceptedMappings}; automatic candidate eligibility: ${report.machineAcceptedMappings}; review required: ${report.reviewRequiredMappings}; rejected: ${report.rejectedMappings}.\n\nCoverage: ${JSON.stringify(report.coverage)}\n\nRequests/tokens/cache/retries/cost: ${JSON.stringify({ metrics: report.metrics, cost: report.cost })}\n\nPer-topic strength/confidence/source comparisons, required spot checks, Aile domain aggregate, rejected patterns, healthy/suspicious overlaps, ontology gaps and review priorities: [full JSON report](../data/generated/topic-mappings-v2.report.json).\n\nResume: ${JSON.stringify(report.resumeTest)}. Source/footnote warnings: ${JSON.stringify(report.sourceWarnings)}; preserved and separate.\n\nValidation: independent cache/coverage/reference/integrity checks passed. Production mappings, translator provenance, text, footnotes, UI and Esma unchanged. No deploy. Human review of proposed ontology and queued relations remains a publication blocker.\n`;
  const temporary = `docs/topic-classification-v2-report.md.${randomUUID()}.tmp`;
  await writeFile(temporary, markdown); await rename(temporary, "docs/topic-classification-v2-report.md");
}
console.log(JSON.stringify(validation, null, 2));
process.exitCode = errors.length ? 1 : 0;
