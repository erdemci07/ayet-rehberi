import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const raw = await readFile("src/data/quran.json", "utf8"); const verses = JSON.parse(raw);
const ontology = JSON.parse(await readFile("src/data/ontology-v2/reviewed.json", "utf8"));
const id = process.argv.find(arg => arg.startsWith("--verse="))?.slice(8);
if (id) {
  const target = verses.find(verse => verse.id === id); if (!target) throw Error(`Unknown target ${id}`);
  const radius = Number(process.argv.find(arg => arg.startsWith("--radius="))?.slice(9) ?? 1);
  if (!Number.isInteger(radius) || radius < 0 || radius > 10) throw Error("Radius must be 0–10");
  const passage = verses.filter(verse => verse.surahNumber === target.surahNumber && Math.abs(verse.ayahNumber - target.ayahNumber) <= radius);
  console.log(JSON.stringify({ mode: "context-preview-only", targetVerseId: id, target, passage, finalClassificationExecuted: false }, null, 2));
} else console.log(JSON.stringify({ mode: "plan-only", providerCalls: 0, corpusCount: verses.length, corpusSha256: createHash("sha256").update(raw).digest("hex"), reviewedCanonicalTopics: ontology.topics.length, executionReady: ontology.topics.length > 0, blocker: ontology.topics.length ? null : "Ontology human review required", relationshipValues: ["primary", "strong", "supporting", "contextual"], passes: 7, contextRadiusDefault: 1, batchSizeSuggested: 24 }, null, 2));
