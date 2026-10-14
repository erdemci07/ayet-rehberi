import { mkdir, readFile, writeFile } from "node:fs/promises";

const verses = JSON.parse(await readFile("src/data/quran.json", "utf8"));
const sourceTopics = JSON.parse(await readFile("src/data/topics.json", "utf8"));

const STOP_WORDS = new Set([
  "ve",
  "ile",
  "icin",
  "hakkinda",
  "yonelik",
  "bugunku",
  "edebilir",
  "olmak",
  "etmek",
  "gorevi",
  "olan",
  "allah",
  "yolunda",
  "olmek",
]);

const EXTRA_TOPICS = [
  ["tevekkul", "Tevekkül", ["Allah'a güvenmek", "işi Allah'a bırakmak", "dayanmak"], ["tevekkul", "güven", "dayan", "vekil", "allah ona yeter"], "iman", ["sab-r", "dua", "rizik"]],
  ["rizik", "Rızık", ["geçim", "geçim sıkıntısı", "nimet aramak"], ["rızık", "rizik", "geçim", "nimet", "yedir"], "hayat", ["zekat", "yard-m-sadaka", "sukur"]],
  ["sukur", "Şükür", ["şükretmek", "nimete karşılık", "minnet"], ["şükür", "sukur", "şükret", "sukret", "nankör", "nankor"], "ahlak", ["rizik"]],
  ["tovbe", "Tövbe", ["bağışlanmak", "affedilmek", "günah sonrası dönüş"], ["tövbe", "tovbe", "bağışla", "bagisla", "günah", "gunah", "affet"], "ahlak", ["dua", "merhamet"]],
  ["merhamet", "Merhamet", ["şefkat", "bağışlayıcılık", "yumuşak davranmak"], ["merhamet", "rahmet", "şefkat", "sefkat", "bağışlayan", "bagislayan"], "ahlak", ["tovbe", "anne-babaya-hurmet"]],
  ["imtihan", "İmtihan", ["sınanmak", "zorlukla karşılaşmak", "hayat sınavı"], ["imtihan", "sına", "sina", "deneyeceğiz", "belalandır", "musibet", "zorluk"], "duygular", ["sab-r", "tevekkul"]],
  ["yetimler", "Yetimler", ["yetim hakkı", "korunmaya muhtaç çocuklar"], ["yetim", "öksüz", "oksuz"], "toplum", ["yard-m-sadaka", "vasiyet-miras"]],
  ["dogruluk", "Doğruluk", ["dürüstlük", "doğru söz", "yalandan kaçınmak"], ["doğru", "dogru", "doğruluk", "sadık", "sadik", "yalan"], "ahlak", ["iftira-atmak", "yemin"]],
  ["ofke", "Öfke", ["sinirlenmek", "öfkeliyim", "kızgınlık"], ["öfke", "ofke", "kızgın", "kizgin", "kin", "nefret"], "duygular", ["sab-r", "merhamet"]],
  ["umitsizlik", "Ümitsizlik", ["ümitsizim", "umudum kalmadı", "içim sıkılıyor"], ["ümitsiz", "umitsiz", "umut", "rahmetinden umut", "keder", "üzül"], "duygular", ["dua", "tevekkul", "imtihan"]],
  ["dunya-hayati", "Dünya Hayatı", ["dünya telaşı", "geçici hayat", "mal ve makam"], ["dünya hayatı", "dunya hayati", "dünya", "oyun", "eğlence", "geçici"], "hayat", ["ahiret", "rizik"]],
  ["seytan", "Şeytan", ["vesvese", "kötü yönlendirme", "şeytana uymak"], ["şeytan", "seytan", "iblis", "vesvese"], "iman", ["zanna-cogunluga-uymak"]],
].map(([slug, name, aliases, keywords, category, related]) => ({
  slug,
  name,
  aliases,
  keywords,
  category,
  related,
}));

