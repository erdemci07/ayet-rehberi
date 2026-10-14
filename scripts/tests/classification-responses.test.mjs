import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicJson, cacheKey, configuration, hash, requestBody, ResponsesRunner, validateResult } from "../lib/classification-responses.mjs";
import { parseClassifierEnv } from "../lib/classifier-env.mjs";

// Non-religious synthetic transport fixtures. Never run a mock provider on Quran data.
const config = configuration({ AYET_CLASSIFIER_MODEL: "test-explicit-model" });
const job = { id: "toy-0", stage: "verse", verseIds: ["toy:1", "toy:2"], topicIds: ["toy-topic"], evidenceIds: ["toy:1", "toy:2", "toy:3"], payload: { text: "Synthetic transport test only", ontologyHash: "toy-ontology" } };
const result = { consideredVerseIds: job.verseIds, consideredTopicIds: job.topicIds, mappings: [], needsMoreContextVerseIds: [], findings: [] };
const response = value => ({ ok: true, status: 200, json: async () => ({ id: "test-response", model: config.model, status: "completed", reasoning: { effort: "high" }, usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 40 }, output_tokens_details: { reasoning_tokens: 10 } }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }) });

test("local env accepts literal dotenv/PowerShell syntax without command evaluation", () => {
  assert.deepEqual(parseClassifierEnv('OPENAI_API_KEY=synthetic-secret\nAYET_CLASSIFIER_MODEL=test-explicit-model'), { OPENAI_API_KEY: "synthetic-secret", AYET_CLASSIFIER_MODEL: "test-explicit-model" });
  assert.deepEqual(parseClassifierEnv('$env:OPENAI_API_KEY="synthetic-secret"\n$env:AYET_CLASSIFIER_MODEL="test-explicit-model"'), { OPENAI_API_KEY: "synthetic-secret", AYET_CLASSIFIER_MODEL: "test-explicit-model" });
  assert.throws(() => parseClassifierEnv('$env:OPENAI_API_KEY="$(Get-Secret)"'), /literal/);
  assert.deepEqual(parseClassifierEnv('UNRELATED=ignore'), {});
});

async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), "ayet-calibration-transport-test-"));
  // Only remove this exact validated directory allocated by mkdtemp, never a workspace or glob.
  t.after(async () => { assert.ok(directory.startsWith(join(tmpdir(), "ayet-calibration-transport-test-"))); await rm(directory, { recursive: true, force: true }); });
  return directory;
}

test("model is mandatory; reasoning high and strict Responses schema; no key in body", () => {
  assert.throws(() => configuration({}), /required/);
  const body = requestBody(config, job);
  assert.equal(body.model, config.model);
  assert.equal(body.reasoning.effort, "high");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.store, false);
  assert.equal(body.truncation, "disabled");
  assert.ok(!JSON.stringify(body).includes("Authorization"));
});

test("zero labels still require every considered target and topic", () => {
  validateResult(result, job);
  assert.throws(() => validateResult({ ...result, consideredVerseIds: ["toy:1"] }, job), /coverage/);
  assert.throws(() => validateResult({ ...result, consideredTopicIds: [] }, job), /coverage/);
  assert.throws(() => validateResult({ ...result, reviewed: true }, job), /unexpected/);
});

test("reject unknown refs, duplicate pairs, false context and missing adjudication", () => {
  const mapping = { verseId: "toy:1", topicId: "toy-topic", relationshipStrength: "contextual", confidence: "high", contextUsed: true, evidenceVerseIds: ["toy:1", "toy:3"], decision: "accept", rationale: "Synthetic reason" };
  validateResult({ ...result, mappings: [mapping] }, job);
  assert.throws(() => validateResult({ ...result, mappings: [mapping, mapping] }, job), /duplicate/);
  assert.throws(() => validateResult({ ...result, mappings: [{ ...mapping, topicId: "unknown" }] }, job), /broken/);
  assert.throws(() => validateResult({ ...result, mappings: [{ ...mapping, contextUsed: false }] }, job), /contextUsed/);
  assert.throws(() => validateResult(result, { ...job, stage: "context", requiredMappingKeys: ["toy:1/toy-topic"] }), /adjudication/);
});

test("cache invalidates on content, ontology, model and output settings changes", () => {
  const key = cacheKey(config, job);
  assert.notEqual(key, cacheKey(config, { ...job, payload: { ...job.payload, text: "Changed synthetic content" } }));
  assert.notEqual(key, cacheKey(config, { ...job, payload: { ...job.payload, ontologyHash: "changed" } }));
  assert.notEqual(key, cacheKey({ ...config, model: "other-explicit-model" }, job));
  assert.notEqual(key, cacheKey({ ...config, maxOutputTokens: 999 }, job));
});

