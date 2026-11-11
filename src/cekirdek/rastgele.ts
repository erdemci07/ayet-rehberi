// Tekrarlanabilir (tohumlu) rastgelelik: aynı kullanıcı aynı gün aynı sonucu görür.

/** FNV-1a: metinden 32 bitlik sayı */
export function ozet(metin: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: [0,1) aralığında sayı üreten fonksiyon döndürür */
export function uretec(tohum: string | number): () => number {
  let a = typeof tohum === "string" ? ozet(tohum) : tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function karistir<T>(dizi: readonly T[], tohum: string): T[] {
  const r = uretec(tohum);
  const out = dizi.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Ağırlıklı, tekrarsız seçim. Ağırlığı 0 olanlar seçilmez. */
export function agirlikliSec<T>(adaylar: readonly { deger: T; agirlik: number }[], adet: number, r: () => number): T[] {
  const havuz = adaylar.filter(a => a.agirlik > 0).map(a => ({ ...a }));
  const secilen: T[] = [];
  while (secilen.length < adet && havuz.length) {
    const toplam = havuz.reduce((t, a) => t + a.agirlik, 0);
    let x = r() * toplam;
    let i = 0;
    for (; i < havuz.length - 1; i++) {
      x -= havuz[i].agirlik;
      if (x < 0) break;
    }
    secilen.push(havuz[i].deger);
    havuz.splice(i, 1);
  }
  return secilen;
}
