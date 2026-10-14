import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export const CLASSIFIER_VERSION = "semantic-calibration-v2.1";
export const PROMPT_VERSION = "semantic-contract-v2.1";
export const REASONING_EFFORT = "high";
export const ENDPOINT = "https://api.openai.com/v1/responses";
export const hash = value => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
export const readJson = async path => JSON.parse(await readFile(path, "utf8"));
export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(temporary, path);
}

// Deliberately no model default, alias substitution, credential discovery or key logging.
export function configuration(env = process.env) {
  const model = env.AYET_CLASSIFIER_MODEL?.trim();
  if (!model || !/^[a-zA-Z0-9._:-]+$/.test(model)) throw new Error("AYET_CLASSIFIER_MODEL is required (no default model).");
  return { model, reasoningEffort: REASONING_EFFORT, endpoint: ENDPOINT, maxOutputTokens: 24000 };
}

const str = { type: "string" };
const strings = { type: "array", items: str };
const object = properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const enumeration = values => ({ type: "string", enum: values });
export const RESULT_SCHEMA = object({
  consideredVerseIds: strings,
  consideredTopicIds: strings,
  mappings: { type: "array", items: object({
    verseId: str, topicId: str,
    relationshipStrength: enumeration(["primary", "strong", "supporting", "contextual"]),
    confidence: enumeration(["high", "medium", "low"]),
    contextUsed: { type: "boolean" },
    evidenceVerseIds: strings,
    decision: enumeration(["candidate", "accept", "reject", "reviewRequired"]),
    rationale: str,
  }) },
  needsMoreContextVerseIds: strings,
  findings: { type: "array", items: object({
    verseId: str, topicId: str,
    kind: enumeration(["falsePositive", "falseNegative", "contextSensitive", "definitionIssue", "uncertain", "none"]),
    note: str,
  }) },
});

