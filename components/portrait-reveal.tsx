"use client";

import { useEffect, useRef, useState } from "react";
import { Eclipse, Glasses, ScanFace, Sun } from "lucide-react";
import { useSitePreferences } from "./site-preferences";

const states = ["cosmic", "sunglasses", "glasses", "human"] as const;
type PortraitState = typeof states[number];
const icons = [Eclipse, Sun, Glasses, ScanFace];

export function PortraitReveal() {
  const { language, motionOn } = useSitePreferences();
  const [mode, setMode] = useState<PortraitState>("cosmic");
  const [failed, setFailed] = useState<PortraitState[]>([]);
  const [ready, setReady] = useState<PortraitState[]>([]);
  const host = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sweep = useRef({ x: .5, y: .35, active: false, face: false, dwell: 0, strength: 0 });
  const labels = language === "en" ? ["StarGod", "Dark glasses", "Clear glasses", "Henry"] : ["StarGod", "Kacamata gelap", "Kacamata bening", "Henry"];
  useEffect(() => {
    // A cached failure can precede hydration and therefore miss React's onError.
    const broken = Array.from(host.current?.querySelectorAll<HTMLImageElement>("img") ?? [])
      .filter(image => image.complete && image.naturalWidth === 0)
      .map(image => image.dataset.portraitLayer as PortraitState);
    if (broken.length) setFailed(previous => [...new Set([...previous, ...broken])]);
    const decoded = Array.from(host.current?.querySelectorAll<HTMLImageElement>("img") ?? [])
      .filter(image => image.complete && image.naturalWidth > 0)
      .map(image => image.dataset.portraitLayer as PortraitState);
    if (decoded.length) setReady(previous => [...new Set([...previous, ...decoded])]);
    return () => { if (touchTimer.current) clearTimeout(touchTimer.current); };
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let frame = 0, previous = 0, visible = false;
    const paint = (time: number) => {
      const dt = Math.min(.05, (time - (previous || time)) / 1000);
      previous = time;
      const point = sweep.current;
      const enabled = motionOn && mode === "cosmic" && !failed.length && ready.length === states.length;
      const target = enabled && point.active ? 1 : 0;
      point.strength += (target - point.strength) * (1 - Math.exp(-dt * (target ? 10 : 3.8)));
      point.dwell = target && point.face ? Math.min(2, point.dwell + dt) : Math.max(0, point.dwell - dt * 2);
      element.style.setProperty("--reveal-x", `${point.x * 100}%`);
      element.style.setProperty("--reveal-y", `${point.y * 100}%`);
      element.style.setProperty("--reveal-strength", point.strength.toFixed(3));
      element.style.setProperty("--clear-opacity", Math.min(1, Math.max(0, (point.dwell - .25) * 2.5)).toFixed(3));
      element.style.setProperty("--human-opacity", Math.min(1, Math.max(0, (point.dwell - 1) * 2)).toFixed(3));
      element.dataset.revealing = String(target === 1);
      if (visible && !document.hidden && enabled && (target || point.strength > .002)) frame = requestAnimationFrame(paint);
      else { frame = 0; previous = 0; }
    };
    const wake = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(paint); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) sweep.current.active = false; wake(); });
    observer.observe(element);
    element.addEventListener("pointermove", wake);
    element.addEventListener("pointerdown", wake);
    element.addEventListener("pointerleave", wake);
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); element.removeEventListener("pointermove", wake); element.removeEventListener("pointerdown", wake); element.removeEventListener("pointerleave", wake); document.removeEventListener("visibilitychange", wake); };
  }, [motionOn, mode, failed.length, ready.length]);
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && event.type === "pointermove") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
    sweep.current.x = x; sweep.current.y = y;
    sweep.current.active = true; sweep.current.face = x > .29 && x < .72 && y > .26 && y < .51;
  };
  const availableMode = failed.includes(mode) ? states.find(state => !failed.includes(state)) : mode;
  return <div className="portrait-identity">
    <div ref={host} className="portrait-reveal" data-portrait-mode={availableMode ?? "missing"} data-interactive={motionOn && failed.length === 0 && ready.length === states.length}
      role="img" aria-label={language === "en" ? "Henry Nugraha and his StarGod identity" : "Henry Nugraha dan identitas StarGod-nya"}
      onPointerMove={update} onPointerDown={event => { if (touchTimer.current) clearTimeout(touchTimer.current); update(event); }} onPointerUp={event => { if (event.pointerType === "touch") touchTimer.current = setTimeout(() => { sweep.current.active = false; }, 1800); }} onPointerCancel={() => { sweep.current.active = false; if (touchTimer.current) clearTimeout(touchTimer.current); }} onPointerLeave={event => { if (event.pointerType !== "touch") sweep.current.active = false; }}>
      {states.map(state => !failed.includes(state) && <img key={state} data-portrait-layer={state} src={`/assets/portrait/henry-${state}-560.webp`} srcSet={`/assets/portrait/henry-${state}-560.webp 560w, /assets/portrait/henry-${state}-960.webp 960w`} sizes="(max-width: 700px) 90vw, 520px" width="1122" height="1402" loading="lazy" decoding="async" alt="" draggable={false} onLoad={() => setReady(previous => [...new Set([...previous, state])])} onError={() => setFailed(previous => [...new Set([...previous, state])])} />)}
      {availableMode === undefined && <span className="portrait-missing">Henry Nugraha</span>}
      <span className="portrait-reveal-light" aria-hidden="true" />
    </div>
    <div className="portrait-states" role="group" aria-label={language === "en" ? "Portrait appearance" : "Tampilan potret"}>
      {states.map((state, index) => { const Icon = icons[index]; return <button type="button" key={state} disabled={failed.includes(state)} aria-label={labels[index]} title={labels[index]} aria-pressed={availableMode === state} onClick={() => { sweep.current.active = false; sweep.current.strength = 0; setMode(state); }}><Icon size={18} aria-hidden="true" /></button>; })}
    </div>
  </div>;
}
