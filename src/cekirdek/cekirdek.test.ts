import { describe, expect, it } from "vitest";
import { agirlikliSec, karistir, uretec } from "./rastgele";
import { gunAnahtari, gunFarki, zamanDilimi } from "./tarih";
import { gununHalleri, SECENEK_SAYISI, type HalKatalogu } from "./halSecimi";
import { gununAyetiSec } from "./gununAyeti";
import { akisHazirla, durakZamani, geri, ileri, simdiki } from "./akis";
import { dokunanSecildi, durumuDuzelt, halSecildi, izleriSil, kaydiDegistir, okumaIsle, sikHaller, yeniDurum } from "./durum";
import { adresCoz, adres } from "./tipler";

const KATALOG: HalKatalogu = [
  { grup: "Zor anlar", ids: ["yorgun", "bunalmis", "kaygili", "korku", "uzgun", "kayip", "yalniz", "kirgin", "ofkeli", "haksizlik", "caresiz", "umutsuz", "pisman", "yetersiz", "kiyas", "sabirsiz", "kararsiz", "isteksiz", "gecim", "hasta", "gece", "daginik", "aile", "yuk", "tereddut"] },
  { grup: "İyi anlar", ids: ["sukur", "huzurlu", "umutlu", "baslangic", "sevgi", "tefekkur"] },
  { grup: "Yön ararken", ids: ["affetmek", "toparlanmak", "iyilik", "anlam"] },
];
const tumu = KATALOG.flatMap(k => k.ids);

describe("rastgele", () => {
  it("aynı tohum aynı sonucu verir", () => {
    expect(karistir([1, 2, 3, 4, 5], "a")).toEqual(karistir([1, 2, 3, 4, 5], "a"));
    expect(karistir([1, 2, 3, 4, 5, 6, 7, 8], "a")).not.toEqual(karistir([1, 2, 3, 4, 5, 6, 7, 8], "b"));
  });
  it("karıştırma eleman kaybetmez", () => {
    expect(karistir([...Array(50).keys()], "x").sort((a, b) => a - b)).toEqual([...Array(50).keys()]);
  });
  it("ağırlıklı seçim tekrarsızdır ve sıfır ağırlığı atlar", () => {
    const r = uretec(1);
    const s = agirlikliSec([{ deger: "a", agirlik: 1 }, { deger: "b", agirlik: 0 }, { deger: "c", agirlik: 5 }], 3, r);
    expect(s.sort()).toEqual(["a", "c"]);
  });
});

