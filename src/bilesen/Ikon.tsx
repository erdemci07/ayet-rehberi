import type { ReactNode } from "react";

const YOLLAR: Record<string, ReactNode> = {
  kapat: <path d="M6 6l12 12M18 6L6 18" />,
  geri: <path d="M15 6l-6 6 6 6" />,
  ileri: <path d="M9 6l6 6-6 6" />,
  kaydet: <path d="M6 4h12v16l-6-4-6 4z" />,
  paylas: (<><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 13v6h14v-6" /></>),
  kitap: (<><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></>),
  saat: (<><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>),
  yenile: (<><path d="M4 12a8 8 0 0 1 14-5l2 2" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5l-2-2" /><path d="M4 20v-5h5" /></>),
  gunes: (<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>),
  pusula: (<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>),
  ara: (<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>),
  not: (<><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6" /></>),
  liste: <path d="M5 7h14M5 12h14M5 17h9" />,
  kisi: (<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-5 8-5s6.5 1 8 5" /></>),
};

export function Ikon({ ad, boyut = 22, kalinlik = 1.7 }: { ad: keyof typeof YOLLAR | string; boyut?: number; kalinlik?: number }) {
  return (
    <svg aria-hidden="true" width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={kalinlik} strokeLinecap="round" strokeLinejoin="round">
      {YOLLAR[ad]}
    </svg>
  );
}

/** Günün ayeti kartındaki silik sekiz köşeli yıldız */
export function Desen() {
  return (
    <svg className="gunun-ayeti__desen" aria-hidden="true" width="260" height="260" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="0.8" style={{ color: "var(--koyu-kart-altin)" }}>
      <path d="M60 8l13 26 29-4-17 23 17 23-29-4-13 26-13-26-29 4 17-23-17-23 29 4z" />
      <path d="M60 26l8 16 18-3-10 14 10 14-18-3-8 16-8-16-18 3 10-14-10-14 18 3z" />
      <circle cx="60" cy="53" r="9" />
    </svg>
  );
}
