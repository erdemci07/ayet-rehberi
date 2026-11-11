// Günün ayeti: hâl havuzlarındaki kısa ayetlerden seçilir.
//  - Son 60 günde gösterilen ayet tekrar gelmez (havuz biterse en eski olan serbest kalır).
//  - Kullanıcının son 14 günde seçtiği hâllerin havuzları 3 kat ağırlık alır.
//  - Aynı gün içinde sabittir (seçilen, durumda saklanır).
import { agirlikliSec, uretec } from "./rastgele";
import { gunFarki } from "./tarih";

export type GununAyetiAdayi = { adres: string; halIds: string[]; uzunluk: number };

export const GUNLUK_AZAMI_UZUNLUK = 260;

export function gununAyetiSec(o: {
  adaylar: GununAyetiAdayi[];
  gun: string;
  kimlik: string;
  gecmis: { gun: string; adres: string }[];
  yakinHaller: string[];
}): string | null {
  const kisa = o.adaylar.filter(a => a.uzunluk <= GUNLUK_AZAMI_UZUNLUK);
  if (!kisa.length) return null;
  const yakin = new Set(o.yakinHaller);
  const kullanilan = new Map<string, number>();
  for (const g of o.gecmis) {
    const fark = gunFarki(g.gun, o.gun);
    if (fark >= 1 && fark <= 60) kullanilan.set(g.adres, Math.min(kullanilan.get(g.adres) ?? 99, fark));
  }
  let havuz = kisa.filter(a => !kullanilan.has(a.adres));
  if (!havuz.length) {
    // Hepsi yakın zamanda gösterilmiş: en uzun süredir gösterilmeyenler
    const enEski = Math.max(...kisa.map(a => kullanilan.get(a.adres) ?? 0));
    havuz = kisa.filter(a => (kullanilan.get(a.adres) ?? 0) === enEski);
  }
  const r = uretec(`${o.kimlik}|${o.gun}|gunun-ayeti`);
  const [secilen] = agirlikliSec(
    havuz.map(a => ({ deger: a.adres, agirlik: a.halIds.some(h => yakin.has(h)) ? 3 : 1 })),
    1,
    r,
  );
  return secilen ?? null;
}
