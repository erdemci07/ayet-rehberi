"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { everydayIntents } from "@/data/discovery";
import type { Topic, Verse } from "@/types/quran";
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
export function SearchPanel({ topics }: { topics: Topic[] }) {
  const [query, setQuery] = useState(""); const [corpus, setCorpus] = useState<Verse[]>([]); const [failed, setFailed] = useState(false);
  const normalizedQuery = normalize(query.trim());
  useEffect(() => {
    if (normalizedQuery.length < 3 || corpus.length) return;
    let active = true;
    const timer = setTimeout(() => import("@/data/quran.json").then(data => { if (active) setCorpus(data.default as Verse[]); }).catch(() => { if (active) setFailed(true); }), 180);
    return () => { active = false; clearTimeout(timer); };
  }, [normalizedQuery, corpus.length]);
  const topicResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const intentSlugs = everydayIntents.filter(intent => normalize(intent.label).includes(normalizedQuery) || normalizedQuery.split(/\s+/).every(word => normalize(intent.label).includes(word))).flatMap(intent => intent.slugs);
    return topics.filter(topic => topic.status === "reviewed").map(topic => {
      const terms = [topic.name, ...(topic.aliases ?? [])].map(normalize);
      const score = terms.includes(normalizedQuery) ? 3 : intentSlugs.includes(topic.slug) ? 2 : terms.some(term => normalizedQuery.split(/\s+/).every(word => term.includes(word))) ? 1 : 0;
      return { topic, score };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(result => result.topic);
  }, [normalizedQuery, topics]);
  const verseResults = useMemo(() => normalizedQuery.length > 2 ? corpus.filter(verse => verse.id === normalizedQuery || normalize(verse.plainTranslation).includes(normalizedQuery)).slice(0, 4) : [], [normalizedQuery, corpus]);
  const loading = normalizedQuery.length > 2 && !corpus.length && !failed;
  return <div className="search-wrap" id="ara"><label className="sr-only" htmlFor="topic-search">Konu, kelime veya ayet ara</label><div className="search-box"><span aria-hidden="true">⌕</span><input id="topic-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Bir konu, kelime ya da soru…" autoComplete="off" type="search" /></div>
    {query && !topicResults.length && !verseResults.length && <p className="demo-note" role="status">{loading ? "Ayetlerde aranıyor…" : "Sonuç bulunamadı."}</p>}
    {failed && <p className="demo-note" role="status">Ayet araması yüklenemedi. Konularda aramaya devam edebilirsiniz.</p>}
    {(topicResults.length > 0 || verseResults.length > 0) && <nav className="search-results" aria-label="Arama sonuçları">{topicResults.map(topic => <Link href={`/konu/${topic.slug}`} key={topic.id} onClick={() => setQuery("")}><span className="result-label">{topic.name}</span><span>Konu</span></Link>)}{verseResults.map(verse => <Link href={`/ayet/${verse.surahNumber}/${verse.ayahNumber}`} key={verse.id} onClick={() => setQuery("")}><span className="result-label">{verse.surahName} · {verse.ayahNumber}</span><span>Ayet</span></Link>)}</nav>}
  </div>;
}
