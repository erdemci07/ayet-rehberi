import Link from "next/link";
import { everydayIntents } from "@/data/discovery";
import type { Topic } from "@/types/quran";
export function DiscoveryIntents({ topics, compact = false }: { topics: Topic[]; compact?: boolean }) {
  const intents = compact ? everydayIntents.slice(0, 4) : everydayIntents;
  return <div className="intent-list">{intents.map(intent => {
    const matches = intent.slugs.map(slug => topics.find(topic => topic.slug === slug && topic.status === "reviewed")).filter((topic): topic is Topic => Boolean(topic));
    if (!matches.length) return null;
    return <details key={intent.id}><summary>{intent.label}<span aria-hidden="true">+</span></summary><div className="related-topics">{matches.map(topic => <Link href={`/konu/${topic.slug}`} key={topic.id}>{topic.name}</Link>)}</div></details>;
  })}</div>;
}
