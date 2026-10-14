import Link from "next/link";
import { surahs } from "@/data";
export const metadata = { title: "Kur’an" };

export default function SurahsPage() {
  return (
    <main className="reading-shell">
      <header className="topic-header">
        <p className="eyebrow">KUR&apos;AN</p>
        <h1>Kur’an</h1>
        <p>114 sure · 6.236 ayet</p>
        <p className="attribution">Erhan Aktaş çevirisi. Nâs 1–6: Yaşar Nuri Öztürk.</p>
      </header>
      <h2 className="list-heading">Sureler</h2><div className="topic-list surah-list">
        {surahs.map((surah) => (
          <Link href={`/sure/${surah.number}`} key={surah.number}>
            <span>
              {surah.number}. {surah.name}
            </span>
            <strong>{surah.count} ayet</strong>
          </Link>
        ))}
      </div>
    </main>
  );
}
