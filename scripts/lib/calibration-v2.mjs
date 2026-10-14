import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicJson, cacheKey, CLASSIFIER_VERSION, hash, PROMPT_VERSION, readJson, REASONING_EFFORT, RESULT_SCHEMA } from "./classification-responses.mjs";

export const CALIBRATION_TOPICS = ["sabir", "zekat", "adalet", "evlilik", "dirilis"];
// Deliberately curated, diverse diagnostic sample, not a statistical prevalence estimate.
export const SAMPLE = [
  ["1:1", "short-theological"], ["1:5", "prayer"], ["2:26", "parable"], ["2:43", "explicit-duty"],
  ["2:45", "explicit-patience"], ["2:102", "complex-narrative"], ["2:153", "explicit-patience"],
  ["2:155", "trial-context"], ["2:156", "pronoun-context"], ["2:157", "pronoun-context"],
  ["2:177", "many-principles"], ["2:228", "family-law"], ["2:256", "freedom"], ["2:261", "charity-not-automatically-zekat"],
  ["2:282", "long-legal"], ["3:7", "interpretation"], ["3:185", "death-and-afterlife"], ["4:3", "marriage-and-justice"],
  ["4:4", "marriage-rights"], ["4:11", "inheritance"], ["4:58", "explicit-justice"], ["4:135", "explicit-justice"],
  ["5:8", "explicit-justice"], ["5:55", "explicit-duty"], ["6:95", "life-not-automatically-resurrection"],
  ["7:54", "creation"], ["9:60", "charity-boundary"], ["12:18", "quoted-narrative-patience"],
  ["12:23", "quoted-narrative"], ["12:28", "quoted-speaker-context"], ["12:83", "narrative-patience"],
  ["13:3", "pairs-not-marriage"], ["18:60", "narrative"], ["18:65", "pronoun-context"], ["18:82", "explanatory-passage"],
  ["19:13", "purity-zekat-boundary"], ["20:14", "direct-worship"], ["24:32", "explicit-marriage"],
  ["30:21", "marriage"], ["36:78", "quoted-resurrection-objection"], ["36:79", "resurrection-answer"],
  ["39:53", "hope-and-repentance"], ["49:12", "social-ethics"], ["55:13", "repeated-rhetorical"],
  ["57:20", "worldly-life"], ["65:3", "reliance"], ["75:3", "resurrection-question"],
  ["97:1", "revelation-context"], ["107:7", "short-social-principle"], ["114:6", "fallback-translator-context"],
].map(([verseId, kind]) => ({ verseId, kind }));

// Diagnostic hypotheses, not exhaustive ground truth and NEVER human-review approvals.
export const PROBES = [
  ["2:153", "sabir", true, "Açık sabır buyruğu"],
  ["2:43", "zekat", true, "Açık zekât buyruğu"],
  ["4:58", "adalet", true, "İnsanlar arasında adil hüküm"],
  ["24:32", "evlilik", true, "Açık evlendirme buyruğu"],
  ["36:79", "dirilis", true, "Ölü kemikleri yeniden diriltme cevabı"],
  ["13:3", "evlilik", false, "Doğadaki çiftler evlilik değildir: açık dışlama kuralı"],
  ["2:261", "zekat", false, "Genel infak zekâtla özdeşleştirilmemeli"],
  ["6:95", "dirilis", false, "Canlılık tek başına ölüm sonrası diriliş değildir"],
].map(([verseId, topicId, expectedRelevant, reason]) => ({ verseId, topicId, expectedRelevant, reason, status: "diagnostic-hypothesis-not-human-ground-truth" }));

export const SETTINGS = { retrievalBatchSize: 128, sampleBatchSize: 10, topicGroupSize: 5, contextRadius: 3, maxAttempts: 3 };
export function chunks(values, size) { const result = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result; }

export async function protectedHashes(root = "src/data") {
  const output = {};
  async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) await walk(path);
      else output[path] = hash(await readFile(path));
    }
  }
  await walk(root);
  return output;
}

