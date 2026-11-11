"use client";
import { useState } from "react";
import type { Ayet } from "@/cekirdek/tipler";

/** Meal metni ve çevirmen notları. Not işaretine dokununca not, ayetin altında açılır. */
export function AyetMetni({ ayet, sinif, numara = false, notlarAcik = false }: { ayet: Ayet; sinif: string; numara?: boolean; notlarAcik?: boolean }) {
  const [acik, setAcik] = useState<number | null>(null);
  const goster = notlarAcik ? ayet.not.map((_, i) => i) : acik === null ? [] : [acik];
  return (
    <>
      <p className={sinif}>
        {numara && <span className="ayet-no">{ayet.n}</span>}
        {ayet.p.map((parca, i) =>
          typeof parca === "string" ? (
            <span key={i}>{parca}</span>
          ) : (
            <button
              key={i}
              type="button"
              className="not-isareti"
              aria-expanded={goster.includes(parca)}
              aria-label={`${parca + 1}. çevirmen notu`}
              onClick={() => setAcik(a => (a === parca ? null : parca))}
            >
              {parca + 1}
            </button>
          ),
        )}
      </p>
      {goster.length > 0 && (
        <div className="not-kutusu" role="note">
          <span className="not-kutusu__baslik">Çevirmenin notu</span>
          {goster.map(i => (
            <p key={i}>
              {ayet.not.length > 1 && <strong>{i + 1}. </strong>}
              {ayet.not[i]}
            </p>
          ))}
        </div>
      )}
      {ayet.yedek && <p className="yedek-uyari">Bu ayette Erhan Aktaş meali eksik olduğu için {ayet.yedek} meali gösteriliyor.</p>}
    </>
  );
}
