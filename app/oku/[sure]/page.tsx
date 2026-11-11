import { Suspense } from "react";
import { Okuma } from "@/ekranlar/Okuma";
import { Iskelet } from "@/bilesen/Ortak";
import { sureNolari } from "@/sunucu/parametreler";

export const dynamicParams = false;
export function generateStaticParams() {
  return sureNolari();
}

export default async function OkumaSayfasi({ params }: { params: Promise<{ sure: string }> }) {
  const { sure } = await params;
  const no = Number(sure);
  return (
    <Suspense fallback={<main className="sayfa sayfa--menusuz"><Iskelet yukseklik={400} /></main>}>
      <Okuma key={no} no={no} />
    </Suspense>
  );
}
