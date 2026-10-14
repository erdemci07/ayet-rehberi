"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { groupOf } from "@/data/discovery";
import type { Topic } from "@/types/quran";
const COUNT = 6; const KEY = "ayet-rehberi:home-topic-history:v2";
function history(): string[] { try { const parsed = JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : []; } catch { return []; } }
function shuffle<T>(items: T[]) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
const synonymFamilies = [["ahiret", "k-yamet-ne-zaman-kopacak", "cennet"], ["yard-m-sadaka", "zekat"], ["kur-an-dinlemek-okumak", "kuran-n-ozellikleri"]];
function choose(topics: Topic[]) {
  const previous = history(); const reviewed = topics.filter(topic => topic.status === "reviewed" && topic.source === "reviewed-ai");
  const candidates = shuffle(reviewed).sort((a, b) => Number(previous.includes(a.slug)) - Number(previous.includes(b.slug)));
  const selected: Topic[] = []; const groups = new Set<string>();
  const compatible = (topic: Topic) => !selected.some(item => item.slug === topic.slug || synonymFamilies.some(family => family.includes(item.slug) && family.includes(topic.slug)));
  for (const topic of candidates) { const group = groupOf(topic); if (!groups.has(group) && compatible(topic)) { selected.push(topic); groups.add(group); } if (selected.length === COUNT) break; }
  for (const topic of candidates) { if (selected.length === COUNT) break; if (compatible(topic)) selected.push(topic); }
  try { sessionStorage.setItem(KEY, JSON.stringify([...new Set([...selected.map(topic => topic.slug), ...previous])].slice(0, 20))); } catch { /* Optional visit history. */ }
  return selected;
}
export function DynamicTopicDiscovery({ topics }: { topics: Topic[] }) {
  const [selected, setSelected] = useState<Topic[]>([]);
  useEffect(() => { queueMicrotask(() => setSelected(choose(topics))); }, [topics]);
  return <div className="topic-grid topic-grid-placeholder">{selected.map(topic => <Link className="topic-chip" href={`/konu/${topic.slug}`} key={topic.id}>{topic.name}</Link>)}</div>;
}