export async function loadInputs() {
  const paths = { corpus: "src/data/quran.json", ontology: "data/generated/topic-ontology-v2.proposed.json", ontologyReport: "data/generated/topic-ontology-v2.report.json", source: "src/data/source-topics.json" };
  const raw = {}; const data = {}; const hashes = {};
  for (const [key, path] of Object.entries(paths)) { raw[key] = await readFile(path, "utf8"); data[key] = JSON.parse(raw[key]); hashes[key] = hash(raw[key]); }
  const { corpus, ontology } = data;
  if (corpus.length !== 6236 || new Set(corpus.map(v => v.id)).size !== 6236) throw new Error("Expected exactly 6236 unique canonical verses.");
  if (ontology.topics.length !== 130 || ontology.subtopics.length !== 36) throw new Error("Unexpected ontology counts.");
  const ids = new Set(corpus.map(v => v.id));
  if (SAMPLE.length !== 50 || SAMPLE.some(v => !ids.has(v.verseId)) || new Set(SAMPLE.map(v => v.verseId)).size !== SAMPLE.length) throw new Error("Invalid calibration sample.");
  if (CALIBRATION_TOPICS.some(id => !ontology.topics.some(t => t.id === id))) throw new Error("Calibration canonical topic missing.");
  return { ...data, raw, hashes, protected: await protectedHashes() };
}

export function topicContract(topic, ontology) {
  return {
    ...topic,
    domain: ontology.domains.find(domain => domain.id === topic.domainId),
    parent: topic.parentTopicId ? ontology.topics.find(t => t.id === topic.parentTopicId) : null,
    relatedTopics: topic.relatedTopicIds.map(id => [...ontology.topics, ...ontology.subtopics].find(t => t.id === id)),
    subtopics: ontology.subtopics.filter(t => t.parentTopicId === topic.id),
  };
}

export function buildJob({ stage, id, targets, topics, inputs, priorMappings = [], radius = 1, fullSurah = false, extra = {} }) {
  const targetIds = new Set(targets.map(v => v.id));
  const evidence = inputs.corpus.filter(v => targets.some(t => v.surahNumber === t.surahNumber && (fullSurah || Math.abs(v.ayahNumber - t.ayahNumber) <= radius)));
  const topicIds = topics.map(t => t.id);
  const requiredMappingKeys = stage === "retrieval" || stage === "verse" ? [] : priorMappings.map(m => `${m.verseId}/${m.topicId}`);
  const job = {
    stage, id, verseIds: targets.map(v => v.id), topicIds, evidenceIds: evidence.map(v => v.id), requiredMappingKeys,
    payload: {
      stage, targetVerseIds: [...targetIds], topicContracts: topics.map(t => topicContract(t, inputs.ontology)),
      canonicalEvidence: evidence, priorMappings,
      ontologyVersion: inputs.ontology.version, ontologyHash: inputs.hashes.ontology, corpusHash: inputs.hashes.corpus,
      classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION,
      ...extra,
    },
  };
  // Break shared leaf objects before assigning field-specific enums/bounds.
  job.schema = JSON.parse(JSON.stringify(RESULT_SCHEMA));
  for (const [field, ids] of [["consideredVerseIds", job.verseIds], ["consideredTopicIds", topicIds]]) {
    job.schema.properties[field].minItems = ids.length;
    job.schema.properties[field].maxItems = ids.length;
    if (ids.length) job.schema.properties[field].items.enum = ids;
  }
  const decisions = stage === "retrieval" ? ["candidate"] : stage === "verse" ? ["candidate", "accept", "reject", "reviewRequired"] : ["accept", "reject", "reviewRequired"];
  job.schema.properties.mappings.items.properties.decision.enum = decisions;
  // Repeat ID enums only within the provider's total-enum technical limit.
  if (job.verseIds.length + topicIds.length <= 400) {
    for (const item of [job.schema.properties.mappings.items, job.schema.properties.findings.items]) {
      if (job.verseIds.length) item.properties.verseId.enum = job.verseIds;
      if (topicIds.length) item.properties.topicId.enum = topicIds;
    }
  }
  return job;
}

