// Kullanıcının cihazda tutulan durumu ("mini hafıza"). Hiçbir şey sunucuya gitmez.
// Bu dosyadaki fonksiyonlar saftır: eski durumu alır, yenisini döndürür (testlenebilir).

export const DURUM_SURUMU = 1;

export type AkisDurumu = {
  /** Ayetlerin bu kullanıcıya özel sırası (havuz/konu içindeki sıra numaraları) */
  sira: number[];
  /** Şu an gösterilen ayetin `sira` içindeki yeri */
  konum: number;
  /** Kaçıncı tur (hepsi okununca yeniden karıştırılır) */
  tur: number;
  /** Son açılış günü */
  son: string;
};

export type Hatirlatmalar = {
  gununAyeti: boolean;
  gununAyetiSaat: string;
  nasilsin: boolean;
  nasilsinSaat: string;
  kaldiginYer: boolean;
  haftaninIsmi: boolean;
  sessizBas: string;
  sessizSon: string;
};

export type Ayarlar = {
  yazi: "normal" | "buyuk" | "cokBuyuk";
  tema: "sistem" | "acik" | "koyu";
  hatirlatmalar: Hatirlatmalar;
};

export type Durum = {
  surum: number;
  /** Tohum için cihazda üretilen rastgele kimlik */
  kimlik: string;
  /** Seçilen hâller (en yeni sonda) */
  halSecimleri: { gun: string; id: string }[];
  /** O gün ilk gösterilen hâl seçenekleri; aynı gün içinde sabit kalır */
  gununHalleri: { gun: string; ids: string[] }[];
  /** Günün ayeti geçmişi */
  gununAyeti: { gun: string; adres: string }[];
  /** Hâl ve konu akışları: "hal:kaygili", "konu:sabir" */
  akislar: Record<string, AkisDurumu>;
  /** Kaydedilen ayetler (en yeni başta) */
  kayitlar: { adres: string; kaynak: string; zaman: string }[];
  /** Duraklarda "bana dokundu" denen ayetler */
  dokunanlar: { adres: string; kaynak: string; gun: string }[];
  /** Okumada kaldığın yer */
  okuma: { sure: number; bolum: number; zaman: string } | null;
  /** Okunmuş bölümler: sure no -> bölüm sıra numaraları */
  okunanBolumler: Record<string, number[]>;
  /** Uygulamanın açıldığı günler (son 60) */
  gunler: string[];
  ayarlar: Ayarlar;
};

const VARSAYILAN_HATIRLATMALAR: Hatirlatmalar = {
  gununAyeti: false,
  gununAyetiSaat: "08:30",
  nasilsin: false,
  nasilsinSaat: "21:00",
  kaldiginYer: false,
  haftaninIsmi: false,
  sessizBas: "23:00",
  sessizSon: "07:00",
};

export function yeniDurum(kimlik: string): Durum {
  return {
    surum: DURUM_SURUMU,
    kimlik,
    halSecimleri: [],
    gununHalleri: [],
    gununAyeti: [],
    akislar: {},
    kayitlar: [],
    dokunanlar: [],
    okuma: null,
    okunanBolumler: {},
    gunler: [],
    ayarlar: { yazi: "normal", tema: "sistem", hatirlatmalar: { ...VARSAYILAN_HATIRLATMALAR } },
  };
}

const dizi = <T>(x: unknown, sinama: (v: unknown) => v is T): T[] => (Array.isArray(x) ? x.filter(sinama) : []);
const nesne = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const metin = (x: unknown): x is string => typeof x === "string";

