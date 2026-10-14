"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Topic, Surah } from "@/types/quran";
import { readingHref, readProgress, type LastReading } from "@/lib/readingProgress";

export function ContinueReading({ topics, surahs }: { topics: Pick<Topic, "name" | "slug">[]; surahs: Surah[] }) {
  const [lastReading, setLastReading] = useState<LastReading | undefined>();

  useEffect(() => {
    queueMicrotask(() => setLastReading(readProgress().lastReading));
  }, []);

  if (!lastReading) return null;

  const [number, ayahNumber] = lastReading.verseId.split(":").map(Number);
  const surah = surahs.find(candidate => candidate.number === number);
  if (!surah || ayahNumber < 1 || ayahNumber > surah.count) return null;
  const verse = { surahName: surah.name, ayahNumber };

  if (lastReading.type === "topic") {
    const topic = topics.find((candidate) => candidate.slug === lastReading.slug);
    if (!topic) return null;
    return (
      <section className="section continue-section">
        <div className="section-heading">
          <h2>Kaldığın Yerden</h2>
        </div>
        <Link className="continue-card" href={readingHref(lastReading)}>
          <span>{topic.name}</span>
          <strong>
            {verse.surahName} · {verse.ayahNumber}
          </strong>
        </Link>
      </section>
    );
  }

  return (
    <section className="section continue-section">
      <div className="section-heading">
        <h2>Kaldığın Yerden</h2>
      </div>
      <Link className="continue-card" href={readingHref(lastReading)}>
        <span>{verse.surahName} Suresi</span>
        <strong>{verse.ayahNumber}. ayet</strong>
      </Link>
    </section>
  );
}