// Validate cached data too: strict server-side JSON schema is not a local trust boundary.
export function validateSchema(value, schema = RESULT_SCHEMA, path = "result", root = schema) {
  if (schema.$ref) {
    const name = schema.$ref.match(/^#\/\$defs\/([a-zA-Z0-9_-]+)$/)?.[1];
    if (!name || !root.$defs?.[name]) throw new Error(`SCHEMA ${path}: unsupported reference`);
    return validateSchema(value, root.$defs[name], path, root);
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`SCHEMA ${path}: object required`);
    for (const key of schema.required) if (!(key in value)) throw new Error(`SCHEMA ${path}: missing ${key}`);
    for (const key of Object.keys(value)) {
      if (!schema.properties[key]) throw new Error(`SCHEMA ${path}: unexpected field`);
      validateSchema(value[key], schema.properties[key], `${path}.${key}`, root);
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) throw new Error(`SCHEMA ${path}: array required`);
    if ((schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) throw new Error(`SCHEMA ${path}: array bounds`);
    value.forEach((entry, index) => validateSchema(entry, schema.items, `${path}[${index}]`, root));
  } else if (typeof value !== schema.type || (schema.enum && !schema.enum.includes(value))) throw new Error(`SCHEMA ${path}: invalid value`);
}
function sameIds(actual, expected) {
  return actual.length === expected.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
}
export function validateResult(result, job) {
  if (job.validate) { validateSchema(result, job.schema); job.validate(result, job); return; }
  validateSchema(result, job.schema ?? RESULT_SCHEMA);
  if (!sameIds(result.consideredVerseIds, job.verseIds) || !sameIds(result.consideredTopicIds, job.topicIds)) throw new Error("SCHEMA incomplete batch coverage");
  const keys = new Set();
  for (const mapping of result.mappings) {
    const key = `${mapping.verseId}/${mapping.topicId}`;
    if (!job.verseIds.includes(mapping.verseId) || !job.topicIds.includes(mapping.topicId) || keys.has(key)) throw new Error("SCHEMA broken/duplicate mapping reference");
    keys.add(key);
    if (!mapping.rationale.trim() || !mapping.evidenceVerseIds.includes(mapping.verseId) || new Set(mapping.evidenceVerseIds).size !== mapping.evidenceVerseIds.length || mapping.evidenceVerseIds.some(id => !job.evidenceIds.includes(id))) throw new Error("SCHEMA invalid mapping evidence");
    if (!mapping.contextUsed && mapping.evidenceVerseIds.some(id => id !== mapping.verseId)) throw new Error("SCHEMA inconsistent contextUsed");
    const decisions = job.stage === "retrieval" ? ["candidate"] : job.stage === "verse" ? ["candidate", "accept", "reject", "reviewRequired"] : ["accept", "reject", "reviewRequired"];
    if (!decisions.includes(mapping.decision)) throw new Error("SCHEMA decision incompatible with stage");
  }
  for (const id of result.needsMoreContextVerseIds) if (!job.verseIds.includes(id)) throw new Error("SCHEMA broken context request");
  for (const finding of result.findings) if (!job.verseIds.includes(finding.verseId) || !job.topicIds.includes(finding.topicId) || !finding.note.trim()) throw new Error("SCHEMA broken finding reference");
  for (const required of job.requiredMappingKeys ?? []) if (!keys.has(required)) throw new Error("SCHEMA missing adjudication decision");
}

export const INSTRUCTIONS = `You are performing unpublished semantic Quran topic calibration, not keyword tagging and not human review.
Use ONLY the supplied canonical Turkish translations, unchanged translator footnotes, and topic definition/inclusion/exclusion contracts. Names and aliases alone are insufficient. Source mappings are not ground truth. Never fabricate or paraphrase scripture.
Every target verse and every topic contract MUST be considered; echo all target IDs and topic IDs even when no relationships exist. Neighboring verses are context, not targets. Permit zero mappings and unlimited justified labels; never force coverage or topic sizes. Do not infer subtopic membership from a parent or assign a modern everyday intent as a topic.
Strength and confidence are separate: primary=central/direct; strong=clear substantive relationship; supporting=meaningful indirect evidence; contextual=relationship depends on passage but target independently contributes. High confidence means clear definition fit, medium means plausible ambiguity, low means weak/uncertain. Contextual may be high confidence. Narrative surroundings must not transfer every story theme to the target.
For retrieval optimize semantic recall and use candidate decisions only. For verse-centric analysis do NOT assume prior retrieval results. For context/audit decide accept/reject/reviewRequired for EVERY supplied prior mapping; additional justified mappings are allowed. Identify false positives/negatives against supplied earlier decisions. A user opening the topic page should not need a stretched interpretation to understand the target's relevance.
If supplied context is insufficient request target IDs in needsMoreContextVerseIds; do not guess. Use evidenceVerseIds only from supplied evidence, including the target. contextUsed must truthfully reflect use of neighbors/footnotes (even if only the target is cited). Provide short Turkish editorial reasons, not hidden reasoning or rewritten translation. findings are evidence-backed calibration observations, NOT human-reviewed conclusions.`;

export function requestBody(config, job) {
  return {
    model: config.model, reasoning: { effort: REASONING_EFFORT },
    instructions: job.instructions ?? INSTRUCTIONS, input: JSON.stringify(job.payload),
    text: { format: { type: "json_schema", name: job.schemaName ?? "quran_topic_calibration", strict: true, schema: job.schema ?? RESULT_SCHEMA } },
    max_output_tokens: job.maxOutputTokens ?? config.maxOutputTokens,
    service_tier: "default", store: job.background === true, truncation: "disabled",
    ...(job.background ? { background: true } : {}),
  };
}

export function cacheKey(config, job) {
  return hash({ classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION, endpoint: config.endpoint, body: requestBody(config, job), validation: { verseIds: job.verseIds, topicIds: job.topicIds, evidenceIds: job.evidenceIds, requiredMappingKeys: job.requiredMappingKeys ?? [] } });
}
export function usageOf(response) {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
    reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
    cacheWriteTokens: response.usage?.input_tokens_details?.cache_creation_tokens ?? null,
  };
}