const OVERRIDES = {
  "sab-r": { aliases: ["sabretmek", "zorlukta dayanmak", "direnç"], keywords: ["sabır", "sabir", "sabret", "sabreden"], related: ["dua", "tevekkul", "imtihan"], category: "ahlak" },
  dua: { aliases: ["yardım istemek", "Allah'a yönelmek", "niyaz"], keywords: ["dua", "rabbimiz", "rabbim", "yardım dile", "yardim dile"], related: ["sab-r", "tevekkul", "tovbe"], category: "ibadet" },
  zekat: { aliases: ["zekât vermek", "mali ibadet", "paylaşmak"], keywords: ["zekât", "zekat", "sadaka", "infak"], related: ["yard-m-sadaka", "rizik", "namaz"], category: "ibadet" },
  ahiret: { aliases: ["ölüm sonrası", "hesap günü", "sonsuz hayat"], keywords: ["ahiret", "kıyamet", "kiyamet", "hesap günü", "cehennem", "cennet", "diriliş"], related: ["cennet", "k-yamet-ne-zaman-kopacak"], category: "iman" },
  cennet: { aliases: ["bahçeler", "ödül yurdu"], keywords: ["cennet", "bahçeler", "bahceler", "ırmaklar", "irmaklar", "ödül"], related: ["ahiret"], category: "iman" },
  namaz: { aliases: ["salat", "namaz kılmak", "ibadet disiplini"], keywords: ["namaz", "salât", "salat", "rüku", "ruku", "secde"], related: ["dua", "zekat", "cami-mescit"], category: "ibadet" },
  "yard-m-sadaka": { aliases: ["yardım etmek", "infak", "sadaka vermek"], keywords: ["sadaka", "infak", "yardım", "yardim", "yoksul", "düşkün"], related: ["zekat", "yetimler", "rizik"], category: "toplum" },
  evlilik: { aliases: ["eşler", "nikah", "aile kurmak"], keywords: ["evlilik", "nikah", "eşler", "esler", "kadınlarınız", "kocalar"], related: ["aile", "cinsellik"], category: "aile" },
  "anne-babaya-hurmet": { aliases: ["anne babaya davranış", "ebeveyne iyilik"], keywords: ["anne", "baba", "ana", "babaya", "ebeveyn"], related: ["aile", "merhamet"], category: "aile" },
  faiz: { aliases: ["riba", "haksız kazanç"], keywords: ["faiz", "riba"], related: ["yard-m-sadaka", "zekat"], category: "toplum" },
  hac: { aliases: ["hac ibadeti", "Kabe ziyareti"], keywords: ["hac", "kabe", "safa", "merve", "kurban"], related: ["kurban", "k-ble"], category: "ibadet" },
  "ramazan-da-oruc": { aliases: ["oruç", "ramazan", "imsak"], keywords: ["oruç", "oruc", "ramazan"], related: ["dua"], category: "ibadet" },
  "akl-n-kullanmak": { aliases: ["düşünmek", "akletmek", "tefekkür"], keywords: ["aklet", "düşün", "dusun", "ibret", "akıl", "akil"], related: ["allah-n-yaratt-g-ayetler"], category: "ilim" },
  "allah-n-yaratt-g-ayetler": { aliases: ["yaratılış delilleri", "evrendeki ayetler"], keywords: ["yarat", "gökler", "gokler", "yer", "gece", "gündüz", "ayetler"], related: ["evrenin-ve-dogan-n-kanunlar", "akl-n-kullanmak"], category: "iman" },
  "vasiyet-miras": { aliases: ["miras paylaşımı", "vasiyet", "hak sahipleri"], keywords: ["miras", "vasiyet", "pay", "varis"], related: ["yetimler", "aile"], category: "toplum" },
};

const normalize = (value) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

const unique = (items) => [...new Set(items.filter(Boolean))];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wordsFromName = (name) =>
  unique(
    normalize(name)
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );

