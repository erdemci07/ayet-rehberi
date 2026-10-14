import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicReader } from "@/components/reading/TopicReader";
import { topics, verseById } from "@/data";
import { TopicSave } from "@/components/topics/TopicSave";
import { previewForTopic } from "@/lib/aiTopicPreview";

export function generateStaticParams() {
  return topics.map((topic) => ({ slug: topic.slug }));
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = topics.find((candidate) => candidate.slug === slug);
  if (!topic) notFound();
  const aiCandidates = previewForTopic(topic);

  const selected = topic.verseIds
    .map((id) => verseById.get(id))
    .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse));
  const related = (topic.relatedTopicIds ?? [])
    .map((id) => topics.find((candidate) => candidate.id === id))
    .filter(Boolean);

  return (
    <main className="reading-shell">
      <Link className="back-link" href="/kesfet">
        ← Keşfet
      </Link>
      <header className="topic-header">
        <p className="eyebrow">KONU</p>
        <h1>{topic.name}</h1>
        <p>{selected.length} ilgili ayet</p>
        <TopicSave slug={topic.slug} />
        {related.length > 0 && (
          <div className="related-topics">
            {related.map(
              (relatedTopic) =>
                relatedTopic && (
                  <Link href={`/konu/${relatedTopic.slug}`} key={relatedTopic.id}>
                    {relatedTopic.name}
                  </Link>
                ),
            )}
          </div>
        )}
      </header>
      <TopicReader slug={topic.slug} name={topic.name} verses={selected} />
      {aiCandidates.length > 0 && (
        <section className="section" aria-label="İnceleme bekleyen AI adayları">
          <h2>AI adayları — inceleme bekliyor</h2>
          <p>Kısmi analiz önerileridir; yukarıdaki mevcut konu eşleştirmelerine eklenmemiştir.</p>
          <details>
            <summary>{aiCandidates.length} ek ayet adayını göster</summary>
            <ul>{aiCandidates.map(mapping => {
              const verse = verseById.get(mapping.verseId);
              return verse ? <li key={mapping.verseId}>
                <Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber}`}>{verse.surahName} {verse.ayahNumber} ({verse.id})</Link>
                <p>{mapping.rationale}</p>
              </li> : null;
            })}</ul>
          </details>
        </section>
      )}
      <p><Link href="/inceleme/ai-adaylari">Kısmi AI konu adaylarını incele</Link></p>
    </main>
  );
}
