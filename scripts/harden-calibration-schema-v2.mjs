import { join } from "node:path";
import { loadClassifierEnv } from "./lib/classifier-env.mjs";
import { atomicJson, cacheKey, configuration, hash, readJson, validateResult } from "./lib/classification-responses.mjs";
import { initialJobs, loadInputs } from "./lib/calibration-v2.mjs";

await loadClassifierEnv();
const inputs = await loadInputs(), config = configuration();
const latest = await readJson("data/generated/topic-classification-calibration-v2/latest.json");
const directory = latest.directory, manifest = await readJson(join(directory, "manifest.json"));
if (manifest.status === "running") throw new Error("Stop at a batch boundary before schema hardening; no concurrent manifest mutation.");
if (manifest.corpusHash !== inputs.hashes.corpus || manifest.ontologyHash !== inputs.hashes.ontology || manifest.model !== config.model) throw new Error("Frozen inputs/model mismatch.");
let reused = 0, upgraded = 0;
for (const job of initialJobs(inputs)) {
  const legacyKey = cacheKey(config, { ...job, schema: undefined }), key = cacheKey(config, job);
  const batch = manifest.batches.find(b => b.id === job.id);
  if (batch && ![legacyKey, key].includes(batch.key)) throw new Error("Unexpected prior schema revision; migration refused.");
  let record;
  try { record = await readJson(join(directory, "checkpoints", `${legacyKey}.json`)); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (record) {
    if (record.key !== legacyKey || record.checksum !== hash(record.result) || record.status !== "completed") throw new Error("Invalid original checkpoint.");
    validateResult(record.result, job);
    await atomicJson(join(directory, "checkpoints", `${key}.json`), { ...record, key, importedFrom: { cacheKey: legacyKey, responseId: record.responseId, reason: "Same semantic inputs; original paid response independently passes stricter ID/cardinality/stage schema. No new API request." } });
    reused++;
  }
  if (batch && batch.key === legacyKey) { batch.key = key; upgraded++; }
}
manifest.schemaHardening = { revision: "strict-ids-stages-1", timestamp: new Date().toISOString(), validPaidResponsesReused: reused, plannedBatchKeysUpgraded: upgraded, apiRequests: 0, originalCheckpointsAndReceiptsPreserved: true };
await atomicJson(join(directory, "manifest.json"), manifest);
console.log(JSON.stringify(manifest.schemaHardening));
