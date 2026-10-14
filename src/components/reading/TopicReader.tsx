import { ProgressiveReader } from "./ProgressiveReader";
import type { Verse } from "@/types/quran";
export function TopicReader({ slug, name, verses }: { slug: string; name: string; verses: Verse[] }) { return <ProgressiveReader slug={slug} name={name} verses={verses} />; }
