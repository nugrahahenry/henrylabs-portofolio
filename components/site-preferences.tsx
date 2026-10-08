"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { Language } from "@/content/projects";

const locationEvent = "henrylabs:location";
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(locationEvent, listener);
  return () => { window.removeEventListener("popstate", listener); window.removeEventListener(locationEvent, listener); };
}
export function updateQuery(patch: Record<string, string | null>, replace = false) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  if (url.href === window.location.href) return;
  window.history[replace ? "replaceState" : "pushState"](window.history.state, "", url);
  window.dispatchEvent(new Event(locationEvent));
}
export function useQuery() {
  const path = usePathname();
  const query = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  useEffect(() => { window.dispatchEvent(new Event(locationEvent)); }, [path]);
  return new URLSearchParams(query);
}
type Preferences = {
  language: Language; motionOn: boolean; motionReady: boolean; reducedMotionActive: boolean;
  toggleLanguage: () => void; toggleMotion: () => void; href: (path: string) => string;
};
const Context = createContext<Preferences | null>(null);
export function SitePreferences({ children }: { children: ReactNode }) {
  const query = useQuery();
  const [motionReady, setReady] = useState(false);
  const reduced = useReducedMotion();
  const language: Language = query.get("lang") === "id" ? "id" : "en";
  const enabled = query.get("motion") !== "off";
  const reducedMotionActive = motionReady && Boolean(reduced);
  const motionOn = motionReady && enabled && !reducedMotionActive;
  useEffect(() => { setReady(true); document.documentElement.dataset.preferencesReady = "true"; }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { document.documentElement.dataset.motion = motionOn ? "on" : "off"; }, [motionOn]);
  const href = (path: string) => {
    const url = new URL(path, "https://portfolio.local");
    if (language === "id") url.searchParams.set("lang", "id");
    if (!enabled) url.searchParams.set("motion", "off");
    return `${url.pathname}${url.search}${url.hash}`;
  };
  return <Context.Provider value={{ language, motionOn, motionReady, reducedMotionActive, href,
    toggleLanguage: () => updateQuery({ lang: language === "en" ? "id" : null }, true),
    toggleMotion: () => updateQuery({ motion: enabled ? "off" : null }, true),
  }}>{children}</Context.Provider>;
}
export function useSitePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("SitePreferences is required");
  return value;
}
export function SiteLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const preferences = useSitePreferences();
  return <Link href={preferences.href(href)} {...props} />;
}
