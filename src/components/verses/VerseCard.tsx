"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { VerseText } from "@/components/verses/VerseText";
import { ShareSheet } from "@/components/verses/ShareSheet";
import { useLibrary, toggleSaved } from "@/lib/library";
import type { Verse } from "@/types/quran";
export function VerseCard({ verse, showTopics = false, relatedTopics = [] }: { verse: Verse; showTopics?: boolean; relatedTopics?: { name: string; slug: string }[] }) {
  const [status, setStatus] = useState(""); const [sharing, setSharing] = useState(false);
  const shareButton = useRef<HTMLButtonElement>(null);
  const saved = useLibrary().verseIds.includes(verse.id);
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${verse.plainTranslation}\n\n${verse.surahName} ${verse.ayahNumber}\n${verse.translator}`); setStatus("Kopyalandı");
    } catch { setStatus("Kopyalama kullanılamıyor"); }
  }
  return <article className="verse-card" id={`ayet-${verse.id.replace(":", "-")}`} data-verse-id={verse.id}>
    <p className="verse-reference">{verse.surahName}<span>·</span>{verse.ayahNumber}{verse.isFallbackTranslation && <small> · {verse.translator}</small>}</p>
    <VerseText verse={verse} />
    <div className="verse-actions">
      {verse.segments.some(segment => segment.type === "footnote" && verse.footnotes.some(note => note.id === segment.id)) && <button type="button" onClick={event => event.currentTarget.closest("article")?.querySelector<HTMLButtonElement>(".footnote-marker")?.click()}>Açıklamalar</button>}
      <button onClick={() => toggleSaved("verseIds", verse.id)} type="button" aria-pressed={saved} aria-label={`${verse.surahName} ${verse.ayahNumber} ${saved ? "kaydını kaldır" : "ayetini kaydet"}`}>{saved ? "Kaydedildi" : "Kaydet"}</button>
      <button ref={shareButton} onClick={() => setSharing(true)} type="button">Paylaş</button><Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber}`}>Ayete git</Link><button onClick={copy} type="button">Kopyala</button>
    </div>
    {showTopics && relatedTopics.length > 0 && <details className="verse-topic-links"><summary>Konuları</summary><div className="related-topics">{relatedTopics.map(topic => <Link key={topic.slug} href={`/konu/${topic.slug}`}>{topic.name}</Link>)}</div></details>}
    {status && <p className="demo-note" role="status">{status}</p>}{sharing && <ShareSheet verse={verse} onClose={() => setSharing(false)} returnFocus={shareButton} />}
  </article>;
}
