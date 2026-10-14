import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceUrl = "https://mealler.org/Konu.aspx";
const source = JSON.parse(await readFile("src/data/source-topics.json", "utf8"));
const corpus = JSON.parse(await readFile("src/data/quran.json", "utf8"));
const corpusIds = new Set(corpus.map(verse => verse.id));
const normalize = value => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const surahNumbers = new Map(corpus.map(verse => [normalize(verse.surahName), verse.surahNumber]));
const cacheRoot = "data/raw/mealler-topics-complete";
const outputPath = "data/generated/mealler-topic-mappings-complete.json";
const reportPath = "data/generated/mealler-topic-recovery-report.json";
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const retrieveTimestamp = new Date().toISOString();
const execute = process.argv.includes("--execute");

await mkdir(cacheRoot, { recursive: true });
await mkdir("data/generated", { recursive: true });

function pageFile(topicId, page) {
  return `${cacheRoot}/${topicId}-${page}.html`;
}

function pageCount(html) {
  const match = html.match(/PageCount\\?":\s*(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function hiddenFields(html) {
  const fields = {};
  for (const input of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = input[0];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
    if (name && (!type || type.toLowerCase() === "hidden")) fields[name] = value;
  }
  return fields;
}

function pageTarget(html, page) {
  const matches = [...html.matchAll(/__doPostBack\((?:&#39;|\\u0027|')([^'&]+?)(?:&#39;|\\u0027|'),(?:&#39;|\\u0027|')?(?:&#39;|\\u0027|')\)[^>]*>[\s\S]{0,160}?>\s*(\d+)\s*</gi)];
  return matches.find(match => Number(match[2]) === page)?.[1] ?? null;
}

function extractVerseIds(html) {
  const ids = [];
  const textPattern = /^\s*([^<\r\n]+?)\s+suresi\s+(\d+)\.\s*ayet\s*$/gim;
  for (const match of html.matchAll(textPattern)) {
    const surahNumber = surahNumbers.get(normalize(match[1].trim()));
    const ayahNumber = Number(match[2]);
    if (surahNumber) ids.push(`${surahNumber}:${ayahNumber}`);
  }
  return ids;
}

async function fetchHtml(url, form) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: form ? "POST" : "GET",
        headers: {
          "User-Agent": "AyetRehberiSourceTopicRecovery/1.0 (local static dataset generator)",
          ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
        },
        body: form ? new URLSearchParams(form) : undefined,
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function readOrFetch(topic, page, html, target) {
  const file = pageFile(topic.id, page);
  if (existsSync(file)) {
    const cachedHtml = await readFile(file, "utf8");
    const cachedIds = extractVerseIds(cachedHtml);
    const previousIds = extractVerseIds(html);
    const duplicateCache = page > 1 && cachedIds.length > 0 && cachedIds.join("|") === previousIds.join("|");
    if (!execute || !duplicateCache) return { html: cachedHtml, fetched: false, file };
  }
  if (!execute) return { html: null, fetched: false, file };
  const nextHtml = await fetchHtml(`${sourceUrl}?id=${topic.id}`, {
    ...hiddenFields(html),
    __EVENTTARGET: target,
    __EVENTARGUMENT: "",
  });
  await writeFile(file, nextHtml);
  await sleep(350);
  return { html: nextHtml, fetched: true, file };
}

const oldById = new Map(source.map(topic => [topic.id, topic]));
const mappings = [];
const topics = [];

for (const topic of source) {
  const startedAt = new Date().toISOString();
  const firstFile = pageFile(topic.id, 1);
  let firstHtml = existsSync(firstFile) ? await readFile(firstFile, "utf8") : null;
  let firstFetched = false;
  const failures = [];
  if (!firstHtml && execute) {
    try {
      firstHtml = await fetchHtml(`${sourceUrl}?id=${topic.id}`);
      await writeFile(firstFile, firstHtml);
      firstFetched = true;
      await sleep(350);
    } catch (error) {
      failures.push({ page: 1, error: String(error) });
    }
  }

  const discoveredPages = firstHtml ? pageCount(firstHtml) : 0;
  const pages = [];
  const uniqueIds = new Set();
  const firstPageByVerse = new Map();
  let duplicateCount = 0;
  let previousHtml = firstHtml;
  for (let page = 1; page <= discoveredPages; page += 1) {
    let result;
    if (page === 1) result = { html: firstHtml, fetched: firstFetched, file: firstFile };
    else {
      const target = pageTarget(previousHtml, page);
      if (!target) {
        failures.push({ page, error: "pagination target not found" });
        continue;
      }
      try {
        result = await readOrFetch(topic, page, previousHtml, target);
      } catch (error) {
        failures.push({ page, error: String(error) });
        continue;
      }
    }
    if (!result.html) {
      failures.push({ page, error: "not fetched; rerun with --execute" });
      continue;
    }
    previousHtml = result.html;
    const pageIds = extractVerseIds(result.html);
    for (const verseId of pageIds) {
      if (uniqueIds.has(verseId)) duplicateCount += 1;
      else {
        uniqueIds.add(verseId);
        firstPageByVerse.set(verseId, page);
      }
      mappings.push({
        source: "mealler.org",
        sourceTopicId: topic.id,
        sourceTopicName: topic.name,
        verseId,
        sourcePage: page,
        sourceUrl: `${sourceUrl}?id=${topic.id}`,
        retrievedAt: retrieveTimestamp,
      });
    }
    pages.push({ page, file: result.file, fetched: result.fetched, rawReferences: pageIds.length });
  }

  const oldIds = new Set(oldById.get(topic.id)?.verseIds ?? []);
  const recoveredIds = [...uniqueIds].filter(id => corpusIds.has(id));
  const invalidIds = [...uniqueIds].filter(id => !corpusIds.has(id));
  topics.push({
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    oldCount: oldIds.size,
    newCount: recoveredIds.length,
    addedMappings: recoveredIds.filter(id => !oldIds.has(id)),
    removedMappings: [...oldIds].filter(id => !uniqueIds.has(id)),
    pagesDiscovered: discoveredPages,
    pagesFetched: pages.length,
    rawReferencesFound: pages.reduce((sum, item) => sum + item.rawReferences, 0),
    uniqueVerseReferences: recoveredIds,
    versePages: Object.fromEntries(firstPageByVerse),
    duplicatesRemoved: duplicateCount,
    failedPages: failures,
    paginationComplete: Boolean(firstHtml) && failures.length === 0 && pages.length === discoveredPages,
    invalidVerseIds: invalidIds,
    pages,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
}

const report = {
  generatedAt: retrieveTimestamp,
  execute,
  source: "mealler.org",
  sourceTopicCount: source.length,
  recoveredTopicCount: topics.length,
  completeTopicCount: topics.filter(topic => topic.paginationComplete).length,
  incompleteTopicCount: topics.filter(topic => !topic.paginationComplete).length,
  totalOldMappings: topics.reduce((sum, topic) => sum + topic.oldCount, 0),
  totalRecoveredMappings: topics.reduce((sum, topic) => sum + topic.newCount, 0),
  totalAddedMappings: topics.reduce((sum, topic) => sum + topic.addedMappings.length, 0),
  topics,
  zekat: topics.find(topic => topic.slug === "zekat") ?? null,
};

await writeFile(outputPath, JSON.stringify({
  generatedAt: retrieveTimestamp,
  source: "mealler.org",
  topics: topics.map(topic => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    mappings: topic.uniqueVerseReferences.map(verseId => ({
      verseId,
      source: "mealler.org",
      sourceTopicId: topic.id,
      sourceTopicName: topic.name,
      sourcePage: topic.versePages[verseId] ?? null,
      sourceUrl: `${sourceUrl}?id=${topic.id}`,
      retrievedAt: retrieveTimestamp,
    })),
  })),
}, null, 2));
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  mode: execute ? "execute" : "cache-audit",
  topics: topics.length,
  complete: report.completeTopicCount,
  incomplete: report.incompleteTopicCount,
  oldMappings: report.totalOldMappings,
  recoveredMappings: report.totalRecoveredMappings,
  addedMappings: report.totalAddedMappings,
  zekat: report.zekat ? { old: report.zekat.oldCount, pages: report.zekat.pagesDiscovered, recovered: report.zekat.newCount } : null,
}, null, 2));