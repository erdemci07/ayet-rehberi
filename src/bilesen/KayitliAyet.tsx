"use client";
import { ayetleriGetir, useVeri } from "@/istemci/veri";
import { adresCoz } from "@/cekirdek/tipler";
import { Iskelet, kisalt as kisa } from "./Ortak";

/** Adresi verilen ayeti kısa bir kart olarak gösterir (metni sure dosyasından gelir). */
export function KayitliAyet({ adres, kisalt = 0, children }: { adres: string; kisalt?: number; children?: React.ReactNode }) {
  const { veri, hata } = useVeri(() => ayetleriGetir(adres), [adres]);
  const { s, b, e } = adresCoz(adres);
  if (hata) return <div className="kart"><p className="kart__alt">{adres} açılamadı</p></div>;
  if (!veri) return <Iskelet yukseklik={90} />;
  const tam = veri.ayetler.map(a => a.m).join(" ");
  const metin = kisalt ? kisa(tam, kisalt) : tam;
  return (
    <div className="kart" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="kart__ayet">{metin}</p>
      <div className="satir-arasi">
        <a className="kart__alt" href={`/oku/${s}/?a=${b}`} style={{ textDecoration: "none" }}>{veri.sureAd} · {b === e ? b : `${b}–${e}`}</a>
        {children}
      </div>
    </div>
  );
}
