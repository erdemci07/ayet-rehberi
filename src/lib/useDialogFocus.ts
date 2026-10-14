"use client";
import { useEffect, type RefObject } from "react";
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void, enabled = true, returnFocus?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!enabled) return;
    const previous = document.activeElement as HTMLElement | null;
    const restoreTarget = returnFocus?.current ?? previous;
    const panel = ref.current;
    if (!panel) return;
    const controls = () => [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, [tabindex="0"]')].filter(node => node.getClientRects().length > 0);
    (controls()[0] ?? panel).focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const nodes = controls(); const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true }); };
  }, [enabled, onClose, ref, returnFocus]);
}
