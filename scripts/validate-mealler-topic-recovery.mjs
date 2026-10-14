import { readFile } from "node:fs/promises";

const corpus = JSON.parse(await readFile("src/data/quran.json", "utf8"));
const source = JSON.parse(await readFile("src/data/source-topics.json", "utf8"));
const recovered = JSON.parse(await readFile("data/generated/mealler-topic-mappings-complete.json", "utf8"));
const report = JSON.parse(await readFile("data/generated/mealler-topic-recovery-report.json", "utf8"));
const corpusIds = new Set(corpus.map(verse => verse.id));
const errors = [];

if (source.length !== 66) errors.push(`expected 66 source topics, found ${source.length}`);
if (recovered.topics.length !== source.length) errors.push("recovered topic count does not match source topic count");
for (const topic of recovered.topics) {
  const ids = topic.mappings.map(mapping => mapping.verseId);
  if (new Set(ids).size !== ids.length) errors.push(`${topic.id}: duplicate recovered mapping`);
  for (const id of ids) if (!corpusIds.has(id)) errors.push(`${topic.id}: unknown verse ${id}`);
  for (const mapping of topic.mappings) {
    if (mapping.source !== "mealler.org" || mapping.sourceTopicId !== topic.id || !mapping.sourceUrl || !mapping.retrievedAt) {
      errors.push(`${topic.id}: missing source provenance`);
    }
  }
}
if (report.sourceTopicCount !== source.length) errors.push("report source topic count mismatch");
console.log(JSON.stringify({
  sourceTopics: source.length,
  recoveredTopics: recovered.topics.length,
  completeTopics: report.completeTopicCount,
  incompleteTopics: report.incompleteTopicCount,
  recoveredMappings: recovered.topics.reduce((sum, topic) => sum + topic.mappings.length, 0),
  errors,
  result: errors.length ? "FAIL" : "PASS",
}, null, 2));
if (errors.length) process.exitCode = 1;