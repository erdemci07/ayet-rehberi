"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FootnoteMarker } from "@/components/footnotes/FootnoteMarker";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useDialogFocus } from "@/lib/useDialogFocus";
import type { Footnote } from "@/types/quran";
const HINT_KEY = "ayet-rehberi:footnote-hint-seen:v1";
let hintClaimed = false;
function subscribe(callback: () => void) { const media = matchMedia("(min-width: 640px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
export function InlineFootnote({ footnote, verseLabel }: { footnote: Footnote; verseLabel?: string }) {
  const [open, setOpen] = useState(false); const [hint, setHint] = useState(false);
  const [position, setPosition] = useState({ left: 20, top: 80 });
  const button = useRef<HTMLButtonElement>(null); const panel = useRef<HTMLDivElement>(null);
  const desktop = useSyncExternalStore(subscribe, () => matchMedia("(min-width: 640px)").matches, () => false);
  const close = useCallback(() => setOpen(false), []);
  useBodyScrollLock(open && !desktop); useDialogFocus(panel, close, open, button);
  useEffect(() => {
    if (hintClaimed) return;
    try { if (localStorage.getItem(HINT_KEY) === "1") return; localStorage.setItem(HINT_KEY, "1"); } catch { /* Optional hint memory. */ }
    hintClaimed = true;
    queueMicrotask(() => setHint(true)); const timer = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open || !desktop) return;
    const outside = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) close(); };
    const reposition = () => {
      const rect = button.current?.getBoundingClientRect(); if (!rect) return;
      setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)), top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - (panel.current?.offsetHeight ?? 200) - 100)) });
    };
    reposition(); document.addEventListener("mousedown", outside); window.addEventListener("resize", reposition); window.addEventListener("scroll", reposition, true);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [open, desktop, close]);
  return <span className="footnote"><FootnoteMarker marker={footnote.marker} open={open} buttonRef={button} onClick={() => { setOpen(value => !value); setHint(false); }} />
    {hint && <span className="footnote-hint">İşarete dokunarak çevirmenin açıklamasını okuyabilirsiniz.</span>}
    {open && createPortal(desktop ? <div ref={panel} tabIndex={-1} className="footnote-popover" role="dialog" aria-label={`${footnote.marker} numaralı açıklama`} style={{ position: "fixed", left: position.left, top: position.top, bottom: "auto", right: "auto" }}><div className="footnote-sheet-heading"><strong>{footnote.marker} Açıklama</strong><button onClick={close}>Kapat</button></div><span>{footnote.text}</span>{verseLabel && <em>{verseLabel}</em>}</div> : <div className="footnote-sheet-layer" role="presentation" onMouseDown={close}><div ref={panel} tabIndex={-1} className="footnote-sheet" role="dialog" aria-modal="true" aria-label={`${footnote.marker} numaralı açıklama`} onMouseDown={event => event.stopPropagation()}><span className="footnote-sheet-handle" aria-hidden="true" /><div className="footnote-sheet-heading"><strong>{footnote.marker} Açıklama</strong><button type="button" onClick={close}>Kapat</button></div><div className="footnote-sheet-body">{footnote.text}</div>{verseLabel && <div className="footnote-sheet-meta">{verseLabel}</div>}</div></div>, document.body)}
  </span>;
}
