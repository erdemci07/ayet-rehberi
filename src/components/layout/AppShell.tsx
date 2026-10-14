import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeControl } from "@/components/layout/ThemeControl";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#icerik">İçeriğe geç</a>
      <div className="app-topline"><Link href="/" aria-label="Ayet Rehberi — Bugün">Ayet Rehberi</Link><ThemeControl /></div>
      <div id="icerik" tabIndex={-1}>
      {children}
      </div>
      <BottomNav />
    </div>
  );
}
