// Statik dışa aktarımda hangi sayfaların üretileceği (yalnızca derleme sırasında çalışır).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const oku = <T,>(yol: string): T => JSON.parse(readFileSync(join(process.cwd(), yol), "utf8")) as T;

export function halIdleri(): { id: string }[] {
  return oku<{ haller: { id: string }[] }[]>("data/v3/uygulama/haller.json").flatMap(g => g.haller.map(h => ({ id: h.id })));
}

export function konuIdleri(): { id: string }[] {
  return oku<{ konular: { id: string }[] }[]>("data/v3/uygulama/konular.json").flatMap(g => g.konular.map(k => ({ id: k.id })));
}

export function esmaSluglari(): { slug: string }[] {
  return oku<{ slug: string }[]>("src/data/esma/published.json").map(e => ({ slug: e.slug }));
}

export function sureNolari(): { sure: string }[] {
  return Array.from({ length: 114 }, (_, i) => ({ sure: String(i + 1) }));
}
