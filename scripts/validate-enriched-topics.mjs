import { readFile } from "node:fs/promises";

const verses = JSON.parse(await readFile("src/data/quran.json", "utf8"));
const topics = JSON.parse(await readFile("src/data/topics-reviewed.json", "utf8"));
const sourceTopics = JSON.parse(await readFile("src/data/source-topics.json", "utf8"));

const verseIds = new Set(verses.map((verse) => verse.id));
const topicIds = new Set(topics.map((topic) => topic.id));
const errors = [];
const seenTopicIds = new Set();
const seenSlugs = new Set();

for (const topic of topics) {
  if (topic.source !== "reviewed-ai" || topic.status !== "reviewed") {
    errors.push(`${topic.id}: invalid production provenance/status`);
  }
  if (!topic.id || !topic.slug || !topic.name) {
    errors.push(`${topic.id ?? "unknown"}: missing identity`);
  }
  if (seenTopicIds.has(topic.id) || seenSlugs.has(topic.slug)) {
    errors.push(`${topic.id}: duplicate topic id/slug`);
  }
  seenTopicIds.add(topic.id);
  seenSlugs.add(topic.slug);

  if (!Array.isArray(topic.verseMappings) || topic.verseMappings.length === 0) {
    errors.push(`${topic.id}: empty production mappings`);
  }

  const mappingIds = new Set();
  for (const mapping of topic.verseMappings ?? []) {
    if (!verseIds.has(mapping.verseId)) errors.push(`${topic.id}: broken verse ${mapping.verseId}`);
    if (mappingIds.has(mapping.verseId)) errors.push(`${topic.id}: duplicate verse ${mapping.verseId}`);
    mappingIds.add(mapping.verseId);
    if (mapping.confidence < 0 || mapping.confidence > 1) {
      errors.push(`${topic.id}: invalid confidence ${mapping.verseId}`);
    }
    if (!["primary", "secondary"].includes(mapping.tier)) {
      errors.push(`${topic.id}: invalid tier ${mapping.verseId}`);
    }
    if (mapping.source !== "ai-reviewed") {
      errors.push(`${topic.id}: invalid mapping source ${mapping.verseId}`);
    }
  }

  const flatVerseIds = new Set(topic.verseIds ?? []);
  if (flatVerseIds.size !== mappingIds.size) {
    errors.push(`${topic.id}: verseIds and verseMappings count mismatch`);
  }
  for (const mappingId of mappingIds) {
    if (!flatVerseIds.has(mappingId)) errors.push(`${topic.id}: verseIds missing ${mappingId}`);
  }

  for (const relatedId of topic.relatedTopicIds ?? []) {
    if (!topicIds.has(relatedId)) errors.push(`${topic.id}: broken related topic ${relatedId}`);
  }

  for (const subtopic of topic.subtopics ?? []) {
    const subSeen = new Set();
    for (const verseId of subtopic.verseIds ?? []) {
      if (!mappingIds.has(verseId)) errors.push(`${topic.id}: subtopic broken verse ${verseId}`);
      if (subSeen.has(verseId)) errors.push(`${topic.id}: subtopic duplicate verse ${verseId}`);
      subSeen.add(verseId);
    }
  }
}

for (const slug of ["sab-r", "dua", "zekat", "tevekkul", "rizik", "evlilik", "ahiret"]) {
  if (!topics.some((topic) => topic.slug === slug && topic.verseMappings.length > 0)) {
    errors.push(`sample topic missing or empty: ${slug}`);
  }
}

const totalMappings = topics.reduce((sum, topic) => sum + topic.verseMappings.length, 0);
const counts = topics.map((topic) => topic.verseMappings.length).sort((a, b) => a - b);
const result = {
  sourceSeedTopics: sourceTopics.length,
  reviewedTopics: topics.length,
  totalMappings,
  averageVersesPerTopic: topics.length ? Number((totalMappings / topics.length).toFixed(2)) : 0,
  medianVersesPerTopic: counts.length ? counts[Math.floor(counts.length / 2)] : 0,
  errors,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