export class ResponsesRunner {
  constructor({ directory, config, apiKey = process.env.OPENAI_API_KEY, fetchFn = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onProgress = () => {}, maxAttempts = 3, timeoutMs = 600000 }) {
    Object.assign(this, { directory, config, apiKey, fetchFn, sleep, onProgress, maxAttempts, timeoutMs });
    this.requests = 0; this.cacheHits = 0; this.retries = 0; this.schemaFailures = 0;
  }
  async run(job, { cacheOnly = false } = {}) {
    const key = cacheKey(this.config, job);
    const checkpoint = join(this.directory, "checkpoints", `${key}.json`);
    let cached;
    try { cached = await readJson(checkpoint); } catch (error) { if (error.code !== "ENOENT") throw new Error("Invalid checkpoint JSON; no automatic overwrite."); }
    if (cached) {
      if (cached.key !== key || cached.checksum !== hash(cached.result) || cached.status !== "completed") throw new Error("Invalid checkpoint checksum/status; no automatic overwrite.");
      validateResult(cached.result, job);
      this.cacheHits++;
      this.onProgress({ stage: job.stage, batch: job.id, status: "cacheHit" });
      return { ...cached, cacheHit: true };
    }
    if (cacheOnly) throw new Error("Resume validation failed: completed checkpoint missing.");
    if (!this.apiKey?.trim()) throw new Error("OPENAI_API_KEY is required for uncached API calls.");
    const body = requestBody(this.config, job);
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (attempt > 1) { this.retries++; await this.sleep(Math.min(20000, 1000 * 2 ** (attempt - 2))); }
      this.requests++;
      const receiptPath = join(this.directory, "requests", `${key}.${randomUUID()}.json`);
      const receipt = { key, batchId: job.id, stage: job.stage, attempt, timestamp: new Date().toISOString(), status: "started", usage: null };
      await atomicJson(receiptPath, receipt);
      let retryable = true;
      try {
        const response = await this.fetchFn(this.config.endpoint, {
          method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs),
        });
        receipt.httpStatus = response.status;
        if (!response.ok) {
          retryable = [408, 409, 429].includes(response.status) || response.status >= 500;
          // Never log response bodies: upstream error messages can echo credentials or input.
          throw new Error(`OpenAI HTTP ${response.status}`);
        }
        const data = await response.json();
        receipt.usage = usageOf(data); receipt.responseId = data.id ?? null; receipt.servedModel = data.model ?? null;
        receipt.status = "received";
        await atomicJson(receiptPath, receipt); // Usage survives even if parsing/coverage validation fails.
        if (data.status !== "completed") { retryable = false; throw new Error("OpenAI incomplete response; increase output allowance explicitly, never accept partial JSON."); }
        if (data.model !== this.config.model && !data.model?.startsWith(`${this.config.model}-`)) { retryable = false; throw new Error("OpenAI served model mismatch; no fallback allowed."); }
        if (data.reasoning?.effort && data.reasoning.effort !== REASONING_EFFORT) { retryable = false; throw new Error("OpenAI reasoning effort mismatch."); }
        const parts = (data.output ?? []).filter(item => item.type === "message").flatMap(item => item.content ?? []);
        if (parts.some(part => part.type === "refusal")) { retryable = false; throw new Error("OpenAI refusal; batch remains incomplete."); }
        let result;
        const outputText = parts.filter(part => part.type === "output_text").map(part => part.text).join("");
        try {
          result = JSON.parse(outputText);
          validateResult(result, job);
        } catch (validationError) {
          this.schemaFailures++; receipt.schemaFailure = true;
          receipt.validationCategory = validationError.message.startsWith("SCHEMA ") ? validationError.message : "SCHEMA invalid JSON text";
          await atomicJson(join(this.directory, "invalid-outputs", basename(receiptPath).replace(/\.json$/, ".invalid-output.json")), { key, batchId: job.id, category: receipt.validationCategory, outputText: outputText.replaceAll(this.apiKey, "[REDACTED]") });
          throw new Error("SCHEMA result JSON/coverage validation failed.");
        }
        retryable = false; // Local commit failures must not blindly repeat a successful paid request.
        const record = { key, status: "completed", checksum: hash(result), result, usage: receipt.usage, responseId: receipt.responseId, servedModel: receipt.servedModel, requestedModel: this.config.model, reasoningEffort: REASONING_EFFORT, classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION, completedAt: new Date().toISOString() };
        await atomicJson(checkpoint, record);
        receipt.status = "completed";
        await atomicJson(receiptPath, receipt);
        this.onProgress({ stage: job.stage, batch: job.id, status: "completed", usage: receipt.usage });
        return { ...record, cacheHit: false };
      } catch (error) {
        // Only allow our own fixed errors into persistent logs, never arbitrary exception messages.
        const safeErrors = ["OpenAI incomplete response; increase output allowance explicitly, never accept partial JSON.", "OpenAI served model mismatch; no fallback allowed.", "OpenAI reasoning effort mismatch.", "OpenAI refusal; batch remains incomplete.", "SCHEMA result JSON/coverage validation failed."];
        receipt.error = safeErrors.includes(error.message) || /^OpenAI HTTP \d{3}$/.test(error.message) ? error.message : "Transport or local I/O failure (details withheld).";
        receipt.status = "failed";
        await atomicJson(receiptPath, receipt);
        if (!retryable || attempt === this.maxAttempts) throw new Error(`Batch ${job.id} failed: ${receipt.error}`);
      }
    }
  }
}
