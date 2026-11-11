"use client";
// Hâl ya da konu seçilince açılan ekran: ayetler birer birer, her 3 ayette bir durak.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { akisHazirla, BEKLEME_MS, durakZamani, geri, ileri, simdiki, type AkisSecenekleri } from "@/cekirdek/akis";
import { dokunanSecildi, halSecildi, kayitliMi, kaydiDegistir } from "@/cekirdek/durum";
import { gunAnahtari } from "@/cekirdek/tarih";
import { adres, type Ayet } from "@/cekirdek/tipler";
import { durumuGuncelle, useDurum, useIstemcide } from "@/istemci/depo";
import { ayetleriGetir, haller, konular, sureler, useVeri } from "@/istemci/veri";
import { AyetMetni } from "./AyetMetni";
import { Ikon } from "./Ikon";
import { ayetPaylas, Iskelet, kisalt, Tost, useTost, YuklenemediKutusu } from "./Ortak";

type Oge = { adres: string; s: number; b: number; e: number; neden?: string; ana?: boolean };
type Gosterim = Oge & { sureAd: string; ayetler: Ayet[] };

type Kaynak = { baslik: string; ogeler: Oge[]; karistir: boolean; hazir?: Map<number, Gosterim> };

async function kaynakYukle(tur: "hal" | "konu", id: string): Promise<Kaynak> {
  if (tur === "hal") {
    const [gruplar, liste] = await Promise.all([haller(), sureler()]);
    const hal = gruplar.flatMap(g => g.haller).find(h => h.id === id);
    if (!hal) throw new Error("Bu hâl bulunamadı");
    const ad = new Map(liste.map(s => [s.no, s.ad]));
    const ogeler = hal.ayetler.map(x => ({ adres: adres(x.s, x.b, x.e), s: x.s, b: x.b, e: x.e, neden: x.neden }));
    const hazir = new Map(hal.ayetler.map((x, i) => [i, { ...ogeler[i], sureAd: ad.get(x.s) ?? "", ayetler: x.ayetler }]));
    return { baslik: hal.etiket, ogeler, karistir: true, hazir };
  }
  const gruplar = await konular();
  const konu = gruplar.flatMap(g => g.konular).find(k => k.id === id);
  if (!konu) throw new Error("Bu konu bulunamadı");
  const ogeler = konu.ayetler.map((a, i) => {
    const [s, n] = a.split(":").map(Number);
    return { adres: a, s, b: n, e: n, ana: i < konu.ana };
  });
  return { baslik: konu.ad, ogeler, karistir: false };
}

