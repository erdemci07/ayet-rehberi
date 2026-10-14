import Link from "next/link";
import { notFound } from "next/navigation";
import { SurahReader } from "@/components/reading/SurahReader";
import { surahs, verses } from "@/data";

export function generateStaticParams() {
  return surahs.map((surah) => ({ number: String(surah.number) }));
}

export default async function Surah({ params }: { params: Promise<{ number: string }> }) {
  const number = Number((await params).number);
  const surah = surahs.find((candidate) => candidate.number === number);
  if (!surah) notFound();

  const list = verses.filter((verse) => verse.surahNumber === number);
  return (
    <main className="reading-shell">
      <Link className="back-link" href="/sureler">
        ← Sureler
      </Link>
      <header className="topic-header">
        <p className="eyebrow">SURE {number}</p>
        <h1>{surah.name}</h1>
        <p>{surah.count} ayet</p>
      </header>
      <SurahReader surahNumber={number} verses={list} />
    </main>
  );
}
