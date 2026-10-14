import { join } from "node:path";
import { atomicJson, cacheKey, hash } from "./classification-responses.mjs";
import { CALIBRATION_TOPICS, chunks, initialJobs, mappingKey, unionMappings } from "./calibration-v2.mjs";
import { DEEP_INSTRUCTIONS, DEEP_PROMPT_VERSION, DEEP_VERSION, deepSchema, hydrateDeepJob, normalizedDeepResult } from "./deep-schema-v2.mjs";

export const DEEP_SETTINGS = { retrievalBatchSize: 128, topicGroupSize: 5, verseBatchSize: 10, auditBatchSize: 20, contextRadius: 3, concurrency: 4, maxAttempts: 3 };
const allTopics = inputs => [...inputs.ontology.topics, ...inputs.ontology.subtopics];
const projectVerse = ({ id, surahNumber, surahName, ayahNumber, translator, plainTranslation, footnotes, isFallbackTranslation }) => ({ id, surahNumber, surahName, ayahNumber, translator, plainTranslation, footnotes, isFallbackTranslation });

export function deepJob({ inputs, stage, id, targets, topics = allTopics(inputs), priorMappings = [], fullSurah = false, radius = DEEP_SETTINGS.contextRadius, extra = {}, pairKeys = [] }) {
  const targetSurahs = new Map();
  for (const target of targets) { const existing = targetSurahs.get(target.surahNumber) ?? []; existing.push(target.ayahNumber); targetSurahs.set(target.surahNumber, existing); }
  const evidence = inputs.corpus.filter(v => targetSurahs.has(v.surahNumber) && (fullSurah || targetSurahs.get(v.surahNumber).some(n => Math.abs(n - v.ayahNumber) <= radius)));
  const needed = new Set(topics.flatMap(t => [t.id, t.parentTopicId, ...t.relatedTopicIds]).filter(Boolean));
  const contracts = allTopics(inputs).filter(t => needed.has(t.id) || needed.has(t.parentTopicId));
  const job = {
    id, stage, verseIds: targets.map(v => v.id), topicIds: topics.map(t => t.id), evidenceIds: evidence.map(v => v.id),
    requiredMappingKeys: priorMappings.map(mappingKey), pairKeys, background: true,
    schemaName: "quran_deep_topic_classification", instructions: DEEP_INSTRUCTIONS,
    maxOutputTokens: ["reverse", "final-reverse", "consolidation"].includes(stage) ? 128000 : 64000,
    payload: { stage, targetVerseIds: targets.map(v => v.id), assignmentTopicIds: topics.map(t => t.id),
      // Each contract occurs once. Related/parent/domain IDs resolve against this complete table.
      topicContracts: contracts, domains: inputs.ontology.domains, canonicalEvidence: evidence.map(projectVerse),
      priorMappings, ontologyVersion: inputs.ontology.version, ontologyHash: inputs.hashes.ontology,
      corpusHash: inputs.hashes.corpus, classifierVersion: DEEP_VERSION, promptVersion: DEEP_PROMPT_VERSION,
      ontologyReviewNotes: inputs.ontologyReport.requiresHumanReview, limitations: inputs.ontologyReport.limitations, ...extra },
  };
  job.schema = deepSchema(job);
  return hydrateDeepJob(job);
}

export function topicPairs(inputs, mappings) {
  const topics = inputs.ontology.topics;
  const sets = new Map(topics.map(t => [t.id, new Set(mappings.filter(m => m.topicId === t.id && m.decision === "accept").map(m => m.verseId))]));
  const output = [];
  for (let a = 0; a < topics.length; a++) for (let b = a + 1; b < topics.length; b++) {
    const left = sets.get(topics[a].id), right = sets.get(topics[b].id);
    const intersectionVerseIds = [...left].filter(id => right.has(id));
    const intersection = intersectionVerseIds.length, union = left.size + right.size - intersection;
    output.push({ key: `${topics[a].id}/${topics[b].id}`, topicA: topics[a].id, topicB: topics[b].id,
      countA: left.size, countB: right.size, intersection, jaccard: union ? intersection / union : 0,
      containmentA: left.size ? intersection / left.size : 0, containmentB: right.size ? intersection / right.size : 0,
      intersectionVerseIds, assessment: intersection ? "pendingSemanticAudit" : "zeroObservedIntersection" });
  }
  return output;
}

