"use client";
import { useEffect, useRef, useState } from "react";
import { VerseCard } from "@/components/verses/VerseCard";
import { readProgress, saveSurahProgress, saveTopicProgress } from "@/lib/readingProgress";
import type { Verse } from "@/types/quran";
const BATCH = 20;
export function ProgressiveReader({ verses, slug, surahNumber, name }: { verses: Verse[]; slug?: string; surahNumber?: number; name: string }) {
  const [count, setCount] = useState(BATCH); const [ready, setReady] = useState(false);
  const targetRef = useRef<string | undefined>(undefined); const restored = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null); const pending = useRef<string | undefined>(undefined);
  useEffect(() => {
    const stored = slug ? readProgress().topicProgress[slug] : readProgress().surahProgress[String(surahNumber)];
    const hashId = window.location.hash.match(/^#ayet-(\d+)-(\d+)$/);
    const requested = hashId ? `${hashId[1]}:${hashId[2]}` : stored?.verseId;
    const index = verses.findIndex(verse => verse.id === requested);
    const oldPage = Math.max(1, Number(new URLSearchParams(window.location.search).get("sayfa")) || 1);
    targetRef.current = index >= 0 ? requested : undefined;
    queueMicrotask(() => { setCount(Math.min(verses.length, Math.max(BATCH, (Math.floor(Math.max(0, index) / BATCH) + 1) * BATCH, oldPage * BATCH))); setReady(true); });
  }, [slug, surahNumber, verses]);
  useEffect(() => {
    if (!ready || restored.current) return;
    const frame = requestAnimationFrame(() => { if (targetRef.current) document.getElementById(`ayet-${targetRef.current.replace(":", "-")}`)?.scrollIntoView({ block: "start", behavior: "instant" }); restored.current = true; });
    return () => cancelAnimationFrame(frame);
  }, [count, ready]);
  useEffect(() => {
    if (!ready) return;
    let timer: number | undefined;
    const flush = () => {
      const id = pending.current; if (!id) return; pending.current = undefined;
      if (slug) saveTopicProgress(slug, Math.floor(verses.findIndex(verse => verse.id === id) / BATCH) + 1, id);
      else if (surahNumber) saveSurahProgress(surahNumber, id);
    };
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - 80) - Math.abs(b.boundingClientRect.top - 80))[0];
      if (!visible) return;
      pending.current = visible.target.getAttribute("data-verse-id") ?? undefined;
      window.clearTimeout(timer); timer = window.setTimeout(flush, 500);
    }, { rootMargin: "-8% 0px -25% 0px", threshold: 0 });
    verses.slice(0, count).forEach(verse => { const node = document.getElementById(`ayet-${verse.id.replace(":", "-")}`); if (node) observer.observe(node); });
    window.addEventListener("pagehide", flush); const hide = () => { if (document.hidden) flush(); }; document.addEventListener("visibilitychange", hide);
    return () => { window.clearTimeout(timer); observer.disconnect(); flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", hide); };
  }, [count, ready, slug, surahNumber, verses]);
  useEffect(() => {
    if (!ready || count >= verses.length || !sentinel.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setCount(value => Math.min(verses.length, value + BATCH)); }, { rootMargin: "150px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [count, ready, verses.length]);
  return <><section className="verse-list" aria-label={`${name} ayetleri`}>{verses.slice(0, count).map(verse => <VerseCard key={verse.id} verse={verse} />)}</section>
    {count < verses.length && <div className="load-more" ref={sentinel}><p>{Math.min(count, verses.length)} / {verses.length} ayet</p><button type="button" onClick={() => setCount(value => Math.min(verses.length, value + BATCH))}>Okumaya devam et</button></div>}
    {count >= verses.length && <p className="reading-end">{verses.length} ayetin tamamı burada.</p>}</>;
}
