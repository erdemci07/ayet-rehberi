import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BackgroundResponsesRunner } from "../lib/background-responses.mjs";
import { configuration, requestBody, validateResult } from "../lib/classification-responses.mjs";
import { buildJob } from "../lib/calibration-v2.mjs";
import { deepJob, topicPairs, coverageStats } from "../lib/deep-classification-v2.mjs";

// Only synthetic non-scripture fixtures. No fake classifier is used on the Quran corpus.
const topic = { id: "toy-topic", name: "Synthetic category", description: "Synthetic definition", inclusion: "Synthetic inclusion", exclusion: "Synthetic exclusion", parentTopicId: null, relatedTopicIds: [], domainId: "toy-domain", provenance: { sourceTopicIds: [] } };
const inputs = { corpus: [1, 2, 3].map(n => ({ id: `toy:${n}`, surahNumber: 1, ayahNumber: n, plainTranslation: `Synthetic record ${n}`, footnotes: [], translator: "Synthetic translator" })), ontology: { version: "toy-version", topics: [topic], subtopics: [], domains: [{ id: "toy-domain" }] }, ontologyReport: { requiresHumanReview: [], limitations: [] }, hashes: { ontology: "toy-ontology", corpus: "toy-corpus" } };
const config = configuration({ AYET_CLASSIFIER_MODEL: "test-explicit-model" });
const job = deepJob({ inputs, stage: "retrieval", id: "toy-retrieval", targets: inputs.corpus.slice(0, 2), topics: [topic] });
const result = { consideredVerses: { "toy:1": true, "toy:2": true }, consideredTopics: { "toy-topic": true }, priorDecisions: {}, newMappings: [], needsMoreContextVerseIds: [], findings: [] };
const data = status => ({ id: "resp_synthetic", model: config.model, status, reasoning: { effort: "high" }, usage: status === "completed" ? { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 50 }, output_tokens_details: { reasoning_tokens: 10 } } : null, output: status === "completed" ? [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] }] : [] });
const response = value => ({ ok: true, status: 200, json: async () => value });
async function temporary(t) { const directory = await mkdtemp(join(tmpdir(), "ayet-deep-transport-test-")); t.after(async () => { assert.ok(directory.startsWith(join(tmpdir(), "ayet-deep-transport-test-"))); await rm(directory, { recursive: true, force: true }); }); return directory; }

test("strict deep schema requires every target/topic and stage-compatible decisions", () => {
  validateResult(result, job);
  assert.throws(() => validateResult({ ...result, consideredVerses: { "toy:1": true } }, job), /missing/);
  assert.throws(() => validateResult({ ...result, consideredTopics: { "toy-topic": false } }, job), /invalid/);
  const mapping = { verseId: "toy:1", topicId: "toy-topic", relationshipStrength: "strong", confidence: "high", contextUsed: false, evidenceVerseIds: ["toy:1"], decision: "candidate", rationale: "Synthetic rationale" };
  validateResult({ ...result, newMappings: [mapping] }, job);
  assert.throws(() => validateResult({ ...result, newMappings: [{ ...mapping, decision: "accept" }] }, job), /invalid/);
  const adjudication = deepJob({ inputs, stage: "adjudication", id: "toy-adjudication", targets: inputs.corpus.slice(0, 2), priorMappings: [mapping] });
  const detail = { ...mapping, decision: "accept" }; delete detail.verseId; delete detail.topicId;
  validateResult({ ...result, priorDecisions: { "toy:1/toy-topic": detail } }, adjudication);
  assert.throws(() => validateResult(result, adjudication), /missing/);
  assert.throws(() => validateResult({ ...result, priorDecisions: { "toy:1/toy-topic": detail }, newMappings: [{ ...mapping, decision: "accept" }] }, adjudication), /duplicate/);
});

test("calibration ID bounds are independent fields, not shared mutable schema leaves", () => {
  const hardened = buildJob({ inputs, stage: "retrieval", id: "toy-calibration", targets: inputs.corpus.slice(0, 2), topics: [topic] });
  assert.equal(hardened.schema.properties.consideredVerseIds.minItems, 2);
  assert.equal(hardened.schema.properties.consideredTopicIds.minItems, 1);
  assert.deepEqual(hardened.schema.properties.consideredVerseIds.items.enum, ["toy:1", "toy:2"]);
  assert.deepEqual(hardened.schema.properties.consideredTopicIds.items.enum, ["toy-topic"]);
  assert.equal(hardened.schema.properties.mappings.items.properties.rationale.enum, undefined);
});

