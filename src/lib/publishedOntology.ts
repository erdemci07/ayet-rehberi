import ontologyData from "@/data/ontology-v2/published.json";
import relationsData from "@/data/ontology-v2/published-mappings.json";
import type { OntologyBundle, VerseTopicRelation } from "@/types/discovery";
// Prepared publication adapter. Legacy production stays active until a reviewed
// migration explicitly switches the application data index to this adapter.
export const publishedOntology = ontologyData as OntologyBundle;
const topicIds = new Set([...publishedOntology.topics, ...publishedOntology.subtopics].filter(topic => topic.status === "published" && topic.review?.reviewer).map(topic => topic.id));
export function publishedRelationsFor(topicId: string) {
  const relations = (relationsData as VerseTopicRelation[]).filter(relation => relation.topicId === topicId && topicIds.has(topicId) && relation.reviewStatus === "published" && relation.review?.decision === "accept" && relation.review.reviewer);
  const byVerse = new Map<string, { verseId: string; origins: VerseTopicRelation[] }>();
  for (const relation of relations) {
    const previous = byVerse.get(relation.verseId);
    if (previous) previous.origins.push(relation);
    else byVerse.set(relation.verseId, { verseId: relation.verseId, origins: [relation] });
  }
  return [...byVerse.values()];
}
