"use client";
export type LastReading =
  | { type: "topic"; slug: string; verseId: string; page: number; updatedAt: number }
  | { type: "surah"; surahNumber: number; verseId: string; updatedAt: number }
  | { type: "verse"; verseId: string; updatedAt: number };
export type ReadingProgressState = {
  version: 2; topicProgress: Record<string, { page: number; verseId: string; updatedAt: number }>;
  surahProgress: Record<string, { verseId: string; updatedAt: number }>;
  lastReading?: LastReading; lastQuranVerse?: string; recent: LastReading[];
};
const KEY = "ayet-rehberi:reading-progress:v2";
const empty = (): ReadingProgressState => ({ version: 2, topicProgress: {}, surahProgress: {}, recent: [] });
const validId = (id: unknown): id is string => typeof id === "string" && /^\d{1,3}:\d{1,3}$/.test(id);
function validReading(value: unknown): value is LastReading {
  if (!value || typeof value !== "object") return false;
  const entry = value as LastReading;
  return validId(entry.verseId) && Number.isFinite(entry.updatedAt) && (entry.type === "verse" || (entry.type === "surah" && Number.isInteger(entry.surahNumber) && entry.surahNumber >= 1 && entry.surahNumber <= 114) || (entry.type === "topic" && typeof entry.slug === "string" && Number.isInteger(entry.page) && entry.page >= 1));
}
export function readProgress(): ReadingProgressState {
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem("ayet-rehberi:reading-progress:v1");
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (![1, 2].includes(parsed?.version)) return empty();
    const state = empty();
    for (const [slug, entry] of Object.entries(parsed.topicProgress ?? {})) {
      const candidate = entry as ReadingProgressState["topicProgress"][string];
      if (candidate && validId(candidate.verseId) && Number.isInteger(candidate.page) && candidate.page >= 1 && Number.isFinite(candidate.updatedAt)) state.topicProgress[slug] = candidate;
    }
    for (const [surah, entry] of Object.entries(parsed.surahProgress ?? {})) {
      const candidate = entry as ReadingProgressState["surahProgress"][string];
      if (candidate && validId(candidate.verseId) && Number.isFinite(candidate.updatedAt) && Number(surah) >= 1 && Number(surah) <= 114) state.surahProgress[surah] = candidate;
    }
    if (validReading(parsed.lastReading)) state.lastReading = parsed.lastReading;
    if (validId(parsed.lastQuranVerse)) state.lastQuranVerse = parsed.lastQuranVerse;
    state.recent = Array.isArray(parsed.recent) ? parsed.recent.filter(validReading).slice(0, 30) : state.lastReading ? [state.lastReading] : [];
    return state;
  } catch { return empty(); }
}
function write(entry: LastReading) {
  const state = readProgress();
  const sameLocation = (item: LastReading) => item.type === entry.type && (item.type === "topic" && entry.type === "topic" ? item.slug === entry.slug : item.type === "surah" && entry.type === "surah" ? item.surahNumber === entry.surahNumber : item.verseId === entry.verseId);
  state.lastReading = entry;
  state.recent = [entry, ...state.recent.filter(item => !sameLocation(item))].slice(0, 30);
  if (entry.type === "topic") state.topicProgress[entry.slug] = { page: entry.page, verseId: entry.verseId, updatedAt: entry.updatedAt };
  else {
    state.lastQuranVerse = entry.verseId;
    const number = entry.type === "surah" ? entry.surahNumber : Number(entry.verseId.split(":")[0]);
    state.surahProgress[String(number)] = { verseId: entry.verseId, updatedAt: entry.updatedAt };
  }
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); window.dispatchEvent(new Event("reading-progress")); } catch { /* Storage is optional. */ }
}
export function saveTopicProgress(slug: string, page: number, verseId: string) { write({ type: "topic", slug, page, verseId, updatedAt: Date.now() }); }
export function saveSurahProgress(surahNumber: number, verseId: string) { write({ type: "surah", surahNumber, verseId, updatedAt: Date.now() }); }
export function saveVerseProgress(verseId: string) { write({ type: "verse", verseId, updatedAt: Date.now() }); }
export function readingHref(entry: LastReading) {
  const anchor = `#ayet-${entry.verseId.replace(":", "-")}`;
  if (entry.type === "topic") return `/konu/${entry.slug}${anchor}`;
  if (entry.type === "surah") return `/sure/${entry.surahNumber}${anchor}`;
  return `/ayet/${entry.verseId.replace(":", "/")}`;
}
