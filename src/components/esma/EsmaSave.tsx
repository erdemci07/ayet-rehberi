"use client";

import { toggleSaved, useLibrary } from "@/lib/library";

export function EsmaSave({ slug, name }: { slug: string; name: string }) {
  const saved = useLibrary().esmaSlugs.includes(slug);
  return <button className="text-button" type="button" aria-pressed={saved} onClick={() => toggleSaved("esmaSlugs", slug)}>{saved ? `${name} kitaplıkta` : "Esmâyı kitaplığa kaydet"}</button>;
}