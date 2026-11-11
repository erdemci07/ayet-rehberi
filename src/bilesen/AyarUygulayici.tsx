"use client";
import { useEffect } from "react";
import { useDurum } from "@/istemci/depo";

/** Yazı boyutu ve tema ayarını sayfanın köküne uygular. */
export function AyarUygulayici() {
  const { ayarlar } = useDurum();
  useEffect(() => {
    const kok = document.documentElement;
    kok.dataset.yazi = ayarlar.yazi;
    if (ayarlar.tema === "sistem") delete kok.dataset.tema;
    else kok.dataset.tema = ayarlar.tema;
  }, [ayarlar.yazi, ayarlar.tema]);
  return null;
}
