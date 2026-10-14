import { topics } from "@/data";
import { Library } from "@/components/library/Library";
export const metadata = { title: "Kitaplığım" };
export default function LibraryPage() { return <main className="page-shell"><header className="topic-header"><p className="eyebrow">SANA AİT</p><h1>Kitaplığım</h1><p>Okudukların, kaydettiklerin ve kaldığın yer.</p></header><Library topics={topics.map(({ name, slug }) => ({ name, slug }))} /></main>; }
