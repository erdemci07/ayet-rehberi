"use client";
import Link from "next/link";
import { Ikon } from "@/bilesen/Ikon";
import { KayitliAyet } from "@/bilesen/KayitliAyet";
import { Iskelet, YuklenemediKutusu } from "@/bilesen/Ortak";
import { esmalar, useVeri } from "@/istemci/veri";

export function EsmaEkrani({ slug }: { slug: string }) {
  const { veri, hata, tekrarDene } = useVeri(esmalar, []);
  const ust = (
    <div className="cubuk">
      <Link className="ikon-dugme" href="/kesfet/?sekme=esma" aria-label="Geri"><Ikon ad="geri" /></Link>
      <div className="cubuk__orta"><p className="cubuk__baslik">Esmâ-ül Hüsnâ</p></div>
      <span />
    </div>
  );
  if (hata) return <main className="sayfa sayfa--menusuz">{ust}<YuklenemediKutusu hata={hata} tekrarDene={tekrarDene} /></main>;
  if (!veri) return <main className="sayfa sayfa--menusuz">{ust}<Iskelet yukseklik={300} /></main>;
  const i = veri.findIndex(e => e.slug === slug);
  const e = veri[i];
  if (!e) return <main className="sayfa sayfa--menusuz">{ust}<p className="bos">Bu isim bulunamadı.</p></main>;
  const onceki = veri[(i - 1 + veri.length) % veri.length];
  const sonraki = veri[(i + 1) % veri.length];
  const aciklamaVar = Boolean(e.sanaNe || e.bugunDene);
  return (
    <main className="sayfa sayfa--menusuz">
      {ust}
      <div className="esma-ust">
        <div className="kemer"><div><p lang="ar" dir="rtl">{e.arapca}</p></div></div>
        <p className="etiket">{e.sira} / {veri.length}</p>
        <h1>{e.ad}</h1>
        <p style={{ fontFamily: "var(--yazi-okuma)", fontSize: 19, color: "var(--murekkep)" }}>{e.kisa}</p>
      </div>
      {e.sanaNe && (
        <section className="bolum-blok">
          <h2 className="ara-baslik">Sana ne söyler?</h2>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{e.sanaNe}</p>
        </section>
      )}
      {e.bugunDene && (
        <section className="neden">
          <p className="not-kutusu__baslik">Bugün dene</p>
          <p>{e.bugunDene}</p>
        </section>
      )}
      {e.ayetler.length > 0 && (
        <section className="bolum-blok">
          <h2 className="ara-baslik">Kur’an’da</h2>
          {e.ayetler.map(a => <KayitliAyet key={a} adres={a} />)}
        </section>
      )}
      {!aciklamaVar && <p className="bilgi">Bu ismin açıklaması hazırlanıyor.</p>}
      <div className="satir-arasi" style={{ marginTop: "auto" }}>
        <Link className="yazi-dugme" href={`/esma/${onceki.slug}/`}><Ikon ad="geri" boyut={16} />{onceki.ad}</Link>
        <Link className="yazi-dugme" href={`/esma/${sonraki.slug}/`}>{sonraki.ad}<Ikon ad="ileri" boyut={16} /></Link>
      </div>
    </main>
  );
}
