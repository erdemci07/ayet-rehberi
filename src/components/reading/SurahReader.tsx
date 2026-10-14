import { ProgressiveReader } from "./ProgressiveReader";
import type { Verse } from "@/types/quran";
export function SurahReader({ surahNumber, verses }: { surahNumber: number; verses: Verse[] }) { return <ProgressiveReader surahNumber={surahNumber} name={verses[0]?.surahName ?? "Sure"} verses={verses} />; }
