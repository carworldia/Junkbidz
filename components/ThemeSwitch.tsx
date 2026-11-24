"use client";
import { useEffect, useState } from "react";

// Appearance: Dark (the default) / Light / Auto (follows the phone or computer setting). Saved on this device.
// The startup script in app/layout.tsx applies it before the page paints, so there is no white flash.
export type ThemePref = "light" | "dark" | "auto";
const KEY = "jk_theme";
const BAR = { light: "#ffffff", dark: "#0d1117" };

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? BAR.dark : BAR.light);
}

export default function ThemeSwitch({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>("dark");

  useEffect(() => {
    let p: ThemePref = "dark";
    try { const s = localStorage.getItem(KEY); if (s === "light" || s === "auto") p = s; } catch {}
    setPref(p);
    applyTheme(p); // also sets the phone's top-bar colour
  }, []);

  // In Auto, follow the device when it switches (e.g. iPhone going dark at sunset).
  useEffect(() => {
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("auto");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);

  function choose(p: ThemePref) {
    setPref(p);
    try { localStorage.setItem(KEY, p); } catch {}
    applyTheme(p);
  }

  const opts: [ThemePref, string][] = [["dark", "Dark"], ["light", "Light"], ["auto", "Auto"]];
  return (
    <div className={`theme-switch${className ? ` ${className}` : ""}`}>
      <span className="ts-label">Appearance</span>
      <div className="ts-seg" role="radiogroup" aria-label="Appearance">
        {opts.map(([p, label]) => (
          <button key={p} type="button" role="radio" aria-checked={pref === p} onClick={() => choose(p)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