export function TekAyetAkisi({ tur, id }: { tur: "hal" | "konu"; id: string }) {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const { veri: kaynak, hata, tekrarDene } = useVeri(() => kaynakYukle(tur, id), [tur, id]);
  const anahtar = `${tur}:${id}`;
  const geriYol = tur === "hal" ? "/" : "/kesfet/";
  const gun = useMemo(() => gunAnahtari(new Date()), []);

  const secenek: AkisSecenekleri | null = kaynak ? { anahtar, kimlik: durum.kimlik, uzunluk: kaynak.ogeler.length, karistir: kaynak.karistir } : null;
  const akis = istemcide && secenek ? akisHazirla(durum.akislar[anahtar], secenek, gun) : null;

  // Akış ilk kez açılıyorsa ya da veri değiştiyse kaydet; hâl seçimini hafızaya yaz.
  const kaydedildi = useRef(false);
  useEffect(() => {
    if (!akis || kaydedildi.current) return;
    kaydedildi.current = true;
    durumuGuncelle(d => {
      let y = d.akislar[anahtar] === akis ? d : { ...d, akislar: { ...d.akislar, [anahtar]: akis } };
      if (tur === "hal") y = halSecildi(y, id, gun);
      return y;
    });
  }, [akis, anahtar, tur, id, gun]);

  const [gosterimler, setGosterimler] = useState<Map<number, Gosterim>>(new Map());
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);
  const [oturumOkunan, setOturumOkunan] = useState(0);
  const [oturumGorulen, setOturumGorulen] = useState<number[]>([]);
  const [durak, setDurak] = useState(false);
  const [turBitti, setTurBitti] = useState(false);
  const [tost, tostGoster] = useTost();

  const simdikiSira = akis ? simdiki(akis) : null;

  const sonrakiSira = akis && akis.konum + 1 < akis.sira.length ? akis.sira[akis.konum + 1] : null;
  const [deneme, setDeneme] = useState(0);

  // Konu akışında ayet metinleri sure dosyasından gelir; şimdiki ve bir sonraki ayet önceden yüklenir.
  // (Hâllerde metinler zaten havuz dosyasında hazır.)
  useEffect(() => {
    if (!kaynak || kaynak.hazir || simdikiSira === null) return;
    let iptal = false;
    for (const sira of [simdikiSira, sonrakiSira]) {
      if (sira === null) continue;
      const oge = kaynak.ogeler[sira];
      ayetleriGetir(oge.adres).then(
        r => { if (!iptal) setGosterimler(m => (m.has(sira) ? m : new Map(m).set(sira, { ...oge, sureAd: r.sureAd, ayetler: r.ayetler }))); },
        () => { if (!iptal && sira === simdikiSira) setYuklemeHatasi("Ayet yüklenemedi"); },
      );
    }
    return () => { iptal = true; };
  }, [kaynak, simdikiSira, sonrakiSira, deneme]);

  const gosterimBul = (sira: number): Gosterim | undefined => kaynak?.hazir?.get(sira) ?? gosterimler.get(sira);

  if (hata) return <main className="sayfa sayfa--menusuz"><YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} /></main>;
  if (!kaynak || !akis || !secenek || simdikiSira === null) {
    return <main className="sayfa sayfa--menusuz"><Iskelet yukseklik={60} /><Iskelet yukseklik={320} /></main>;
  }

  const toplam = kaynak.ogeler.length;
  const gosterim = gosterimBul(simdikiSira);
  const kayitli = gosterim ? kayitliMi(durum, gosterim.adres) : false;

  const sonraki = () => {
    const { akis: yeni, turBitti: bitti } = ileri(akis, secenek, gun);
    durumuGuncelle(d => ({ ...d, akislar: { ...d.akislar, [anahtar]: yeni } }));
    const okunan = oturumOkunan + 1;
    setOturumOkunan(okunan);
    setOturumGorulen(g => [...g, simdikiSira]);
    if (bitti) setTurBitti(true);
    if (durakZamani(okunan)) setDurak(true);
    window.scrollTo({ top: 0 });
  };
  const onceki = () => {
    durumuGuncelle(d => ({ ...d, akislar: { ...d.akislar, [anahtar]: geri(akis) } }));
    window.scrollTo({ top: 0 });
  };

  if (durak) {
    const son3 = oturumGorulen.slice(-3).map(i => gosterimBul(i)).filter((g): g is Gosterim => Boolean(g));
    const kalan = toplam - akis.konum;
    return (
      <main className="sayfa sayfa--menusuz">
        <div className="cubuk">
          <button type="button" className="ikon-dugme" aria-label="Geri" onClick={() => setDurak(false)}><Ikon ad="geri" /></button>
          <div className="cubuk__orta"><p className="cubuk__baslik">{kaynak.baslik}</p></div>
          <span />
        </div>
        <div className="durak">
          <div className="durak__ust">
            <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="var(--altin)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 58V30a20 20 0 0 1 40 0v28" /><path d="M20 58V32a12 12 0 0 1 24 0v26" /><path d="M8 58h48" /></svg>
            <h1>{oturumOkunan <= 3 ? "Bugünlük üç ayet yeter" : "Biraz soluklan"}</h1>
            <p>{turBitti ? `Bu bölümdeki ${toplam} ayetin hepsini okudun. Devam edersen yeni bir sırayla baştan başlar.` : `Az okumak, çok düşünmek. Kalan ${kalan} ayet yarın da burada.`}</p>
          </div>
          {son3.length > 0 && (
            <fieldset>
              <legend>Hangisi sana daha çok dokundu?</legend>
              {son3.map(g => {
                const secili = durum.dokunanlar.some(x => x.adres === g.adres && x.gun === gun);
                const metin = g.ayetler.map(a => a.m).join(" ");
                return (
                  <label className="secim" key={g.adres}>
                    <input type="radio" name="dokunan" checked={secili} onChange={() => { durumuGuncelle(d => dokunanSecildi(d, g.adres, anahtar, gun, new Date().toISOString())); tostGoster("Bende'ye kaydedildi"); }} />
                    <span className="secim__metin">
                      <span>{kisalt(metin, 130)}</span>
                      <span>{g.sureAd} {g.b === g.e ? g.b : `${g.b}–${g.e}`}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Link className="dugme" href={geriYol}>Tamam, yarın devam ederim</Link>
            <button type="button" className="dugme dugme--sade" onClick={() => setDurak(false)}>Bir ayet daha oku</button>
          </div>
        </div>
        <Tost mesaj={tost} />
      </main>
    );
  }

  return (
    <main className="sayfa sayfa--menusuz">
      <div className="bolum-blok" style={{ gap: 10 }}>
        <div className="cubuk">
          <Link className="ikon-dugme" href={geriYol} aria-label="Kapat"><Ikon ad="kapat" /></Link>
          <div className="cubuk__orta">
            <p className="cubuk__baslik">{kaynak.baslik}</p>
            <p className="cubuk__alt">{akis.konum + 1} / {toplam}</p>
          </div>
          <button type="button" className="ikon-dugme" aria-pressed={kayitli} aria-label={kayitli ? "Kayıttan çıkar" : "Kaydet"} disabled={!gosterim}
            onClick={() => { if (!gosterim) return; durumuGuncelle(d => kaydiDegistir(d, gosterim.adres, anahtar, new Date().toISOString())); tostGoster(kayitli ? "Kayıttan çıkarıldı" : "Bende'ye kaydedildi"); }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill={kayitli ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v16l-6-4-6 4z" /></svg>
          </button>
        </div>
        <div className="ilerleme" aria-hidden="true"><span style={{ width: `${((akis.konum + 1) / toplam) * 100}%` }} /></div>
      </div>

      {gosterim ? (
        <article className="akis" aria-live="polite" key={`${akis.tur}-${akis.konum}`}>
          {turBitti && akis.konum === 0 && <p className="tur-bitti">Hepsini okudun; şimdi yeni bir sırayla baştan.</p>}
          <div className="akis__adres"><span /><p>{gosterim.sureAd} · {gosterim.b === gosterim.e ? gosterim.b : `${gosterim.b}–${gosterim.e}`}{gosterim.ana ? " · ana ayet" : ""}</p></div>
          <div className="bolum-blok">
            {gosterim.ayetler.map(a => <AyetMetni key={a.n} ayet={a} sinif="akis__metin" numara={gosterim.ayetler.length > 1} />)}
          </div>
          {gosterim.neden && (
            <div className="neden">
              <p className="not-kutusu__baslik">Neden bu ayet?</p>
              <p>{gosterim.neden}</p>
            </div>
          )}
          <div className="secenekler">
            <Link className="cip" href={`/oku/${gosterim.s}/?a=${gosterim.b}`}><Ikon ad="kitap" boyut={16} />Geçtiği bölüm</Link>
            <button type="button" className="cip" onClick={async () => {
              const r = await ayetPaylas(gosterim.ayetler.map(a => a.m).join(" "), `${gosterim.sureAd} ${gosterim.b === gosterim.e ? gosterim.b : `${gosterim.b}-${gosterim.e}`}`);
              if (r === "kopyalandi") tostGoster("Ayet kopyalandı");
            }}><Ikon ad="paylas" boyut={16} />Paylaş</button>
          </div>
        </article>
      ) : yuklemeHatasi ? (
        <YuklenemediKutusu hata={yuklemeHatasi} tekrarDene={() => { setYuklemeHatasi(null); setDeneme(d => d + 1); }} />
      ) : (
        <div className="akis"><Iskelet yukseklik={260} /></div>
      )}

      <div className="akis__alt">
        <p className="akis__ipucu">Acele etme. Bir kez daha, yavaşça oku.</p>
        <div className="akis__dugmeler">
          <button type="button" className="dugme dugme--ikincil dugme--yuvarlak" aria-label="Önceki ayet" onClick={onceki} disabled={akis.konum === 0}><Ikon ad="geri" boyut={20} /></button>
          <button type="button" className="dugme dugme--genis" onClick={sonraki} disabled={!gosterim}>
            Sonraki ayet <Ikon ad="ileri" boyut={18} kalinlik={2} />
            <span aria-hidden="true" className="bekleme-cizgisi" key={`${akis.tur}-${akis.konum}`} style={{ "--bekleme": `${BEKLEME_MS}ms` } as CSSProperties} />
          </button>
        </div>
      </div>
      <Tost mesaj={tost} />
    </main>
  );
}