/** Depodan okunan herhangi bir veriyi güvenli bir Durum'a çevirir. Bozuk alanlar varsayılana döner. */
export function durumuDuzelt(ham: unknown, kimlikUret: () => string): Durum {
  if (!nesne(ham)) return yeniDurum(kimlikUret());
  const d = yeniDurum(metin(ham.kimlik) && ham.kimlik.length > 3 ? ham.kimlik : kimlikUret());
  d.halSecimleri = dizi(ham.halSecimleri, (v): v is Durum["halSecimleri"][number] => nesne(v) && metin(v.gun) && metin(v.id)).slice(-300);
  d.gununHalleri = dizi(ham.gununHalleri, (v): v is Durum["gununHalleri"][number] => nesne(v) && metin(v.gun) && Array.isArray(v.ids) && v.ids.every(metin)).slice(-14);
  d.gununAyeti = dizi(ham.gununAyeti, (v): v is Durum["gununAyeti"][number] => nesne(v) && metin(v.gun) && metin(v.adres)).slice(-90);
  if (nesne(ham.akislar)) {
    for (const [k, v] of Object.entries(ham.akislar)) {
      if (nesne(v) && Array.isArray(v.sira) && v.sira.every(n => Number.isInteger(n)) && Number.isInteger(v.konum) && metin(v.son)) {
        d.akislar[k] = { sira: v.sira as number[], konum: v.konum as number, tur: Number.isInteger(v.tur) ? (v.tur as number) : 0, son: v.son };
      }
    }
  }
  d.kayitlar = dizi(ham.kayitlar, (v): v is Durum["kayitlar"][number] => nesne(v) && metin(v.adres) && metin(v.kaynak) && metin(v.zaman)).slice(0, 500);
  d.dokunanlar = dizi(ham.dokunanlar, (v): v is Durum["dokunanlar"][number] => nesne(v) && metin(v.adres) && metin(v.kaynak) && metin(v.gun)).slice(-300);
  if (nesne(ham.okuma) && Number.isInteger(ham.okuma.sure) && Number.isInteger(ham.okuma.bolum) && metin(ham.okuma.zaman)) {
    d.okuma = { sure: ham.okuma.sure as number, bolum: ham.okuma.bolum as number, zaman: ham.okuma.zaman };
  }
  if (nesne(ham.okunanBolumler)) {
    for (const [k, v] of Object.entries(ham.okunanBolumler)) {
      if (Array.isArray(v) && v.every(n => Number.isInteger(n))) d.okunanBolumler[k] = v as number[];
    }
  }
  d.gunler = dizi(ham.gunler, metin).slice(-60);
  if (nesne(ham.ayarlar)) {
    const a = ham.ayarlar;
    if (a.yazi === "normal" || a.yazi === "buyuk" || a.yazi === "cokBuyuk") d.ayarlar.yazi = a.yazi;
    if (a.tema === "sistem" || a.tema === "acik" || a.tema === "koyu") d.ayarlar.tema = a.tema;
    if (nesne(a.hatirlatmalar)) {
      const h = a.hatirlatmalar;
      const v = d.ayarlar.hatirlatmalar;
      for (const k of ["gununAyeti", "nasilsin", "kaldiginYer", "haftaninIsmi"] as const) if (typeof h[k] === "boolean") v[k] = h[k] as boolean;
      for (const k of ["gununAyetiSaat", "nasilsinSaat", "sessizBas", "sessizSon"] as const) if (metin(h[k]) && /^\d\d:\d\d$/.test(h[k] as string)) v[k] = h[k] as string;
    }
  }
  return d;
}

// ---------- Değişiklikler ----------

export function gunuIsle(d: Durum, gun: string): Durum {
  if (d.gunler[d.gunler.length - 1] === gun) return d;
  return { ...d, gunler: [...d.gunler.filter(g => g !== gun), gun].slice(-60) };
}

export function halSecildi(d: Durum, id: string, gun: string): Durum {
  const son = d.halSecimleri[d.halSecimleri.length - 1];
  if (son && son.gun === gun && son.id === id) return d;
  return { ...d, halSecimleri: [...d.halSecimleri, { gun, id }].slice(-300) };
}

export function kayitliMi(d: Durum, adres: string): boolean {
  return d.kayitlar.some(k => k.adres === adres);
}

export function kaydiDegistir(d: Durum, adres: string, kaynak: string, zaman: string): Durum {
  if (kayitliMi(d, adres)) return { ...d, kayitlar: d.kayitlar.filter(k => k.adres !== adres) };
  return { ...d, kayitlar: [{ adres, kaynak, zaman }, ...d.kayitlar].slice(0, 500) };
}

export function dokunanSecildi(d: Durum, adres: string, kaynak: string, gun: string, zaman: string): Durum {
  const dokunanlar = [...d.dokunanlar.filter(x => !(x.adres === adres && x.gun === gun)), { adres, kaynak, gun }].slice(-300);
  const kayitlar = kayitliMi(d, adres) ? d.kayitlar : [{ adres, kaynak, zaman }, ...d.kayitlar].slice(0, 500);
  return { ...d, dokunanlar, kayitlar };
}

export function okumaIsle(d: Durum, sure: number, bolum: number, zaman: string): Durum {
  const k = String(sure);
  const onceki = d.okunanBolumler[k] ?? [];
  const okunanBolumler = onceki.includes(bolum) ? d.okunanBolumler : { ...d.okunanBolumler, [k]: [...onceki, bolum].sort((a, b) => a - b) };
  return { ...d, okuma: { sure, bolum, zaman }, okunanBolumler };
}

/** "Beni nasıl tanıyorsun?" sayfasındaki sıfırlama: tercihler ve kayıtlar kalır, kişisel izler silinir. */
export function izleriSil(d: Durum): Durum {
  return { ...d, halSecimleri: [], gununHalleri: [], dokunanlar: [] };
}

/** Son `gun` gün içinde en çok seçilen hâller (çoktan aza) */
export function sikHaller(d: Durum, bugun: string, gunSayisi: number, gunFarki: (a: string, b: string) => number): { id: string; adet: number }[] {
  const sayac = new Map<string, number>();
  for (const s of d.halSecimleri) {
    const fark = gunFarki(s.gun, bugun);
    if (fark >= 0 && fark < gunSayisi) sayac.set(s.id, (sayac.get(s.id) ?? 0) + 1);
  }
  return [...sayac.entries()].map(([id, adet]) => ({ id, adet })).sort((a, b) => b.adet - a.adet || a.id.localeCompare(b.id));
}
