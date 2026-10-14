"use client";
import { useEffect } from "react";
import { saveVerseProgress } from "@/lib/readingProgress";
export function DirectVerseMemory({ verseId }: { verseId: string }) { useEffect(() => { saveVerseProgress(verseId); }, [verseId]); return null; }
