import { Suspense } from "react";
import { Kesfet } from "@/ekranlar/Kesfet";
import { Iskelet } from "@/bilesen/Ortak";

export const metadata = { title: "Keşfet" };
export default function KesfetSayfasi() {
  return (
    <Suspense fallback={<main className="sayfa"><Iskelet yukseklik={400} /></main>}>
      <Kesfet />
    </Suspense>
  );
}
