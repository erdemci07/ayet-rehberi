import candidates from "../../data/generated/topic-classification-v2/deep-8b8d066fcd82d82a5b1b/closeout/partial-candidates.json";
import sampleDecisions from "../../data/generated/topic-classification-v2/deep-8b8d066fcd82d82a5b1b/closeout/partial-sample-decisions.json";
import ontology from "../../data/generated/topic-ontology-v2.proposed.json";

type PreviewMapping = {
  verseId: string;
  topicId: string;
  decision: string;
  confidence: string;
  relationshipStrength: string;
  rationale: string;
  reviewStatus: string;
  sourceResponseId: string;
};

// Public preview only: never merge this unfinished AI layer into reviewed/source mappings.
export const previewTopics: { id: string; name: string; description: string; sourceTopicNames: string[] }[] = [...ontology.topics, ...ontology.subtopics];
const byPair = new Map<string, PreviewMapping>();
for (const mapping of [...sampleDecisions, ...candidates]) {
  if (mapping.decision === "reject" || mapping.reviewStatus !== "humanReviewRequired") continue;
  const key = `${mapping.verseId}/${mapping.topicId}`;
  if (!byPair.has(key)) byPair.set(key, mapping);
}
export const previewMappings = [...byPair.values()];
export function previewForTopic(topic: { id: string; name: string; verseIds: string[] }) {
  const matchingIds = new Set(previewTopics.filter(candidate => candidate.id === topic.id || candidate.sourceTopicNames.includes(topic.name)).map(candidate => candidate.id));
  const existing = new Set(topic.verseIds);
  return previewMappings.filter(mapping => matchingIds.has(mapping.topicId) && !existing.has(mapping.verseId));
}
