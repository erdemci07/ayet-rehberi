"use client";
import Link from "next/link";
import { Ikon } from "@/bilesen/Ikon";
import { Iskelet, YuklenemediKutusu } from "@/bilesen/Ortak";
import { haller, useVeri } from "@/istemci/veri";

export function TumHaller() {
  const { veri, hata, tekrarDene } = useVeri(haller, []);
  return (
    <main className="sayfa sayfa--menusuz">
      <div className="cubuk">
        <Link className="ikon-dugme" href="/" aria-label="Geri"><Ikon ad="geri" /></Link>
        <div className="cubuk__orta"><p className="cubuk__baslik">Tüm hâller</p></div>
        <span />
      </div>
      <p className="soluk" style={{ margin: 0 }}>Şu an sana en yakın olanı seç. Ayetler birer birer gelir.</p>
      {hata && <YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} />}
      {!veri && !hata && <Iskelet yukseklik={300} />}
      {veri?.map(g => (
        <section key={g.grup} className="bolum-blok">
          <h2 className="etiket">{g.grup}</h2>
          <div className="secenekler">
            {g.haller.map(h => <Link key={h.id} className="secenek" href={`/hal/${h.id}/`}>{h.etiket}</Link>)}
          </div>
        </section>
      ))}
    </main>
  );
}
