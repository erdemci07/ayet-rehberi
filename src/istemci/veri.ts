"use client";
// public/veri altındaki dosyaları bir kez indirir ve bellekte tutar.
// Telefon uygulamasında bu dosyalar paketin içindedir; internet gerekmez.
import { useEffect, useRef, useState } from "react";
import type { Ayet, Esma, HalGrubu, KonuGrubu, Sure, SureOzet } from "@/cekirdek/tipler";
import { adresCoz } from "@/cekirdek/tipler";

const onbellek = new Map<string, Promise<unknown>>();

export function veriGetir<T>(yol: string): Promise<T> {
  let p = onbellek.get(yol) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`/veri/${yol}`).then(r => {
      if (!r.ok) throw new Error(`${yol} yüklenemedi (${r.status})`);
      return r.json() as Promise<T>;
    });
    // Başarısız istek önbellekte kalmasın; tekrar denenebilsin.
    p.catch(() => onbellek.delete(yol));
    onbellek.set(yol, p);
  }
  return p;
}

export const haller = () => veriGetir<HalGrubu[]>("haller.json");
export const konular = () => veriGetir<KonuGrubu[]>("konular.json");
export const sureler = () => veriGetir<SureOzet[]>("sureler.json");
export const sure = (no: number) => veriGetir<Sure>(`sure/${no}.json`);
export const esmalar = () => veriGetir<Esma[]>("esma.json");

/** "13:28" ya da "94:5-6" adresindeki ayet(ler) */
export async function ayetleriGetir(a: string): Promise<{ sureAd: string; ayetler: Ayet[] }> {
  const { s, b, e } = adresCoz(a);
  const k = await sure(s);
  return { sureAd: k.ad, ayetler: k.ayetler.slice(b - 1, e) };
}

export type Yukleme<T> = { veri: T | null; hata: string | null; tekrarDene: () => void };

export function useVeri<T>(getir: () => Promise<T>, bagimlilik: unknown[] = []): Yukleme<T> {
  const anahtar = JSON.stringify(bagimlilik);
  const [deneme, setDeneme] = useState(0);
  const [sonuc, setSonuc] = useState<{ anahtar: string; deneme: number; veri: T | null; hata: string | null } | null>(null);
  const getirRef = useRef(getir);
  useEffect(() => {
    getirRef.current = getir;
  });
  useEffect(() => {
    let iptal = false;
    getirRef.current().then(
      v => { if (!iptal) setSonuc({ anahtar, deneme, veri: v, hata: null }); },
      (e: unknown) => { if (!iptal) setSonuc({ anahtar, deneme, veri: null, hata: e instanceof Error ? e.message : "Veri yüklenemedi" }); },
    );
    return () => { iptal = true; };
  }, [anahtar, deneme]);
  const gecerli = sonuc && sonuc.anahtar === anahtar && sonuc.deneme === deneme ? sonuc : null;
  return { veri: gecerli?.veri ?? null, hata: gecerli?.hata ?? null, tekrarDene: () => setDeneme(d => d + 1) };
}
