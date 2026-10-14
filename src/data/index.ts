import quran from "./quran.json";
import reviewedTopics from "./topics-reviewed.json";
import sourceTopicsData from "./source-topics.json";
import type { Topic, Verse } from "@/types/quran";

export const verses = quran as Verse[];
export const topics = reviewedTopics as Topic[];
export const sourceTopics = sourceTopicsData as Topic[];
export const verseById = new Map(verses.map((verse) => [verse.id, verse]));
export const surahs = [
  ...new Map(
    verses.map((verse) => [
      verse.surahNumber,
      { number: verse.surahNumber, name: verse.surahName, count: 0 },
    ]),
  ).values(),
].map((surah) => ({
  ...surah,
  count: verses.filter((verse) => verse.surahNumber === surah.number).length,
}));
