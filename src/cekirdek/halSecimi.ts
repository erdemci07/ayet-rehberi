// "Bugün nasılsın?" seçenekleri: her gün değişir, aynı gün içinde sabit kalır.
// Kurallar:
//  - 6 seçenek: 4 "Zor anlar", 1 "İyi anlar", 1 "Yön ararken" (grup yetmezse diğerlerinden tamamlanır)
//  - Önceki 2 günün ilk sayfasında görünenler bugün ilk sayfaya gelmez;
//    kullanıcının son 30 günde en çok seçtiği 2 hâl bu kuraldan muaftır.
//  - Günün saati ağırlığı değiştirir (gece "Gece, aklım dolu" öne çıkar).
//  - Sık seçilen hâllerin ağırlığı biraz artar, ama baskın olmaz.
//  - "Başka duygular": aynı gün içinde daha önce gösterilmeyenlerden yeni 6 seçenek.
import { agirlikliSec, uretec } from "./rastgele";
import { gunFarki, type ZamanDilimi } from "./tarih";

export type HalKatalogu = { grup: string; ids: string[] }[];

export const SECENEK_SAYISI = 6;

const ZAMAN_AGIRLIGI: Record<ZamanDilimi, Record<string, number>> = {
  sabah: { baslangic: 2.2, umutlu: 1.6, sukur: 1.6, kaygili: 1.3, isteksiz: 1.4, gece: 0 },
  gunduz: { bunalmis: 1.6, daginik: 1.6, yorgun: 1.2, yuk: 1.4, gecim: 1.3, gece: 0 },
  aksam: { yorgun: 2, tefekkur: 1.6, huzurlu: 1.5, sukur: 1.4, aile: 1.3, gece: 0.6 },
  gece: { gece: 3.5, kaygili: 1.6, yalniz: 1.6, uzgun: 1.4, pisman: 1.3, baslangic: 0.4 },
};

const GRUP_KOTASI = [4, 1, 1];

export type HalSecimGirdisi = {
  katalog: HalKatalogu;
  gun: string;
  zaman: ZamanDilimi;
  kimlik: string;
  /** Önceki günlerin ilk sayfaları */
  gecmisGunler: { gun: string; ids: string[] }[];
  /** Son 30 günün sık seçilenleri (çoktan aza) */
  sikSecilenler: { id: string; adet: number }[];
  /** Bugün zaten gösterilmiş olanlar ("Başka duygular" için) */
  bugunGosterilen?: string[];
  sayfa?: number;
};

export function gununHalleri(g: HalSecimGirdisi): string[] {
  const sayfa = g.sayfa ?? 0;
  const r = uretec(`${g.kimlik}|${g.gun}|hal|${sayfa}`);
  const muaf = new Set(g.sikSecilenler.slice(0, 2).map(s => s.id));
  const yakinda = new Set<string>();
  for (const k of g.gecmisGunler) {
    const fark = gunFarki(k.gun, g.gun);
    if (fark >= 1 && fark <= 2) k.ids.forEach(id => yakinda.add(id));
  }
  const gosterilen = new Set(g.bugunGosterilen ?? []);
  const sik = new Map(g.sikSecilenler.map(s => [s.id, s.adet]));
  const zamanA = ZAMAN_AGIRLIGI[g.zaman];

  const agirlik = (id: string, gevset: boolean) => {
    if (gosterilen.has(id)) return 0;
    if (!gevset && sayfa === 0 && yakinda.has(id) && !muaf.has(id)) return 0;
    const z = zamanA[id] ?? 1;
    const s = 1 + 0.5 * Math.min(sik.get(id) ?? 0, 4);
    return z * s;
  };

  const secilen: string[] = [];
  const sec = (ids: string[], adet: number) => {
    for (const gevset of [false, true]) {
      const kalan = adet - secilen.filter(id => ids.includes(id)).length;
      if (kalan <= 0) return;
      const adaylar = ids.filter(id => !secilen.includes(id)).map(id => ({ deger: id, agirlik: agirlik(id, gevset) }));
      secilen.push(...agirlikliSec(adaylar, kalan, r));
    }
  };
  g.katalog.forEach((grup, i) => sec(grup.ids, GRUP_KOTASI[i] ?? 0));
  // Bir grup yetmediyse kalan yerleri tüm hâllerden doldur
  const hepsi = g.katalog.flatMap(k => k.ids);
  if (secilen.length < SECENEK_SAYISI) sec(hepsi, SECENEK_SAYISI);
  // Ekranda zor-iyi-yön karışık dursun diye sırayı da tohumla karıştır
  const sonuc = secilen.slice(0, SECENEK_SAYISI);
  const anahtar = new Map(sonuc.map(id => [id, r()]));
  return sonuc.sort((a, b) => anahtar.get(a)! - anahtar.get(b)!);
}