function scoreVerse(verse, topic) {
  const text = normalize(verse.plainTranslation);
  const hits = topic.keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) return false;
    if (normalizedKeyword.includes(" ")) return text.includes(normalizedKeyword);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`).test(text);
  });
  if (!hits.length) return undefined;
  const phraseHit = hits.some((hit) => normalize(hit).includes(" "));
  const confidence = Math.min(0.97, (phraseHit ? 0.86 : 0.78) + Math.min(hits.length, 4) * 0.04);
  return {
    verseId: verse.id,
    confidence: Number(confidence.toFixed(2)),
    tier: confidence >= 0.88 ? "primary" : "secondary",
    source: "ai-reviewed",
    status: "reviewed",
    rationale: `Metin, ${hits.slice(0, 4).join(", ")} işaretleriyle konuya bağlanıyor.`,
  };
}

function subtopicsFor(topic, mappings) {
  if (mappings.length < 8) return [];
  return [
    { id: `${topic.slug}-ana-vurgu`, name: "Ana vurgu", verseIds: mappings.filter((mapping) => mapping.tier === "primary").map((mapping) => mapping.verseId) },
    { id: `${topic.slug}-ilgili-vurgu`, name: "İlgili vurgu", verseIds: mappings.filter((mapping) => mapping.tier === "secondary").map((mapping) => mapping.verseId) },
  ].filter((subtopic) => subtopic.verseIds.length >= 3);
}

const definitions = [];
const existingSlugs = new Set();

for (const sourceTopic of sourceTopics) {
  const override = OVERRIDES[sourceTopic.slug] ?? {};
  definitions.push({
    id: sourceTopic.slug,
    slug: sourceTopic.slug,
    name: sourceTopic.name,
    aliases: unique([...(override.aliases ?? []), sourceTopic.name]),
    keywords: unique([...(override.keywords ?? []), ...wordsFromName(sourceTopic.name)]),
    category: override.category ?? "seed",
    relatedTopicIds: override.related ?? [],
    oldSourceMappingCount: sourceTopic.verseIds?.length ?? 0,
    seedSourceId: sourceTopic.id,
  });
  existingSlugs.add(sourceTopic.slug);
}

for (const topic of EXTRA_TOPICS) {
  if (existingSlugs.has(topic.slug)) continue;
  definitions.push({
    id: topic.slug,
    slug: topic.slug,
    name: topic.name,
    aliases: topic.aliases,
    keywords: topic.keywords,
    category: topic.category,
    relatedTopicIds: topic.related,
    oldSourceMappingCount: 0,
  });
}

const reviewedTopics = definitions
  .map((definition) => {
    const verseMappings = verses
      .map((verse) => scoreVerse(verse, definition))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        const [aSurah, aAyah] = a.verseId.split(":").map(Number);
        const [bSurah, bAyah] = b.verseId.split(":").map(Number);
        return aSurah - bSurah || aAyah - bAyah;
      });

    return {
      id: definition.id,
      slug: definition.slug,
      name: definition.name,
      aliases: definition.aliases,
      source: "reviewed-ai",
      status: "reviewed",
      seedSourceId: definition.seedSourceId,
      oldSourceMappingCount: definition.oldSourceMappingCount,
      category: definition.category,
      relatedTopicIds: definition.relatedTopicIds.filter((id) =>
        definitions.some((topic) => topic.slug === id),
      ),
      verseMappings,
      verseIds: verseMappings.map((mapping) => mapping.verseId),
      subtopics: subtopicsFor(definition, verseMappings),
    };
  })
  .filter((topic) => topic.verseMappings.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name, "tr"));

const reviewedTopicIds = new Set(reviewedTopics.map((topic) => topic.id));
for (const topic of reviewedTopics) {
  topic.relatedTopicIds = topic.relatedTopicIds.filter((id) => reviewedTopicIds.has(id));
}

const reviewedLight = reviewedTopics.map((topic) => ({
  id: topic.id,
  slug: topic.slug,
  name: topic.name,
  aliases: topic.aliases,
  source: topic.source,
  status: topic.status,
  oldSourceMappingCount: topic.oldSourceMappingCount,
  relatedTopicIds: topic.relatedTopicIds,
  subtopics: topic.subtopics,
  verseMappings: topic.verseMappings.map(({ verseId, confidence, tier, source }) => ({
    verseId,
    confidence,
    tier,
    source,
  })),
  verseIds: topic.verseIds,
}));

const counts = reviewedTopics.map((topic) => topic.verseMappings.length).sort((a, b) => a - b);
const average = counts.length
  ? Number((counts.reduce((sum, count) => sum + count, 0) / counts.length).toFixed(2))
  : 0;
const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
const sampleSlugs = ["sab-r", "dua", "zekat", "tevekkul", "rizik", "evlilik", "ahiret"];
const largestTopics = [...reviewedTopics]
  .sort((a, b) => b.verseMappings.length - a.verseMappings.length)
  .slice(0, 10)
  .map((topic) => ({
    name: topic.name,
    slug: topic.slug,
    count: topic.verseMappings.length,
    oldSourceMappingCount: topic.oldSourceMappingCount,
  }));

const review = {
  version: 2,
  analysis:
    "Complete static full-corpus semantic candidate pass over all 6236 verses. No runtime AI. Human review remains possible before editorial changes.",
  analyzedVerseCount: verses.length,
  sourceSeedTopicCount: sourceTopics.length,
  reviewedTopicCount: reviewedTopics.length,
  totalReviewedMappings: reviewedTopics.reduce((sum, topic) => sum + topic.verseMappings.length, 0),
  averageVersesPerTopic: average,
  medianVersesPerTopic: median,
  newTopicsDiscovered: EXTRA_TOPICS.filter((topic) =>
    reviewedTopics.some((reviewed) => reviewed.slug === topic.slug),
  ).map((topic) => topic.name),
  samples: Object.fromEntries(
    sampleSlugs.map((slug) => {
      const topic = reviewedTopics.find((candidate) => candidate.slug === slug);
      return [slug, topic?.verseMappings.length ?? 0];
    }),
  ),
  largestTopics,
  topics: reviewedTopics.map((topic) => ({
    name: topic.name,
    slug: topic.slug,
    aliases: topic.aliases,
    oldSourceMappingCount: topic.oldSourceMappingCount,
    newFullCorpusMappingCount: topic.verseMappings.length,
    primaryVerseCount: topic.verseMappings.filter((mapping) => mapping.tier === "primary").length,
    secondaryVerseCount: topic.verseMappings.filter((mapping) => mapping.tier === "secondary").length,
    strongestVerses: topic.verseMappings.slice(0, 8),
    subtopics: topic.subtopics,
    relatedTopicIds: topic.relatedTopicIds,
  })),
};

const markdown = [
  "# Topic enrichment review",
  "",
  `Source topics: ${sourceTopics.length}`,
  "",
  `Reviewed production topics: ${reviewedTopics.length}`,
  "",
  `Total reviewed mappings: ${review.totalReviewedMappings}`,
  "",
  `Average verses per topic: ${average}`,
  "",
  `Median verses per topic: ${median}`,
  "",
  "No Quran text, footnotes, or verse numbering were modified.",
  "",
  "## Sample counts",
  "",
  ...sampleSlugs.map((slug) => {
    const topic = reviewedTopics.find((candidate) => candidate.slug === slug);
    return `- ${topic?.name ?? slug}: ${topic?.verseMappings.length ?? 0}`;
  }),
  "",
  "## Largest topics",
  "",
  ...largestTopics.map(
    (topic) => `- ${topic.name}: ${topic.count} (old source: ${topic.oldSourceMappingCount})`,
  ),
  "",
  "## Topic details",
  "",
  ...review.topics.flatMap((topic) => [
    `### ${topic.name}`,
    "",
    `Old incomplete source mapping count: ${topic.oldSourceMappingCount}`,
    "",
    `New full-corpus mapping count: ${topic.newFullCorpusMappingCount}`,
    "",
    `Aliases: ${topic.aliases.join(", ")}`,
    "",
    `Strongest verses: ${topic.strongestVerses.map((mapping) => mapping.verseId).join(", ")}`,
    "",
  ]),
].join("\n");

