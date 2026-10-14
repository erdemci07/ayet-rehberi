import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { atomicJson, cacheKey, CLASSIFIER_VERSION, hash, PROMPT_VERSION, readJson, REASONING_EFFORT, requestBody, ResponsesRunner, usageOf, validateResult } from "./classification-responses.mjs";

// Background response IDs survive process interruption. Never redispatch an unknown POST.
export class BackgroundResponsesRunner extends ResponsesRunner {
  async run(job, { cacheOnly = false } = {}) {
    const key = cacheKey(this.config, job);
    try { return await super.run(job, { cacheOnly: true }); }
    catch (error) { if (!error.message.includes("completed checkpoint missing")) throw error; }
    if (cacheOnly) throw new Error("Resume validation failed: completed checkpoint missing.");
    if (!job.background) return super.run(job);
    if (!this.apiKey?.trim()) throw new Error("OPENAI_API_KEY is required for uncached API calls.");
    const pendingPath = join(this.directory, "pending", `${key}.json`);
    let pending;
    try { pending = await readJson(pendingPath); } catch (error) { if (error.code !== "ENOENT") throw new Error("Invalid pending-response record."); }
    if (pending && !pending.responseId && pending.state !== "safeToRetry") throw new Error(`Batch ${job.id}: POST outcome unknown; refusing a duplicate paid request.`);
    for (let attempt = pending?.attempt ?? 1; attempt <= this.maxAttempts; attempt++) {
      if (!pending || pending.state === "safeToRetry") {
        const receiptPath = join(this.directory, "requests", `${key}.${randomUUID()}.json`);
        pending = { key, attempt, state: "dispatching", responseId: null, receiptPath };
        await atomicJson(pendingPath, pending);
        const receipt = { key, batchId: job.id, stage: job.stage, attempt, timestamp: new Date().toISOString(), status: "started", usage: null, pollingRequests: 0, transport: "background" };
        await atomicJson(receiptPath, receipt);
        this.requests++;
        let response;
        try {
          response = await this.fetchFn(this.config.endpoint, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(requestBody(this.config, job)), signal: AbortSignal.timeout(120000) });
        } catch {
          receipt.status = "unknown"; receipt.error = "POST transport outcome unknown; response ID unavailable; no automatic paid redispatch.";
          await atomicJson(receiptPath, receipt);
          throw new Error(`Batch ${job.id}: POST outcome unknown; refusing a duplicate paid request.`);
        }
        receipt.httpStatus = response.status;
        if (!response.ok) {
          receipt.status = "failed"; receipt.error = `OpenAI HTTP ${response.status}`;
          await atomicJson(receiptPath, receipt);
          if ([408, 409, 429].includes(response.status) || response.status >= 500) {
            pending.state = "safeToRetry"; pending.attempt = attempt + 1; await atomicJson(pendingPath, pending);
            if (attempt < this.maxAttempts) { this.retries++; await this.sleep(Math.min(30000, 5000 * 2 ** attempt)); continue; }
          }
          throw new Error(`Batch ${job.id} failed: OpenAI HTTP ${response.status}`);
        }
        let data;
        try { data = await response.json(); } catch { throw new Error(`Batch ${job.id}: accepted POST response unreadable; no automatic paid redispatch.`); }
        if (!/^resp_[a-zA-Z0-9_-]+$/.test(data.id ?? "")) throw new Error(`Batch ${job.id}: accepted POST has no valid response ID; no automatic paid redispatch.`);
        pending.responseId = data.id; pending.state = "polling";
        pending.response = this.persistableResponse(data);
        receipt.responseId = data.id; receipt.status = "polling";
        await atomicJson(pendingPath, pending); await atomicJson(receiptPath, receipt);
        this.onProgress({ stage: job.stage, batch: job.id, status: "submitted", responseId: data.id });
      }
      const receipt = await readJson(pending.receiptPath);
      let data = pending.response;
      let failures = 0;
      while (["queued", "in_progress"].includes(data.status)) {
        await this.sleep(10000);
        try {
          const response = await this.fetchFn(`${this.config.endpoint}/${pending.responseId}`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(60000) });
          receipt.pollingRequests++;
          if (!response.ok) throw new Error("polling failed");
          data = this.persistableResponse(await response.json());
          if (data.id !== pending.responseId) throw new Error("polling response ID mismatch");
          pending.response = data; failures = 0;
          await atomicJson(pendingPath, pending); await atomicJson(pending.receiptPath, receipt);
        } catch {
          failures++; await atomicJson(pending.receiptPath, receipt);
          if (failures >= 3) throw new Error(`Batch ${job.id}: polling failed; saved response ID will resume without a new paid POST.`);
          await this.sleep(20000);
        }
      }
      receipt.usage = data.usage ? usageOf(data) : null; receipt.servedModel = data.model; receipt.status = "received";
      await atomicJson(pending.receiptPath, receipt);
      if (data.status !== "completed") {
        receipt.status = "failed"; receipt.providerStatus = data.status; receipt.errorCode = data.errorCode ?? null;
        receipt.error = data.errorCode === "credit_balance_exhausted" ? "OpenAI API project credit balance exhausted; add project credit before resuming." : "Provider response incomplete/failed; no partial result or automatic paid redispatch.";
        await atomicJson(pending.receiptPath, receipt);
        throw new Error(`Batch ${job.id}: ${receipt.error}`);
      }
      if (data.model !== this.config.model && !data.model?.startsWith(`${this.config.model}-`)) throw new Error("OpenAI served model mismatch; no fallback allowed.");
      if (data.reasoning?.effort && data.reasoning.effort !== REASONING_EFFORT) throw new Error("OpenAI reasoning effort mismatch.");
      const parts = (data.output ?? []).flatMap(item => item.content ?? []);
      if (parts.some(part => part.type === "refusal")) throw new Error(`Batch ${job.id}: provider refusal; no partial result accepted.`);
      const outputText = parts.filter(part => part.type === "output_text").map(part => part.text).join("");
      let result;
      try { result = JSON.parse(outputText); validateResult(result, job); }
      catch {
        this.schemaFailures++; receipt.schemaFailure = true; receipt.status = "failed";
        receipt.error = "SCHEMA result JSON/coverage validation failed; original response retained for local recovery.";
        await atomicJson(pending.receiptPath, receipt);
        throw new Error(`Batch ${job.id}: SCHEMA validation failed; original paid response retained, no automatic paid redispatch.`);
      }
      const record = { key, status: "completed", checksum: hash(result), result, usage: receipt.usage, responseId: data.id, servedModel: data.model, requestedModel: this.config.model, reasoningEffort: REASONING_EFFORT, classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION, completedAt: new Date().toISOString() };
      await atomicJson(join(this.directory, "checkpoints", `${key}.json`), record);
      receipt.status = "completed"; await atomicJson(pending.receiptPath, receipt);
      pending.state = "completed"; await atomicJson(pendingPath, pending);
      this.onProgress({ stage: job.stage, batch: job.id, status: "completed", usage: receipt.usage });
      return { ...record, cacheHit: false };
    }
    throw new Error(`Batch ${job.id}: retry limit exhausted.`);
  }
  persistableResponse(data) {
    // Persist output text only, never internal reasoning items or credentials.
    const knownCodes = ["credit_balance_exhausted", "insufficient_quota", "rate_limit_exceeded", "server_error", "invalid_json_schema", "invalid_prompt"];
    return { id: data.id, status: data.status, model: data.model, errorCode: knownCodes.includes(data.error?.code) ? data.error.code : knownCodes.includes(data.errorCode) ? data.errorCode : null, reasoning: data.reasoning ? { effort: data.reasoning.effort } : null, usage: data.usage ?? null, output: (data.output ?? []).filter(item => item.type === "message").map(item => ({ type: "message", content: (item.content ?? []).filter(part => ["output_text", "refusal"].includes(part.type)).map(part => ({ type: part.type, ...(part.type === "output_text" ? { text: part.text.replaceAll(this.apiKey, "[REDACTED]") } : {}) })) })) };
  }
}
