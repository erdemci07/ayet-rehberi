"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useDialogFocus } from "@/lib/useDialogFocus";
import type { TranslationSegment, Verse } from "@/types/quran";

const themes = {
  Sade: { bg: "#fffdf8", fg: "#202923", muted: "#6d766f", accent: "#3f7d5a" },
  Krem: { bg: "#f5eee2", fg: "#473b2c", muted: "#7b6b58", accent: "#8a6a3d" },
  Gece: { bg: "#19332a", fg: "#f4f5ef", muted: "#bdd0c5", accent: "#9fd0ad" },
  Yeşil: { bg: "#dfeee2", fg: "#23523a", muted: "#547160", accent: "#2f764f" },
} as const;

type ThemeName = keyof typeof themes;

function textWithMarkers(segments: TranslationSegment[]) {
  return segments.map((segment) => (segment.type === "text" ? segment.value : segment.marker)).join("");
}

function verseUrl(verse: Verse) {
  return `${location.origin}/ayet/${verse.surahNumber}/${verse.ayahNumber}/`;
}

function splitWords(text: string, ctx: CanvasRenderingContext2D, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function fitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number) {
  for (let size = 54; size >= 12; size -= 2) {
    ctx.font = `${size}px Georgia, serif`;
    const lines = splitWords(text, ctx, maxWidth);
    const lineHeight = size * 1.25;
    if (lines.length * lineHeight <= maxHeight) return { lines, size, lineHeight };
  }
  ctx.font = "12px Georgia, serif";
  const lines = splitWords(text, ctx, maxWidth);
  return { lines, size: 12, lineHeight: 15 };
}

function previewFontSize(text: string) {
  if (text.length > 1200) return "10px";
  if (text.length > 900) return "11px";
  if (text.length > 650) return "12px";
  if (text.length > 430) return "14px";
  return undefined;
}

export function ShareSheet({ verse, onClose, returnFocus }: { verse: Verse; onClose: () => void; returnFocus?: RefObject<HTMLButtonElement | null> }) {
  const [theme, setTheme] = useState<ThemeName>("Sade");
  const [status, setStatus] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const selectedTheme = themes[theme];
  const markedText = useMemo(() => textWithMarkers(verse.segments), [verse.segments]);
  const hasFootnotes = verse.footnotes.length > 0;
  const previewTextSize = previewFontSize(markedText);

  useBodyScrollLock(true);
  useDialogFocus(panelRef, onClose, true, returnFocus);

  async function renderImage() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");

    canvas.width = 1080;
    canvas.height = 1350;
    ctx.fillStyle = selectedTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = selectedTheme.accent;
    ctx.font = "700 34px Arial, sans-serif";
    ctx.fillText("AYET REHBERİ", 90, 128);

    ctx.fillStyle = selectedTheme.fg;
    const fitted = fitLines(ctx, markedText, 900, 780);
    ctx.font = `${fitted.size}px Georgia, serif`;
    fitted.lines.forEach((line, index) => {
      ctx.fillText(line, 90, 280 + index * fitted.lineHeight);
    });

    ctx.fillStyle = selectedTheme.muted;
    ctx.font = "32px Arial, sans-serif";
    ctx.fillText(`${verse.surahName} · ${verse.ayahNumber}`, 90, 1134);
    ctx.fillText(verse.translator, 90, 1190);

    if (hasFootnotes) {
      ctx.fillStyle = selectedTheme.accent;
      ctx.font = "26px Arial, sans-serif";
      ctx.fillText(`${verse.footnotes.map((note) => note.marker).join(" ")} Açıklamalı ayet`, 90, 1262);
    }

    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image generation failed"))), "image/png"),
    );
  }

  async function shareImage() {
    try {
      const blob = await renderImage();
      const file = new File([blob], "ayet-rehberi.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ayet Rehberi", text: `${verse.surahName} ${verse.ayahNumber}` });
        return;
      }
      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = "ayet-rehberi.png";
      link.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("Görsel indirildi.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus("Görsel oluşturulamadı.");
    }
  }

  async function shareText() {
    const text = `${markedText}\n\n${verse.surahName} ${verse.ayahNumber}\n${verse.translator}`;
    const url = verseUrl(verse);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ayet Rehberi", text, url });
        return;
      }
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setStatus("Metin ve bağlantı kopyalandı.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus("Paylaşım yapılamadı.");
    }
  }

  return (
    <div className="share-layer" role="presentation" onMouseDown={onClose}>
      <section
        ref={panelRef}
        tabIndex={-1}
        className="share-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Ayeti paylaş"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="share-handle" aria-hidden="true" />
        <header className="share-header">
          <h2>Ayeti Paylaş</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Paylaşımı kapat">
            ×
          </button>
        </header>

        <div className="share-theme-row" role="group" aria-label="Görsel tema seç">
          {Object.keys(themes).map((item) => (
            <button
              className={item === theme ? "selected" : undefined}
              type="button"
              onClick={() => setTheme(item as ThemeName)}
              key={item}
              aria-pressed={item === theme}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="share-preview-frame">
          <div
            className="share-preview"
            style={{
              background: selectedTheme.bg,
              color: selectedTheme.fg,
              ["--share-muted" as string]: selectedTheme.muted,
              ["--share-accent" as string]: selectedTheme.accent,
              ["--share-text-size" as string]: previewTextSize,
            }}
          >
            <b>AYET REHBERİ</b>
            <p>{markedText}</p>
            <small>
              {verse.surahName} · {verse.ayahNumber}
              <br />
              {verse.translator}
            </small>
            {hasFootnotes && <em>{verse.footnotes.map((note) => note.marker).join(" ")} Açıklamalı ayet</em>}
          </div>
        </div>

        <div className="share-actions">
          <button className="share-primary" type="button" onClick={shareImage}>
            Görseli Paylaş
          </button>
          <button className="share-secondary" type="button" onClick={shareText}>
            Metin olarak paylaş
          </button>
        </div>
        {status && <p className="share-status">{status}</p>}
      </section>
    </div>
  );
}
