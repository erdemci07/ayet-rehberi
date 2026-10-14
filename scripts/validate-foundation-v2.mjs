import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const read = async path => JSON.parse(await readFile(path, "utf8"));
const proposal = await read("data/generated/topic-ontology-v2.proposed.json");
const report = await read("data/generated/topic-ontology-v2.report.json");
const source = await read("src/data/source-topics.json");
const corpus = await read("src/data/quran.json");
const verseIds = new Set(corpus.map(verse => verse.id));
const errors = [];
const baseline = {
  "src/data/quran.json": "bef53e9693dd7b854c5810ef59d98f3272bd4a0365e8d50bb5988f8ccc5005b8",
  "src/data/topics-reviewed.json": "2ba80e307852bca692552e41e5fa2bf85858a438534c077b6674fc9479b71d0b",
  "src/data/source-topics.json": "2d2bd8f662b39ae2de121f56f24464c4aca7ee47b2203ad275d7d827d87662f3",
};
for (const [path, expected] of Object.entries(baseline)) if (createHash("sha256").update(await readFile(path)).digest("hex") !== expected) errors.push(`Migration changed protected file ${path}`);
const nodes = [...proposal.topics, ...proposal.subtopics];
const ids = new Set(nodes.map(topic => topic.id)); const topicIds = new Set(proposal.topics.map(topic => topic.id));
const domainIds = new Set(proposal.domains.map(domain => domain.id));
if (ids.size !== nodes.length || new Set(nodes.map(topic => topic.slug)).size !== nodes.length) errors.push("Duplicate ontology id/slug");
if (domainIds.size !== proposal.domains.length) errors.push("Duplicate domain id");
for (const topic of nodes) {
  if (topic.status !== "proposed" || topic.provenance.origin !== "editorial-proposal") errors.push(`${topic.id}: proposed provenance/status`);
  if (!topic.description || !topic.inclusion || !topic.exclusion || !topic.reviewNotes.length) errors.push(`${topic.id}: incomplete semantic definition`);
  if (!domainIds.has(topic.domainId)) errors.push(`${topic.id}: broken domain`);
  if (topic.parentTopicId && !topicIds.has(topic.parentTopicId)) errors.push(`${topic.id}: broken parent`);
  for (const related of topic.relatedTopicIds) if (!ids.has(related) || related === topic.id) errors.push(`${topic.id}: broken/self relationship`);
  if (new Set(topic.aliases).size !== topic.aliases.length) errors.push(`${topic.id}: duplicate alias`);
}
for (const intent of proposal.everydayIntents) for (const id of intent.topicIds) if (!topicIds.has(id)) errors.push(`${intent.id}: broken intent topic ${id}`);
const intentIds = new Set(proposal.everydayIntents.map(intent => intent.id));
for (const topic of nodes) for (const id of topic.everydayIntents) if (!intentIds.has(id)) errors.push(`${topic.id}: broken everyday intent ${id}`);
for (const entry of source) if (!report.sourceRepresentation.some(item => item.sourceTopicId === entry.id && item.sourceName === entry.name && item.represented && topicIds.has(item.topicId))) errors.push(`${entry.id}: missing source-name correspondence`);
for (const evidence of report.corpusEvidence) for (const example of evidence.examples) {
  const verse = corpus.find(verse => verse.id === example.verseId);
  if (!verse || verse.plainTranslation !== example.canonicalText || verse.translator !== example.translator) errors.push(`${evidence.topicId}: altered evidence`);
}
const actualCounts = { domains: proposal.domains.length, canonicalTopics: proposal.topics.length, subtopics: proposal.subtopics.length, aliases: nodes.reduce((sum, topic) => sum + topic.aliases.length, 0), everydayIntents: proposal.everydayIntents.length, sourceTopics: source.length, representedSourceTopics: report.sourceRepresentation.filter(item => item.represented).length, finalVerseMappings: 0 };
for (const [key, count] of Object.entries(actualCounts)) if (report.counts[key] !== count) errors.push(`Report count mismatch ${key}`);
for (const path of ["src/data/ontology-v2/future-ai-mappings.json", "src/data/ontology-v2/published-mappings.json"]) {
  const mappings = await read(path); const keys = new Set();
  for (const mapping of mappings) {
    const key = `${mapping.verseId}/${mapping.topicId}/${mapping.provenance.origin}`;
    if (keys.has(key)) errors.push(`${path}: duplicate relation ${key}`); keys.add(key);
    if (!verseIds.has(mapping.verseId) || !ids.has(mapping.topicId)) errors.push(`${path}: broken relation ${key}`);
    if (!Number.isFinite(mapping.confidence) || mapping.confidence < 0 || mapping.confidence > 1) errors.push(`${key}: confidence`);
    if (!["primary", "strong", "supporting", "contextual"].includes(mapping.relationship)) errors.push(`${key}: strength`);
    for (const ref of mapping.evidence.verseIds) if (!verseIds.has(ref)) errors.push(`${key}: broken evidence ${ref}`);
    if (path.includes("published-") && (mapping.reviewStatus !== "published" || !mapping.review?.reviewer || mapping.review?.decision !== "accept")) errors.push(`${key}: missing publication approval`);
  }
  if (mappings.length) errors.push(`${path}: final mappings must remain unpopulated in this foundation sprint`);
}
const published = await read("src/data/esma/published.json");
for (const stage of ["reviewed", "published"]) {
  const bundle = await read(`src/data/ontology-v2/${stage}.json`);
  for (const node of [...bundle.domains, ...bundle.topics, ...bundle.subtopics, ...bundle.everydayIntents]) if (node.status !== stage || !node.review?.reviewer || !node.review?.reviewedAt) errors.push(`${stage} ontology: missing real approval ${node.id}`);
}
const currentTopics = await read("src/data/topics-reviewed.json");
const esmaIds = new Set(); const esmaSlugs = new Set();
for (const entry of published) {
  if (esmaIds.has(entry.id) || esmaSlugs.has(entry.slug)) errors.push(`${entry.id}: duplicate Esmâ`);
  esmaIds.add(entry.id); esmaSlugs.add(entry.slug);
  if (entry.reviewStatus !== "published" || !entry.review?.reviewer || !entry.review?.reviewedAt || !entry.sources?.length) errors.push(`${entry.id}: missing Esmâ review/source`);
  for (const key of ["arabic", "transliteration", "displayNameTr", "shortMeaningTr", "longMeaningTr"]) if (!entry[key]) errors.push(`${entry.id}: empty ${key}`);
  for (const reference of entry.quranReferences) if (!verseIds.has(reference)) errors.push(`${entry.id}: broken Quran link ${reference}`);
  for (const id of entry.relatedTopics) if (!currentTopics.some(topic => topic.id === id && topic.status === "reviewed")) errors.push(`${entry.id}: broken published topic ${id}`);
  for (const citation of entry.sources) { try { if (!/^https?:$/.test(new URL(citation.url).protocol) || !citation.title) errors.push(`${entry.id}: source URL/title`); } catch { errors.push(`${entry.id}: invalid source URL`); } }
}
console.log(JSON.stringify({ protectedFilesUnchanged: !errors.some(error => error.includes("protected file")), ...actualCounts, publishedEsma: published.length, errors, result: errors.length ? "FAIL" : "PASS" }, null, 2));
process.exitCode = errors.length ? 1 : 0;
