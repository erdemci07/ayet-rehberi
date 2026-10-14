import { mkdir, readdir, rename } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { loadClassifierEnv } from "./lib/classifier-env.mjs";
import { atomicJson, cacheKey, CLASSIFIER_VERSION, configuration, hash, PROMPT_VERSION, readJson, validateResult } from "./lib/classification-responses.mjs";
import { initialJobs, loadInputs } from "./lib/calibration-v2.mjs";

await loadClassifierEnv();
const config = configuration();
const latest = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
const manifest = await readJson(join(latest.directory, "manifest.json"));
if (manifest.model !== config.model) throw new Error("Recovery model mismatch.");
const inputs = await loadInputs();
if (manifest.corpusHash !== inputs.hashes.corpus || manifest.ontologyHash !== inputs.hashes.ontology) throw new Error("Recovery frozen hash mismatch.");
const jobs = initialJobs(inputs);
let recovered = 0;
const entries = [];
for (const folder of ["requests", "invalid-outputs"]) {
  let files = [];
  try { files = await readdir(join(latest.directory, folder)); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const file of files.filter(f => f.endsWith(".invalid-output.json"))) entries.push({ file, folder });
}
for (const { file, folder } of entries) {
  const saved = await readJson(join(latest.directory, folder, file));
  const job = jobs.find(j => j.id === saved.batchId);
  if (!job || cacheKey(config, job) !== saved.key) throw new Error("Recovery batch content mismatch; no re-labeling.");
  const result = JSON.parse(saved.outputText);
  validateResult(result, job); // Never fill considered IDs, modify mappings or manufacture results.
  const receiptPath = join(latest.directory, "requests", file.replace(/\.invalid-output\.json$/, ".json"));
  const receipt = await readJson(receiptPath);
  if (!receipt.usage || receipt.httpStatus !== 200 || receipt.servedModel !== config.model || !receipt.responseId) throw new Error("Missing original successful API receipt; recovery refused.");
  const checkpoint = join(latest.directory, "checkpoints", `${saved.key}.json`);
  let existing;
  try { existing = await readJson(checkpoint); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) validateResult(existing.result, job);
  else {
    await atomicJson(checkpoint, { key: saved.key, status: "completed", checksum: hash(result), result, usage: receipt.usage, responseId: receipt.responseId, servedModel: receipt.servedModel, requestedModel: config.model, reasoningEffort: "high", classifierVersion: CLASSIFIER_VERSION, promptVersion: PROMPT_VERSION, completedAt: new Date().toISOString(), validationRecovery: "Unchanged original API result revalidated locally after initial verse-stage candidate policy correction." });
    receipt.originalStatus = receipt.status; receipt.status = "completed"; receipt.revalidatedLocally = true;
    await atomicJson(receiptPath, receipt);
    recovered++;
  }
  if (folder === "requests") {
    const scope = resolve(latest.directory);
    const source = resolve(join(scope, folder, file));
    const destination = resolve(join(scope, "invalid-outputs", file));
    if (!scope.startsWith(resolve("data/generated/topic-classification-calibration-v2") + sep) || !source.startsWith(scope + sep) || !destination.startsWith(scope + sep)) throw new Error("Diagnostic archive paths escaped run directory.");
    await mkdir(join(scope, "invalid-outputs"), { recursive: true });
    await rename(source, destination); // Preserve paid response; do not confuse diagnostics with request receipts.
  }
}
console.log(JSON.stringify({ recoveredUnchangedResponses: recovered, apiRequests: 0, noScriptureOrMappingEdits: true }));
