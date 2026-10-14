export type ReviewStatus = "proposed" | "reviewed" | "published" | "rejected" | "sourceChecked";
export type ContentSource = { title: string; url: string; locator?: string };
export type ReviewRecord = { reviewer: string; reviewedAt: string; notes: string };
export type OntologyDomain = { id: string; name: string; description: string; status: ReviewStatus; version: string; review?: ReviewRecord };
export type DiscoveryIntent = { id: string; label: string; topicIds: string[]; kind: "discovery-query"; status: ReviewStatus; reviewNotes: string; review?: ReviewRecord };
export type OntologyTopic = {
  id: string; slug: string; name: string; description: string; domainId: string;
  parentTopicId: string | null; aliases: string[]; everydayIntents: string[];
  relatedTopicIds: string[]; sourceTopicNames: string[]; status: ReviewStatus;
  reviewNotes: string[]; version: string; inclusion: string; exclusion: string;
  provenance: { origin: "editorial-proposal"; sourceTopicIds: string[] };
  review?: ReviewRecord;
};
export type OntologyBundle = { version: string; domains: OntologyDomain[]; topics: OntologyTopic[]; subtopics: OntologyTopic[]; everydayIntents: DiscoveryIntent[] };
export type VerseTopicRelation = {
  verseId: string; topicId: string;
  relationship: "primary" | "strong" | "supporting" | "contextual";
  confidence: number; evidence: { verseIds: string[]; note: string };
  reviewStatus: ReviewStatus; classifierVersion: string; ontologyVersion: string;
  provenance: { origin: "mealler.org" | "ai-proposed" | "human-reviewed"; sourceUrl?: string; runId?: string };
  review?: { reviewer: string; reviewedAt: string; decision: "accept" | "reject" };
};
export type EsmaEntry = {
  order: number; slug: string; arabic: string; name: string; transliteration: string;
  shortMeaning: string; meaning: string; reflection: string; humanReflection: string;
  quranReferences: string[]; relatedTopicIds: string[]; sources: ContentSource[];
  reviewStatus: ReviewStatus;
  id?: string; displayNameTr?: string; shortMeaningTr?: string; longMeaningTr?: string;
  relatedTopics?: string[]; reflectionText?: string;
};