describe("tarih", () => {
  it("gün anahtarı ve fark", () => {
    expect(gunAnahtari(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(gunFarki("2026-02-27", "2026-03-02")).toBe(3);
    expect(gunFarki("2026-12-31", "2027-01-01")).toBe(1);
  });
  it("zaman dilimi", () => {
    expect(zamanDilimi(new Date(2026, 0, 1, 6))).toBe("sabah");
    expect(zamanDilimi(new Date(2026, 0, 1, 23))).toBe("gece");
    expect(zamanDilimi(new Date(2026, 0, 1, 3))).toBe("gece");
  });
});

describe("hâl seçimi", () => {
  const temel = { katalog: KATALOG, kimlik: "k1", gecmisGunler: [], sikSecilenler: [] };
  it("6 farklı seçenek ve grup kotası", () => {
    const s = gununHalleri({ ...temel, gun: "2026-11-11", zaman: "sabah" });
    expect(s).toHaveLength(SECENEK_SAYISI);
    expect(new Set(s).size).toBe(SECENEK_SAYISI);
    expect(s.filter(id => KATALOG[0].ids.includes(id))).toHaveLength(4);
    expect(s.filter(id => KATALOG[1].ids.includes(id))).toHaveLength(1);
    expect(s.filter(id => KATALOG[2].ids.includes(id))).toHaveLength(1);
  });
  it("aynı gün sabit, farklı gün farklı", () => {
    const a = gununHalleri({ ...temel, gun: "2026-11-11", zaman: "sabah" });
    expect(gununHalleri({ ...temel, gun: "2026-11-11", zaman: "sabah" })).toEqual(a);
    expect(gununHalleri({ ...temel, gun: "2026-11-12", zaman: "sabah" })).not.toEqual(a);
  });
  it("önceki iki günün seçenekleri tekrar gelmez (sık seçilen 2 hâl hariç)", () => {
    const d1 = gununHalleri({ ...temel, gun: "2026-11-10", zaman: "aksam" });
    const d2 = gununHalleri({ ...temel, gun: "2026-11-11", zaman: "aksam", gecmisGunler: [{ gun: "2026-11-10", ids: d1 }] });
    expect(d2.filter(id => d1.includes(id))).toEqual([]);
    const sik = [{ id: d1[0], adet: 9 }];
    const d3 = gununHalleri({ ...temel, gun: "2026-11-11", zaman: "aksam", gecmisGunler: [{ gun: "2026-11-10", ids: d1 }], sikSecilenler: sik });
    expect(d3.filter(id => d1.includes(id) && id !== d1[0])).toEqual([]);
  });
  it("gündüz 'gece' hâli hiç çıkmaz; 'Başka duygular' bugün gösterilenleri tekrar etmez", () => {
    for (let i = 1; i <= 28; i++) {
      const gun = `2026-02-${String(i).padStart(2, "0")}`;
      const s = gununHalleri({ ...temel, gun, zaman: "gunduz" });
      expect(s).not.toContain("gece");
      const s2 = gununHalleri({ ...temel, gun, zaman: "gunduz", sayfa: 1, bugunGosterilen: s });
      expect(s2.filter(id => s.includes(id))).toEqual([]);
      expect(s2).toHaveLength(SECENEK_SAYISI);
    }
  });
  it("bütün hâller tükenince eksik döner, hata vermez", () => {
    const s = gununHalleri({ ...temel, gun: "2026-11-11", zaman: "gece", sayfa: 6, bugunGosterilen: tumu.slice(0, 33) });
    expect(s.length).toBeLessThanOrEqual(2);
  });
});

describe("günün ayeti", () => {
  const adaylar = [
    { adres: "13:28", halIds: ["kaygili"], uzunluk: 100 },
    { adres: "94:5-6", halIds: ["umutsuz"], uzunluk: 90 },
    { adres: "2:255", halIds: ["korku"], uzunluk: 900 },
    { adres: "93:3-5", halIds: ["uzgun"], uzunluk: 150 },
  ];
  it("uzun ayeti seçmez, aynı gün sabit", () => {
    const o = { adaylar, gun: "2026-11-11", kimlik: "k", gecmis: [], yakinHaller: [] };
    const a = gununAyetiSec(o);
    expect(a).not.toBe("2:255");
    expect(gununAyetiSec(o)).toBe(a);
  });
  it("son 60 günde gösterilen tekrar gelmez; hepsi gösterildiyse en eskisi gelir", () => {
    const gecmis = [{ gun: "2026-11-10", adres: "13:28" }, { gun: "2026-11-09", adres: "94:5-6" }];
    expect(gununAyetiSec({ adaylar, gun: "2026-11-11", kimlik: "k", gecmis, yakinHaller: [] })).toBe("93:3-5");
    const hepsi = [...gecmis, { gun: "2026-11-01", adres: "93:3-5" }];
    expect(gununAyetiSec({ adaylar, gun: "2026-11-11", kimlik: "k", gecmis: hepsi, yakinHaller: [] })).toBe("93:3-5");
  });
});

describe("tek ayet akışı", () => {
  const o = { anahtar: "hal:kaygili", kimlik: "k", uzunluk: 7, karistir: true };
  it("her ayet bir turda bir kez gelir, tur bitince yeniden başlar", () => {
    let a = akisHazirla(undefined, o, "g1");
    const gorulen = [simdiki(a)];
    let bitti = false;
    for (let i = 0; i < 6; i++) {
      const s = ileri(a, o, "g1");
      a = s.akis;
      bitti = s.turBitti;
      gorulen.push(simdiki(a));
    }
    expect(bitti).toBe(false);
    expect(new Set(gorulen).size).toBe(7);
    const yeni = ileri(a, o, "g1");
    expect(yeni.turBitti).toBe(true);
    expect(yeni.akis.tur).toBe(1);
    expect(simdiki(yeni.akis)).not.toBe(simdiki(a));
  });
  it("veri değişince akış yeniden kurulur, bozuk değilse korunur", () => {
    const a = ileri(akisHazirla(undefined, o, "g1"), o, "g1").akis;
    expect(akisHazirla(a, o, "g2").konum).toBe(1);
    expect(akisHazirla(a, { ...o, uzunluk: 8 }, "g2").konum).toBe(0);
    expect(akisHazirla({ ...a, konum: 99 }, o, "g2").konum).toBe(0);
  });
  it("karıştırılmayan akış sırayı korur; geri en başta durur", () => {
    const k = { ...o, karistir: false, anahtar: "konu:sabir" };
    const a = akisHazirla(undefined, k, "g");
    expect(a.sira).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(geri(a)).toBe(a);
  });
  it("durak her 3 ayette bir", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(durakZamani)).toEqual([false, false, false, true, false, false, true]);
  });
});

