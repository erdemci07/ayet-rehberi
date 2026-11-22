"use client";
import { useEffect, useRef } from "react";
import { useDurum, useIstemcide } from "@/istemci/depo";
import { hasPushConsent, syncPush } from "@/istemci/push";

// Sync only the consented notification preferences and minimal progress summary.
// The personal mood history, saved verses, and full reading log remain on-device.
export function BildirimSenkron() {
  const ready = useIstemcide();
  const durum = useDurum();
  const last = useRef("");
  useEffect(() => {
    if (!ready || !hasPushConsent()) return;
    const relevant = JSON.stringify({
      prefs: durum.ayarlar.hatirlatmalar, open: durum.gunler.at(-1),
      read: durum.okuma,
    });
    if (last.current === relevant) return;
    last.current = relevant;
    void syncPush(durum).catch(() => { last.current = ""; });
  }, [ready, durum]);
  return null;
}
