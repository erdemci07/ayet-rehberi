import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/literata/400.css";
import "@fontsource/literata/500.css";
import "@fontsource/amiri/400.css";
import "./tema.css";
import "./stiller.css";
import { AltMenu } from "@/bilesen/AltMenu";
import { AyarUygulayici } from "@/bilesen/AyarUygulayici";

export const metadata: Metadata = {
  title: { default: "Ayet Rehberi", template: "%s · Ayet Rehberi" },
  description: "Her gün bir ayet, o anki hâline göre seçilmiş ayetler ve bölüm bölüm sakin bir Kur'an okuması.",
  applicationName: "Ayet Rehberi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#121815" },
  ],
};

// Tema ve yazı boyutu, sayfa çizilmeden önce uygulanır (yanıp sönme olmasın).
const ONCEDEN = `try{var d=JSON.parse(localStorage.getItem('ayet-rehberi:durum:v2')||'{}').ayarlar||{};var k=document.documentElement;if(d.yazi==='buyuk'||d.yazi==='cokBuyuk')k.dataset.yazi=d.yazi;if(d.tema==='acik'||d.tema==='koyu')k.dataset.tema=d.tema}catch(e){}`;

export default function KokYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ONCEDEN }} />
      </head>
      <body>
        <AyarUygulayici />
        {children}
        <AltMenu />
      </body>
    </html>
  );
}
