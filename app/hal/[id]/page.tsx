import { TekAyetAkisi } from "@/bilesen/TekAyetAkisi";
import { halIdleri } from "@/sunucu/parametreler";

export const dynamicParams = false;
export function generateStaticParams() {
  return halIdleri();
}

export default async function HalSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TekAyetAkisi tur="hal" id={id} />;
}
