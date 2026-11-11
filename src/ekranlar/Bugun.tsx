"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { kayitliMi, kaydiDegistir, sikHaller } from "@/cekirdek/durum";
import { gununAyetiSec, type GununAyetiAdayi } from "@/cekirdek/gununAyeti";
import { gununHalleri, SECENEK_SAYISI } from "@/cekirdek/halSecimi";
import { gunAnahtari, gunFarki, selamlama, tarihYazisi, zamanDilimi } from "@/cekirdek/tarih";
import { adres, type HalGrubu, type HavuzAyet, type SureOzet } from "@/cekirdek/tipler";
import { AyetMetni } from "@/bilesen/AyetMetni";
import { Desen, Ikon } from "@/bilesen/Ikon";
import { ayetPaylas, Iskelet, Tost, useTost, YuklenemediKutusu } from "@/bilesen/Ortak";
import { durumuGuncelle, useDurum, useIstemcide } from "@/istemci/depo";
import { haller, sureler, useVeri } from "@/istemci/veri";

type Katalog = {
  gruplar: HalGrubu[];
  etiket: Map<string, string>;
  ayetler: Map<string, HavuzAyet>;
  adaylar: GununAyetiAdayi[];
  sureAd: Map<number, string>;
  sureListe: SureOzet[];
};

async function katalogYukle(): Promise<Katalog> {
  const [gruplar, liste] = await Promise.all([haller(), sureler()]);
  const etiket = new Map<string, string>();
  const ayetler = new Map<string, HavuzAyet>();
  const halIds = new Map<string, string[]>();
  for (const g of gruplar)
    for (const h of g.haller) {
      etiket.set(h.id, h.etiket);
      for (const a of h.ayetler) {
        const ad = adres(a.s, a.b, a.e);
        if (!ayetler.has(ad)) ayetler.set(ad, a);
        halIds.set(ad, [...(halIds.get(ad) ?? []), h.id]);
      }
    }
  const adaylar = [...ayetler.entries()].map(([ad, a]) => ({
    adres: ad,
    halIds: halIds.get(ad) ?? [],
    uzunluk: a.ayetler.reduce((t, x) => t + x.m.length, 0),
  }));
  return { gruplar, etiket, ayetler, adaylar, sureAd: new Map(liste.map(s => [s.no, s.ad])), sureListe: liste };
}

function gunYazisi(fark: number): string {
  if (fark <= 0) return "Bugün";
  if (fark === 1) return "Dün";
  return `${fark} gün önce`;
}

