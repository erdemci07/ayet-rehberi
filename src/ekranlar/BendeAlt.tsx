"use client";
import Link from "next/link";
import { useState } from "react";
import { izleriSil, kaydiDegistir, type Ayarlar, type Hatirlatmalar as HatirlatmaAyarlari } from "@/cekirdek/durum";
import { Ikon } from "@/bilesen/Ikon";
import { KayitliAyet } from "@/bilesen/KayitliAyet";
import { Iskelet, Tost, useTost } from "@/bilesen/Ortak";
import { durumuGuncelle, herSeyiSil, useDurum, useIstemcide } from "@/istemci/depo";
import { haller, useVeri } from "@/istemci/veri";

function Kabuk({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <main className="sayfa sayfa--menusuz">
      <div className="cubuk">
        <Link className="ikon-dugme" href="/bende/" aria-label="Geri"><Ikon ad="geri" /></Link>
        <div className="cubuk__orta"><p className="cubuk__baslik">{baslik}</p></div>
        <span />
      </div>
      {children}
    </main>
  );
}

// ---------- Kaydettiklerin ----------
export function Kayitlar() {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const [tost, tostGoster] = useTost();
  if (!istemcide) return <Kabuk baslik="Kaydettiklerin"><Iskelet /></Kabuk>;
  return (
    <Kabuk baslik="Kaydettiklerin">
      {durum.kayitlar.length === 0 && <p className="bos">Henüz kaydettiğin bir ayet yok.</p>}
      {durum.kayitlar.map(k => (
        <KayitliAyet key={k.adres} adres={k.adres}>
          <button type="button" className="yazi-dugme" onClick={() => { durumuGuncelle(d => kaydiDegistir(d, k.adres, k.kaynak, k.zaman)); tostGoster("Kayıttan çıkarıldı"); }}>Çıkar</button>
        </KayitliAyet>
      ))}
      <Tost mesaj={tost} />
    </Kabuk>
  );
}

// ---------- Görünüm ----------
const YAZILAR: { id: Ayarlar["yazi"]; ad: string }[] = [
  { id: "normal", ad: "Normal" },
  { id: "buyuk", ad: "Büyük" },
  { id: "cokBuyuk", ad: "Çok büyük" },
];
const TEMALAR: { id: Ayarlar["tema"]; ad: string }[] = [
  { id: "sistem", ad: "Telefona göre" },
  { id: "acik", ad: "Açık" },
  { id: "koyu", ad: "Koyu" },
];

export function Gorunum() {
  const istemcide = useIstemcide();
  const { ayarlar } = useDurum();
  const ayarla = (y: Partial<Ayarlar>) => durumuGuncelle(d => ({ ...d, ayarlar: { ...d.ayarlar, ...y } }));
  if (!istemcide) return <Kabuk baslik="Görünüm"><Iskelet /></Kabuk>;
  return (
    <Kabuk baslik="Görünüm">
      <section className="bolum-blok">
        <h2 className="ara-baslik">Yazı boyutu</h2>
        <div className="secenekler" role="group" aria-label="Yazı boyutu">
          {YAZILAR.map(y => <button key={y.id} type="button" className="secenek" aria-pressed={ayarlar.yazi === y.id} onClick={() => ayarla({ yazi: y.id })}>{y.ad}</button>)}
        </div>
        <div className="kart"><p style={{ margin: 0, fontFamily: "var(--yazi-okuma)", fontSize: "var(--okuma-boyut)", lineHeight: "var(--okuma-satir)" }}>Şüphesiz, zorlukla birlikte bir kolaylık vardır.</p></div>
      </section>
      <section className="bolum-blok">
        <h2 className="ara-baslik">Tema</h2>
        <div className="secenekler" role="group" aria-label="Tema">
          {TEMALAR.map(t => <button key={t.id} type="button" className="secenek" aria-pressed={ayarlar.tema === t.id} onClick={() => ayarla({ tema: t.id })}>{t.ad}</button>)}
        </div>
      </section>
    </Kabuk>
  );
}

// ---------- Hatırlatmalar ----------
const HATIRLATMALAR: { id: "gununAyeti" | "nasilsin" | "kaldiginYer" | "haftaninIsmi"; ad: string; alt: string; saat?: "gununAyetiSaat" | "nasilsinSaat" }[] = [
  { id: "gununAyeti", ad: "Günün ayeti", alt: "Sabah kısa bir ayet", saat: "gununAyetiSaat" },
  { id: "nasilsin", ad: "Bugün nasılsın?", alt: "Akşam, gününe göre ayetler", saat: "nasilsinSaat" },
  { id: "kaldiginYer", ad: "Kaldığın yer", alt: "Birkaç gün okumazsan nazikçe hatırlatır" },
  { id: "haftaninIsmi", ad: "Haftanın ismi", alt: "Haftada bir, Esmâ'dan bir isim" },
];

