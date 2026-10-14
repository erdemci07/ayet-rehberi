import type { Topic } from "@/types/quran";
import sourceTopics from "./source-topics.json";

// Navigation groupings of existing production records, not a published V2 ontology.
export const discoveryGroups = [
  { id: "hayat", name: "Hayat ve aile", topicIds: ["027", "2037", "030", "033", "015", "025", "026", "022"], slugs: ["rizik", "dunya-hayati", "yetimler"] },
  { id: "ic-dunya", name: "İç dünya", topicIds: ["038", "2036"], slugs: ["tevekkul", "imtihan", "umitsizlik", "ofke"] },
  { id: "iliskiler", name: "İnsanlarla ilişkiler", topicIds: ["031", "034", "021", "024", "1035", "2054", "028", "2039", "1034", "2046"], slugs: ["merhamet", "dogruluk"] },
  { id: "kulluk", name: "İman ve kulluk", topicIds: ["023", "014", "013", "016", "018", "012", "1029", "019", "017", "2057", "1028", "1024", "1033", "2048"], slugs: ["sukur", "tovbe"] },
  { id: "kuran", name: "Kur’an ve düşünme", topicIds: ["2049", "2047", "1030", "1027", "2038", "2045", "2050", "2058", "2060", "2044", "2053", "2059"], slugs: [] },
  { id: "ahiret", name: "Ahiret ve inanç", topicIds: ["036", "037", "1026", "1032", "2055", "2056"], slugs: ["seytan"] },
];
export function groupOf(topic: Topic) {
  const sourceId = sourceTopics.find(source => source.slug === topic.slug)?.id;
  return discoveryGroups.find(group => (sourceId && group.topicIds.includes(sourceId)) || (group.slugs as string[]).includes(topic.slug))?.id ?? "diger";
}

// User-provided everyday query language, linked only to existing production topics.
// This is navigational metadata, never a new verse assignment or a treatment claim.
export const everydayIntents = [
  { id: "sabir", label: "Sabretmekte zorlanıyorum", slugs: ["sab-r", "imtihan"] },
  { id: "gelecek", label: "Gelecek konusunda kaygılıyım", slugs: ["tevekkul", "umitsizlik"] },
  { id: "karar", label: "Bir karar vermem gerekiyor", slugs: ["akl-n-kullanmak", "tevekkul"] },
  { id: "dua", label: "Biraz huzur arıyorum", slugs: ["dua", "tevekkul"] },
  { id: "yalniz", label: "Kendimi yalnız hissediyorum", slugs: ["dua", "merhamet"] },
  { id: "affetmek", label: "Affetmekte zorlanıyorum", slugs: ["merhamet", "tovbe"] },
  { id: "sukur", label: "Şükretmek istiyorum", slugs: ["sukur"] },
  { id: "gecim", label: "Maddi sıkıntı yaşıyorum", slugs: ["rizik", "yard-m-sadaka"] },
  { id: "ofke", label: "Öfkeliyim", slugs: ["ofke", "sab-r"] },
  { id: "umut", label: "Umudumu kaybediyorum", slugs: ["umitsizlik", "dua"] },
  { id: "aile", label: "Ailemle ilgili zorlanıyorum", slugs: ["evlilik", "anne-babaya-hurmet"] },
  { id: "hak", label: "Haksızlığa uğradım", slugs: ["dogruluk", "sab-r"] },
];
