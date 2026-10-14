"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Bugün", icon: "⌂", match: (path: string) => path === "/" },
  { href: "/kesfet", label: "Keşfet", icon: "◌", match: (path: string) => path.startsWith("/kesfet") || path.startsWith("/konu") },
  { href: "/kuran", label: "Kur’an", icon: "☷", match: (path: string) => path.startsWith("/kuran") || path.startsWith("/sure") || path.startsWith("/ayet") },
  { href: "/esma", label: "Esmâ", icon: "✧", match: (path: string) => path.startsWith("/esma") },
  { href: "/kitapligim", label: "Kitaplığım", icon: "▤", match: (path: string) => path.startsWith("/kitapligim") },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Alt gezinme">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} href={item.href} key={item.href}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
