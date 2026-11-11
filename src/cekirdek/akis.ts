// Tek ayet akışı: hâl ya da konu seçilince ayetler liste olarak değil, birer birer gelir.
//  - Hâl havuzları her kullanıcı için tohumla karıştırılır; konular kendi sırasıyla (önce ana ayetler) gelir.
//  - Bütün ayetler okunmadan hiçbiri tekrar etmez; tur bitince yeni bir sırayla baştan başlar.
//  - Her DURAK_ARALIGI ayette bir durak ekranı gelir.
//  - "Sonraki" düğmesinin altındaki çizgi BEKLEME_MS içinde dolar (düğme her zaman basılabilir).
import type { AkisDurumu } from "./durum";
import { karistir } from "./rastgele";

export const DURAK_ARALIGI = 3;
export const BEKLEME_MS = 4000;

function siraUret(uzunluk: number, tohum: string | null): number[] {
  const duz = Array.from({ length: uzunluk }, (_, i) => i);
  return tohum ? karistir(duz, tohum) : duz;
}

function gecerliMi(a: AkisDurumu | undefined, uzunluk: number): a is AkisDurumu {
  if (!a || a.sira.length !== uzunluk) return false;
  const gorulen = new Set(a.sira);
  return gorulen.size === uzunluk && a.sira.every(n => n >= 0 && n < uzunluk) && a.konum >= 0 && a.konum < uzunluk;
}

export type AkisSecenekleri = { anahtar: string; kimlik: string; uzunluk: number; karistir: boolean };

const tohum = (o: AkisSecenekleri, tur: number) => (o.karistir ? `${o.kimlik}|${o.anahtar}|${tur}` : null);

/** Kayıtlı akışı doğrular; yoksa ya da veri değiştiyse yenisini kurar. */
export function akisHazirla(mevcut: AkisDurumu | undefined, o: AkisSecenekleri, gun: string): AkisDurumu {
  if (gecerliMi(mevcut, o.uzunluk)) return mevcut.son === gun ? mevcut : { ...mevcut, son: gun };
  return { sira: siraUret(o.uzunluk, tohum(o, 0)), konum: 0, tur: 0, son: gun };
}

export function ileri(a: AkisDurumu, o: AkisSecenekleri, gun: string): { akis: AkisDurumu; turBitti: boolean } {
  if (a.konum + 1 < a.sira.length) return { akis: { ...a, konum: a.konum + 1, son: gun }, turBitti: false };
  const tur = a.tur + 1;
  let sira = siraUret(o.uzunluk, tohum(o, tur));
  // Yeni tur, az önce okunan ayetle başlamasın
  if (sira.length > 1 && sira[0] === a.sira[a.konum]) sira = [...sira.slice(1), sira[0]];
  return { akis: { sira, konum: 0, tur, son: gun }, turBitti: true };
}

export function geri(a: AkisDurumu): AkisDurumu {
  return a.konum > 0 ? { ...a, konum: a.konum - 1 } : a;
}

export const simdiki = (a: AkisDurumu): number => a.sira[a.konum];

/** Bu oturumda okunan ayet sayısına göre durak zamanı mı? */
export const durakZamani = (oturumdaOkunan: number): boolean => oturumdaOkunan > 0 && oturumdaOkunan % DURAK_ARALIGI === 0;