test("real adapter-shaped successful request checkpoints; new runner resumes without credentials/network", async t => {
  const directory = await temporary(t); const secret = "synthetic-secret-never-log";
  const progress = [];
  const runner = new ResponsesRunner({ directory, config, apiKey: secret, fetchFn: async (url, options) => { assert.equal(url, config.endpoint); assert.equal(options.headers.Authorization, `Bearer ${secret}`); return response(result); }, onProgress: p => progress.push(p) });
  const first = await runner.run(job);
  assert.equal(first.usage.cachedInputTokens, 40); assert.equal(runner.requests, 1);
  const resume = new ResponsesRunner({ directory, config, apiKey: undefined, fetchFn: () => assert.fail("Unexpected network request") });
  const second = await resume.run(job, { cacheOnly: true });
  assert.equal(second.checksum, first.checksum); assert.equal(resume.requests, 0); assert.equal(resume.cacheHits, 1);
  const files = await readdir(join(directory, "requests"));
  assert.ok(!JSON.stringify(progress).includes(secret));
  for (const file of files) assert.ok(!(await readFile(join(directory, "requests", file), "utf8")).includes(secret));
  assert.equal((await readdir(join(directory, "checkpoints"))).filter(f => f.endsWith(".tmp")).length, 0);
});

test("bounded retry and journal preserve usage on schema failure", async t => {
  const directory = await temporary(t); let count = 0;
  const runner = new ResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => {}, fetchFn: async () => response(++count === 1 ? { ...result, consideredVerseIds: [] } : result) });
  await runner.run(job);
  assert.equal(runner.requests, 2); assert.equal(runner.retries, 1); assert.equal(runner.schemaFailures, 1);
  const receipts = await Promise.all((await readdir(join(directory, "requests"))).map(file => readFile(join(directory, "requests", file), "utf8").then(JSON.parse)));
  assert.equal(receipts.reduce((sum, r) => sum + r.usage.inputTokens, 0), 200);
});

test("401 fails without retry, error body/key never logged", async t => {
  const directory = await temporary(t);
  const runner = new ResponsesRunner({ directory, config, apiKey: "synthetic-secret", sleep: async () => assert.fail("Unexpected retry"), fetchFn: async () => ({ ok: false, status: 401, json: () => assert.fail("Do not read upstream credential-bearing error body") }) });
  await assert.rejects(() => runner.run(job), /HTTP 401/);
  assert.equal(runner.requests, 1); assert.equal(runner.retries, 0);
});

test("429 retries boundedly, partial/refused JSON is never committed", async t => {
  const directory = await temporary(t); let count = 0;
  const runner = new ResponsesRunner({ directory, config, apiKey: "synthetic-secret", maxAttempts: 2, sleep: async () => {}, fetchFn: async () => ++count === 1 ? { ok: false, status: 429 } : { ok: true, status: 200, json: async () => ({ status: "incomplete", usage: { input_tokens: 100, output_tokens: 200 } }) } });
  await assert.rejects(() => runner.run(job), /incomplete/);
  assert.equal(runner.requests, 2); assert.equal(runner.retries, 1);
  await assert.rejects(() => runner.run(job, { cacheOnly: true }), /checkpoint missing/);
});

test("checksum and schema corruption stop resume, not silently overwrite", async t => {
  const directory = await temporary(t);
  const key = cacheKey(config, job);
  await atomicJson(join(directory, "checkpoints", `${key}.json`), { key, status: "completed", result, checksum: hash("corrupt") });
  const runner = new ResponsesRunner({ directory, config, apiKey: "synthetic-secret", fetchFn: () => assert.fail("Corrupt checkpoint must not trigger paid replacement") });
  await assert.rejects(() => runner.run(job), /checksum/);
  assert.equal(runner.requests, 0);
});

test("unexpected served model fails rather than silently substituting", async t => {
  const directory = await temporary(t);
  const runner = new ResponsesRunner({ directory, config, apiKey: "synthetic-secret", fetchFn: async () => { const res = response(result); const data = await res.json(); return { ...res, json: async () => ({ ...data, model: "unexpected-other-model" }) }; } });
  await assert.rejects(() => runner.run(job), /model mismatch/);
  assert.equal(runner.requests, 1); assert.equal(runner.retries, 0);
});

test("arbitrary credential-bearing exception never reaches receipt", async t => {
  const directory = await temporary(t); const secret = "synthetic-secret-never-log";
  const runner = new ResponsesRunner({ directory, config, apiKey: secret, maxAttempts: 1, fetchFn: async () => { throw new Error(`OpenAI custom error ${secret}`); } });
  await assert.rejects(() => runner.run(job), /details withheld/);
  for (const file of await readdir(join(directory, "requests"))) assert.ok(!(await readFile(join(directory, "requests", file), "utf8")).includes(secret));
});