describe("durum", () => {
  it("bozuk veriyi güvenle düzeltir", () => {
    expect(durumuDuzelt(null, () => "yeni").kimlik).toBe("yeni");
    const d = durumuDuzelt({ kimlik: "eski-kimlik", kayitlar: [{ adres: "1:1" }, { adres: "2:2", kaynak: "x", zaman: "t" }], ayarlar: { yazi: "dev", tema: "koyu", hatirlatmalar: { nasilsin: true, nasilsinSaat: "25" } }, akislar: { a: { sira: [0, 1], konum: 1, son: "g" }, b: "bozuk" } }, () => "yeni");
    expect(d.kimlik).toBe("eski-kimlik");
    expect(d.kayitlar).toHaveLength(1);
    expect(d.ayarlar.yazi).toBe("normal");
    expect(d.ayarlar.tema).toBe("koyu");
    expect(d.ayarlar.hatirlatmalar.nasilsin).toBe(true);
    expect(d.ayarlar.hatirlatmalar.nasilsinSaat).toBe("21:00");
    expect(Object.keys(d.akislar)).toEqual(["a"]);
  });
  it("kayıt, dokunan, okuma ve iz silme", () => {
    let d = yeniDurum("k");
    d = kaydiDegistir(d, "13:28", "hal:kaygili", "t1");
    expect(d.kayitlar).toHaveLength(1);
    d = kaydiDegistir(d, "13:28", "hal:kaygili", "t2");
    expect(d.kayitlar).toHaveLength(0);
    d = dokunanSecildi(d, "94:5-6", "hal:kaygili", "g", "t");
    expect(d.kayitlar[0].adres).toBe("94:5-6");
    d = okumaIsle(okumaIsle(d, 2, 3, "t"), 2, 1, "t");
    expect(d.okunanBolumler["2"]).toEqual([1, 3]);
    expect(d.okuma?.bolum).toBe(1);
    d = halSecildi(halSecildi(halSecildi(d, "kaygili", "2026-11-10"), "kaygili", "2026-11-11"), "yorgun", "2026-11-11");
    expect(sikHaller(d, "2026-11-11", 30, gunFarki)[0]).toEqual({ id: "kaygili", adet: 2 });
    d = izleriSil(d);
    expect(d.halSecimleri).toEqual([]);
    expect(d.kayitlar).toHaveLength(1);
  });
  it("adres yardımcıları", () => {
    expect(adres(94, 5, 6)).toBe("94:5-6");
    expect(adresCoz("2:255")).toEqual({ s: 2, b: 255, e: 255 });
  });
});
