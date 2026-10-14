import { INSTRUCTIONS, RESULT_SCHEMA, validateResult } from "./classification-responses.mjs";

const str = { type: "string" };
const strings = { type: "array", items: str };
const object = properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const enumeration = enumValues => ({ type: "string", enum: enumValues });
const array = items => ({ type: "array", items });
const considered = ids => object(Object.fromEntries(ids.map(id => [id, { type: "boolean", enum: [true] }])));
export const DEEP_VERSION = "deep-semantic-v2.1";
export const DEEP_PROMPT_VERSION = "deep-contract-v2.1";

export function deepSchema(job) {
  const decisions = ["retrieval", "verse"].includes(job.stage) ? ["candidate"] : ["accept", "reject", "reviewRequired"];
  const mapping = structuredClone(RESULT_SCHEMA.properties.mappings.items);
  mapping.properties.decision = enumeration(decisions);
  const detail = object(Object.fromEntries(Object.entries(mapping.properties).filter(([key]) => !["verseId", "topicId"].includes(key))));
  const properties = {
    // Strict required object keys prevent echo-array omissions and invented target IDs.
    consideredVerses: considered(job.verseIds), consideredTopics: considered(job.topicIds),
    priorDecisions: object(Object.fromEntries(job.requiredMappingKeys.map(key => [key, { $ref: "#/$defs/decision" }]))),
    newMappings: array({ $ref: "#/$defs/mapping" }),
    needsMoreContextVerseIds: strings,
    findings: RESULT_SCHEMA.properties.findings,
  };
  if (job.stage === "coverage") properties.coverage = object(Object.fromEntries(job.verseIds.map(id => [id, { $ref: "#/$defs/coverage" }])));
  if (job.stage === "overlap") properties.pairAssessments = object(Object.fromEntries(job.pairKeys.map(key => [key, { $ref: "#/$defs/pair" }])));
  if (job.stage === "discovery" || job.stage === "consolidation") properties.proposals = array({ $ref: "#/$defs/proposal" });
  const schema = { ...object(properties), $defs: { mapping, decision: detail } };
  if (properties.coverage) schema.$defs.coverage = object({ reason: enumeration(["mapped", "legitimatelyNarrow", "ontologyGap", "contextDependent", "uncertain"]), note: str });
  if (properties.pairAssessments) schema.$defs.pair = object({ assessment: enumeration(["healthy", "suspicious", "uncertain"]), note: str, evidenceVerseIds: strings });
  if (properties.proposals) schema.$defs.proposal = object({ name: str, description: str, inclusion: str, exclusion: str, domainProposal: str, evidenceVerseIds: strings, note: str });
  // Provider limits are technical bounds, never semantic label/verse-count caps.
  let propertyCount = 0, enums = 0, textLength = 0;
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.properties) { propertyCount += Object.keys(value.properties).length; textLength += Object.keys(value.properties).join("").length; }
    if (value.enum) { enums += value.enum.length; textLength += value.enum.join("").length; }
    for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
  }
  visit(schema);
  if (propertyCount > 5000 || enums > 1000 || textLength > 115000) {
    // Arrays have unlimited cardinality; exact coverage/decision sets remain mandatory locally.
    properties.consideredVerses = strings; properties.consideredTopics = strings;
    properties.priorDecisions = array({ $ref: "#/$defs/mapping" });
    schema.properties = properties;
    if (properties.coverage) properties.coverage = array(object({ verseId: str, reason: schema.$defs.coverage.properties.reason, note: str }));
    job.arrayCoverage = true;
  }
  return schema;
}

