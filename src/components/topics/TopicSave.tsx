"use client";
import { toggleSaved, useLibrary } from "@/lib/library";
export function TopicSave({ slug }: { slug: string }) {
  const saved = useLibrary().topicSlugs.includes(slug);
  return <button className="text-button" aria-pressed={saved} onClick={() => toggleSaved("topicSlugs", slug)} type="button">{saved ? "Konu kitaplığında" : "Konuyu takip et"}</button>;
}
