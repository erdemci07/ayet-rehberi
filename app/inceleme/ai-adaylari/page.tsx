import Link from "next/link";
import { previewMappings, previewTopics } from "@/lib/aiTopicPreview";
import { verseById } from "@/data";

export default function AiCandidatePreviewPage() {
  const groups = previewTopics.map(topic => ({ topic, mappings: previewMappings.filter(mapping => mapping.topicId === topic.id) })).filter(group => group.mappings.length);
  return (
    <main className="reading-shell">
      <Link className="back-link" href="/konular">← Konular</Link>
      <header className="topic-header">
        <p className="eyebrow">İNCELEME BEKLİYOR</p>
        <h1>AI konu adayları</h1>
        <p>Kısmi analizden {previewMappings.length} benzersiz aday ilişki. Tam 6.236 ayet analizi ve nihai konu doğrulaması tamamlanmadı.</p>
        <p>Bu öneriler doğrulanmış konu eşleştirmelerinden ayrıdır; Quran metnini veya mevcut konu verilerini değiştirmez.</p>
      </header>
      <section className="section" aria-label="İnceleme bekleyen konu önerileri">
        {groups.map(({ topic, mappings }) => (
          <details key={topic.id}>
            <summary>{topic.name} — {mappings.length} aday</summary>
            <p>{topic.description}</p>
            <ul>
              {mappings.map(mapping => {
                const verse = verseById.get(mapping.verseId);
                if (!verse) return null;
                return <li key={`${mapping.verseId}/${mapping.topicId}`}>
                  <Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber}`}>{verse.surahName} {verse.ayahNumber} ({verse.id})</Link>
                  <p>{mapping.rationale}</p>
                  <small>AI önerisi · insan incelemesi bekliyor</small>
                </li>;
              })}
            </ul>
          </details>
        ))}
      </section>
    </main>
  );
}
