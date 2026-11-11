"use client";
// Cihazdaki durumu tutan tek depo. localStorage yoksa (gizli sekme, kapalı depolama) bellekte çalışır.
import { useSyncExternalStore } from "react";
import { durumuDuzelt, gunuIsle, yeniDurum, type Durum } from "@/cekirdek/durum";
import { gunAnahtari } from "@/cekirdek/tarih";

const ANAHTAR = "ayet-rehberi:durum:v2";

function kimlikUret(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const SUNUCU_DURUMU: Durum = yeniDurum("sunucu");
let durum: Durum | null = null;
const dinleyiciler = new Set<() => void>();

function yukle(): Durum {
  if (durum) return durum;
  let ham: unknown = null;
  try {
    const metin = window.localStorage.getItem(ANAHTAR);
    if (metin) ham = JSON.parse(metin);
  } catch {}
  durum = gunuIsle(durumuDuzelt(ham, kimlikUret), gunAnahtari(new Date()));
  kaydet(durum);
  return durum;
}

function kaydet(d: Durum) {
  try {
    window.localStorage.setItem(ANAHTAR, JSON.stringify(d));
  } catch {
    // Depolama doluysa ya da kapalıysa uygulama bellekteki durumla çalışmaya devam eder.
  }
}

export function durumuGuncelle(f: (d: Durum) => Durum) {
  const eski = yukle();
  const yeni = f(eski);
  if (yeni === eski) return;
  durum = yeni;
  kaydet(yeni);
  dinleyiciler.forEach(d => d());
}

export function durumuAl(): Durum {
  return yukle();
}

function abone(d: () => void) {
  dinleyiciler.add(d);
  const depolamaDegisti = (e: StorageEvent) => {
    if (e.key !== ANAHTAR) return;
    durum = null;
    d();
  };
  window.addEventListener("storage", depolamaDegisti);
  return () => {
    dinleyiciler.delete(d);
    window.removeEventListener("storage", depolamaDegisti);
  };
}

/** Durumu okur; sunucuda ve ilk çizimde varsayılan durumu döndürür (hidrasyon uyumu için). */
export function useDurum(): Durum {
  return useSyncExternalStore(abone, yukle, () => SUNUCU_DURUMU);
}

/** İlk çizimden sonra true olur; tarihe ve cihaz durumuna bağlı içerik bundan sonra çizilir. */
export function useIstemcide(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Cihazdaki her şeyi siler; yeni bir kimlikle baştan başlar. */
export function herSeyiSil() {
  durumuGuncelle(() => yeniDurum(kimlikUret()));
}
