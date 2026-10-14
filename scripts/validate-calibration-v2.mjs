import { join } from "node:path";
import { atomicJson, cacheKey, hash, readJson, ResponsesRunner } from "./lib/classification-responses.mjs";
import { CALIBRATION_TOPICS, mappingKey, protectedHashes, SAMPLE, SETTINGS } from "./lib/calibration-v2.mjs";

const latest = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
const directory = latest.directory;
const manifest = await readJson(join(directory, "manifest.json"));
const report = await readJson(join(directory, "report.json"));
const frozen = await readJson(join(directory, "frozen-inputs.json"));
const errors = [];
if (manifest.status !== "completed" || !report.calibrationComplete) errors.push("Calibration incomplete: no semantic success claim permitted.");
if (hash(await protectedHashes()) !== hash(manifest.protectedHashes)) errors.push("Protected data changed.");
if (report.fullCorpusClassificationStarted || manifest.fullRunAuthorized || report.publication.switchedToV2) errors.push("Unauthorized full run/publication.");
if (manifest.reasoningEffort !== "high" || !manifest.model) errors.push("Missing model/high reasoning config.");
if (manifest.status === "completed") {
  const jobs = await readJson(join(directory, "completed-jobs.json"));
  const jobIds = new Set(jobs.map(j => j.id));
  if (jobIds.size !== jobs.length || manifest.batches.length !== jobs.length || manifest.batches.some(b => b.status !== "completed" || !jobIds.has(b.id))) errors.push("Missing/duplicate/incomplete batches.");
  const config = { model: manifest.model, endpoint: "https://api.openai.com/v1/responses", maxOutputTokens: 24000 };
  const runner = new ResponsesRunner({ directory, config, apiKey: undefined, fetchFn: async () => { throw new Error("Validator must never make API requests."); } });
  for (const job of jobs) {
    const batch = manifest.batches.find(b => b.id === job.id);
    if (batch?.key !== cacheKey(config, job)) errors.push(`Batch key mismatch ${job.id}`);
    try { await runner.run(job, { cacheOnly: true }); } catch { errors.push(`Invalid checkpoint ${job.id}`); }
  }
  const expectedRetrievalBatches = Math.ceil(6236 / SETTINGS.retrievalBatchSize);
  if (jobs.filter(j => /^retrieval-\d{3}$/.test(j.id)).length !== expectedRetrievalBatches) errors.push("Retrieval batches missing.");
  for (const topicId of CALIBRATION_TOPICS) {
    const ids = jobs.filter(j => /^retrieval-\d{3}$/.test(j.id) && j.topicIds.includes(topicId)).flatMap(j => j.verseIds);
    if (ids.length !== 6236 || new Set(ids).size !== 6236) errors.push(`Incomplete retrieval ${topicId}`);
  }
  const sample = jobs.filter(j => j.stage === "verse").flatMap(j => j.verseIds);
  if (sample.length !== 50 || new Set(sample).size !== 50 || SAMPLE.some(s => !sample.includes(s.verseId))) errors.push("Sample coverage incomplete.");
  if (jobs.filter(j => j.stage === "verse").some(j => j.topicIds.length !== 166)) errors.push("Sample missing full ontology contracts.");
  for (const topicId of CALIBRATION_TOPICS) if (!jobs.some(j => j.id === `topic-audit-${topicId}`)) errors.push(`Missing reverse calibration audit ${topicId}`);
  if (!jobs.some(j => j.stage === "quality")) errors.push("Missing sample adversarial audit.");
  const mappings = await readJson(join(directory, "sample-mappings.json"));
  const verseIds = new Set(frozen.corpus.map(v => v.id)); const topicIds = new Set([...frozen.ontology.topics, ...frozen.ontology.subtopics].map(t => t.id));
  if (new Set(mappings.map(mappingKey)).size !== mappings.length) errors.push("Duplicate final sample mappings.");
  for (const m of mappings) {
    if (!verseIds.has(m.verseId) || !topicIds.has(m.topicId) || !sample.includes(m.verseId)) errors.push("Broken/out-of-sample mapping.");
    if (!["machineAccepted", "humanReviewRequired"].includes(m.reviewStatus)) errors.push("AI output has human-review/invalid status.");
    if (m.reviewStatus === "machineAccepted" && (m.confidence !== "high" || m.decision !== "accept")) errors.push("Invalid automatic eligibility.");
    if (m.runId !== manifest.runId || m.ontologyHash !== manifest.ontologyHash || m.corpusHash !== manifest.corpusHash) errors.push("Mapping provenance/hash mismatch.");
  }
  if (report.resumeTest.status !== "PASS" || report.resumeTest.newRequests !== 0) errors.push("Resume replay test incomplete.");
}
const validation = { runId: manifest.runId, status: manifest.status, protectedDataUnchanged: !errors.includes("Protected data changed."), fullRunStarted: false, errors, result: errors.length ? "FAIL" : "PASS_CALIBRATION_ONLY", reportChecksum: hash(report) };
await atomicJson(join(directory, "validation.json"), validation);
console.log(JSON.stringify(validation, null, 2));
process.exitCode = errors.length ? 1 : 0;
