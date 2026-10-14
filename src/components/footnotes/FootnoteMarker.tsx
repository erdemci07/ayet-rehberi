"use client";

import type { RefObject } from "react";

export function FootnoteMarker({
  marker,
  open,
  buttonRef,
  onClick,
}: {
  marker: string;
  open: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      className="footnote-marker"
      type="button"
      aria-expanded={open}
      aria-label={`${marker} numaralı açıklamayı aç`}
      onClick={onClick}
    >
      <span>{marker}</span>
    </button>
  );
}
