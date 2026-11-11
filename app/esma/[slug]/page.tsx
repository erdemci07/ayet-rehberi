import { EsmaEkrani } from "@/ekranlar/EsmaEkrani";
import { esmaSluglari } from "@/sunucu/parametreler";

export const dynamicParams = false;
export function generateStaticParams() {
  return esmaSluglari();
}

export default async function EsmaSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EsmaEkrani slug={slug} />;
}
