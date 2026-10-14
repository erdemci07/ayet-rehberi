import { InlineFootnote } from "@/components/footnotes/InlineFootnote";
import type { Verse } from "@/types/quran";
export function VerseText({ verse }: { verse: Verse }) {
  return <p className="verse-text">{verse.segments.map((segment, index) => {
    if (segment.type === "text") return <span key={index}>{segment.value}</span>;
    const note = verse.footnotes.find(candidate => candidate.id === segment.id);
    return note ? <InlineFootnote footnote={note} key={`${segment.id}-${index}`} verseLabel={`${verse.surahName} · ${verse.ayahNumber} · ${verse.translator}`} /> : <sup key={`${segment.id}-${index}`} aria-label={`${segment.marker} numaralı dipnotun açıklaması kaynakta yok`}>{segment.marker}</sup>;
  })}</p>;
}
