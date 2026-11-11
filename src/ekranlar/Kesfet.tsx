"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/bilesen/Ikon";
import { Iskelet, YuklenemediKutusu } from "@/bilesen/Ortak";
import { useDurum, useIstemcide } from "@/istemci/depo";
import { esmalar, haller, konular, sureler, useVeri } from "@/istemci/veri";
import type { Esma } from "@/cekirdek/tipler";

type Sekme = "konular" | "sureler" | "esma";
const SEKMELER: { id: Sekme; ad: string }[] = [
  { id: "konular", ad: "Konular" },
  { id: "sureler", ad: "Sureler" },
  { id: "esma", ad: "Esmâ" },
];

/** Aramada Türkçe harf ve şapka farklarını yok sayar */
export function sadelestir(m: string): string {
  return m
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/['’\-]/g, "")
    .trim();
}

async function hepsiniYukle() {
  const [k, s, e, h] = await Promise.all([konular(), sureler(), esmalar(), haller()]);
  return { konular: k, sureler: s, esma: e, haller: h };
}

/** Yılın haftasına göre sıradaki isim (herkeste aynı) */
export function haftaninIsmi(liste: Esma[], tarih: Date): Esma | undefined {
  if (!liste.length) return undefined;
  const yilBasi = Date.UTC(tarih.getFullYear(), 0, 1);
  const bugun = Date.UTC(tarih.getFullYear(), tarih.getMonth(), tarih.getDate());
  const hafta = Math.floor((bugun - yilBasi) / (7 * 864e5));
  return liste[(tarih.getFullYear() * 53 + hafta) % liste.length];
}

export function Kesfet() {
  const params = useSearchParams();
  const router = useRouter();
  const istemcide = useIstemcide();
  const durum = useDurum();
  const { veri, hata, tekrarDene } = useVeri(hepsiniYukle, []);
  const [arama, setArama] = useState("");
  const ham = params.get("sekme");
  const sekme: Sekme = ham === "sureler" || ham === "esma" ? ham : "konular";
  const sekmeSec = (s: Sekme) => router.replace(s === "konular" ? "/kesfet/" : `/kesfet/?sekme=${s}`, { scroll: false });

  const q = sadelestir(arama);
  const haftanin = veri && istemcide ? haftaninIsmi(veri.esma, new Date()) : undefined;

  return (
    <main className="sayfa">
      <div className="ust-baslik"><h1 className="baslik">Keşfet</h1></div>
      <label className="arama">
        <Ikon ad="ara" boyut={18} />
        <span className="gizli">Ara</span>
        <input type="search" value={arama} onChange={e => setArama(e.target.value)} placeholder="Konu, sure ya da isim ara" enterKeyHint="search" />
      </label>

      {hata && <YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} />}
      {!veri && !hata && <Iskelet yukseklik={400} />}

      {veri && q && <AramaSonuclari veri={veri} q={q} />}

      {veri && !q && (
        <>
          <div className="sekmeler" role="tablist">
            {SEKMELER.map(s => (
              <button key={s.id} type="button" role="tab" aria-selected={sekme === s.id} onClick={() => sekmeSec(s.id)}>{s.ad}</button>
            ))}
          </div>

          {sekme === "konular" && (
            <>
              {haftanin && (
                <Link className="koyu-satir" href={`/esma/${haftanin.slug}/`}>
                  <div className="kemer kemer--kucuk"><span>{haftanin.arapca}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <p className="etiket">Haftanın ismi</p>
                    <p style={{ fontFamily: "var(--yazi-okuma)", fontSize: 20 }}>{haftanin.ad}</p>
                    <p style={{ fontSize: 13, color: "var(--koyu-kart-soluk)" }}>{haftanin.kisa}</p>
                  </div>
                </Link>
              )}
              {veri.konular.map(g => (
                <section key={g.grup} className="bolum-blok">
                  <h2 className="etiket">{g.grup}</h2>
                  <div className="izgara">
                    {g.konular.map(k => (
                      <Link key={k.id} className="kart" href={`/konu/${k.id}/`}>
                        <span className="kart__baslik">{k.ad}</span>
                        <span className="kart__alt">{k.ayetler.length} ayet</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {sekme === "sureler" && (
            <nav className="liste" aria-label="Sureler">
              {veri.sureler.map(s => {
                const okunan = istemcide ? (durum.okunanBolumler[String(s.no)] ?? []).length : 0;
                return (
                  <Link key={s.no} className="liste__satir" href={`/oku/${s.no}/`}>
                    <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span className="sayac" style={{ width: 26, textAlign: "right" }}>{s.no}</span>
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span>{s.ad}</span>
                        <small>{s.ayet} ayet · {s.bolum} bölüm</small>
                      </span>
                    </span>
                    {okunan > 0 && <small>{okunan === s.bolum ? "✓ okundu" : `${okunan}/${s.bolum}`}</small>}
                  </Link>
                );
              })}
            </nav>
          )}

          {sekme === "esma" && (
            <nav className="liste" aria-label="Esmâ-ül Hüsnâ">
              {veri.esma.map(e => (
                <Link key={e.slug} className="liste__satir" href={`/esma/${e.slug}/`}>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span>{e.ad}</span>
                    <small>{e.kisa}</small>
                  </span>
                  <span lang="ar" dir="rtl" style={{ fontFamily: "var(--yazi-arapca)", fontSize: 20, color: "var(--altin-yazi)" }}>{e.arapca}</span>
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </main>
  );
}

function AramaSonuclari({ veri, q }: { veri: Awaited<ReturnType<typeof hepsiniYukle>>; q: string }) {
  const sayi = Number(q);
  const haller = veri.haller.flatMap(g => g.haller).filter(h => sadelestir(`${h.etiket} ${h.aciklama}`).includes(q));
  const konular = veri.konular.flatMap(g => g.konular).filter(k => sadelestir(k.ad).includes(q));
  const sureler = veri.sureler.filter(s => sadelestir(s.ad).includes(q) || s.no === sayi);
  const esma = veri.esma.filter(e => sadelestir(`${e.ad} ${e.kisa}`).includes(q));
  if (!haller.length && !konular.length && !sureler.length && !esma.length) return <p className="bos">Bununla eşleşen bir şey bulamadım.</p>;
  return (
    <>
      {haller.length > 0 && (
        <section className="bolum-blok">
          <h2 className="etiket">Hâller</h2>
          <div className="secenekler">{haller.map(h => <Link key={h.id} className="secenek" href={`/hal/${h.id}/`}>{h.etiket}</Link>)}</div>
        </section>
      )}
      {konular.length > 0 && (
        <section className="bolum-blok">
          <h2 className="etiket">Konular</h2>
          <div className="izgara">
            {konular.map(k => (
              <Link key={k.id} className="kart" href={`/konu/${k.id}/`}><span className="kart__baslik">{k.ad}</span><span className="kart__alt">{k.ayetler.length} ayet</span></Link>
            ))}
          </div>
        </section>
      )}
      {sureler.length > 0 && (
        <section className="bolum-blok">
          <h2 className="etiket">Sureler</h2>
          <nav className="liste">{sureler.map(s => <Link key={s.no} className="liste__satir" href={`/oku/${s.no}/`}><span>{s.no}. {s.ad}</span><small>{s.ayet} ayet</small></Link>)}</nav>
        </section>
      )}
      {esma.length > 0 && (
        <section className="bolum-blok">
          <h2 className="etiket">Esmâ</h2>
          <nav className="liste">{esma.map(e => <Link key={e.slug} className="liste__satir" href={`/esma/${e.slug}/`}><span>{e.ad}</span><small>{e.kisa}</small></Link>)}</nav>
        </section>
      )}
    </>
  );
}