export function coverageStats(inputs, mappings) {
  const counts = inputs.corpus.map(v => mappings.filter(m => m.verseId === v.id && m.decision === "accept").length);
  const mapped = counts.filter(n => n > 0).sort((a, b) => a - b);
  const quantile = q => mapped.length ? mapped[Math.min(mapped.length - 1, Math.floor((mapped.length - 1) * q))] : 0;
  const distribution = Object.fromEntries(["0", "1", "2", "3", "4", "5", "6-10", "11+"].map(k => [k, 0]));
  counts.forEach(n => distribution[n <= 5 ? String(n) : n <= 10 ? "6-10" : "11+"]++);
  return { totalVerses: counts.length, mappedVerses: mapped.length, unmappedVerses: counts.length - mapped.length,
    averageTopicsPerMappedVerse: mapped.length ? mapped.reduce((a, b) => a + b, 0) / mapped.length : 0,
    median: quantile(0.5), p90: quantile(0.9), maximum: mapped.at(-1) ?? 0, distribution,
    unmappedVerseIds: inputs.corpus.filter((_, i) => counts[i] === 0).map(v => v.id),
    outliers: inputs.corpus.filter((_, i) => counts[i] > 10).map(v => ({ verseId: v.id, count: counts[inputs.corpus.indexOf(v)] })) };
}

