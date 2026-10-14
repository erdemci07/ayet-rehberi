"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { publishedEsma } from "@/data/esma";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");

export function EsmaSearch() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return publishedEsma;

    return publishedEsma.filter((entry) => {
      const haystack = [
        entry.name,
        entry.arabic,
        entry.transliteration,
        entry.shortMeaning,
        entry.meaning,
      ]
        .filter(Boolean)
        .join(" ");

      return normalize(haystack).includes(term);
    });
  }, [query]);

  return (
    <>
      <section className="section">
        <label htmlFor="esma-search" className="sr-only">
          Esmâ ara
        </label>
        <div className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            id="esma-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="İsim, anlam ya da Arapça ara…"
            autoComplete="off"
          />
        </div>
      </section>

      {filtered.length ? (
        <div className="topic-list">
          {filtered.map((entry) => (
            <Link key={entry.slug} href={`/esma/${entry.slug}`}>
              <span><strong>{entry.name}</strong><small>{entry.shortMeaning}</small></span>
              <span lang="ar" dir="rtl">{entry.arabic}</span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="section pending-content">
          <h2>Sonuç bulunamadı</h2>
          <p>Aramanızla eşleşen bir isim bulunamadı. Başka bir kelime deneyin.</p>
        </section>
      )}
    </>
  );
}
