import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedEsma } from "@/data/esma";
import { EsmaReadingPage } from "@/components/esma/EsmaReadingPage";
export function generateStaticParams() { return [{ slug: "inceleme" }, ...publishedEsma.map(entry => ({ slug: entry.slug }))]; }
export default async function EsmaDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "inceleme") return <main className="reading-shell"><Link href="/esma" className="back-link">← Esmâ</Link><header className="topic-header"><p className="eyebrow">İÇERİK İNCELEMESİ</p><h1>Anlam, kaynak, bağlam</h1></header><section className="section literary-copy"><p>Bu alanda her ismin anlamı, kaynakları ve Kur’an bağlantıları birlikte okunabilecek.</p><p>Üzerine düşünme metinleri, anlam açıklamalarından ayrı sunulacak. Henüz yayımlanmış bir isim kaydı yok.</p></section></main>;
  const index = publishedEsma.findIndex(entry => entry.slug === slug); if (index < 0) notFound();
  return <EsmaReadingPage entry={publishedEsma[index]} previous={publishedEsma[index - 1]} next={publishedEsma[index + 1]} />;
}
