"use client";
import { useEffect, useState } from "react";
type Theme = "system" | "light" | "dark";
export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => { queueMicrotask(() => { const stored = document.documentElement.dataset.theme; setTheme(stored === "dark" || stored === "light" ? stored : "system"); }); }, []);
  function change(value: Theme) {
    setTheme(value);
    if (value === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
    try { localStorage.setItem("ayet-rehberi:theme:v1", value); } catch { /* Optional persistence. */ }
  }
  return <label className="theme-control"><span className="sr-only">Okuma teması</span><select aria-label="Okuma teması" value={theme} onChange={event => change(event.target.value as Theme)}><option value="system">Sistem teması</option><option value="light">Açık tema</option><option value="dark">Koyu tema</option></select></label>;
}