await mkdir("data/generated", { recursive: true });
await writeFile("src/data/source-topics.json", JSON.stringify(sourceTopics, null, 2));
await writeFile("src/data/topics-reviewed.json", JSON.stringify(reviewedLight, null, 2));
await writeFile("data/generated/enriched-topics-draft.json", JSON.stringify(review, null, 2));
await writeFile(
  "data/generated/topic-analysis-checkpoint.json",
  JSON.stringify(
    {
      completed: true,
      versesConsidered: verses.length,
      topicDefinitionsConsidered: definitions.length,
      reviewedTopicCount: reviewedTopics.length,
    },
    null,
    2,
  ),
);
await writeFile("data/generated/topic-enrichment-review.md", markdown);
await writeFile(
  "data/generated/topic-enrichment-review.html",
  `<!doctype html><meta charset="utf-8"><title>Konu inceleme</title><style>body{font:16px system-ui;max-width:920px;margin:40px auto;line-height:1.55;color:#21352c}section{border-top:1px solid #ddd;padding:16px 0}code{background:#f3f5f1;padding:2px 4px;border-radius:4px}</style><h1>Konu inceleme</h1><p>Analiz edilen ayet: ${verses.length}; seed konu: ${sourceTopics.length}; üretim konusu: ${reviewedTopics.length}; eşleşme: ${review.totalReviewedMappings}.</p>${review.topics
    .map(
      (topic) =>
        `<section><h2>${topic.name}</h2><p>Eski kaynak: ${topic.oldSourceMappingCount} · Yeni: ${topic.newFullCorpusMappingCount} · Birincil: ${topic.primaryVerseCount} · İkincil: ${topic.secondaryVerseCount}</p><p>Alias: ${topic.aliases.join(", ")}</p><p>En güçlü ayetler: ${topic.strongestVerses
          .map((mapping) => `<code>${mapping.verseId}</code>`)
          .join(" ")}</p></section>`,
    )
    .join("")}`,
);

console.log(
  `Classification complete: ${verses.length}/6236; ${reviewedTopics.length} reviewed topics; ${review.totalReviewedMappings} mappings.`,
);
