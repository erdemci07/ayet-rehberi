"use client";
import { useSyncExternalStore } from "react";
const KEY = "ayet-rehberi:library:v2";
export type LibraryState = { version: 2; verseIds: string[]; topicSlugs: string[]; esmaSlugs: string[] };
const blank: LibraryState = { version: 2, verseIds: [], topicSlugs: [], esmaSlugs: [] };
let memory = "";
function snapshot() { try { return window.localStorage.getItem(KEY) ?? memory; } catch { return memory; } }
function parse(raw: string): LibraryState {
  try {
    const state = JSON.parse(raw);
    if (![1, 2].includes(state?.version)) return blank;
    return { version: 2, verseIds: Array.isArray(state.verseIds) ? [...new Set<string>(state.verseIds.filter((id: unknown) => typeof id === "string" && /^\d+:\d+$/.test(id)))] : [], topicSlugs: Array.isArray(state.topicSlugs) ? [...new Set<string>(state.topicSlugs.filter((slug: unknown) => typeof slug === "string" && /^[a-z0-9-]+$/.test(slug)))] : [], esmaSlugs: Array.isArray(state.esmaSlugs) ? [...new Set<string>(state.esmaSlugs.filter((slug: unknown) => typeof slug === "string" && /^[a-z0-9-]+$/.test(slug)))] : [] };
  } catch { return blank; }
}
function subscribe(callback: () => void) {
  window.addEventListener("library-change", callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener("library-change", callback); window.removeEventListener("storage", callback); };
}
export function useLibrary() { return parse(useSyncExternalStore(subscribe, snapshot, () => "")); }
export function toggleSaved(kind: "verseIds" | "topicSlugs" | "esmaSlugs", id: string) {
  const state = parse(snapshot());
  state[kind] = state[kind].includes(id) ? state[kind].filter(value => value !== id) : [...state[kind], id];
  memory = JSON.stringify(state);
  try { window.localStorage.setItem(KEY, memory); } catch { /* In-memory saves still work during this visit. */ }
  window.dispatchEvent(new Event("library-change"));
}