export function normalizedDeepResult(result) {
  const previous = Array.isArray(result.priorDecisions) ? result.priorDecisions : Object.entries(result.priorDecisions).map(([key, value]) => { const [verseId, topicId] = key.split("/"); return { verseId, topicId, ...value }; });
  return {
    consideredVerseIds: Array.isArray(result.consideredVerses) ? result.consideredVerses : Object.keys(result.consideredVerses),
    consideredTopicIds: Array.isArray(result.consideredTopics) ? result.consideredTopics : Object.keys(result.consideredTopics),
    mappings: [...previous, ...result.newMappings], needsMoreContextVerseIds: result.needsMoreContextVerseIds, findings: result.findings,
  };
}

export function validateDeepResult(result, job) {
  const normalized = normalizedDeepResult(result, job);
  validateResult(normalized, { ...job, validate: undefined, schema: undefined });
  const prior = Array.isArray(result.priorDecisions) ? result.priorDecisions.map(m => `${m.verseId}/${m.topicId}`) : Object.keys(result.priorDecisions);
  if (prior.length !== job.requiredMappingKeys.length || new Set(prior).size !== prior.length || prior.some(key => !job.requiredMappingKeys.includes(key))) throw new Error("SCHEMA incomplete prior decisions");
  if (result.coverage) {
    const entries = Array.isArray(result.coverage) ? result.coverage : Object.entries(result.coverage).map(([verseId, value]) => ({ verseId, ...value }));
    if (entries.length !== job.verseIds.length || new Set(entries.map(e => e.verseId)).size !== entries.length || entries.some(e => !job.verseIds.includes(e.verseId) || !e.note.trim())) throw new Error("SCHEMA incomplete coverage audit");
  }
  for (const [key, assessment] of Object.entries(result.pairAssessments ?? {})) {
    if (!job.pairKeys.includes(key) || !assessment.note.trim() || assessment.evidenceVerseIds.some(id => !job.evidenceIds.includes(id))) throw new Error("SCHEMA invalid pair assessment");
  }
  for (const proposal of result.proposals ?? []) {
    if (["name", "description", "inclusion", "exclusion", "note"].some(k => !proposal[k].trim()) || !proposal.evidenceVerseIds.length || new Set(proposal.evidenceVerseIds).size !== proposal.evidenceVerseIds.length || proposal.evidenceVerseIds.some(id => !job.evidenceIds.includes(id))) throw new Error("SCHEMA invalid expansion evidence");
  }
}

export function hydrateDeepJob(job) { return { ...job, validate: validateDeepResult }; }
export const DEEP_INSTRUCTIONS = INSTRUCTIONS.replaceAll("calibration", "classification") + `
This is a nine-pass unpublished editorial data-quality run. Frozen definitions and translator footnotes are authoritative inputs, not earlier model decisions. Do not generate Esma content.
The strict result uses consideredVerses/consideredTopics keys set to true after examining EVERY supplied target/contract. Where arrays are used, return every ID exactly once.
For EVERY prior pair give one explicit priorDecisions entry; newMappings must contain only new pairs, never duplicates of priorDecisions. Retrieval/independent verse passes use candidate decisions. Other passes use accept/reject/reviewRequired. Never omit a prior pair even when rejected. Unlimited justified labels and zero labels are allowed.
Coverage: inspect EACH verse, including genuinely narrow zero-label verses, ontology gaps and over-tagged outliers; do not force new labels. Pair audit: assess EACH complete supplied overlap set as healthy/suspicious/uncertain, not solely by numeric overlap; never merge topics. Discovery/consolidation: propose evidence-backed gaps only, leave proposals unpublished and avoid duplicating current definitions. Do not assign everyday intents directly.
Reverse audit: evaluate the COMPLETE supplied topic family candidate/accepted set AS A WHOLE; user-facing relevance without stretched meaning is mandatory. Use complete membership lists and all supplied canonical evidence. Identify possible misses only where evidence is actually supplied; do not certify absence outside it.
Final quality: actively disprove keyword-only or context-transferred labels and seek genuine missed labels. Explicitly reconsider every pair. New pairs require another whole-topic audit; no AI decision is humanReviewed. Turkish concise editorial reasons only; no rewritten scripture or private reasoning.`;
