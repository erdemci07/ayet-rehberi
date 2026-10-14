import Link from "next/link";
import { topics } from "@/data";
import { discoveryGroups, groupOf } from "@/data/discovery";
import { DiscoveryIntents } from "@/components/topics/DiscoveryIntents";
import { SearchPanel } from "@/components/search/SearchPanel";
export const metadata = { title: "Keşfet" };
export default function DiscoverPage() {
  const groups = [...discoveryGroups, { id: "diger", name: "Diğer konular" }];
  return <main className="page-shell"><header className="topic-header"><p className="eyebrow">KUR’AN’I KEŞFET</p><h1>Keşfet</h1><p>Bir kelimeden, bir sorudan ya da hayatın içinden başlayın.</p><SearchPanel topics={topics} /></header>
    <section className="section" id="hayatin-icinden"><div className="section-heading"><h2>Bugün neye ihtiyacın var?</h2></div><DiscoveryIntents topics={topics} /></section>
    {groups.map(group => { const selected = topics.filter(topic => groupOf(topic) === group.id).sort((a, b) => a.name.localeCompare(b.name, "tr"));
      return selected.length ? <section className="section discovery-domain" key={group.id}><h2>{group.name}</h2><div className="topic-list">{selected.map(topic => <Link key={topic.id} href={`/konu/${topic.slug}`}><span>{topic.name}</span><strong>{topic.verseIds.length} ayet</strong></Link>)}</div></section> : null;
    })}<p className="demo-note">Konu bağlantıları okumayı kolaylaştıran editoryal bir keşif katmanıdır.</p></main>;
}
