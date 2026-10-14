"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { publishedEsma } from "@/data/esma";
export function EsmaPreview() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!publishedEsma.length) return;
    const now = new Date(); const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
    queueMicrotask(() => setIndex(Math.floor(day) % publishedEsma.length));
  }, []);
  const daily = publishedEsma[index];
  if (daily) return <section className="section esma-preview"><p className="eyebrow">GÜNÜN ESMÂSI · {daily.order}/99</p><h2>{daily.name}</h2><p>{daily.shortMeaning}</p><Link className="back-link" href={`/esma/${daily.slug}`}>Anlamını oku →</Link></section>;
  return null;
}