export function initialJobs(inputs) {
  const topics = CALIBRATION_TOPICS.map(id => inputs.ontology.topics.find(t => t.id === id));
  const allTopics = [...inputs.ontology.topics, ...inputs.ontology.subtopics];
  const retrieval = chunks(inputs.corpus, SETTINGS.retrievalBatchSize).map((targets, index) => buildJob({ stage: "retrieval", id: `retrieval-${String(index).padStart(3, "0")}`, targets, topics, inputs }));
  const verse = chunks(SAMPLE.map(s => inputs.corpus.find(v => v.id === s.verseId)), SETTINGS.sampleBatchSize).map((targets, index) => buildJob({ stage: "verse", id: `verse-${index}`, targets, topics: allTopics, inputs }));
  return [...retrieval, ...verse];
}

export function mappingKey(m) { return `${m.verseId}/${m.topicId}`; }
export function unionMappings(...collections) {
  const map = new Map();
  for (const collection of collections) for (const mapping of collection) if (!map.has(mappingKey(mapping))) map.set(mappingKey(mapping), mapping);
  return [...map.values()];
}
export function annotate(mapping, manifest, disagreements = []) {
  return {
    ...mapping, classifierVersion: CLASSIFIER_VERSION, ontologyVersion: manifest.ontologyVersion,
    ontologyHash: manifest.ontologyHash, corpusHash: manifest.corpusHash, runId: manifest.runId,
    reviewStatus: mapping.decision === "accept" && mapping.confidence === "high" && !disagreements.includes(mappingKey(mapping)) ? "machineAccepted" : "humanReviewRequired",
    provenance: { origin: "openai-semantic-calibration", production: false },
  };
}

