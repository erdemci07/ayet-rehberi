#!/usr/bin/env node
// Uygulamanın çalışırken okuduğu veriyi üretir: public/veri/**.json
// Kaynaklar: src/data/quran.json (meal + notlar), data/v3/uygulama/*.json (bölüm, konu, hâl),
//            src/data/esma/published.json (isimler; açıklama metinleri yeniden yazılacak).
// Çalıştırma: node scripts/uygulama/veri-uret.mjs   (npm run veri; build öncesi otomatik çalışır)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const kok = process.cwd();
const oku = p => JSON.parse(readFileSync(join(kok, p), "utf8"));
const hedef = join(kok, "public/veri");
rmSync(hedef, { recursive: true, force: true });
mkdirSync(join(hedef, "sure"), { recursive: true });
const yaz = (p, v) => writeFileSync(join(hedef, p), JSON.stringify(v));

const meal = oku("src/data/quran.json");
const bolumler = oku("data/v3/uygulama/bolumler.json");
const konular = oku("data/v3/uygulama/konular.json");
const haller = oku("data/v3/uygulama/haller.json");
const esma = oku("src/data/esma/published.json");

const hatalar = [];

// --- Ayet biçimi: { n, m (düz metin), p (parçalar: metin ya da not sırası), not: [metin], yedek? }
// Kaynakta bazı notlar "… 16/Nahl, 102 ayette …" gibi yerlerde yanlışlıkla bölünmüş; bölünen parça
// metinde hiçbir işaretle eşleşmez. Bu parçalar, sırayla bir önceki notun sonuna eklenir.
function ayetBicimle(v) {
  const isaretler = v.segments.filter(s => s.type === "footnote").map(s => s.id);
  const notluId = new Set(v.footnotes.map(f => f.id));
  // Metinde işareti olup notu bulunmayanlar (ör. işaret fn-1, not fn-2 olarak kaydedilmiş)
  const bosIsaret = isaretler.filter(id => !notluId.has(id));
  const isaretli = new Set(isaretler);
  const notlar = [];
  const idSira = new Map();
  let sondaNot = false;
  for (const f of v.footnotes) {
    if (isaretli.has(f.id) && !idSira.has(f.id)) {
      idSira.set(f.id, notlar.length);
      notlar.push(f.text.trim());
    } else if (notlar.length) {
      notlar[notlar.length - 1] = `${notlar[notlar.length - 1]} ${f.marker} ${f.text.trim()}`;
    } else if (bosIsaret.length) {
      idSira.set(bosIsaret.shift(), notlar.length);
      notlar.push(f.text.trim());
    } else {
      // Metinde hiç işareti olmayan not: ayetin sonunda gösterilir.
      notlar.push(f.text.trim());
      sondaNot = true;
    }
  }
  const p = [];
  for (const s of v.segments) {
    if (s.type === "text") {
      if (typeof p[p.length - 1] === "string") p[p.length - 1] += s.value;
      else p.push(s.value);
    } else if (idSira.has(s.id)) {
      p.push(idSira.get(s.id));
    }
    // Kaynağında açıklaması olmayan işaret gösterilmez.
  }
  if (sondaNot) p.push(0);
  const a = { n: v.ayahNumber, m: v.plainTranslation, p, not: notlar };
  if (v.isFallbackTranslation) a.yedek = v.translator;
  return a;
}

const sureAyet = new Map();
for (const v of meal) {
  if (!sureAyet.has(v.surahNumber)) sureAyet.set(v.surahNumber, { ad: v.surahName, ayetler: [] });
  sureAyet.get(v.surahNumber).ayetler.push(ayetBicimle(v));
}
const ayetBul = (s, n) => sureAyet.get(s)?.ayetler[n - 1];

const sureListe = [];
for (let s = 1; s <= 114; s++) {
  const k = sureAyet.get(s);
  const bl = bolumler[String(s)];
  if (!k || !bl) { hatalar.push(`sure ${s} eksik`); continue; }
  k.ayetler.forEach((a, i) => { if (a.n !== i + 1) hatalar.push(`${s}:${a.n} sıra bozuk`); });
  let beklenen = 1;
  for (const b of bl) { if (b.bas !== beklenen) hatalar.push(`sure ${s} bölüm boşluğu ${b.bas}`); beklenen = b.son + 1; }
  if (beklenen !== k.ayetler.length + 1) hatalar.push(`sure ${s} bölümler ayet sayısını tutmuyor`);
  yaz(`sure/${s}.json`, { no: s, ad: k.ad, bolumler: bl, ayetler: k.ayetler });
  sureListe.push({ no: s, ad: k.ad, ayet: k.ayetler.length, bolum: bl.length });
}
yaz("sureler.json", sureListe);

// --- Hâller: havuz ayetleri metinleriyle birlikte (Bugün ekranı ağdan bağımsız açılsın diye)
const halCikti = haller.map(g => ({
  grup: g.grup,
  haller: g.haller.map(h => ({
    id: h.id, etiket: h.etiket, aciklama: h.aciklama,
    ayetler: h.ayetler.map(x => {
      const ay = [];
      for (let n = x.bas; n <= x.son; n++) {
        const a = ayetBul(x.sure, n);
        if (!a) hatalar.push(`hâl ${h.id}: ${x.sure}:${n} yok`); else ay.push(a);
      }
      return { s: x.sure, b: x.bas, e: x.son, neden: x.neden, ayetler: ay };
    }),
  })),
}));
yaz("haller.json", halCikti);

// --- Konular: yalnız referanslar; metin, okunurken ilgili sure dosyasından gelir
const konuCikti = konular.map(g => ({
  grup: g.grup,
  konular: g.konular.map(k => {
    const ana = k.ana.map(([s, n]) => `${s}:${n}`);
    const anaSet = new Set(ana);
    const sira = [...ana, ...k.ayetler.map(([s, n]) => `${s}:${n}`).filter(r => !anaSet.has(r))];
    const tek = [...new Set(sira)];
    for (const r of tek) { const [s, n] = r.split(":").map(Number); if (!ayetBul(s, n)) hatalar.push(`konu ${k.id}: ${r} yok`); }
    return { id: k.id, ad: k.ad, ana: ana.length, ayetler: tek };
  }),
}));
yaz("konular.json", konuCikti);

// --- Esmâ: yalnız ad, Arapça yazım ve kısa anlam. Uzun açıklamalar yeniden yazılana kadar yayımlanmaz.
const esmaCikti = esma
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(e => ({ sira: e.order, slug: e.slug, ad: e.name, arapca: e.arabic, kisa: e.shortMeaning, sanaNe: "", bugunDene: "", ayetler: [] }));
yaz("esma.json", esmaCikti);

const surum = { uretildi: new Date().toISOString().slice(0, 10), sure: sureListe.length, hal: halCikti.reduce((t, g) => t + g.haller.length, 0), konu: konuCikti.reduce((t, g) => t + g.konular.length, 0), esma: esmaCikti.length };
yaz("surum.json", surum);

if (hatalar.length) {
  console.error(`Veri üretimi ${hatalar.length} hata ile durdu:\n` + hatalar.slice(0, 30).join("\n"));
  process.exit(1);
}
console.log("veri hazır:", surum);
