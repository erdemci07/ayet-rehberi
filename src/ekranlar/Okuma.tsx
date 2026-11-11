"use client";
// Bölüm bölüm okuma. Adres: /oku/2/?b=5 (5. bölüm) ya da /oku/2/?a=255 (255. ayetin bölümü)
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { okumaIsle } from "@/cekirdek/durum";
import type { Ayarlar } from "@/cekirdek/durum";
import { AyetMetni } from "@/bilesen/AyetMetni";
import { Ikon } from "@/bilesen/Ikon";
import { Iskelet, YuklenemediKutusu } from "@/bilesen/Ortak";
import { durumuGuncelle, useDurum, useIstemcide } from "@/istemci/depo";
import { sure as sureGetir, useVeri } from "@/istemci/veri";

const YAZI_SIRASI: Ayarlar["yazi"][] = ["normal", "buyuk", "cokBuyuk"];
const sayi = (v: string | null) => {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function Okuma({ no }: { no: number }) {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const params = useSearchParams();
  const { veri: s, hata, tekrarDene } = useVeri(() => sureGetir(no), [no]);
  const [secili, setSecili] = useState<number | null>(null);
  const [liste, setListe] = useState(false);
  const isaretli = useRef<HTMLDivElement>(null);

  const istenenAyet = sayi(params.get("a"));
  const istenenBolum = sayi(params.get("b"));

  let bolum = 0;
  if (s) {
    if (secili !== null) bolum = secili;
    else if (istenenAyet !== null) bolum = Math.max(0, s.bolumler.findIndex(b => istenenAyet >= b.bas && istenenAyet <= b.son));
    else if (istenenBolum !== null) bolum = Math.min(Math.max(istenenBolum - 1, 0), s.bolumler.length - 1);
    else if (istemcide && durum.okuma?.sure === no) bolum = Math.min(durum.okuma.bolum, s.bolumler.length - 1);
  }
  const isaretliAyet = secili === null ? istenenAyet : null;

  // Kaldığın yer
  useEffect(() => {
    if (!s || !istemcide) return;
    durumuGuncelle(d => (d.okuma?.sure === no && d.okuma.bolum === bolum ? d : { ...d, okuma: { sure: no, bolum, zaman: new Date().toISOString() } }));
  }, [s, istemcide, no, bolum]);

  useEffect(() => {
    if (isaretliAyet !== null) isaretli.current?.scrollIntoView({ block: "center" });
  }, [isaretliAyet, s]);

  if (hata) return <main className="sayfa sayfa--menusuz"><YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} /></main>;
  if (!s) return <main className="sayfa sayfa--menusuz"><Iskelet yukseklik={60} /><Iskelet yukseklik={400} /></main>;

  const b = s.bolumler[bolum];
  const ayetler = s.ayetler.slice(b.bas - 1, b.son);
  const okunan = durum.okunanBolumler[String(no)] ?? [];
  const sonBolum = bolum === s.bolumler.length - 1;

  const git = (yeni: number) => {
    setSecili(yeni);
    setListe(false);
    window.scrollTo({ top: 0 });
  };
  const sonraki = () => {
    durumuGuncelle(d => okumaIsle(d, no, bolum, new Date().toISOString()));
    if (!sonBolum) git(bolum + 1);
  };
  const yaziDegistir = () =>
    durumuGuncelle(d => ({ ...d, ayarlar: { ...d.ayarlar, yazi: YAZI_SIRASI[(YAZI_SIRASI.indexOf(d.ayarlar.yazi) + 1) % YAZI_SIRASI.length] } }));

  const ust = (
    <div className="okuma-ust">
      <div className="cubuk" style={{ margin: 0 }}>
        <Link className="ikon-dugme" href="/kesfet/?sekme=sureler" aria-label="Kapat"><Ikon ad="kapat" /></Link>
        <div className="cubuk__orta">
          <p className="cubuk__baslik">{s.ad}</p>
          <p className="cubuk__alt">{liste ? `${s.bolumler.length} bölüm` : `${bolum + 1}. bölüm / ${s.bolumler.length}`}</p>
        </div>
        <button type="button" className="ikon-dugme" aria-label={liste ? "Bölüm listesini kapat" : "Bölüm listesi"} aria-expanded={liste} onClick={() => setListe(l => !l)}><Ikon ad="liste" /></button>
      </div>
      <div className="ilerleme ilerleme--altin" aria-hidden="true"><span style={{ width: `${((bolum + 1) / s.bolumler.length) * 100}%` }} /></div>
    </div>
  );

  if (liste) {
    return (
      <main className="sayfa sayfa--menusuz">
        {ust}
        <nav className="liste" aria-label="Bölümler">
          {s.bolumler.map((x, i) => (
            <button key={x.bas} type="button" className="liste__satir" aria-current={i === bolum ? "true" : undefined} onClick={() => git(i)}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: i === bolum ? 600 : 400 }}>{x.baslik}</span>
                <small>{x.bas === x.son ? `${x.bas}. ayet` : `${x.bas}–${x.son}. ayetler`}</small>
              </span>
              {okunan.includes(i) && <span aria-label="Okundu" style={{ color: "var(--vurgu)" }}>✓</span>}
            </button>
          ))}
        </nav>
      </main>
    );
  }

  return (
    <main className="sayfa sayfa--menusuz">
      {ust}
      <header className="bolum-baslik">
        <p className="etiket">{b.bas === b.son ? `${b.bas}. ayet` : `${b.bas}–${b.son}. ayetler`}</p>
        <h1>{b.baslik}</h1>
        {b.ozet && <p>{b.ozet}</p>}
      </header>
      <div className="okuma-ayetler">
        {ayetler.map(a => (
          <div key={a.n} className={`okuma-ayet${a.n === isaretliAyet ? " okuma-ayet--isaretli" : ""}`} ref={a.n === isaretliAyet ? isaretli : undefined}>
            <AyetMetni ayet={a} sinif="" numara />
          </div>
        ))}
      </div>
      <div className="okuma-alt">
        <button type="button" className="dugme dugme--ikincil dugme--yuvarlak" aria-label="Önceki bölüm" disabled={bolum === 0} onClick={() => git(bolum - 1)}><Ikon ad="geri" boyut={20} /></button>
        <button type="button" className="dugme dugme--ikincil dugme--yuvarlak" aria-label="Yazı boyutu" onClick={yaziDegistir} style={{ fontFamily: "var(--yazi-okuma)", fontSize: 18 }}>Aa</button>
        {sonBolum ? (
          no < 114 ? (
            <Link className="dugme dugme--genis" href={`/oku/${no + 1}/`} onClick={sonraki}>Sonraki sure <Ikon ad="ileri" boyut={18} kalinlik={2} /></Link>
          ) : (
            <Link className="dugme dugme--genis" href="/" onClick={sonraki}>Okumayı bitir</Link>
          )
        ) : (
          <button type="button" className="dugme dugme--genis" onClick={sonraki}>Sonraki bölüm <Ikon ad="ileri" boyut={18} kalinlik={2} /></button>
        )}
      </div>
    </main>
  );
}
