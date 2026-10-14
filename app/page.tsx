import Link from "next/link";
import { ContinueReading } from "@/components/reading/ContinueReading";
import { DailyVerse } from "@/components/reading/DailyVerse";
import { DiscoveryIntents } from "@/components/topics/DiscoveryIntents";
import { EsmaPreview } from "@/components/esma/EsmaPreview";
import { DynamicTopicDiscovery } from "@/components/topics/DynamicTopicDiscovery";
import { topics, verses, surahs } from "@/data";

export default function Home() {
  const dailyIds = ["2:153", "13:28", "39:53", "49:13", "3:134", "2:186", "17:23", "16:90", "14:7", "94:5", "2:286", "4:58", "31:18", "57:20"];
  const candidates = dailyIds.map(id => verses.find(verse => verse.id === id)!);

  return (
    <main className="page-shell">
      <header className="home-hero">
        <p className="eyebrow">AYET REHBERİ</p>
        <h1>Bugün</h1>
        <p className="intro">Oku. Keşfet. Kaldığın yerden devam et.</p>
      </header>

      <DailyVerse candidates={candidates} />

      <section className="section">
        <div className="section-heading">
          <h2>Bugün neye ihtiyacın var?</h2>
        </div>
        <DiscoveryIntents topics={topics} compact />
        <Link className="back-link" href="/kesfet#hayatin-icinden">Hayatın içinden keşfet →</Link>
      </section>

      <ContinueReading topics={topics.map(({ name, slug }) => ({ name, slug }))} surahs={surahs} />
      <section className="section">
        <div className="section-heading">
          <h2>Bugün Keşfet</h2>
          <Link href="/kesfet">Tüm konular</Link>
        </div>
        <DynamicTopicDiscovery topics={topics} />
      </section>

      <EsmaPreview />
    </main>
  );
}