export async function executeDeepClassification({ inputs, config, runner, calibrationRunner, manifest, directory, cacheOnly = false }) {
  const completedJobs = new Map();
  const corpusById = new Map(inputs.corpus.map(v => [v.id, v]));
  let persistence = Promise.resolve();
  const persist = () => { persistence = persistence.then(() => atomicJson(join(directory, "manifest.json"), manifest)); return persistence; };
  async function runOne(job, provider = runner) {
    const key = cacheKey(config, job);
    let batch = manifest.batches.find(b => b.id === job.id);
    if (batch && batch.key !== key) throw new Error(`Frozen batch content changed: ${job.id}; resume refused.`);
    if (!batch) { batch = { id: job.id, stage: job.stage, key, verseIds: job.verseIds, topicIds: job.topicIds, status: "pending", cacheOrigin: provider === calibrationRunner ? "calibration" : "full" }; manifest.batches.push(batch); }
    await persist();
    try {
      const record = await provider.run(job, { cacheOnly: provider === calibrationRunner || cacheOnly });
      batch.status = "completed"; batch.checksum = record.checksum; batch.cacheHit = record.cacheHit;
      completedJobs.set(job.id, { job, record, cacheOrigin: batch.cacheOrigin });
      await persist();
      return job.validate ? { ...normalizedDeepResult(record.result, job), raw: record.result } : record.result;
    } catch (error) { batch.status = "failed"; await persist(); throw error; }
  }
  async function runMany(jobs, concurrency = DEEP_SETTINGS.concurrency) {
    for (const job of jobs) {
      const key = cacheKey(config, job), previous = manifest.batches.find(b => b.id === job.id);
      if (previous && previous.key !== key) throw new Error(`Frozen batch content changed: ${job.id}; resume refused.`);
      if (!previous) manifest.batches.push({ id: job.id, stage: job.stage, key, verseIds: job.verseIds, topicIds: job.topicIds, status: "pending", cacheOrigin: "full" });
    }
    await persist();
    const output = new Array(jobs.length); let next = 0; let failure;
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (!failure && next < jobs.length) { const index = next++; try { output[index] = await runOne(jobs[index]); } catch (error) { failure = error; } }
    }));
    if (failure) throw failure;
    return output;
  }
  async function semanticPass(stage, targets, priorMappings, extra = {}, topics = allTopics(inputs)) {
    const jobs = chunks(targets, DEEP_SETTINGS.auditBatchSize).map((batch, index) => {
      const ids = new Set(batch.map(v => v.id));
      const scoped = Object.fromEntries(Object.entries(extra).map(([key, value]) => [key,
        Array.isArray(value) && value.length && value[0]?.verseId ? value.filter(entry => ids.has(entry.verseId)) :
          key === "disagreementKeys" ? value.filter(entry => ids.has(entry.split("/")[0])) : value]));
      return deepJob({ inputs, stage, id: `${stage}-${index}`, targets: batch, topics, priorMappings: priorMappings.filter(m => ids.has(m.verseId)), extra: scoped });
    });
    const results = await runMany(jobs);
    for (let index = 0; index < results.length; index++) if (results[index].needsMoreContextVerseIds.length) {
      const job = jobs[index];
      const scoped = Object.fromEntries(Object.entries(job.payload).filter(([key]) => Object.hasOwn(extra, key)));
      results[index] = await runOne(deepJob({ inputs, stage, id: `${job.id}-expanded`, targets: job.verseIds.map(id => corpusById.get(id)), topics, priorMappings: unionMappings(job.payload.priorMappings, results[index].mappings), fullSurah: true, extra: { ...scoped, contextExpansion: "complete target surahs" } }));
      if (results[index].needsMoreContextVerseIds.length) throw new Error(`Unresolved complete-surah context in ${job.id}; no silent omission.`);
    }
    return results;
  }
  async function finishPass(number, name, artifact) {
    await atomicJson(join(directory, `pass-${number}.json`), artifact);
    manifest.passes[number - 1] = { number, name, status: "completed", checksum: hash(artifact) };
    await persist();
    runner.onProgress({ stage: name, status: "passCompleted", pass: number });
  }
  // PASS 1: all 130 canonical contracts × all 6236 verses, no lexical prefilter.
  const reused = initialJobs(inputs).filter(j => j.stage === "retrieval");
  let candidates = [];
  const freshCalibrationTopicJobs = [];
  for (const job of reused) {
    try {
      // Inspect only valid existing checkpoints; NEVER launch a calibration request.
      await calibrationRunner.run(job, { cacheOnly: true });
      candidates.push(...(await runOne(job, calibrationRunner)).mappings);
    } catch (error) {
      if (!error.message.includes("completed checkpoint missing")) throw error;
      freshCalibrationTopicJobs.push(deepJob({ inputs, stage: "retrieval", id: `retrieval-direct-${job.id}`, targets: job.verseIds.map(id => corpusById.get(id)), topics: inputs.ontology.topics.filter(t => CALIBRATION_TOPICS.includes(t.id)), radius: 1 }));
    }
  }
  const remaining = inputs.ontology.topics.filter(t => !CALIBRATION_TOPICS.includes(t.id));
  const retrievalJobs = [...freshCalibrationTopicJobs, ...chunks(remaining, DEEP_SETTINGS.topicGroupSize).flatMap((topics, group) => chunks(inputs.corpus, DEEP_SETTINGS.retrievalBatchSize).map((targets, batch) => deepJob({ inputs, stage: "retrieval", id: `retrieval-group-${group}-${batch}`, targets, topics, radius: 1 })))];
  const retrievalResults = await runMany(retrievalJobs);
  candidates.push(...retrievalResults.flatMap(r => r.mappings));
  for (const [index, result] of retrievalResults.entries()) if (result.needsMoreContextVerseIds.length) {
    const job = retrievalJobs[index], ids = result.needsMoreContextVerseIds;
    const topics = inputs.ontology.topics.filter(t => job.topicIds.includes(t.id));
    const expanded = await runOne(deepJob({ inputs, stage: "retrieval", id: `${job.id}-expanded`, targets: ids.map(id => corpusById.get(id)), topics, fullSurah: true }));
    if (expanded.needsMoreContextVerseIds.length) throw new Error("Unresolved retrieval context; no silent candidate omissions.");
    candidates = [...candidates.filter(m => !(ids.includes(m.verseId) && job.topicIds.includes(m.topicId))), ...expanded.mappings];
  }
  // Calibration need not be complete. Expand actual context requests from reused answers.
  for (const { job, record, cacheOrigin } of [...completedJobs.values()]) if (cacheOrigin === "calibration" && record.result.needsMoreContextVerseIds.length) {
    const ids = record.result.needsMoreContextVerseIds;
    const result = await runOne(deepJob({ inputs, stage: "retrieval", id: `${job.id}-expanded`, targets: ids.map(id => corpusById.get(id)), topics: inputs.ontology.topics.filter(t => job.topicIds.includes(t.id)), fullSurah: true }));
    if (result.needsMoreContextVerseIds.length) throw new Error("Unresolved reused-candidate context; no silent omission.");
    candidates = [...candidates.filter(m => !(ids.includes(m.verseId) && job.topicIds.includes(m.topicId))), ...result.mappings];
  }
  candidates = unionMappings(candidates);
  await finishPass(1, "topic-centric-retrieval", { candidates, comparisons: 6236 * 130 });
  // PASS 2: independent full-ontology analysis of EVERY verse (including subtopics).
  const reusedVerseResults = [], reusedVerseIds = new Set();
  for (const job of initialJobs(inputs).filter(j => j.stage === "verse")) {
    try {
      await calibrationRunner.run(job, { cacheOnly: true });
      reusedVerseResults.push(await runOne(job, calibrationRunner)); job.verseIds.forEach(id => reusedVerseIds.add(id));
    } catch (error) { if (!error.message.includes("completed checkpoint missing")) throw error; }
  }
  const verseJobs = chunks(inputs.corpus.filter(v => !reusedVerseIds.has(v.id)), DEEP_SETTINGS.verseBatchSize).map((targets, index) => deepJob({ inputs, stage: "verse", id: `verse-full-${index}`, targets, radius: 1 }));
  const verseResults = [...reusedVerseResults, ...await runMany(verseJobs)];
  const verseMappings = verseResults.flatMap(r => r.mappings);
  const candidateKeys = new Set(candidates.map(mappingKey)), verseKeys = new Set(verseMappings.filter(m => m.decision !== "reject" && inputs.ontology.topics.some(t => t.id === m.topicId)).map(mappingKey));
  const disagreements = [...new Set([...candidateKeys, ...verseKeys])].filter(key => candidateKeys.has(key) !== verseKeys.has(key));
  await finishPass(2, "independent-verse-analysis", { mappings: verseMappings, disagreements });
  // PASS 3: all relationships are context-checked; no arbitrary ambiguity cutoff.
  const combined = unionMappings(candidates, verseMappings);
  const contextResults = await semanticPass("context", inputs.corpus, combined, { independentTopicCandidates: candidates, independentVerseMappings: verseMappings, disagreementKeys: disagreements });
  const contextMappings = contextResults.flatMap(r => r.mappings);
  await finishPass(3, "context-validation", { mappings: contextMappings, findings: contextResults.flatMap(r => r.findings) });
  // PASS 4: explicit decision for EVERY proposed pair, even rejects.
  const adjudicationResults = await semanticPass("adjudication", inputs.corpus, unionMappings(contextMappings, combined), { independentTopicCandidates: candidates, independentVerseMappings: verseMappings, contextualDecisions: contextMappings, disagreementKeys: disagreements, instruction: "Reconcile topic-centric and independent verse-centric perspectives with contextual decisions. Explicit accept/reject/reviewRequired for every prior pair." });
  let mappings = adjudicationResults.flatMap(r => r.mappings);
  await finishPass(4, "mapping-adjudication", { mappings, findings: adjudicationResults.flatMap(r => r.findings) });
  // PASS 5: EACH canonical topic + its meaningful subtopics, complete sets AS A WHOLE.
  async function reverse(stage, current) {
    const jobs = inputs.ontology.topics.map(topic => {
      const family = [topic, ...inputs.ontology.subtopics.filter(t => t.parentTopicId === topic.id)];
      const topicIds = new Set(family.map(t => t.id));
      const prior = current.filter(m => topicIds.has(m.topicId));
      const targetIds = new Set(prior.map(m => m.verseId));
      // Empty families examine the complete corpus; zero is not assumed valid without review.
      const targets = targetIds.size ? inputs.corpus.filter(v => targetIds.has(v.id)) : inputs.corpus;
      return deepJob({ inputs, stage, id: `${stage}-${topic.id}`, targets, topics: family, priorMappings: prior, extra: { entireSet: true, completeAcceptedVerseIds: prior.filter(m => m.decision === "accept").map(m => m.verseId), instruction: "Audit every supplied family relationship as one complete set. Do not truncate, normalize counts or assume old source mappings are ground truth." } });
    });
    const results = await runMany(jobs, 2);
    for (let index = 0; index < results.length; index++) if (results[index].needsMoreContextVerseIds.length) {
      const job = jobs[index], topics = allTopics(inputs).filter(t => job.topicIds.includes(t.id));
      results[index] = await runOne(deepJob({ inputs, stage, id: `${job.id}-expanded`, targets: job.verseIds.map(id => corpusById.get(id)), topics, priorMappings: unionMappings(job.payload.priorMappings, results[index].mappings), fullSurah: true, extra: { entireSet: true } }));
      if (results[index].needsMoreContextVerseIds.length) throw new Error(`Whole-topic context unresolved: ${job.id}.`);
    }
    return results;
  }
  const reverseResults = await reverse("reverse", mappings);
  mappings = reverseResults.flatMap(r => r.mappings);
  await finishPass(5, "complete-set-reverse-audit", { mappings, findings: reverseResults.flatMap(r => r.findings), canonicalTopicsAudited: 130, subtopicsAudited: 36 });
  // PASS 6: EACH verse is semantically audited, including zero/over-tagged targets.
  const coverageResults = await semanticPass("coverage", inputs.corpus, mappings, { distribution: coverageStats(inputs, mappings), instruction: "Distinguish legitimately narrow verses from ontology gaps; do not repair zeros just for completeness. Inspect all high-label verses for drift." });
  mappings = coverageResults.flatMap(r => r.mappings);
  const coverageNotes = coverageResults.flatMap(r => Array.isArray(r.raw.coverage) ? r.raw.coverage : Object.entries(r.raw.coverage).map(([verseId, value]) => ({ verseId, ...value })));
  await finishPass(6, "corpus-coverage-audit", { mappings, coverageNotes, statistics: coverageStats(inputs, mappings) });
  // PASS 7: all 8385 canonical pairs measured, EVERY positive intersection audited semantically.
  async function overlaps(stage, current) {
    const pairs = topicPairs(inputs, current);
    const jobs = chunks(pairs.filter(p => p.intersection > 0), 5).map((batch, index) => {
      const ids = new Set(batch.flatMap(p => p.intersectionVerseIds)), topicIds = new Set(batch.flatMap(p => [p.topicA, p.topicB]));
      return deepJob({ inputs, stage: "overlap", id: `${stage}-${index}`, targets: inputs.corpus.filter(v => ids.has(v.id)), topics: inputs.ontology.topics.filter(t => topicIds.has(t.id)), pairKeys: batch.map(p => p.key), extra: { pairs: batch, completeMemberships: Object.fromEntries([...topicIds].map(id => [id, current.filter(m => m.topicId === id && m.decision === "accept").map(m => m.verseId)])), instruction: "Assess each complete observed overlap and definitions as healthy/suspicious/uncertain. Do not infer duplicates solely from percentages; no automatic topic merges." } });
    });
    const results = await runMany(jobs, 2);
    const assessments = Object.assign({}, ...results.map(r => r.raw.pairAssessments));
    if (results.some(r => r.needsMoreContextVerseIds.length)) throw new Error("Overlap context unresolved; no silent incomplete pair audit.");
    return pairs.map(pair => ({ ...pair, ...(assessments[pair.key] ?? {}) }));
  }
  let overlap = await overlaps("overlap-initial", mappings);
  await finishPass(7, "cross-topic-overlap-audit", { pairs: overlap });
  // PASS 8: actual semantic gap discovery across ALL6236, not only keyword clusters.
  const discoveryResults = await semanticPass("discovery", inputs.corpus, mappings, { coverageNotes, instruction: "Find justified ontology gaps, particularly zero-mapped verses, awkward assignments and review-required clusters. Do not invent topics or silently change frozen ontology." });
  const rawProposals = discoveryResults.flatMap(r => r.raw.proposals);
  let proposals = [];
  if (rawProposals.length) {
    const ids = new Set(rawProposals.flatMap(p => p.evidenceVerseIds));
    const consolidation = await runOne(deepJob({ inputs, stage: "consolidation", id: "expansion-consolidation", targets: inputs.corpus.filter(v => ids.has(v.id)), extra: { rawProposals, instruction: "Consolidate ALL evidence-backed proposals as a whole against all existing contracts. Keep every genuinely distinct gap, reject duplicates/weak gaps, preserve actual supplied evidence; no arbitrary cap." } }));
    if (consolidation.needsMoreContextVerseIds.length) throw new Error("Ontology expansion consolidation requested unresolved context.");
    proposals = consolidation.raw.proposals.map(p => ({ ...p, status: "proposed", humanReviewed: false }));
  }
  await finishPass(8, "missed-topic-discovery", { rawProposals, proposals });
  // PASS 9: adversarial semantic review of EVERY target and explicit earlier pair.
  const discoveryAdditions = discoveryResults.flatMap(r => r.mappings).filter(m => !mappings.some(prior => mappingKey(prior) === mappingKey(m)));
  const qualityResults = await semanticPass("quality", inputs.corpus, unionMappings(mappings, discoveryAdditions), { instruction: "Final adversarial review: challenge false positives/negatives, keyword matches, modern projection, narrative theme transfer and definition violations. All existing pairs need an explicit decision; no publication." });
  mappings = qualityResults.flatMap(r => r.mappings);
  const qualityAccepted = new Set(mappings.filter(m => m.decision === "accept").map(mappingKey));
  // New/changed quality relationships receive mandatory whole-topic review before eligibility.
  const finalReverse = await reverse("final-reverse", mappings);
  mappings = finalReverse.flatMap(r => r.mappings);
  // Recalculate and re-audit overlaps after final graph changes, never retain stale percentages.
  overlap = await overlaps("overlap-final", mappings);
  const uncertainTopics = new Set(overlap.filter(p => ["suspicious", "uncertain"].includes(p.assessment)).flatMap(p => [p.topicA, p.topicB]));
  const definitionSensitive = new Set(inputs.ontologyReport.requiresHumanReview.map(t => t.id));
  const disagreementSet = new Set(disagreements);
  const finalCoverage = coverageStats(inputs, mappings);
  const manyLabels = new Set(finalCoverage.outliers.map(v => v.verseId));
  const annotated = mappings.map(m => {
    const reviewReasons = [m.confidence !== "high" ? "confidence" : null, m.decision === "reviewRequired" ? "semanticAmbiguity" : null,
      disagreementSet.has(mappingKey(m)) ? "independentDisagreement" : null, m.contextUsed ? "contextSensitive" : null,
      uncertainTopics.has(m.topicId) ? "overlapReview" : null, definitionSensitive.has(m.topicId) ? "definitionReview" : null,
      manyLabels.has(m.verseId) ? "manyLabels" : null, !qualityAccepted.has(mappingKey(m)) ? "notAcceptedByFinalQuality" : null].filter(Boolean);
    return { ...m, classifierVersion: DEEP_VERSION, promptVersion: DEEP_PROMPT_VERSION, ontologyVersion: manifest.ontologyVersion,
      ontologyHash: manifest.ontologyHash, corpusVersion: manifest.corpusVersion, corpusHash: manifest.corpusHash, runId: manifest.runId,
      reviewStatus: m.decision === "accept" && !reviewReasons.length ? "machineAccepted" : "humanReviewRequired", reviewReasons,
      provenance: { source: "openai-semantic-classification", requestedModel: config.model, reasoningEffort: "high", production: false } };
  });
  const findings = [...completedJobs.values()].flatMap(({ record }) => record.result.findings ?? []);
  await finishPass(9, "final-adversarial-quality", { mappings: annotated, findings, statistics: finalCoverage, finalOverlapChecksum: hash(overlap) });
  // Exercise the actual run's checkpoints with network prohibited.
  const before = runner.requests, cached = runner.cacheHits;
  for (const { job, cacheOrigin } of completedJobs.values()) await (cacheOrigin === "calibration" ? calibrationRunner : runner).run(job, { cacheOnly: true });
  const resumeTest = { status: "PASS", batchesReplayed: completedJobs.size, fullRunCacheHits: runner.cacheHits - cached, newRequests: runner.requests - before, mode: "cacheOnly" };
  if (resumeTest.newRequests) throw new Error("Resume replay made a paid request.");
  return { candidates, mappings: annotated, disagreements, overlap, proposals, rawProposals, coverageNotes, coverage: finalCoverage, findings, resumeTest,
    jobs: [...completedJobs.values()].map(({ job, cacheOrigin }) => ({ job, cacheOrigin })) };
}