test("background sends high/strict exact configured model and checkpoints terminal response", async t => {
  const directory = await temporary(t); const methods = [];
  const runner = new BackgroundResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async (url, options) => { methods.push(options.method ?? "GET"); if (options.method === "POST") { const body = JSON.parse(options.body); assert.equal(body.background, true); assert.equal(body.store, true); assert.equal(body.model, config.model); assert.equal(body.reasoning.effort, "high"); assert.equal(body.text.format.strict, true); return response(data("queued")); } assert.equal(url, `${config.endpoint}/resp_synthetic`); return response(data("completed")); } });
  const record = await runner.run(job); assert.equal(record.usage.cachedInputTokens, 50); assert.deepEqual(methods, ["POST", "GET"]);
  const resumed = new BackgroundResponsesRunner({ directory, config, apiKey: undefined, fetchFn: () => assert.fail("Unexpected network") });
  await resumed.run(job, { cacheOnly: true }); assert.equal(resumed.requests, 0);
  for (const file of await readdir(join(directory, "requests"))) assert.ok(!(await readFile(join(directory, "requests", file), "utf8")).includes("synthetic-secret"));
});

test("interrupted polling resumes same provider response ID without another paid POST", async t => {
  const directory = await temporary(t); let posts = 0;
  const first = new BackgroundResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async (_, options) => { if (options.method === "POST") { posts++; return response(data("in_progress")); } throw new Error("Synthetic polling interruption"); } });
  await assert.rejects(() => first.run(job), /saved response ID/); assert.equal(posts, 1);
  const resumed = new BackgroundResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async (_, options) => { assert.notEqual(options.method, "POST"); return response(data("completed")); } });
  await resumed.run(job); assert.equal(resumed.requests, 0); assert.equal(posts, 1);
});

test("unknown POST outcome never causes automatic duplicate paid dispatch", async t => {
  const directory = await temporary(t); let requests = 0;
  const runner = new BackgroundResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async () => { requests++; throw new Error("Synthetic POST interruption"); } });
  await assert.rejects(() => runner.run(job), /outcome unknown/);
  await assert.rejects(() => runner.run(job), /duplicate paid request/); assert.equal(requests, 1);
});

test("provider credit exhaustion is retained as an external blocker, without invented zero usage or retries", async t => {
  const directory = await temporary(t); let posts = 0;
  const runner = new BackgroundResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async (_, options) => {
    if (options.method === "POST") { posts++; return response(data("queued")); }
    return response({ ...data("failed"), error: { code: "credit_balance_exhausted", message: "Untrusted upstream synthetic-secret must never be logged" } });
  } });
  await assert.rejects(() => runner.run(job), /credit balance exhausted/); assert.equal(posts, 1);
  const receipts = await readdir(join(directory, "requests"));
  const receipt = JSON.parse(await readFile(join(directory, "requests", receipts[0]), "utf8"));
  assert.equal(receipt.usage, null); assert.equal(receipt.errorCode, "credit_balance_exhausted"); assert.equal(receipt.status, "failed");
  assert.ok(!JSON.stringify(receipt).includes("synthetic-secret"));
});

test("coverage and overlap calculations preserve zeros and exact complete membership sets", () => {
  const secondTopic = { ...topic, id: "toy-second" }; const pairInputs = { ...inputs, ontology: { ...inputs.ontology, topics: [topic, secondTopic] } };
  const mappings = [{ verseId: "toy:1", topicId: topic.id, decision: "accept" }, { verseId: "toy:1", topicId: secondTopic.id, decision: "accept" }, { verseId: "toy:2", topicId: topic.id, decision: "accept" }];
  const pairs = topicPairs(pairInputs, mappings); assert.equal(pairs.length, 1); assert.equal(pairs[0].jaccard, 0.5); assert.equal(pairs[0].containmentB, 1); assert.deepEqual(pairs[0].intersectionVerseIds, ["toy:1"]);
  const coverage = coverageStats(pairInputs, mappings); assert.equal(coverage.unmappedVerses, 1); assert.equal(coverage.distribution["0"], 1); assert.equal(coverage.maximum, 2);
  assert.equal(requestBody(config, job).model, config.model);
});
