import { readFile } from "node:fs/promises";

const entries = JSON.parse(await readFile("src/data/esma/published.json", "utf8"));
const corpus = JSON.parse(await readFile("src/data/quran.json", "utf8"));
const ontology = JSON.parse(await readFile("src/data/ontology-v2/reviewed.json", "utf8"));
const verseIds = new Set(corpus.map(verse => verse.id));
const topicIds = new Set([...ontology.topics, ...ontology.subtopics].map(topic => topic.id));
const errors = [];
if (entries.length !== 99) errors.push(`expected 99 records, found ${entries.length}`);
if (JSON.stringify(entries.map(entry => entry.order)) !== JSON.stringify(Array.from({ length: 99 }, (_, index) => index + 1))) errors.push("orders are not exactly 1-99");
for (const field of ["slug", "name", "arabic", "shortMeaning", "meaning", "humanReflection"]) {
  if (entries.some(entry => typeof entry[field] !== "string" || !entry[field].trim())) errors.push(`${field} contains an empty value`);
}
for (const field of ["slug", "name", "arabic"]) {
  const values = entries.map(entry => entry[field]);
  if (new Set(values).size !== values.length) errors.push(`${field} contains duplicates`);
}
for (const entry of entries) {
  if (entry.reviewStatus !== "sourceChecked") errors.push(`${entry.slug}: invalid review status`);
  if (entry.reviewStatus === "humanReviewed" || entry.review?.reviewer) errors.push(`${entry.slug}: human review was claimed`);
  if (new Set(entry.quranReferences).size !== entry.quranReferences.length) errors.push(`${entry.slug}: duplicate Quran reference`);
  for (const verseId of entry.quranReferences) if (!verseIds.has(verseId)) errors.push(`${entry.slug}: unknown Quran reference ${verseId}`);
  for (const topicId of entry.relatedTopicIds) if (!topicIds.has(topicId)) errors.push(`${entry.slug}: unknown topic ID ${topicId}`);
  if (!entry.sources.length) errors.push(`${entry.slug}: missing provenance`);
}
console.log(JSON.stringify({ records: entries.length, coreData: entries.filter(entry => entry.name && entry.arabic && entry.shortMeaning).length, longMeanings: entries.filter(entry => entry.meaning).length, quranReferences: entries.filter(entry => entry.quranReferences.length).length, topicRelationships: entries.filter(entry => entry.relatedTopicIds.length).length, awaitingEnrichment: entries.filter(entry => !entry.quranReferences.length || !entry.relatedTopicIds.length).length, errors, result: errors.length ? "FAIL" : "PASS" }, null, 2));
if (errors.length) process.exitCode = 1;