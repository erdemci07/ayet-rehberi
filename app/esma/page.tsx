import { EsmaSearch } from "@/components/esma/EsmaSearch";

export const metadata = { title: "Esmâ" };

export default function EsmaPage() {
  return (
    <main className="page-shell">
      <header className="topic-header">
        <p className="eyebrow">ANLAM VE TEFEKKÜR</p>
        <h1>Esmâ</h1>
        <p>Allah’ın isimlerini anlamları ve kaynak bağlamıyla okumak.</p>
      </header>

      <EsmaSearch />
    </main>
  );
}
