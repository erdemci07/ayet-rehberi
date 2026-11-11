import { TekAyetAkisi } from "@/bilesen/TekAyetAkisi";
import { konuIdleri } from "@/sunucu/parametreler";

export const dynamicParams = false;
export function generateStaticParams() {
  return konuIdleri();
}

export default async function KonuSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TekAyetAkisi tur="konu" id={id} />;
}
