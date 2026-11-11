"use client";
import Link from "next/link";
import { sikHaller } from "@/cekirdek/durum";
import { gunAnahtari, gunFarki } from "@/cekirdek/tarih";
import { Ikon } from "@/bilesen/Ikon";
import { KayitliAyet } from "@/bilesen/KayitliAyet";
import { Iskelet } from "@/bilesen/Ortak";
import { useDurum, useIstemcide } from "@/istemci/depo";
import { haller, sureler, useVeri } from "@/istemci/veri";

async function yukle() {
  const [h, s] = await Promise.all([haller(), sureler()]);
  return {
    etiket: new Map(h.flatMap(g => g.haller).map(x => [x.id, x.etiket])),
    toplamBolum: s.reduce((t, x) => t + x.bolum, 0),
    sureAd: new Map(s.map(x => [x.no, x.ad])),
  };
}

export function Bende() {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const { veri } = useVeri(yukle, []);
  if (!istemcide || !veri) return <main className="sayfa"><div className="ust-baslik"><h1 className="baslik">Bende</h1></div><Iskelet yukseklik={140} /><Iskelet yukseklik={200} /></main>;

  const bugun = gunAnahtari(new Date());
  const sik = sikHaller(durum, bugun, 14, gunFarki).filter(s => veri.etiket.has(s.id)).slice(0, 3);
  const okunanBolum = Object.values(durum.okunanBolumler).reduce((t, x) => t + x.length, 0);
  const sonOtuz = durum.gunler.filter(g => { const f = gunFarki(g, bugun); return f >= 0 && f < 30; }).length;
  const yuzde = veri.toplamBolum ? Math.round((okunanBolum / veri.toplamBolum) * 1000) / 10 : 0;

  return (
    <main className="sayfa">
      <div className="ust-baslik"><h1 className="baslik">Bende</h1></div>

      <section className="kart kart--kum bolum-blok" style={{ gap: 8 }}>
        <p className="not-kutusu__baslik" style={{ margin: 0 }}>Son günlerde</p>
        {sik.length ? (
          <p style={{ margin: 0, fontFamily: "var(--yazi-okuma)", fontSize: 18, lineHeight: 1.45 }}>
            Son iki haftada en çok {sik.map((s, i) => <span key={s.id}>{i > 0 && (i === sik.length - 1 ? " ve " : ", ")}“{veri.etiket.get(s.id)}”</span>)} dedin.
          </p>
        ) : (
          <p style={{ margin: 0, fontFamily: "var(--yazi-okuma)", fontSize: 18 }}>Bugün nasıl olduğunu seçtikçe burada kendine dair küçük bir iz göreceksin.</p>
        )}
        <p className="kart__alt" style={{ color: "inherit", opacity: 0.8 }}>Son 30 günde {sonOtuz} gün buradaydın.</p>
      </section>

      <section className="bolum-blok">
        <div className="satir-arasi">
          <h2 className="ara-baslik">Kaydettiklerin</h2>
          {durum.kayitlar.length > 0 && <Link className="yazi-dugme" href="/bende/kayitlar/">Tümü ({durum.kayitlar.length})</Link>}
        </div>
        {durum.kayitlar.length ? (
          durum.kayitlar.slice(0, 2).map(k => <KayitliAyet key={k.adres} adres={k.adres} kisalt={160} />)
        ) : (
          <p className="bilgi">Bir ayeti kaydettiğinde ya da durakta “bana dokundu” dediğinde burada durur.</p>
        )}
      </section>

      <section className="bolum-blok">
        <h2 className="ara-baslik">Okuma yolculuğun</h2>
        <div className="kart bolum-blok" style={{ gap: 10 }}>
          <div className="satir-arasi">
            <span>{okunanBolum} / {veri.toplamBolum} bölüm</span>
            <span className="sayac">%{yuzde.toLocaleString("tr-TR")}</span>
          </div>
          <div className="ilerleme ilerleme--altin" aria-hidden="true"><span style={{ width: `${Math.max(yuzde, okunanBolum ? 1 : 0)}%` }} /></div>
          {durum.okuma ? (
            <Link className="yazi-dugme" href={`/oku/${durum.okuma.sure}/?b=${durum.okuma.bolum + 1}`} style={{ alignSelf: "flex-start", padding: 0 }}>
              {veri.sureAd.get(durum.okuma.sure)} · {durum.okuma.bolum + 1}. bölümden devam et
            </Link>
          ) : (
            <Link className="yazi-dugme" href="/oku/1/" style={{ alignSelf: "flex-start", padding: 0 }}>Okumaya başla</Link>
          )}
        </div>
      </section>

      <nav className="liste" aria-label="Ayarlar">
        <Link className="liste__satir" href="/bende/hatirlatmalar/"><span>Hatırlatmalar</span><Ikon ad="ileri" boyut={18} /></Link>
        <Link className="liste__satir" href="/bende/gorunum/"><span>Görünüm ve yazı boyutu</span><Ikon ad="ileri" boyut={18} /></Link>
        <Link className="liste__satir" href="/bende/tanima/"><span>Beni nasıl tanıyorsun?</span><Ikon ad="ileri" boyut={18} /></Link>
      </nav>
      <p className="sayac" style={{ textAlign: "center", margin: 0 }}>Meal: Erhan Aktaş · Her şey yalnızca bu cihazda tutulur.</p>
    </main>
  );
}
