// public/veri altındaki JSON dosyalarının biçimi (scripts/uygulama/veri-uret.mjs üretir).

/** Ayet metni parçası: düz metin ya da `not` dizisindeki sıra numarası. */
export type Parca = string | number;

export type Ayet = {
  n: number;
  /** Notsuz düz metin */
  m: string;
  p: Parca[];
  not: string[];
  /** Erhan Aktaş meali eksik olduğunda kullanılan çevirmen */
  yedek?: string;
};

export type HavuzAyet = { s: number; b: number; e: number; neden: string; ayetler: Ayet[] };
export type Hal = { id: string; etiket: string; aciklama: string; ayetler: HavuzAyet[] };
export type HalGrubu = { grup: string; haller: Hal[] };

export type Bolum = { bas: number; son: number; baslik: string; ozet: string };
export type Sure = { no: number; ad: string; bolumler: Bolum[]; ayetler: Ayet[] };
export type SureOzet = { no: number; ad: string; ayet: number; bolum: number };

export type Konu = { id: string; ad: string; ana: number; ayetler: string[] };
export type KonuGrubu = { grup: string; konular: Konu[] };

export type Esma = {
  sira: number;
  slug: string;
  ad: string;
  arapca: string;
  kisa: string;
  sanaNe: string;
  bugunDene: string;
  ayetler: string[];
};

/** "2:255" ya da "94:5-6" biçiminde ayet adresi */
export type AyetAdresi = string;

export const adres = (s: number, b: number, e: number = b): AyetAdresi => (e === b ? `${s}:${b}` : `${s}:${b}-${e}`);

export function adresCoz(a: AyetAdresi): { s: number; b: number; e: number } {
  const [s, aralik] = a.split(":");
  const [b, e] = aralik.split("-");
  return { s: Number(s), b: Number(b), e: Number(e ?? b) };
}