export async function executeCalibration(inputs, config, runner, manifest, directory, { stopAfterBatches = Infinity } = {}) {
  const jobs = initialJobs(inputs);
  const results = new Map(); let completedThisInvocation = 0;
  async function runJob(job) {
    const key = cacheKey(config, job);
    const previous = manifest.batches.find(b => b.id === job.id);
    if (previous && previous.key !== key) throw new Error("Run manifest job content changed; resume refused.");
    if (!previous) manifest.batches.push({ id: job.id, stage: job.stage, key, verseIds: job.verseIds, topicIds: job.topicIds, status: "pending" });
    const batch = manifest.batches.find(b => b.id === job.id);
    await atomicJson(join(directory, "manifest.json"), manifest);
    if (completedThisInvocation >= stopAfterBatches) throw new Error("Calibration paused at explicit batch limit; rerun resumes checkpoints.");
    try {
      const record = await runner.run(job);
      batch.status = "completed"; batch.checksum = record.checksum;
      results.set(job.id, { job, record });
      completedThisInvocation++;
      await atomicJson(join(directory, "manifest.json"), manifest);
      return record.result;
    } catch (error) { batch.status = "failed"; await atomicJson(join(directory, "manifest.json"), manifest); throw error; }
  }
  // Declare all fixed batches before first request so missing work is visible on interruption.
  for (const job of jobs) if (!manifest.batches.some(b => b.id === job.id)) manifest.batches.push({ id: job.id, stage: job.stage, key: cacheKey(config, job), verseIds: job.verseIds, topicIds: job.topicIds, status: "pending" });
  await atomicJson(join(directory, "manifest.json"), manifest);
  for (const job of jobs) await runJob(job);
  let candidates = jobs.filter(j => j.stage === "retrieval").flatMap(j => results.get(j.id).record.result.mappings);
  const retrievalContextIds = [...new Set(jobs.filter(j => j.stage === "retrieval").flatMap(j => results.get(j.id).record.result.needsMoreContextVerseIds))];
  for (const [index, ids] of chunks(retrievalContextIds, SETTINGS.sampleBatchSize).entries()) {
    const targets = inputs.corpus.filter(v => ids.includes(v.id));
    const topics = CALIBRATION_TOPICS.map(id => inputs.ontology.topics.find(t => t.id === id));
    const job = buildJob({ stage: "retrieval", id: `retrieval-context-${index}`, targets, topics, inputs, fullSurah: true, extra: { instruction: "Resolve requested retrieval context. These are fresh candidates, not prior mapping assumptions." } });
    const result = await runJob(job);
    if (result.needsMoreContextVerseIds.length) throw new Error("Retrieval context remains unresolved with complete surahs; no silent missing candidates.");
    candidates = [...candidates.filter(m => !ids.includes(m.verseId)), ...result.mappings];
  }
  const initialSample = jobs.filter(j => j.stage === "verse").flatMap(j => results.get(j.id).record.result.mappings);
  const sampleIds = new Set(SAMPLE.map(s => s.verseId));
  const candidateKeys = new Set(candidates.filter(m => sampleIds.has(m.verseId)).map(mappingKey));
  const sampleKeys = new Set(initialSample.filter(m => CALIBRATION_TOPICS.includes(m.topicId) && m.decision !== "reject").map(mappingKey));
  const disagreements = [...new Set([...candidateKeys, ...sampleKeys])].filter(key => candidateKeys.has(key) !== sampleKeys.has(key));
  const allTopics = [...inputs.ontology.topics, ...inputs.ontology.subtopics];
  const contextResults = [];
  for (const [index, sample] of chunks(SAMPLE, SETTINGS.sampleBatchSize).entries()) {
    const targets = sample.map(s => inputs.corpus.find(v => v.id === s.verseId));
    const targetIds = new Set(targets.map(v => v.id));
    const priorMappings = unionMappings(initialSample.filter(m => targetIds.has(m.verseId)), candidates.filter(m => targetIds.has(m.verseId)));
    let job = buildJob({ stage: "context", id: `context-${index}`, targets, topics: allTopics, inputs, priorMappings, radius: SETTINGS.contextRadius, extra: { independentVerseMappings: initialSample.filter(m => targetIds.has(m.verseId)), topicCentricCandidates: candidates.filter(m => targetIds.has(m.verseId)), disagreements: disagreements.filter(key => targetIds.has(key.split("/")[0])) } });
    let result = await runJob(job);
    if (result.needsMoreContextVerseIds.length) {
      job = buildJob({ stage: "context", id: `context-${index}-expanded`, targets, topics: allTopics, inputs, priorMappings: unionMappings(priorMappings, result.mappings), fullSurah: true, extra: { contextExpansion: "complete target surahs; no target verse merging" } });
      result = await runJob(job);
      if (result.needsMoreContextVerseIds.length) throw new Error("Insufficient full-surah context; calibration remains incomplete rather than guessing.");
    }
    contextResults.push(...result.mappings);
  }
  // Complete candidate sets per chosen topic, AS A WHOLE. These audits remain calibration-only.
  const auditedCandidates = [];
  for (const topicId of CALIBRATION_TOPICS) {
    const priorMappings = candidates.filter(m => m.topicId === topicId);
    const targets = inputs.corpus.filter(v => priorMappings.some(m => m.verseId === v.id));
    const topic = inputs.ontology.topics.find(t => t.id === topicId);
    const job = buildJob({ stage: "audit", id: `topic-audit-${topicId}`, targets, topics: [topic], inputs, priorMappings, radius: SETTINGS.contextRadius, extra: { instruction: "Audit the entire candidate set as a whole against the exclusion contract; do not normalize count. Candidate retrieval covered all 6236 verses. Misses outside this supplied set cannot be certified absent." } });
    const result = await runJob(job);
    if (result.needsMoreContextVerseIds.length) throw new Error("Topic audit requested more context; incomplete, no silent context skip.");
    auditedCandidates.push(...result.mappings);
  }
  const targets = SAMPLE.map(s => inputs.corpus.find(v => v.id === s.verseId));
  const finalJob = buildJob({ stage: "quality", id: "sample-adversarial-audit", targets, topics: allTopics, inputs, priorMappings: contextResults, radius: SETTINGS.contextRadius, extra: { instruction: "Try to disprove weak/context-projected mappings and find missing relationships. Explicitly decide every prior pair. This is not a production run or a human review." } });
  let quality = await runJob(finalJob);
  if (quality.needsMoreContextVerseIds.length) {
    const expanded = buildJob({ stage: "quality", id: "sample-adversarial-audit-expanded", targets, topics: allTopics, inputs, priorMappings: unionMappings(contextResults, quality.mappings), fullSurah: true });
    quality = await runJob(expanded);
    if (quality.needsMoreContextVerseIds.length) throw new Error("Final sample audit insufficient context; calibration incomplete.");
  }
  // Replay every checkpoint with network disabled: test actual complete-run resume, not just a mock.
  const before = runner.requests; const replayStart = runner.cacheHits;
  for (const { job } of results.values()) await runner.run(job, { cacheOnly: true });
  const resumeTest = { status: "PASS", replayedBatches: runner.cacheHits - replayStart, newRequests: runner.requests - before, mode: "all completed checkpoints replayed with cacheOnly; no network permitted" };
  if (resumeTest.newRequests || resumeTest.replayedBatches !== results.size) throw new Error("Resume checkpoint validation failed.");
  return { candidates: candidates.map(m => annotate(m, manifest, disagreements)), initialSample: initialSample.map(m => annotate(m, manifest, disagreements)), contextResults: contextResults.map(m => annotate(m, manifest, disagreements)), auditedCandidates: auditedCandidates.map(m => annotate(m, manifest, disagreements)), sampleMappings: quality.mappings.map(m => annotate(m, manifest, disagreements)), findings: [...results.values()].flatMap(v => v.record.result.findings), disagreements, resumeTest, jobs: [...results.values()].map(v => v.job), records: [...results.values()].map(v => v.record) };
}

