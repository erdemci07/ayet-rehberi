import Link from "next/link";
import { verseById, topics } from "@/data";
import { VerseCard } from "@/components/verses/VerseCard";
import type { EsmaEntry } from "@/types/discovery";
import { EsmaSave } from "@/components/esma/EsmaSave";

export function EsmaReadingPage({
  entry,
  previous,
  next,
}: {
  entry: EsmaEntry;
  previous?: EsmaEntry;
  next?: EsmaEntry;
}) {
  return (
    <main className="reading-shell">
      <Link href="/esma" className="back-link">← Esmâ</Link>

      <header className="topic-header">
        <p className="arabic-name" lang="ar" dir="rtl">{entry.arabic}</p>
        <p className="eyebrow">{entry.order} / 99</p>
        <h1>{entry.name}</h1>
        <p>{entry.shortMeaning}</p>
        <EsmaSave slug={entry.slug} name={entry.name} />
      </header>

      {entry.meaning && (
        <section className="section literary-copy">
          <h2>Anlamı</h2>
          <p>{entry.meaning}</p>
        </section>
      )}

      {entry.quranReferences && entry.quranReferences.length > 0 && (
        <section className="section">
          <h2>Kur’an bağlantıları</h2>
          {entry.quranReferences.map((id) => {
            const verse = verseById.get(id);
            return verse ? <VerseCard key={id} verse={verse} /> : null;
          })}
        </section>
      )}

      {entry.reflection && (
        <section className="section literary-copy">
          <h2>Üzerine düşünmek</h2>
          <p>{entry.reflection}</p>
        </section>
      )}

      {entry.humanReflection && (
        <section className="section literary-copy">
          <h2>İnsana hatırlattığı</h2>
          <p>{entry.humanReflection}</p>
        </section>
      )}

      {entry.relatedTopicIds.length > 0 && (
        <section className="section">
          <h2>İlgili konular</h2>
          <div className="related-topics">
            {entry.relatedTopicIds.map((id) => {
              const topic = topics.find((topic) => topic.id === id && topic.status === "reviewed");
              return topic ? (
                <Link href={`/konu/${topic.slug}`} key={id}>
                  {topic.name}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}

      {entry.sources && entry.sources.length > 0 && (
        <section className="section">
          <h2>Kaynaklar</h2>
          <ul>
            {entry.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noreferrer">
                  {source.title}
                </a>
                {source.locator ? ` · ${source.locator}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="reading-neighbors" aria-label="Esmâ okuması">
        {previous && <Link href={`/esma/${previous.slug}`}>← {previous.name}</Link>}
        {next && <Link href={`/esma/${next.slug}`}>{next.name} →</Link>}
      </nav>
    </main>
  );
}
