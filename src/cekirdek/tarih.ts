// Gün ve saat yardımcıları. Hepsi cihazın yerel saatine göre çalışır.

/** Yerel tarihe göre "YYYY-AA-GG" */
export function gunAnahtari(d: Date): string {
  const a = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${a}-${g}`;
}

/** İki gün anahtarı arasındaki gün farkı (b - a) */
export function gunFarki(a: string, b: string): number {
  const ms = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86400000);
}

export type ZamanDilimi = "sabah" | "gunduz" | "aksam" | "gece";

export function zamanDilimi(d: Date): ZamanDilimi {
  const s = d.getHours();
  if (s >= 5 && s < 11) return "sabah";
  if (s >= 11 && s < 17) return "gunduz";
  if (s >= 17 && s < 22) return "aksam";
  return "gece";
}

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function tarihYazisi(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`;
}

export function selamlama(z: ZamanDilimi): string {
  return { sabah: "Günaydın", gunduz: "Hoş geldin", aksam: "İyi akşamlar", gece: "İyi geceler" }[z];
}