export async function requestMetrics(directory) {
  let files = [];
  try { files = await readdir(join(directory, "requests")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const receipts = await Promise.all(files.filter(f => f.endsWith(".json") && !f.endsWith(".invalid-output.json")).map(f => readJson(join(directory, "requests", f))));
  const totals = { requestCount: receipts.length, successfulRequests: receipts.filter(r => r.status === "completed").length, failedRequests: receipts.filter(r => r.status === "failed").length, uncertainRequests: receipts.filter(r => !["failed", "completed"].includes(r.status)).length, retryCount: receipts.filter(r => r.attempt > 1).length, jsonSchemaFailureCount: receipts.filter(r => r.schemaFailure).length, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, requestsWithoutUsage: receipts.filter(r => !r.usage).length, longContextRequests: receipts.filter(r => r.usage?.inputTokens > 272000).length, usageReceipts: receipts.filter(r => r.usage).map(r => ({ stage: r.stage, usage: r.usage })), byStage: {}, servedModels: [...new Set(receipts.map(r => r.servedModel).filter(Boolean))] };
  for (const receipt of receipts) {
    totals.byStage[receipt.stage] ??= { requests: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    totals.byStage[receipt.stage].requests++;
    if (receipt.usage) for (const key of ["inputTokens", "outputTokens", "cachedInputTokens", "reasoningTokens"]) { totals[key] += receipt.usage[key]; if (key in totals.byStage[receipt.stage]) totals.byStage[receipt.stage][key] += receipt.usage[key]; }
  }
  totals.pollingRequestCount = receipts.reduce((sum, receipt) => sum + (receipt.pollingRequests ?? 0), 0);
  totals.providerFailureCodes = [...new Set(receipts.map(receipt => receipt.errorCode).filter(Boolean))];
  return totals;
}

export function costEstimate(metrics, model) {
  // Pricing metadata is NOT a fallback model. Unknown models have unknown pricing.
  if (model !== "gpt-5.6-sol") return { usd: null, reason: "No verified rate for configured model; no model substitution." };
  if (metrics.requestCount > 0 && metrics.usageReceipts?.length === 0) return { usd: null, reason: "Provider reported no token usage; do not claim a zero invoice or estimate unavailable usage." };
  const usages = metrics.usageReceipts?.map(r => r.usage) ?? [metrics];
  let input = 0; let cached = 0; let output = 0;
  for (const usage of usages) {
    const long = usage.longContext ?? usage.inputTokens > 272000;
    input += (usage.inputTokens - usage.cachedInputTokens) * 4 * (long ? 2 : 1) / 1e6;
    cached += usage.cachedInputTokens * 0.4 * (long ? 2 : 1) / 1e6;
    output += usage.outputTokens * 20 * (long ? 1.5 : 1) / 1e6;
  }
  return { usdBaseEstimate: input + cached + output, usdIfAllUncachedInputWereCacheWrites: input * 1.25 + cached + output, inputPerMillion: 4, cachedInputPerMillion: 0.4, outputPerMillion: 20, priceChecked: "2026-09-17", source: "https://developers.openai.com/api/docs/models/gpt-5.6-sol", caveats: ["Estimate, not an invoice; absent usage from failed/uncertain calls may be billable.", "Cache-write quantities may not be exposed; upper scenario applies 1.25x to all uncached input.", "Requests >272K input tokens use 2x input and 1.5x output rates; check per-request receipts before extrapolation.", "No Batch API discount assumed; standard service tier, no tools."] };
}

export function volumeEstimate(metrics, inputs, outputs) {
  const retrievalBatches = Math.ceil(inputs.corpus.length / SETTINGS.retrievalBatchSize) * Math.ceil(inputs.ontology.topics.length / SETTINGS.topicGroupSize);
  const verseBatches = Math.ceil(inputs.corpus.length / SETTINGS.sampleBatchSize);
  const retrieval = metrics.byStage.retrieval;
  const verse = metrics.byStage.verse;
  const context = metrics.byStage.context;
  const audit = metrics.byStage.audit;
  const quality = metrics.byStage.quality;
  const stages = [
    ["1-topic-retrieval", retrievalBatches, retrieval, 130 / 5], ["2-verse-centric", verseBatches, verse, 6236 / 50],
    ["3-context-validation", verseBatches, context, 6236 / 50], ["5-reverse-topic-audit", inputs.ontology.topics.length, audit, 130 / 5],
    ["9-adversarial-quality", Math.ceil(6236 / 50), quality, 6236 / 50],
  ].map(([stage, requests, observed, scale]) => ({ stage, projectedRequests: requests, projectedInputTokens: observed?.requests ? scale * observed.inputTokens : null, projectedOutputTokens: observed?.requests ? scale * observed.outputTokens : null, projectedCachedInputTokens: observed?.requests ? scale * observed.cachedInputTokens : null, scaleFactor: scale }));
  return { fullRunExecuted: false, retrievalTopicVerseComparisons: 6236 * 130, deterministicRetrievalRequests: retrievalBatches, verseCentricRequests: verseBatches, measuredStageProjections: stages, requestSubtotal: stages.reduce((sum, stage) => sum + stage.projectedRequests, 0), fullNinePassCost: null, reason: "Passes 4/6/7/8, variable ambiguities, 8385 canonical topic pairs and expansion/consolidation calls require separate measurement. This subtotal is not a full-run quote or authorization.", assumptions: ["Five topic contracts per retrieval call; 128 target verses; all topics individually considered.", "Full ontology in each 10-target verse-centric/context call; final quality calls have 50 targets as in calibration.", "Conservative scenario context-validates all verses; actual ambiguity rate may differ.", "One complete-set reverse call per canonical topic; no arbitrary truncation.", "Per-target/per-topic linear token extrapolation including observed retries/expansions; volume changes with topic density.", "Calibration sample is diagnostic/curated, not statistically representative; density and output cost vary.", "No default model substitution, no request initiated by this projection."], sampleMappingsObserved: outputs?.sampleMappings?.length ?? null };
}

export const VERSION_METADATA = { classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION, reasoningEffort: REASONING_EFFORT };
