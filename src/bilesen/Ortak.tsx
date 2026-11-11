"use client";
import { useEffect, useState } from "react";

export function YuklenemediKutusu({ hata, tekrarDene }: { hata: string; tekrarDene: () => void }) {
  return (
    <div className="bilgi" role="alert">
      <p style={{ margin: "0 0 8px" }}>Bu içerik şu an açılamadı. ({hata})</p>
      <button type="button" className="yazi-dugme" onClick={tekrarDene}>Tekrar dene</button>
    </div>
  );
}

export function Iskelet({ yukseklik = 120 }: { yukseklik?: number }) {
  return <div className="iskelet" style={{ minHeight: yukseklik }} aria-hidden="true" />;
}

/** Kısa süreli bilgi baloncuğu */
export function useTost(): [string | null, (m: string) => void] {
  const [mesaj, setMesaj] = useState<string | null>(null);
  useEffect(() => {
    if (!mesaj) return;
    const t = setTimeout(() => setMesaj(null), 2200);
    return () => clearTimeout(t);
  }, [mesaj]);
  return [mesaj, setMesaj];
}

export function Tost({ mesaj }: { mesaj: string | null }) {
  return mesaj ? <div className="tost" role="status">{mesaj}</div> : <div className="gizli" role="status" />;
}

/** Ayeti paylaşır; paylaşım menüsü yoksa panoya kopyalar. */
export async function ayetPaylas(metin: string, kaynak: string): Promise<"paylasildi" | "kopyalandi" | "olmadi"> {
  const icerik = `${metin}\n— ${kaynak} (Erhan Aktaş meali)`;
  try {
    if (navigator.share) {
      await navigator.share({ text: icerik });
      return "paylasildi";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "olmadi";
  }
  try {
    await navigator.clipboard.writeText(icerik);
    return "kopyalandi";
  } catch {
    return "olmadi";
  }
}

/** Uzun metni kelime ortasından bölmeden kısaltır */
export function kisalt(m: string, en: number): string {
  if (m.length <= en) return m;
  const kesit = m.slice(0, en);
  const bosluk = kesit.lastIndexOf(" ");
  return `${(bosluk > en * 0.6 ? kesit.slice(0, bosluk) : kesit).replace(/[,;:.\s]+$/, "")}…`;
}

