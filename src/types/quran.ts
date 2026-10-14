export type TranslationSegment =
  | { type: "text"; value: string }
  | { type: "footnote"; id: string; marker: string };

export type Footnote = { id: string; marker: string; text: string };

export type Translator = "Erhan Aktaş" | "Yaşar Nuri Öztürk";

export type Verse = {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  translator: Translator;
  isFallbackTranslation: boolean;
  fallbackReason?: string;
  plainTranslation: string;
  segments: TranslationSegment[];
  footnotes: Footnote[];
};

export type TopicMapping = {
  verseId: string;
  confidence?: number;
  tier?: "primary" | "secondary";
  source?: "ai-reviewed" | "mealler.org";
};

export type Subtopic = {
  id: string;
  name: string;
  verseIds: string[];
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
  aliases?: string[];
  verseIds: string[];
  verseMappings?: TopicMapping[];
  relatedTopicIds?: string[];
  subtopics?: Subtopic[];
  source?: "reviewed-ai" | "mealler.org";
  status?: "reviewed" | "historical-source";
  oldSourceMappingCount?: number;
};

export type Surah = { number: number; name: string; count: number };
