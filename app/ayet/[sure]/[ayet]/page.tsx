import Link from "next/link";
import { notFound } from "next/navigation";
import { verseById, verses, topics } from "@/data";
import { VerseCard } from "@/components/verses/VerseCard";
import { DirectVerseMemory } from "@/components/reading/DirectVerseMemory";
export function generateStaticParams() { return verses.map(verse => ({ sure: String(verse.surahNumber), ayet: String(verse.ayahNumber) })); }
export default async function Ayet({ params }: { params: Promise<{ sure: string; ayet: string }> }) {
  const p = await params; const verse = verseById.get(`${p.sure}:${p.ayet}`); if (!verse) notFound();
  const relatedTopics = topics.filter(topic => topic.status === "reviewed" && topic.verseMappings?.some(mapping => mapping.verseId === verse.id && mapping.tier === "primary")).map(({ name, slug }) => ({ name, slug }));
  return <main className="reading-shell"><DirectVerseMemory verseId={verse.id} /><Link className="back-link" href={`/sure/${verse.surahNumber}#ayet-${verse.id.replace(":", "-")}`}>← Sure içinde gör</Link><header className="topic-header"><p className="eyebrow">AYET</p><h1>{verse.surahName} · {verse.ayahNumber}</h1><p>{verse.translator}</p></header><section className="verse-list"><VerseCard verse={verse} showTopics relatedTopics={relatedTopics} /></section><nav className="reading-neighbors" aria-label="Ayetler arasında gezinme">{verseById.has(`${verse.surahNumber}:${verse.ayahNumber - 1}`) && <Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber - 1}`}>← Önceki ayet</Link>}{verseById.has(`${verse.surahNumber}:${verse.ayahNumber + 1}`) && <Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber + 1}`}>Sonraki ayet →</Link>}</nav></main>;
}
