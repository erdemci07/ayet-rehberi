"use client";
import { useEffect, useState } from "react";
import { VerseCard } from "@/components/verses/VerseCard";
import type { Verse } from "@/types/quran";
// A small curated pool of canonical records; date selection never edits their content.
export function DailyVerse({ candidates }: { candidates: Verse[] }) {
  const [index, setIndex] = useState(0); const [date, setDate] = useState("");
  useEffect(() => {
    const now = new Date(); const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
    queueMicrotask(() => { setIndex(Math.floor(day) % candidates.length); setDate(now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })); });
  }, [candidates.length]);
  return <section className="section daily-reading"><div className="section-heading"><h2>Günün Ayeti</h2><span className="daily-date">{date}</span></div><VerseCard verse={candidates[index]} /></section>;
}
