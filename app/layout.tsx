import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
export const metadata: Metadata = { title: { default: "Ayet Rehberi", template: "%s · Ayet Rehberi" }, description: "Kur’an’ı oku, hayatın içinden konuları keşfet ve kaldığın yerden devam et." };
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={geist.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('ayet-rehberi:theme:v1');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}" }} /></head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
