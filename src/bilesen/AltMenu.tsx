"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon } from "./Ikon";

const SEKMELER = [
  { yol: "/", ad: "Bugün", ikon: "gunes" },
  { yol: "/kesfet/", ad: "Keşfet", ikon: "pusula" },
  { yol: "/bende/", ad: "Bende", ikon: "kaydet" },
];

export function AltMenu() {
  const ham = usePathname() ?? "/";
  const yol = ham.endsWith("/") ? ham : `${ham}/`;
  // Menü yalnızca üç ana sekmede görünür; okuma ve ayet akışı ekranları tam ekrandır.
  if (!SEKMELER.some(s => s.yol === yol)) return null;
  const etkin = (s: string) => s === yol;
  return (
    <nav className="alt-menu" aria-label="Ana menü">
      <ul>
        {SEKMELER.map(s => (
          <li key={s.yol}>
            <Link href={s.yol} aria-current={etkin(s.yol) ? "page" : undefined}>
              <Ikon ad={s.ikon} />
              {s.ad}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