export function Hatirlatmalar() {
  const istemcide = useIstemcide();
  const { ayarlar } = useDurum();
  const h = ayarlar.hatirlatmalar;
  const ayarla = (y: Partial<HatirlatmaAyarlari>) => durumuGuncelle(d => ({ ...d, ayarlar: { ...d.ayarlar, hatirlatmalar: { ...d.ayarlar.hatirlatmalar, ...y } } }));
  if (!istemcide) return <Kabuk baslik="Hatırlatmalar"><Iskelet /></Kabuk>;
  return (
    <Kabuk baslik="Hatırlatmalar">
      <p className="soluk" style={{ margin: 0 }}>Hepsi kapalı başlar. Açtıkların günde en fazla bir kez, sessiz saatler dışında gelir.</p>
      <div className="liste">
        {HATIRLATMALAR.map(x => (
          <div key={x.id} className="liste__satir">
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span>{x.ad}</span>
              <small>{x.alt}</small>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {x.saat && h[x.id] && (
                <input className="saat" type="time" aria-label={`${x.ad} saati`} value={h[x.saat]} onChange={e => e.target.value && ayarla({ [x.saat!]: e.target.value })} />
              )}
              <label className="anahtar">
                <input type="checkbox" role="switch" checked={h[x.id]} aria-label={x.ad} onChange={e => ayarla({ [x.id]: e.target.checked })} />
                <span />
              </label>
            </span>
          </div>
        ))}
      </div>
      <section className="bolum-blok">
        <h2 className="ara-baslik">Sessiz saatler</h2>
        <div className="liste">
          <div className="liste__satir">
            <span>Başlangıç</span>
            <input className="saat" type="time" aria-label="Sessiz saat başlangıcı" value={h.sessizBas} onChange={e => e.target.value && ayarla({ sessizBas: e.target.value })} />
          </div>
          <div className="liste__satir">
            <span>Bitiş</span>
            <input className="saat" type="time" aria-label="Sessiz saat bitişi" value={h.sessizSon} onChange={e => e.target.value && ayarla({ sessizSon: e.target.value })} />
          </div>
        </div>
      </section>
      <p className="bilgi">Bildirimler telefon uygulamasında çalışacak. Seçimlerin şimdiden kaydediliyor.</p>
    </Kabuk>
  );
}

// ---------- Beni nasıl tanıyorsun? ----------
export function Tanima() {
  const istemcide = useIstemcide();
  const durum = useDurum();
  const { veri } = useVeri(haller, []);
  const [onay, setOnay] = useState<null | "izler" | "hepsi">(null);
  const [tost, tostGoster] = useTost();
  if (!istemcide) return <Kabuk baslik="Beni nasıl tanıyorsun?"><Iskelet /></Kabuk>;
  const etiket = new Map((veri ?? []).flatMap(g => g.haller).map(h => [h.id, h.etiket]));
  const sonSecimler = [...durum.halSecimleri].reverse().slice(0, 5);
  return (
    <Kabuk baslik="Beni nasıl tanıyorsun?">
      <p style={{ margin: 0, fontFamily: "var(--yazi-okuma)", fontSize: 18, lineHeight: 1.5 }}>
        Seni yalnızca bu telefonda tuttuğum birkaç küçük izle tanıyorum. Hiçbiri bir sunucuya gitmez, hesap da yok.
      </p>
      <div className="liste">
        <div className="liste__satir"><span>Seçtiğin hâller</span><small>{durum.halSecimleri.length}</small></div>
        <div className="liste__satir"><span>Kaydettiğin ayetler</span><small>{durum.kayitlar.length}</small></div>
        <div className="liste__satir"><span>“Bana dokundu” dediklerin</span><small>{durum.dokunanlar.length}</small></div>
        <div className="liste__satir"><span>Okuduğun bölümler</span><small>{Object.values(durum.okunanBolumler).reduce((t, x) => t + x.length, 0)}</small></div>
        <div className="liste__satir"><span>Uygulamayı açtığın günler</span><small>{durum.gunler.length}</small></div>
      </div>
      {sonSecimler.length > 0 && (
        <p className="soluk" style={{ margin: 0, fontSize: 14 }}>
          Son seçtiklerin: {sonSecimler.map(s => etiket.get(s.id) ?? s.id).join(", ")}
        </p>
      )}
      <p className="soluk" style={{ margin: 0, fontSize: 14 }}>
        Bunları “Bugün nasılsın?” seçeneklerini sana göre sıralamak ve günün ayetini seçerken kullanıyorum.
      </p>

      {onay === null && (
        <div className="bolum-blok" style={{ marginTop: "auto" }}>
          <button type="button" className="dugme dugme--ikincil" onClick={() => setOnay("izler")}>Kişisel izleri sil</button>
          <button type="button" className="dugme dugme--sade" style={{ color: "#9b3b2e" }} onClick={() => setOnay("hepsi")}>Her şeyi sil</button>
        </div>
      )}
      {onay && (
        <div className="uyari-kutu" role="alertdialog" aria-label="Silme onayı" style={{ marginTop: "auto" }}>
          <p>
            {onay === "izler"
              ? "Seçtiğin hâller ve “bana dokundu” işaretlerin silinecek. Kayıtların, okuma yerin ve ayarların kalacak."
              : "Kayıtların, okuma yolculuğun, ayarların ve tüm izler silinecek. Bu geri alınamaz."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="dugme dugme--ikincil" style={{ flex: 1 }} onClick={() => setOnay(null)}>Vazgeç</button>
            <button type="button" className="dugme dugme--tehlike" style={{ flex: 1 }} onClick={() => {
              if (onay === "izler") durumuGuncelle(izleriSil);
              else herSeyiSil();
              setOnay(null);
              tostGoster("Silindi");
            }}>Sil</button>
          </div>
        </div>
      )}
      <Tost mesaj={tost} />
    </Kabuk>
  );
}
