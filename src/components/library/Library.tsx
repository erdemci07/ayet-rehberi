"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLibrary, toggleSaved } from "@/lib/library";
import { readingHref, readProgress, type ReadingProgressState } from "@/lib/readingProgress";
import { VerseCard } from "@/components/verses/VerseCard";
import { publishedEsma } from "@/data/esma";
import type { Topic, Verse } from "@/types/quran";
export function Library({ topics }: { topics: Pick<Topic, "name" | "slug">[] }) {
  const library = useLibrary(); const [progress, setProgress] = useState<ReadingProgressState>();
  const [corpus, setCorpus] = useState<Verse[]>([]); const [error, setError] = useState(false); const [limit, setLimit] = useState(20);
  useEffect(() => {
    const update = () => setProgress(readProgress()); queueMicrotask(update);
    window.addEventListener("reading-progress", update); window.addEventListener("storage", update);
    return () => { window.removeEventListener("reading-progress", update); window.removeEventListener("storage", update); };
  }, []);
  useEffect(() => { let active = true; import("@/data/quran.json").then(data => { if (active) setCorpus(data.default as Verse[]); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  const saved = library.verseIds.map(id => corpus.find(verse => verse.id === id)).filter((verse): verse is Verse => Boolean(verse));
  function label(entry: NonNullable<ReadingProgressState["lastReading"]>) { return entry.type === "topic" ? topics.find(topic => topic.slug === entry.slug)?.name ?? entry.slug : `${corpus.find(verse => verse.id === entry.verseId)?.surahName ?? "Sure"} · ${entry.verseId.split(":")[1]}`; }
  return <>
    <section className="section"><h2>Kaldığın Yer</h2>{progress?.lastReading ? <Link className="continue-card" href={readingHref(progress.lastReading)}><strong>{label(progress.lastReading)}</strong><span>Okumaya devam et →</span></Link> : <p className="intro">Okumaya başladığınızda kaldığınız yer burada görünür.</p>}</section>
    <section className="section"><h2>Kaydedilen Ayetler <small>{library.verseIds.length}</small></h2>{error && <p role="status">Ayetler yüklenemedi. Sayfayı yeniden açabilirsiniz.</p>}{!library.verseIds.length && <p className="intro">Bir ayetin altındaki Kaydet düğmesine dokunun.</p>}{library.verseIds.length > 0 && !corpus.length && !error && <p role="status">Kaydedilen ayetler yükleniyor…</p>}{saved.slice(0, limit).map(verse => <VerseCard key={verse.id} verse={verse} />)}{saved.length > limit && <button className="text-button" onClick={() => setLimit(value => value + 20)}>Daha fazla göster</button>}</section>
    <section className="section"><h2>Takip Edilen Konular</h2>{!library.topicSlugs.length && <p className="intro">Konu sayfasından okumak istediğiniz konuları takip edin.</p>}<div className="topic-list">{library.topicSlugs.map(slug => { const topic = topics.find(topic => topic.slug === slug); return topic ? <div className="library-topic" key={slug}><Link href={`/konu/${slug}`}>{topic.name}</Link><button aria-label={`${topic.name} takibini bırak`} className="text-button" onClick={() => toggleSaved("topicSlugs", slug)}>Kaldır</button></div> : null; })}</div></section>
    <section className="section"><h2>Kaydedilen Esmâ <small>{library.esmaSlugs.length}</small></h2>{!library.esmaSlugs.length && <p className="intro">Bir Esmâ kaydını detay sayfasından kitaplığınıza ekleyebilirsiniz.</p>}<div className="topic-list">{library.esmaSlugs.map(slug => { const entry = publishedEsma.find(esma => esma.slug === slug); return entry ? <div className="library-topic" key={slug}><Link href={`/esma/${slug}`}>{entry.name}</Link><button aria-label={`${entry.name} kaydını kaldır`} className="text-button" onClick={() => toggleSaved("esmaSlugs", slug)}>Kaldır</button></div> : null; })}</div></section>
    <section className="section"><h2>Son Okunanlar</h2><div className="topic-list">{progress?.recent.map(entry => <Link key={`${entry.type}-${entry.type === "topic" ? entry.slug : entry.verseId}`} href={readingHref(entry)}><span>{label(entry)}</span><small>{new Date(entry.updatedAt).toLocaleDateString("tr-TR")}</small></Link>)}</div>{!progress?.recent.length && <p className="intro">Okuma geçmişiniz bu cihazda tutulur.</p>}</section>
    <p className="demo-note">Kitaplığınız bu tarayıcıda saklanır. Hesap gerekmez.</p></>;
}