export function Bugun() {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const { veri: k, hata, tekrarDene } = useVeri(katalogYukle, []);
  const [simdi] = useState(() => new Date());
  const gun = gunAnahtari(simdi);
  const zaman = zamanDilimi(simdi);
  const [sayfalar, setSayfalar] = useState<string[][]>([]);
  const [tost, tostGoster] = useTost();

  // Bugünün hâl seçenekleri: gün içinde sabit (ilk hesaplanan kaydedilir)
  const ilkSayfa = useMemo(() => {
    if (!k || !istemcide) return null;
    const kayitli = durum.gununHalleri.find(x => x.gun === gun);
    if (kayitli && kayitli.ids.every(id => k.etiket.has(id))) return kayitli.ids;
    return gununHalleri({
      katalog: k.gruplar.map(g => ({ grup: g.grup, ids: g.haller.map(h => h.id) })),
      gun,
      zaman,
      kimlik: durum.kimlik,
      gecmisGunler: durum.gununHalleri,
      sikSecilenler: sikHaller(durum, gun, 30, gunFarki),
    });
  }, [k, istemcide, durum, gun, zaman]);

  // Günün ayeti: gün içinde sabit
  const gununAdresi = useMemo(() => {
    if (!k || !istemcide) return null;
    const kayitli = durum.gununAyeti.find(x => x.gun === gun);
    if (kayitli && k.ayetler.has(kayitli.adres)) return kayitli.adres;
    return gununAyetiSec({
      adaylar: k.adaylar,
      gun,
      kimlik: durum.kimlik,
      gecmis: durum.gununAyeti,
      yakinHaller: sikHaller(durum, gun, 14, gunFarki).map(s => s.id),
    });
  }, [k, istemcide, durum, gun]);

  useEffect(() => {
    if (!ilkSayfa && !gununAdresi) return;
    durumuGuncelle(d => {
      let y = d;
      if (ilkSayfa && !y.gununHalleri.some(x => x.gun === gun && x.ids.join() === ilkSayfa.join()))
        y = { ...y, gununHalleri: [...y.gununHalleri.filter(x => x.gun !== gun), { gun, ids: ilkSayfa }].slice(-14) };
      if (gununAdresi && !y.gununAyeti.some(x => x.gun === gun && x.adres === gununAdresi))
        y = { ...y, gununAyeti: [...y.gununAyeti.filter(x => x.gun !== gun), { gun, adres: gununAdresi }].slice(-90) };
      return y;
    });
  }, [ilkSayfa, gununAdresi, gun]);

  if (hata) return <main className="sayfa"><YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} /></main>;

  const ust = (
    <div className="ust-baslik">
      <div className="ust-baslik__metin">
        <p className="tarih">{istemcide ? tarihYazisi(simdi) : " "}</p>
        <h1 className="baslik">{istemcide ? selamlama(zaman) : "Hoş geldin"}</h1>
      </div>
      <Link href="/bende/" className="ikon-dugme" aria-label="Bende" style={{ background: "var(--vurgu-acik)", color: "var(--vurgu-acik-yazi)" }}><Ikon ad="kisi" /></Link>
    </div>
  );

  if (!k || !istemcide || !ilkSayfa) {
    return <main className="sayfa">{ust}<Iskelet yukseklik={260} /><Iskelet yukseklik={150} /><Iskelet yukseklik={80} /></main>;
  }

  const gosterilen = [ilkSayfa, ...sayfalar];
  const simdikiSayfa = gosterilen[gosterilen.length - 1];
  const tumGosterilen = gosterilen.flat();
  const baskaVar = tumGosterilen.length < k.etiket.size;
  const baskaDuygular = () => {
    const yeni = gununHalleri({
      katalog: k.gruplar.map(g => ({ grup: g.grup, ids: g.haller.map(h => h.id) })),
      gun, zaman, kimlik: durum.kimlik, gecmisGunler: [], sikSecilenler: [],
      bugunGosterilen: tumGosterilen, sayfa: gosterilen.length,
    });
    if (yeni.length) setSayfalar(s => [...s, yeni]);
  };

  const gunluk = gununAdresi ? k.ayetler.get(gununAdresi) : undefined;
  const gunlukKayitli = gununAdresi ? kayitliMi(durum, gununAdresi) : false;

  // Yarım kalan hâl akışı (son 7 gün)
  const sonSecim = [...durum.halSecimleri].reverse().find(s => {
    const f = gunFarki(s.gun, gun);
    return f >= 0 && f <= 7 && k.etiket.has(s.id) && durum.akislar[`hal:${s.id}`];
  });
  const sonAkis = sonSecim ? durum.akislar[`hal:${sonSecim.id}`] : undefined;

  const okuma = durum.okuma;
  const okumaSure = okuma ? k.sureListe.find(s => s.no === okuma.sure) : undefined;

  return (
    <main className="sayfa">
      {ust}

      {gunluk && gununAdresi && (
        <section className="gunun-ayeti" aria-label="Günün ayeti">
          <div className="gunun-ayeti__desen"><Desen /></div>
          <div className="gunun-ayeti__ust"><p>GÜNÜN AYETİ</p><span /></div>
          <div className="bolum-blok" style={{ gap: 8 }}>
            {gunluk.ayetler.map(a => <AyetMetni key={a.n} ayet={a} sinif="gunun-ayeti__metin" numara={gunluk.ayetler.length > 1} />)}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--koyu-kart-altin)", position: "relative" }}>
            {k.sureAd.get(gunluk.s)} · {gunluk.b === gunluk.e ? gunluk.b : `${gunluk.b}–${gunluk.e}`}
          </p>
          <div className="gunun-ayeti__alt">
            <Link href={`/oku/${gunluk.s}/?a=${gunluk.b}`}>Bölümünü oku →</Link>
            <div>
              <button type="button" className="ikon-dugme" aria-label="Paylaş" onClick={async () => {
                const r = await ayetPaylas(gunluk.ayetler.map(a => a.m).join(" "), `${k.sureAd.get(gunluk.s)} ${gunluk.b === gunluk.e ? gunluk.b : `${gunluk.b}-${gunluk.e}`}`);
                if (r === "kopyalandi") tostGoster("Ayet kopyalandı");
              }}><Ikon ad="paylas" /></button>
              <button type="button" className="ikon-dugme" aria-pressed={gunlukKayitli} aria-label={gunlukKayitli ? "Kayıttan çıkar" : "Kaydet"} onClick={() => {
                durumuGuncelle(d => kaydiDegistir(d, gununAdresi, "gunun-ayeti", new Date().toISOString()));
                tostGoster(gunlukKayitli ? "Kayıttan çıkarıldı" : "Bende'ye kaydedildi");
              }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill={gunlukKayitli ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M6 4h12v16l-6-4-6 4z" /></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="bolum-blok" aria-labelledby="nasilsin">
        <h2 className="ara-baslik" id="nasilsin">Bugün nasılsın?</h2>
        <div className="secenekler">
          {simdikiSayfa.map(id => (
            <Link key={id} className="secenek" href={`/hal/${id}/`}>{k.etiket.get(id)}</Link>
          ))}
        </div>
        <div className="satir-arasi">
          {baskaVar && simdikiSayfa.length >= SECENEK_SAYISI ? (
            <button type="button" className="yazi-dugme" onClick={baskaDuygular}><Ikon ad="yenile" boyut={16} />Başka duygular</button>
          ) : <span />}
          <Link className="yazi-dugme" href="/hal/">Tüm hâller</Link>
        </div>
      </section>

      {sonSecim && sonAkis && (
        <Link className="kart kart--satir kart--adacayi" href={`/hal/${sonSecim.id}/`}>
          <span className="kart__ikon"><Ikon ad="saat" boyut={20} /></span>
          <span className="kart__govde">
            <span className="kart__baslik">{gunYazisi(gunFarki(sonSecim.gun, gun))} “{k.etiket.get(sonSecim.id)}” demiştin</span>
            <span className="kart__alt">Kaldığın ayetten devam et · {sonAkis.konum + 1}/{sonAkis.sira.length}</span>
          </span>
          <Ikon ad="ileri" boyut={18} />
        </Link>
      )}

      {okuma && okumaSure ? (
        <Link className="kart kart--satir kart--vurgu" href={`/oku/${okuma.sure}/?b=${okuma.bolum + 1}`}>
          <span className="kart__ikon"><Ikon ad="kitap" boyut={20} /></span>
          <span className="kart__govde">
            <span className="kart__baslik">Kaldığın yerden devam et</span>
            <span className="kart__alt">{okumaSure.ad} · {okuma.bolum + 1}. bölüm / {okumaSure.bolum}</span>
          </span>
          <Ikon ad="ileri" boyut={18} />
        </Link>
      ) : (
        <Link className="kart kart--satir kart--vurgu" href="/oku/1/">
          <span className="kart__ikon"><Ikon ad="kitap" boyut={20} /></span>
          <span className="kart__govde">
            <span className="kart__baslik">Okumaya başla</span>
            <span className="kart__alt">Kur’an’ı bölüm bölüm, sakin bir hızla oku</span>
          </span>
          <Ikon ad="ileri" boyut={18} />
        </Link>
      )}
      <Tost mesaj={tost} />
    </main>
  );
}
